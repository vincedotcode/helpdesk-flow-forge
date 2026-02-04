import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-session-token, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModel = 'gemini-2.0-flash-lite';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

const MAX_HISTORY_MESSAGES = 12;

const ticketPayloadRegex = /<TICKET_PAYLOAD>[\s\S]*?<\/TICKET_PAYLOAD>/i;

const parseTicketPayload = (aiResponse: string) => {
  const match = aiResponse.match(ticketPayloadRegex);
  if (!match) {
    return { cleaned: aiResponse.trim(), payload: null };
  }

  const cleaned = aiResponse.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
  const jsonText = match[0]
    .replace(/<\/?TICKET_PAYLOAD>/gi, '')
    .trim();

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    payload = null;
  }

  return { cleaned, payload };
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const mapUrgencyToPriority = (urgency: string | undefined) => {
  const value = (urgency || '').toLowerCase();
  if (!value) return 'medium';
  if (value.includes('urgent') || value.includes('critical') || value.includes('sev1')) return 'urgent';
  if (value.includes('high') || value.includes('sev2')) return 'high';
  if (value.includes('low') || value.includes('minor')) return 'low';
  return 'medium';
};

const detailSignals = {
  software: /\b(app|application|software|system|website|portal|platform|tool|service|outlook|slack|jira|salesforce|gmail|chrome|edge|safari|firefox)\b/i,
  version: /\b(v(?:ersion)?\s*\d+(?:\.\d+){0,3})\b/i,
  environment: /\b(windows|mac|macos|ios|android|linux|ubuntu|chrome|firefox|safari|edge|browser|desktop|mobile)\b/i,
  steps: /\b(step|steps|reproduce|when i|after i|then i|click|open|navigate)\b/i,
  error: /\b(error|failed|failure|exception|crash|stack trace|code)\b/i,
  impact: /\b(urgent|critical|blocking|blocker|outage|down|cannot|can't|unable|impact|business)\b/i,
  troubleshooting: /\b(tried|attempted|restart|reinstall|cleared cache|workaround|logged out)\b/i,
  startTime: /\b(since|started|begin|began|today|yesterday|this morning|last week|last month)\b/i,
  frequency: /\b(always|sometimes|intermittent|occasionally|often|every time)\b/i,
  scope: /\b(only me|just me|others|team|everyone|all users|multiple users)\b/i,
  workaround: /\b(workaround|temporary fix|bypass|alternate)\b/i,
};

const getMissingDetails = (text: string) => {
  const missing: string[] = [];
  if (!detailSignals.software.test(text)) missing.push('software');
  if (!detailSignals.environment.test(text)) missing.push('environment');
  if (!detailSignals.steps.test(text)) missing.push('steps');
  if (!detailSignals.error.test(text)) missing.push('error');
  if (!detailSignals.impact.test(text)) missing.push('impact');
  if (!detailSignals.startTime.test(text)) missing.push('startTime');
  if (!detailSignals.frequency.test(text)) missing.push('frequency');
  if (!detailSignals.scope.test(text)) missing.push('scope');
  if (!detailSignals.workaround.test(text)) missing.push('workaround');
  return missing;
};

const buildClarifyingQuestion = (missing: string[]) => {
  const prompts: Record<string, string> = {
    software: 'the software/app name (and version if you know it)',
    environment: 'your device and OS/browser',
    steps: 'the steps to reproduce the issue',
    error: 'any exact error message or what you see on screen',
    impact: 'how urgent this is and the business impact',
    startTime: 'when this started happening',
    frequency: 'how often it happens (always/intermittent)',
    scope: 'whether it affects just you or multiple users',
    workaround: "any workaround you've already tried",
  };

  const selected = missing.slice(0, 3).map((item) => prompts[item]);
  if (selected.length === 0) {
    return 'Could you share any additional context about the issue so I can log this accurately?';
  }

  return `To make sure I log this correctly, could you share ${selected.join('; ')}?`;
};

const buildTicketDescription = (params: {
  userMessage: string;
  ticketSummary: string;
  details: Record<string, string>;
  bestDepartmentName?: string;
  sessionId?: string;
  slaTarget?: string;
  sentiment?: string;
}) => {
  const lines: string[] = [];
  lines.push('This ticket was automatically created from a knowledge base conversation.');
  lines.push('');
  lines.push(`User Question: ${params.userMessage}`);
  lines.push(`Issue Summary: ${params.ticketSummary}`);

  if (params.details.software_name || params.details.software_version) {
    lines.push(`Software: ${[params.details.software_name, params.details.software_version].filter(Boolean).join(' ')}`);
  }
  if (params.details.environment) lines.push(`Environment: ${params.details.environment}`);
  if (params.details.affected_systems) lines.push(`Affected Systems: ${params.details.affected_systems}`);
  if (params.details.actual_behavior) lines.push(`Actual Behavior: ${params.details.actual_behavior}`);
  if (params.details.expected_behavior) lines.push(`Expected Behavior: ${params.details.expected_behavior}`);
  if (params.details.steps_to_reproduce) lines.push(`Steps to Reproduce: ${params.details.steps_to_reproduce}`);
  if (params.details.start_time) lines.push(`Issue Start: ${params.details.start_time}`);
  if (params.details.frequency) lines.push(`Frequency: ${params.details.frequency}`);
  if (params.details.user_scope) lines.push(`User Scope: ${params.details.user_scope}`);
  if (params.details.business_impact) lines.push(`Business Impact: ${params.details.business_impact}`);
  if (params.details.troubleshooting) lines.push(`Troubleshooting Tried: ${params.details.troubleshooting}`);
  if (params.details.additional_info) lines.push(`Additional Info: ${params.details.additional_info}`);
  if (params.slaTarget) lines.push(`SLA Target: ${params.slaTarget}`);
  if (params.sentiment) lines.push(`User Sentiment: ${params.sentiment}`);

  if (params.bestDepartmentName) {
    lines.push(`Routed to: ${params.bestDepartmentName} department based on issue analysis.`);
  }

  if (params.sessionId) {
    lines.push(`Session ID: ${params.sessionId}`);
  }

  return lines.join('\n');
};

const resolveIntentRegex = /\b(resolved|fixed|solved|issue is gone|close ticket|mark as resolved|resolved now)\b/i;
const statusIntentRegex = /\b(status|update|progress|eta|when will this be fixed)\b/i;
const escalationSignalRegex = /\b(security|breach|data leak|compliance|legal|privacy|pii|gdpr|pci|hipaa|outage|down|payment failure)\b/i;

const detectSentiment = (text: string) => {
  const lower = text.toLowerCase();
  const negativeSignals = ['angry', 'frustrated', 'upset', 'unacceptable', 'terrible', 'horrible', 'disappointed', 'mad'];
  const positiveSignals = ['thanks', 'thank you', 'appreciate', 'great', 'awesome', 'helpful'];

  if (negativeSignals.some((signal) => lower.includes(signal))) return 'negative';
  if (positiveSignals.some((signal) => lower.includes(signal))) return 'positive';
  return 'neutral';
};

const detectUrgencyLevel = (text: string) => {
  const lower = text.toLowerCase();
  if (/\b(urgent|critical|sev1|sev-1|p0|blocker|outage|down)\b/.test(lower)) return 'urgent';
  if (/\b(high|sev2|sev-2|p1|impacting)\b/.test(lower)) return 'high';
  if (/\b(low|minor|p3)\b/.test(lower)) return 'low';
  if (/\b(medium|p2)\b/.test(lower)) return 'medium';
  return '';
};

const computeSlaTarget = (priority: string) => {
  const matrix: Record<string, string> = {
    urgent: 'Response within 1 hour, resolution target 4 hours',
    high: 'Response within 4 hours, resolution target 1 business day',
    medium: 'Response within 1 business day, resolution target 3 business days',
    low: 'Response within 2 business days, resolution target 5 business days',
  };
  return matrix[priority] || matrix.medium;
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseKey = serviceRoleKey || supabaseServiceKey || supabaseAnonKey;
    if (!supabaseKey) {
      throw new Error('Supabase key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { message, sessionId, userId, ticketId } = body || {};
    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

    if (!message || !sessionId || !userId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: message, sessionId, userId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing knowledge base query:', { message, sessionId, userId, ticketId });

    const { data: history } = await supabase
      .from('knowledge_chat_messages')
      .select('message, response, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    const historyText = (history || [])
      .map((entry: any) => `${entry?.message || ''} ${entry?.response || ''}`)
      .join(' ');
    const combinedText = `${historyText} ${message}`.trim();
    const inferredSentiment = detectSentiment(combinedText);
    const inferredUrgency = detectUrgencyLevel(combinedText);

    let existingTicket: any = null;
    if (ticketId) {
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();
      existingTicket = ticketData || null;
    } else {
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .ilike('additional_info', `%Session ID: ${sessionId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingTicket = ticketData || null;
    }

    const saveConversation = async (responseText: string) => {
      const { error: saveError } = await supabase
        .from('knowledge_chat_messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          message: message,
          response: responseText,
          message_type: 'user'
        });

      if (saveError) {
        console.error('Error saving conversation:', saveError);
      }
    };

    if (existingTicket && resolveIntentRegex.test(message)) {
      const resolvedAt = new Date().toISOString();
      const { error: resolveError } = await supabase
        .from('tickets')
        .update({ status: 'resolved', resolved_at: resolvedAt })
        .eq('id', existingTicket.id);

      let responseText = '';
      if (resolveError) {
        console.error('Error resolving ticket:', resolveError);
        responseText = "I tried to mark the ticket as resolved, but hit an error. Please try again or contact support.";
      } else {
        await supabase.from('ticket_chat_messages').insert({
          ticket_id: existingTicket.id,
          user_id: userId,
          message: 'User confirmed the issue is resolved.',
          message_type: 'text'
        });
        responseText = `Thanks for confirming! I've marked Ticket #${existingTicket.id} as resolved.`;
      }

      await saveConversation(responseText);
      return new Response(JSON.stringify({
        response: responseText,
        ticketUpdated: !resolveError,
        ticketId: existingTicket.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingTicket && statusIntentRegex.test(message)) {
      const responseText = `Here's the latest status on Ticket #${existingTicket.id}:\n- Status: ${existingTicket.status}\n- Priority: ${existingTicket.priority}\n${existingTicket.assigned_to ? '- Assigned: Yes' : '- Assigned: Pending'}\n- Last updated: ${existingTicket.updated_at || existingTicket.created_at}`;
      await saveConversation(responseText);
      return new Response(JSON.stringify({
        response: responseText,
        ticketId: existingTicket.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ticketContext = existingTicket
      ? `\nExisting Ticket Context:\n- Ticket ID: ${existingTicket.id}\n- Title: ${existingTicket.title}\n- Status: ${existingTicket.status}\n- Priority: ${existingTicket.priority}\n- Description: ${existingTicket.description}`
      : '';

    const systemPrompt = `You are an AI ticket intake assistant for a helpdesk system.
${ticketContext}

Your role is to:
1. Collect the details required to create or update a support ticket.
2. Ask concise follow-up questions to fill missing details.
3. Once enough details are available, respond with exactly: "CREATE_TICKET: [brief issue summary]".
4. If a ticket already exists and the user provides additional details about the same issue, respond with exactly: "UPDATE_TICKET: [brief update summary]".

Strict rules:
- Do NOT provide troubleshooting, recommendations, or solutions.
- Do NOT answer policy or procedure questions directly.
- If a user asks for advice or a fix, explain that you can create a ticket and ask for the missing details instead.
- Keep responses short, professional, and focused on ticket intake.

Key details to gather before creating a ticket:
- Software/app name (and version if known)
- Device + OS/browser/environment
- Exact error message or observed behavior
- Steps to reproduce the issue
- Business impact/urgency
- Troubleshooting already tried
- When it started and how often it occurs
- Whether it affects just the user or multiple users
- Any workaround discovered

When you respond with CREATE_TICKET or UPDATE_TICKET, append a JSON block in tags <TICKET_PAYLOAD>...</TICKET_PAYLOAD> with fields you can infer. Example:
<TICKET_PAYLOAD>{"action":"create","title":"...","summary":"...","category":"...","urgency_level":"...","affected_systems":"...","steps_to_reproduce":"...","expected_behavior":"...","actual_behavior":"...","business_impact":"...","additional_info":"...","software_name":"...","software_version":"...","environment":"...","troubleshooting":"...","start_time":"...","frequency":"...","user_scope":"...","workaround":"...","sentiment":"..."}</TICKET_PAYLOAD>
Do NOT mention the JSON block in your user-facing response.`;

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    (history || []).forEach((entry: any) => {
      if (entry?.message) {
        contents.push({ role: 'user', parts: [{ text: entry.message }] });
      }
      if (entry?.response) {
        contents.push({ role: 'model', parts: [{ text: entry.response }] });
      }
    });
    contents.push({ role: 'user', parts: [{ text: message }] });

    const basePayload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
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

    if (!response.ok) {
      // Handle quota exceeded errors with a user-friendly message
      if (response.status === 429) {
        console.error('Gemini API quota exceeded:', data);
        return new Response(JSON.stringify({
          response: "I'm currently experiencing high demand and have reached my request limit. Please try again in a few moments, or contact your system administrator to upgrade the API quota. In the meantime, you can create a support ticket manually from the dashboard.",
          error: 'QUOTA_EXCEEDED'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

    const { cleaned: cleanedResponse, payload: ticketPayload } = parseTicketPayload(aiResponse);
    aiResponse = cleanedResponse;

    console.log('AI Response:', aiResponse);

    const isCreate = aiResponse.startsWith('CREATE_TICKET:');
    const isUpdate = aiResponse.startsWith('UPDATE_TICKET:');

    const missingDetails = getMissingDetails(combinedText);
    const coreMissing = missingDetails.filter((item) => (
      item === 'software'
      || item === 'environment'
      || item === 'steps'
      || item === 'error'
      || item === 'impact'
    ));
    const isFirstTurn = (history || []).length === 0;
    const shouldDeferTicket = coreMissing.length >= 2;

    let ticketCreated = false;
    let ticketUpdated = false;
    let ticketIdResult: string | null = null;

    if ((isCreate || isUpdate) && (isFirstTurn || shouldDeferTicket) && missingDetails.length > 0) {
      aiResponse = buildClarifyingQuestion(missingDetails);
    } else if (isCreate || isUpdate) {
      const ticketSummary = aiResponse.replace(/^CREATE_TICKET:/, '').replace(/^UPDATE_TICKET:/, '').trim();
      const details = {
        title: normalizeText(ticketPayload?.title) || ticketSummary || 'Support request',
        summary: normalizeText(ticketPayload?.summary) || ticketSummary,
        category: normalizeText(ticketPayload?.category),
        urgency_level: normalizeText(ticketPayload?.urgency_level) || inferredUrgency,
        affected_systems: normalizeText(ticketPayload?.affected_systems),
        steps_to_reproduce: normalizeText(ticketPayload?.steps_to_reproduce),
        expected_behavior: normalizeText(ticketPayload?.expected_behavior),
        actual_behavior: normalizeText(ticketPayload?.actual_behavior),
        business_impact: normalizeText(ticketPayload?.business_impact),
        additional_info: normalizeText(ticketPayload?.additional_info),
        software_name: normalizeText(ticketPayload?.software_name),
        software_version: normalizeText(ticketPayload?.software_version),
        environment: normalizeText(ticketPayload?.environment),
        troubleshooting: normalizeText(ticketPayload?.troubleshooting),
        start_time: normalizeText(ticketPayload?.start_time),
        frequency: normalizeText(ticketPayload?.frequency),
        user_scope: normalizeText(ticketPayload?.user_scope),
        workaround: normalizeText(ticketPayload?.workaround),
        sentiment: normalizeText(ticketPayload?.sentiment) || inferredSentiment,
      };

      const issueTextForRouting = `${message} ${ticketSummary} ${details.category} ${details.affected_systems} ${details.environment}`.trim();

      const bestDepartment = await findBestDepartmentForIssue(supabase, issueTextForRouting);

      let targetDepartmentId = bestDepartment?.id || null;
      let departmentAdmin = null;

      if (targetDepartmentId) {
        const { data: admin } = await supabase
          .from('users')
          .select('id')
          .eq('department_id', targetDepartmentId)
          .eq('role', 'department_admin')
          .eq('is_active', true)
          .maybeSingle();
        departmentAdmin = admin || null;
      } else {
        const { data: userInfo } = await supabase
          .from('users')
          .select('department_id')
          .eq('id', userId)
          .maybeSingle();

        if (userInfo?.department_id) {
          targetDepartmentId = userInfo.department_id;
          const { data: admin } = await supabase
            .from('users')
            .select('id')
            .eq('department_id', userInfo.department_id)
            .eq('role', 'department_admin')
            .eq('is_active', true)
            .maybeSingle();
          departmentAdmin = admin || null;
        }
      }

      const priority = mapUrgencyToPriority(details.urgency_level);
      const slaTarget = computeSlaTarget(priority);
      const shouldEscalate = priority === 'urgent'
        || details.sentiment === 'negative'
        || escalationSignalRegex.test(combinedText);

      let superAdmin: { id: string } | null = null;
      if (shouldEscalate) {
        const { data: admin } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'super_admin')
          .eq('is_active', true)
          .maybeSingle();
        superAdmin = admin || null;
      }

      // For normal AI-created tickets, keep assigned_to null so DB auto-assignment can route to a technician.
      // For escalations, assign to super admin (fallback to department admin) immediately.
      const assignedUserId = shouldEscalate
        ? (superAdmin?.id || departmentAdmin?.id || null)
        : null;

      if (isUpdate) {
        let targetTicket = existingTicket;
        if (!targetTicket && ticketId) {
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .maybeSingle();
          targetTicket = ticketData || null;
        }

        if (!targetTicket) {
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('*')
            .ilike('additional_info', `%Session ID: ${sessionId}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          targetTicket = ticketData || null;
        }

        if (targetTicket) {
          const updatePayload: Record<string, unknown> = {};

          if (details.category) updatePayload.category = details.category;
          if (details.urgency_level) {
            updatePayload.urgency_level = details.urgency_level;
            updatePayload.priority = priority;
          }
          if (details.affected_systems) updatePayload.affected_systems = details.affected_systems;
          if (details.steps_to_reproduce) updatePayload.steps_to_reproduce = details.steps_to_reproduce;
          if (details.expected_behavior) updatePayload.expected_behavior = details.expected_behavior;
          if (details.actual_behavior) updatePayload.actual_behavior = details.actual_behavior;
          if (details.business_impact) updatePayload.business_impact = details.business_impact;

          if (!details.urgency_level && shouldEscalate && priority) {
            updatePayload.priority = priority;
          }

          if (shouldEscalate && assignedUserId) {
            updatePayload.assigned_to = assignedUserId;
          }

          const attachmentNames = attachments
            .map((item: any) => (item?.name || item?.url || item?.path || 'attachment'))
            .filter(Boolean)
            .join(', ');

          const appendedInfo = [
            details.summary ? `Update Summary: ${details.summary}` : '',
            details.environment ? `Environment: ${details.environment}` : '',
            details.software_name || details.software_version ? `Software: ${[details.software_name, details.software_version].filter(Boolean).join(' ')}` : '',
            details.troubleshooting ? `Troubleshooting Tried: ${details.troubleshooting}` : '',
            details.start_time ? `Issue Start: ${details.start_time}` : '',
            details.frequency ? `Frequency: ${details.frequency}` : '',
            details.user_scope ? `User Scope: ${details.user_scope}` : '',
            details.workaround ? `Workaround: ${details.workaround}` : '',
            details.sentiment ? `User Sentiment: ${details.sentiment}` : '',
            slaTarget ? `SLA Target: ${slaTarget}` : '',
            attachmentNames ? `Attachments: ${attachmentNames}` : '',
            details.additional_info ? `Additional Info: ${details.additional_info}` : '',
          ].filter(Boolean).join('\n');

          if (appendedInfo) {
            const existingInfo = targetTicket.additional_info || '';
            const stamp = new Date().toISOString();
            const sessionTag = `Session ID: ${sessionId}`;
            const sessionLine = existingInfo.includes(sessionTag) ? '' : `\n${sessionTag}`;
            updatePayload.additional_info = `${existingInfo ? `${existingInfo}\n\n` : ''}[${stamp}] ${appendedInfo}${sessionLine}`.trim();
          }

          if (attachments.length > 0) {
            const currentAttachments = Array.isArray(targetTicket.attachments) ? targetTicket.attachments : [];
            updatePayload.attachments = [...currentAttachments, ...attachments];
          }

          const { error: updateError } = await supabase
            .from('tickets')
            .update(updatePayload)
            .eq('id', targetTicket.id);

          if (updateError) {
            console.error('Error updating ticket:', updateError);
            aiResponse = 'I gathered the new details but hit an error updating the ticket. Please try again or contact support.';
          } else {
            ticketUpdated = true;
            ticketIdResult = targetTicket.id;

            await supabase
              .from('ticket_chat_messages')
              .insert({
                ticket_id: targetTicket.id,
                user_id: userId,
                message: `Additional details from knowledge assistant:\n${appendedInfo || details.summary}`,
                message_type: 'text'
              });

            const escalationNote = shouldEscalate ? ' I also flagged this for expedited review.' : '';
            const slaNote = slaTarget ? ` Current SLA target: ${slaTarget}.` : '';
            aiResponse = `Thanks! I've added those details to your existing ticket (Ticket #${targetTicket.id}).${escalationNote}${slaNote} Is there anything else you'd like to add?`;
          }
        } else {
          aiResponse = "I couldn't find an existing ticket for this conversation. Would you like me to create a new ticket with the details you've shared?";
        }
      } else {
        // Create a ticket and assign to the best department
        const ticketDescription = buildTicketDescription({
          userMessage: message,
          ticketSummary,
          details,
          bestDepartmentName: bestDepartment?.name,
          sessionId,
          slaTarget,
          sentiment: details.sentiment,
        });

        const attachmentNames = attachments
          .map((item: any) => (item?.name || item?.url || item?.path || 'attachment'))
          .filter(Boolean)
          .join(', ');

        const additionalInfo = [
          details.additional_info,
          details.start_time ? `Issue Start: ${details.start_time}` : '',
          details.frequency ? `Frequency: ${details.frequency}` : '',
          details.user_scope ? `User Scope: ${details.user_scope}` : '',
          details.workaround ? `Workaround: ${details.workaround}` : '',
          details.sentiment ? `User Sentiment: ${details.sentiment}` : '',
          slaTarget ? `SLA Target: ${slaTarget}` : '',
          attachmentNames ? `Attachments: ${attachmentNames}` : '',
          `Session ID: ${sessionId}`,
        ].filter(Boolean).join('\n');

        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            title: `Auto-generated: ${details.title.substring(0, 80)}`,
            description: ticketDescription,
            status: 'open',
            priority,
            created_by: userId,
            department_id: targetDepartmentId,
            assigned_to: assignedUserId,
            category: details.category || null,
            urgency_level: details.urgency_level || null,
            affected_systems: details.affected_systems || null,
            steps_to_reproduce: details.steps_to_reproduce || null,
            expected_behavior: details.expected_behavior || null,
            actual_behavior: details.actual_behavior || null,
            business_impact: details.business_impact || null,
            additional_info: additionalInfo,
            attachments: attachments.length > 0 ? attachments : [],
          })
          .select()
          .single();

        if (ticketError) {
          console.error('Error creating ticket:', ticketError);
          aiResponse = "I understand you need help with this issue. Unfortunately, I couldn't automatically create a support ticket right now. Please contact your system administrator or create a ticket manually.";
        } else {
          ticketCreated = true;
          ticketIdResult = ticket.id;

          let assignmentText = '';
          const hasAssignment = !!ticket.assigned_to;
          if (bestDepartment) {
            assignmentText = ` and has been routed to the ${bestDepartment.name} department`;
            if (hasAssignment) {
              assignmentText += ' for review';
            }
          } else if (hasAssignment) {
            assignmentText = ' and has been assigned for expedited review';
          }

          const escalationNote = shouldEscalate ? '\n- Escalation: Flagged for expedited review' : '';
          const slaNote = slaTarget ? `\n- SLA Target: ${slaTarget}` : '';
          aiResponse = `I've automatically created a support ticket for your issue (Ticket #${ticket.id})${assignmentText}. Our technical team will review it and get back to you soon.\n\nYour ticket details:\n- Title: ${ticket.title}\n- Status: ${ticket.status}\n- Priority: ${ticket.priority}${slaNote}${escalationNote}\n${bestDepartment ? `- Department: ${bestDepartment.name}` : ''}\n\nYou can track the progress of your ticket in the dashboard.`;
        }
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
      ticketUpdated,
      ticketId: ticketIdResult
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
