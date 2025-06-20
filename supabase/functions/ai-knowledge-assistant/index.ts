import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the session token from custom header
    const sessionToken = req.headers.get('x-session-token');
    console.log('Session token received:', sessionToken ? 'present' : 'missing');
    
    if (!sessionToken) {
      console.error('Missing session token');
      return new Response(JSON.stringify({ 
        error: 'Missing session token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate the session token against the user_sessions table
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        user_id,
        expires_at,
        users!inner(
          id,
          email,
          first_name,
          last_name,
          role,
          department_id,
          is_active
        )
      `)
      .eq('session_token', sessionToken)
      .single();

    console.log('Session validation result:', { 
      found: !!sessionData, 
      error: sessionError?.message,
      expired: sessionData ? new Date(sessionData.expires_at) < new Date() : 'N/A'
    });

    if (sessionError || !sessionData || new Date(sessionData.expires_at) < new Date()) {
      console.error('Invalid or expired session:', { sessionError, sessionData });
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired session' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, sessionId, userId } = await req.json();

    // Verify the userId matches the session
    if (userId !== sessionData.user_id) {
      console.error('User ID mismatch:', { provided: userId, expected: sessionData.user_id });
      return new Response(JSON.stringify({ 
        error: 'User ID mismatch' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing knowledge base query:', { message, sessionId, userId });

    // Get all active knowledge articles for context
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('title, content')
      .eq('is_active', true);

    if (articlesError) {
      console.error('Error fetching knowledge articles:', articlesError);
      throw articlesError;
    }

    // Create knowledge context from articles
    const knowledgeContext = articles.map(article => 
      `Title: ${article.title}\nContent: ${article.content}`
    ).join('\n\n---\n\n');

    const systemPrompt = `You are an AI assistant for a helpdesk system with access to the organization's knowledge base. 

Your knowledge base contains:
${knowledgeContext}

Your role is to:
1. Answer user questions using the knowledge base information
2. Provide helpful, accurate responses based on the available documentation
3. If you cannot find the answer in the knowledge base or if the user has a technical issue that needs hands-on help, respond with exactly: "CREATE_TICKET: [brief description of the issue]"

Guidelines:
- Always try to answer from the knowledge base first
- Be helpful and professional
- If the user needs technical support, account access, or has an issue that requires intervention, suggest creating a ticket
- Keep responses concise but informative
- If you're unsure, it's better to create a ticket than give wrong information

User question: ${message}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const aiData = await response.json();
    let aiResponse = aiData.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Check if AI wants to create a ticket
    let ticketCreated = false;
    let ticketId = null;

    if (aiResponse.startsWith('CREATE_TICKET:')) {
      const ticketDescription = aiResponse.replace('CREATE_TICKET:', '').trim();
      
      // Create a ticket automatically
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: `Auto-generated: ${ticketDescription.substring(0, 50)}...`,
          description: `This ticket was automatically created from a knowledge base interaction.

User Question: ${message}

Issue Description: ${ticketDescription}`,
          status: 'open',
          priority: 'medium',
          created_by: userId,
          department_id: sessionData.users.department_id,
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        aiResponse = "I understand you need help with this issue. Unfortunately, I couldn't automatically create a support ticket right now. Please contact your system administrator or create a ticket manually.";
      } else {
        ticketCreated = true;
        ticketId = ticket.id;
        aiResponse = `I've automatically created a support ticket for your issue (Ticket #${ticket.id}). Our technical team will review it and get back to you soon. 

Your ticket details:
- Title: ${ticket.title}
- Status: ${ticket.status}
- Priority: ${ticket.priority}

You can track the progress of your ticket in the dashboard.`;
      }
    }

    // Save the conversation
    const { error: saveError } = await supabase
      .from('knowledge_chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        message: message,
        response: aiResponse,
        message_type: 'user'
      });

    if (saveError) {
      console.error('Error saving conversation:', saveError);
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      ticketCreated,
      ticketId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-knowledge-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: 'Sorry, I encountered an error while processing your request. Please try again or contact support.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
