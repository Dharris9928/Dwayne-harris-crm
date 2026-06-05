import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headers: csvHeaders, sampleRows, tableType } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const crmFields = tableType === 'companies' 
      ? ['company_name', 'website_url', 'industry_type', 'builder_segment', 'contractor_segment', 'industry_specialties', 'city', 'state', 'zip_code', 'primary_phone', 'primary_email', 'linkedin_company_url', 'annual_revenue_range', 'employee_count_range', 'years_in_business', 'company_type', 'contractor_specialties']
      : ['first_name', 'last_name', 'title', 'email', 'phone', 'mobile', 'linkedin_url', 'decision_tier', 'is_primary_contact'];

    const systemPrompt = `You are an expert data import assistant for a CRM system. Analyze CSV data and provide intelligent field mappings and data parsing.

CRM Fields Available for ${tableType}:
${crmFields.join(', ')}

Your tasks:
1. **Field Mapping**: Map CSV columns to CRM fields intelligently
   - Handle variations (e.g., "Company Name" vs "Organization" vs "Business Name")
   - Detect combined fields (e.g., "Full Name" → first_name + last_name)
   - Identify unmapped custom fields

2. **Data Parsing**: Clean and structure data
   - Split combined fields (e.g., "John Doe - CEO" → name + title)
   - Normalize phone numbers (remove formatting, keep digits only)
   - Validate emails and extract domain
   - Parse addresses (city, state, zip)
   - Normalize state names (e.g., "Texas" → "TX")
   ${tableType === 'companies' ? '- Detect industry_type from company name/description keywords' : ''}

3. **Data Quality**: Flag issues
   - Missing required fields (${tableType === 'companies' ? 'company_name' : 'first_name, last_name, email'})
   - Invalid formats (emails, phone numbers)
   - Suspicious data patterns
   - Potential duplicates within file

4. **Confidence Scoring**: Provide 0-100 confidence scores for:
   - Each field mapping
   - Each parsed row
   - Overall import confidence

Return structured output with all mappings, parsed data, and quality warnings.`;

    const userPrompt = `Parse this CSV import for ${tableType}:

Headers: ${JSON.stringify(csvHeaders)}

Sample Rows (first 10):
${JSON.stringify(sampleRows, null, 2)}

Provide complete field mapping and parsed data for all sample rows.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
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
            name: 'parse_import_data',
            description: 'Parse and map CSV import data to CRM fields',
            parameters: {
              type: 'object',
              properties: {
                fieldMappings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      csvColumn: { type: 'string' },
                      crmField: { type: 'string' },
                      confidence: { type: 'number', minimum: 0, maximum: 100 },
                      parseStrategy: { type: 'string' },
                      notes: { type: 'string' }
                    },
                    required: ['csvColumn', 'crmField', 'confidence', 'parseStrategy']
                  }
                },
                parsedRows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rowIndex: { type: 'number' },
                      parsedData: { type: 'object' },
                      confidence: { type: 'number', minimum: 0, maximum: 100 },
                      warnings: { type: 'array', items: { type: 'string' } },
                      detectedIndustry: { type: 'string' }
                    },
                    required: ['rowIndex', 'parsedData', 'confidence']
                  }
                },
                overallConfidence: { type: 'number', minimum: 0, maximum: 100 },
                recommendations: { type: 'array', items: { type: 'string' } }
              },
              required: ['fieldMappings', 'parsedRows', 'overallConfidence']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'parse_import_data' } }
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const parsedResult = JSON.parse(toolCall.function.arguments);

    // Log AI session for tracking
    const { error: logError } = await supabase
      .from('import_ai_sessions')
      .insert({
        user_id: user.id,
        table_name: tableType,
        file_name: 'import_preview',
        file_size: JSON.stringify(sampleRows).length,
        raw_headers: csvHeaders,
        ai_mappings: parsedResult.fieldMappings,
        confidence_scores: { overall: parsedResult.overallConfidence },
        rows_parsed: sampleRows.length,
        status: 'pending'
      });

    if (logError) {
      console.error('Failed to log AI session:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      data: parsedResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-parse-import:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
