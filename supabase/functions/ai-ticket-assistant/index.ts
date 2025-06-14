
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { action, ticketContext, userMessage, conversationHistory } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'summarize') {
      systemPrompt = `You are an expert IT support assistant. Analyze the following support ticket and provide:
1. A concise summary of the issue
2. Potential root causes
3. Recommended troubleshooting steps
4. Priority assessment and urgency justification
5. Estimated resolution time

Be technical but clear, and focus on actionable insights.`;
      
      userPrompt = `Please analyze this support ticket:\n\n${ticketContext}`;
    } else if (action === 'chat') {
      systemPrompt = `You are an expert IT support assistant helping to resolve a support ticket. You have full context of the ticket details and previous conversation. Provide helpful, technical guidance for troubleshooting and resolving IT issues. Be concise but thorough.

Ticket Context:
${ticketContext}`;
      
      userPrompt = userMessage;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history for chat mode
    if (action === 'chat' && conversationHistory) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-ticket-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
