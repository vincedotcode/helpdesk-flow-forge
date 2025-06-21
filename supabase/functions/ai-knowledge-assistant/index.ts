
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Function to determine the best department for an issue
const findBestDepartmentForIssue = async (supabase: any, issueDescription: string) => {
  console.log('Finding best department for issue:', issueDescription);
  
  // Get all departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, name, description');

  if (deptError || !departments) {
    console.error('Error fetching departments:', deptError);
    return null;
  }

  // Define keyword mapping for common issue types
  const departmentKeywords = {
    finance: ['finance', 'financial', 'budget', 'payment', 'invoice', 'billing', 'accounting', 'expense', 'money', 'cost'],
    it: ['computer', 'software', 'hardware', 'network', 'internet', 'system', 'technical', 'login', 'password', 'server', 'email'],
    hr: ['human resources', 'employee', 'payroll', 'benefits', 'leave', 'vacation', 'personnel', 'hiring', 'staff'],
    facilities: ['building', 'office', 'maintenance', 'repair', 'cleaning', 'security', 'access', 'parking', 'facilities'],
    legal: ['legal', 'contract', 'compliance', 'policy', 'regulation', 'lawsuit', 'agreement'],
    operations: ['operations', 'process', 'workflow', 'procedure', 'business', 'customer', 'service']
  };

  const lowerIssue = issueDescription.toLowerCase();
  
  // Score each department based on keyword matches
  let bestMatch = null;
  let highestScore = 0;

  for (const dept of departments) {
    let score = 0;
    const deptName = dept.name.toLowerCase();
    const deptDesc = (dept.description || '').toLowerCase();
    
    // Check if department name or description matches issue keywords
    for (const [category, keywords] of Object.entries(departmentKeywords)) {
      for (const keyword of keywords) {
        if (lowerIssue.includes(keyword)) {
          // Higher score if department name contains the category
          if (deptName.includes(category) || deptDesc.includes(category)) {
            score += 10;
          }
          // Lower score for partial matches
          else if (deptName.includes(keyword) || deptDesc.includes(keyword)) {
            score += 5;
          }
          // Even lower score for keyword presence in issue
          else {
            score += 1;
          }
        }
      }
    }

    // Special handling for common department name patterns
    if (lowerIssue.includes('finance') && (deptName.includes('finance') || deptName.includes('accounting'))) {
      score += 15;
    }
    if ((lowerIssue.includes('computer') || lowerIssue.includes('technical')) && 
        (deptName.includes('it') || deptName.includes('information') || deptName.includes('technology'))) {
      score += 15;
    }

    console.log(`Department ${dept.name} scored: ${score}`);
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = dept;
    }
  }

  console.log('Best department match:', bestMatch?.name, 'with score:', highestScore);
  return bestMatch;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { message, sessionId, userId } = await req.json();

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
      
      // Find the best department for this issue
      const bestDepartment = await findBestDepartmentForIssue(supabase, `${message} ${ticketDescription}`);
      
      let targetDepartmentId = null;
      let departmentAdmin = null;

      if (bestDepartment) {
        targetDepartmentId = bestDepartment.id;
        
        // Find department admin for the best matched department
        const { data: admin, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('department_id', bestDepartment.id)
          .eq('role', 'department_admin')
          .eq('is_active', true)
          .single();

        if (!adminError && admin) {
          departmentAdmin = admin;
        }
      } else {
        // Fallback to user's department if no specific match found
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('department_id')
          .eq('id', userId)
          .single();

        if (!userError && userInfo && userInfo.department_id) {
          targetDepartmentId = userInfo.department_id;
          
          // Find department admin for user's department
          const { data: admin, error: adminError } = await supabase
            .from('users')
            .select('id')
            .eq('department_id', userInfo.department_id)
            .eq('role', 'department_admin')
            .eq('is_active', true)
            .single();

          if (!adminError && admin) {
            departmentAdmin = admin;
          }
        }
      }

      // Create a ticket and assign to the best department
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: `Auto-generated: ${ticketDescription.substring(0, 50)}...`,
          description: `This ticket was automatically created from a knowledge base interaction.

User Question: ${message}

Issue Description: ${ticketDescription}

${bestDepartment ? `\nRouted to: ${bestDepartment.name} department based on issue analysis.` : ''}`,
          status: 'open',
          priority: 'medium',
          created_by: userId,
          department_id: targetDepartmentId,
          assigned_to: departmentAdmin?.id || null,
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        aiResponse = "I understand you need help with this issue. Unfortunately, I couldn't automatically create a support ticket right now. Please contact your system administrator or create a ticket manually.";
      } else {
        ticketCreated = true;
        ticketId = ticket.id;
        
        let assignmentText = "";
        if (bestDepartment) {
          assignmentText = ` and has been routed to the ${bestDepartment.name} department`;
          if (departmentAdmin) {
            assignmentText += " admin for review";
          }
        } else if (departmentAdmin) {
          assignmentText = " and has been assigned to your department admin for review";
        }
        
        aiResponse = `I've automatically created a support ticket for your issue (Ticket #${ticket.id})${assignmentText}. Our technical team will review it and get back to you soon. 

Your ticket details:
- Title: ${ticket.title}
- Status: ${ticket.status}
- Priority: ${ticket.priority}
${bestDepartment ? `- Department: ${bestDepartment.name}` : ''}

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
