import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authorization.ts';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completations';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabase } = await verifyUser(req);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { presentationId, instruction } = await req.json();

    if (!presentationId || !instruction) {
      return new Response(
        JSON.stringify({ error: 'presentationId and instruction are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load existing presentation
    const { data: presentation, error: loadError } = await supabase
      .from('presentations')
      .select('slides, ai_conversation')
      .eq('id', presentationId)
      .single();

    if (loadError || !presentation) {
      return new Response(
        JSON.stringify({ error: 'Presentation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a presentation editor. The user will provide current slides and an edit instruction. Return the updated slides in the same JSON format.

RULES:
- Maintain Google branding (colors: Blue #4285F4, Red #EA4335, Yellow #FBBC04, Green #34A853)
- Keep slide structure consistent
- Font: Google Sans
- Max 5 bullets per content slide

Return ONLY valid JSON with updated slides array.`;

    // Build conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(presentation.ai_conversation || []),
      { 
        role: 'user', 
        content: `Current slides:\n${JSON.stringify(presentation.slides, null, 2)}\n\nEdit instruction: ${instruction}` 
      }
    ];

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;

    // Parse updated slides
    let updatedSlides;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiContent;
      const parsed = JSON.parse(jsonStr);
      updatedSlides = parsed.slides || parsed;
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation history
    const updatedConversation = [
      ...(presentation.ai_conversation || []),
      { role: 'user', content: instruction },
      { role: 'assistant', content: aiContent }
    ];

    return new Response(
      JSON.stringify({ slides: updatedSlides, conversation: updatedConversation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ai-edit-presentation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});