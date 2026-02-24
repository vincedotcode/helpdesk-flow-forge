
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-session-token, x-client-info, apikey, content-type',
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

    if (!action || !ticketContext) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action, ticketContext' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'summarize') {
      systemPrompt = `You are a helpdesk triage and troubleshooting assistant. Analyze the following support ticket and provide:
1. A concise summary of the issue
2. Key facts extracted (systems, impact, urgency)
3. Missing details to request from the requester
4. Prioritized troubleshooting steps (start with safe, low-risk checks before disruptive actions)
5. Suggested workflow actions (assignment, escalation, or next operational step)

Troubleshooting requirements:
- Use a numbered list and include the expected outcome for each step.
- If key details are missing, state assumptions and ask focused follow-up questions.
- Never claim the issue is resolved unless the user confirmed results.
- Recommend escalation when troubleshooting cannot proceed safely.`;
      
      userPrompt = `Please analyze this support ticket:\n\n${ticketContext}`;
    } else if (action === 'chat') {
      systemPrompt = `You are a helpdesk triage and troubleshooting assistant helping manage a support ticket. You have full context of the ticket details and previous conversation.

For every response:
- Provide clear troubleshooting steps tailored to the ticket.
- Ask for missing details only when they block safe troubleshooting.
- Clarify scope and operational next actions (assignment, escalation, vendor handoff when needed).
- Keep responses concise and professional.
- Never claim the issue is fixed without user confirmation.

Ticket Context:
${ticketContext}`;
      
      userPrompt = userMessage;
      if (!userPrompt) {
        return new Response(JSON.stringify({ error: 'Missing required field for chat: userMessage' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use summarize or chat.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (action === 'chat' && conversationHistory) {
      for (const msg of conversationHistory) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const callGemini = async (payload: Record<string, unknown>) => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return { response, data };
    };

    const basePayload: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.3,
      },
    };

    let { response, data } = await callGemini(basePayload);

    if (!response.ok && data?.error?.message?.includes('systemInstruction')) {
      const fallbackPayload = {
        ...basePayload,
        system_instruction: basePayload.systemInstruction,
      } as Record<string, unknown>;
      delete (fallbackPayload as any).systemInstruction;
      const fallback = await callGemini(fallbackPayload);
      response = fallback.response;
      data = fallback.data;
    }

    if (!response.ok && response.status === 429) {
      return new Response(JSON.stringify({
        error: 'Assistant is temporarily rate limited. Please retry shortly.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
