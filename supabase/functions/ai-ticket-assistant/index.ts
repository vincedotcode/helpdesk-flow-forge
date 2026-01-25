
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.0-pro';

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
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { action, ticketContext, userMessage, conversationHistory } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'summarize') {
      systemPrompt = `You are a helpdesk triage assistant. Analyze the following support ticket and provide:
1. A concise summary of the issue
2. Key facts extracted (systems, impact, urgency)
3. Missing details to request from the requester
4. Suggested workflow actions (assignments, escalation, or next steps) without troubleshooting

Do NOT provide solutions, fixes, or troubleshooting steps. Keep it concise and actionable for ticket handling.`;
      
      userPrompt = `Please analyze this support ticket:\n\n${ticketContext}`;
    } else if (action === 'chat') {
      systemPrompt = `You are a helpdesk triage assistant helping manage a support ticket. You have full context of the ticket details and previous conversation. Ask for missing information, clarify scope, and suggest ticket workflow actions. Do NOT provide troubleshooting steps or solutions. Be concise and professional.

Ticket Context:
${ticketContext}`;
      
      userPrompt = userMessage;
    }

    const contents = [];
    if (action === 'chat' && conversationHistory) {
      for (const msg of conversationHistory) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.3,
        },
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    
    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(data)}`);
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const aiResponseText = parts.map((p: any) => p?.text).filter(Boolean).join('');
    let aiResponse = aiResponseText?.trim();

    if (!aiResponse) {
      if (candidate?.finishReason === 'SAFETY') {
        aiResponse = "I'm sorry, I can't answer that request. Please rephrase or contact support.";
      } else {
        throw new Error(`Gemini API returned an empty response: ${JSON.stringify(data)}`);
      }
    }

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
