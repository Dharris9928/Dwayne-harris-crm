import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  companyIds: z.array(z.string().uuid('Invalid company ID format')).min(1, 'At least one company ID required').max(100, 'Maximum 100 companies allowed')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user and check rate limit
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'ai-prioritize-leads');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters',
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { companyIds } = validation.data;

    // Fetch companies with all relevant data
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        *,
        contacts(id, first_name, last_name, title, decision_tier),
        outreach_activities(id, activity_type, outcome, scheduled_date),
        enrichment_logs(id, status, created_at)
      `)
      .in('id', companyIds);

    if (companiesError) throw companiesError;

    // Fetch communication history for these companies
    const { data: communications } = await supabase
      .from('company_communications')
      .select('company_id, communication_type, sent_at, attempted_at, opportunity_id')
      .in('company_id', companyIds);

    // Fetch opportunities for these companies
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('company_id, stage, amount, closed_date, created_at')
      .in('company_id', companyIds);

    // Enrich companies with communication and opportunity data
    const enrichedCompanies = companies?.map(company => {
      const companyComs = communications?.filter(c => c.company_id === company.id) || [];
      const companyOpps = opportunities?.filter(o => o.company_id === company.id) || [];
      const wonOpps = companyOpps.filter(o => o.stage === 'won');
      
      // Calculate average time to close for won deals
      let avgTimeToClose = null;
      if (wonOpps.length > 0) {
        const timelines = wonOpps
          .filter(o => o.created_at && o.closed_date)
          .map(o => {
            const created = new Date(o.created_at);
            const closed = new Date(o.closed_date);
            return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          });
        
        if (timelines.length > 0) {
          avgTimeToClose = Math.round(timelines.reduce((a, b) => a + b, 0) / timelines.length);
        }
      }

      return {
        ...company,
        total_communications: companyComs.length,
        recent_communications: companyComs.slice(0, 5),
        total_opportunities: companyOpps.length,
        won_opportunities: wonOpps.length,
        avg_days_to_close: avgTimeToClose,
        total_won_revenue: wonOpps.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0)
      };
    }) || [];

    // Build AI prompt
    const systemPrompt = `You are an expert sales strategist with access to historical communication and conversion data. Analyze these companies and provide prioritization recommendations.

IMPORTANT: Use the communication history and won opportunity timelines to inform your recommendations. Companies with:
- Previous wins should be prioritized higher
- Faster time-to-close rates indicate better prospects
- Active communication patterns show engagement
- Multiple opportunities suggest stronger relationships

For each company, consider:
- Lead score and priority tier
- Industry type and segment
- Data completeness
- Digital engagement (website, LinkedIn, social)
- Contact availability and decision maker access
- Financial stability indicators
- Recent enrichment activity
- Outreach history
- Communication engagement patterns
- Won opportunity history and conversion timelines

Provide clear, actionable prioritization advice based on historical performance.`;

    const companyData = enrichedCompanies.map(c => ({
      id: c.id,
      name: c.company_name,
      industryType: c.industry_type,
      segment: c.segment,
      leadScore: c.lead_score,
      priorityTier: c.priority_tier,
      status: c.status,
      website: c.website_url ? 'Yes' : 'No',
      linkedin: c.linkedin_company_url ? 'Yes' : 'No',
      contactCount: c.contacts?.length || 0,
      hasDecisionMakers: c.contacts?.some((ct: any) => ct.decision_tier === 'Primary') || false,
      revenueGrowth: c.revenue_growth_indicators,
      multipleProjects: c.multiple_active_projects,
      awards: c.industry_awards_recognition,
      positiveReviews: c.positive_reviews_reputation,
      lastEnriched: c.enrichment_logs?.[0]?.created_at || null,
      recentOutreach: c.outreach_activities?.filter((a: any) => 
        new Date(a.scheduled_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0,
      totalCommunications: c.total_communications,
      totalOpportunities: c.total_opportunities,
      wonOpportunities: c.won_opportunities,
      avgDaysToClose: c.avg_days_to_close,
      totalWonRevenue: c.total_won_revenue
    }));

    const userPrompt = `Analyze these ${companies.length} companies and provide prioritization recommendations:\n\n${JSON.stringify(companyData, null, 2)}\n\nFor each company, provide:\n1. Priority score (1-100)\n2. Key reasons for prioritization\n3. Recommended next action\n4. Potential objections or concerns\n5. Estimated conversion probability`;

    // Call Lovable AI
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
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'prioritize_companies',
            description: 'Return prioritization analysis for companies',
            parameters: {
              type: 'object',
              properties: {
                analyses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      companyId: { type: 'string' },
                      priorityScore: { type: 'number', minimum: 1, maximum: 100 },
                      keyReasons: { type: 'array', items: { type: 'string' } },
                      recommendedAction: { type: 'string' },
                      concerns: { type: 'array', items: { type: 'string' } },
                      conversionProbability: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                    },
                    required: ['companyId', 'priorityScore', 'keyReasons', 'recommendedAction', 'conversionProbability']
                  }
                }
              },
              required: ['analyses']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'prioritize_companies' } }
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
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call returned from AI');
    }

    const analyses = JSON.parse(toolCall.function.arguments).analyses;

    return new Response(
      JSON.stringify({ analyses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log detailed error server-side only
    console.error('Error in ai-prioritize-leads:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ error: 'Lead prioritization failed. Please try again or contact support.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});