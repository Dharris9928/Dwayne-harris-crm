import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check rate limit
    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'prospect-chat');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { messages, perspective, userRole } = await req.json();

    // System prompt with context
    const systemPrompt = `You are an AI prospecting assistant for a CRM focused on home builders and contractors.

Current user context:
- Role: ${userRole}
- Perspective: ${perspective}
  - my_records: Companies the user created
  - assigned_to_me: Companies assigned to the user
  - all_records: All companies user has access to

Available company types:
1. Builder: Home builders
   - luxury_custom: Premium/luxury builders
   - production_tract: High-volume production
   - regional_mid_volume: Regional mid-size builders

2. Contractor: Trade contractors
   - smart_home_champions: Smart home tech adopters
   - premium_specialists: Premium HVAC/trade specialists
   - regional_growth: Fast-growing contractors

When users ask about companies:
1. Extract search criteria using the search_companies function
2. Be conversational and helpful
3. Acknowledge when users have limited access
4. Offer to refine searches
5. Keep responses concise but informative

Examples:
- "Show me contractors in Texas" → state: TX, industry_type: Contractor
- "Find HVAC companies with good scores" → contractor_specialty: HVAC, min_score: 60
- "Luxury builders I'm assigned to" → segment: luxury_custom, use assigned_to_me perspective`;

    // Call Lovable AI without streaming for simpler implementation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'search_companies',
            description: 'Search companies database with extracted criteria',
            parameters: {
              type: 'object',
              properties: {
                industry_type: { 
                  type: 'string', 
                  enum: ['Builder', 'Contractor', 'Energy', 'Engineer', 'Partner'] 
                },
                segment: { 
                  type: 'string',
                  description: 'Specific segment like luxury_custom, smart_home_champions, etc.'
                },
                state: { type: 'string', description: 'US state abbreviation (e.g., TX, CA)' },
                city: { type: 'string' },
                status: { 
                  type: 'string', 
                  enum: ['Lead', 'Prospect', 'Active', 'Inactive', 'Lost'] 
                },
                priority_tier: { 
                  type: 'string', 
                  enum: ['P1', 'P2', 'P3', 'Unscored'] 
                },
                min_score: { type: 'number', description: 'Minimum lead score' },
                min_employees: { type: 'number' },
                max_employees: { type: 'number' },
                has_website: { type: 'boolean' },
                contractor_specialty: { 
                  type: 'string',
                  description: 'For contractors: HVAC, Plumbing, Electrical, etc.'
                }
              }
            }
          }
        }],
        tool_choice: 'auto'
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCalls = aiData.choices?.[0]?.message?.tool_calls;
    
    let companyResults: any[] = [];
    
    // Execute company search if tool was called
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      if (toolCall.function?.name === 'search_companies') {
        try {
          const filters = JSON.parse(toolCall.function.arguments);
          
          // Build query with perspective filter
          let query = supabase
            .from('companies')
            .select('id, company_name, industry_type, segment, city, state, lead_score, priority_tier, website_url, total_employees, annual_revenue_range, created_by, assigned_to_sales_rep_id')
            .order('lead_score', { ascending: false })
            .limit(15);

          // Apply perspective filter
          switch (perspective) {
            case 'my_records':
              query = query.eq('created_by', user.id);
              break;
            case 'assigned_to_me':
              query = query.eq('assigned_to_sales_rep_id', user.id);
              break;
            case 'all_records':
              const { data: hasElevated } = await supabase.rpc('has_elevated_access', { _user_id: user.id });
              if (!hasElevated) {
                query = query.or(`created_by.eq.${user.id},assigned_to_sales_rep_id.eq.${user.id}`);
              }
              break;
          }

          // Apply extracted filters
          if (filters.industry_type) query = query.eq('industry_type', filters.industry_type);
          if (filters.segment) query = query.eq('segment', filters.segment);
          if (filters.state) query = query.eq('state', filters.state);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
          if (filters.status) query = query.eq('status', filters.status);
          if (filters.priority_tier) query = query.eq('priority_tier', filters.priority_tier);
          if (filters.min_score) query = query.gte('lead_score', filters.min_score);
          if (filters.min_employees) query = query.gte('total_employees', filters.min_employees);
          if (filters.max_employees) query = query.lte('total_employees', filters.max_employees);
          if (filters.has_website) query = query.not('website_url', 'is', null);
          if (filters.contractor_specialty) query = query.ilike('contractor_specialty', `%${filters.contractor_specialty}%`);

          const { data: companies } = await query;

          // Check elevated access once
          const { data: hasElevatedAccess } = await supabase.rpc('has_elevated_access', { _user_id: user.id });

          // Add hasAccess flag to each company
          companyResults = (companies || []).map((company: any) => ({
            id: company.id,
            company_name: company.company_name,
            industry_type: company.industry_type,
            segment: company.segment,
            city: company.city,
            state: company.state,
            lead_score: company.lead_score,
            priority_tier: company.priority_tier,
            website_url: company.website_url,
            total_employees: company.total_employees,
            hasAccess: company.created_by === user.id || 
                     company.assigned_to_sales_rep_id === user.id ||
                     hasElevatedAccess
          }));
        } catch (parseError) {
          console.error('Error parsing tool call arguments:', parseError);
        }
      }
    }

    const responseMessage = aiData.choices?.[0]?.message?.content || `I found ${companyResults.length} companies matching your criteria.`;

    return new Response(
      JSON.stringify({ 
        message: responseMessage,
        companyResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in prospect-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
