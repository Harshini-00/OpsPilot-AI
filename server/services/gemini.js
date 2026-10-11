import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates an initial project operational plan from name, goal, deadline, and team
 */
export async function generateOperationPlan({ name, goal, deadline, teamMembers }) {
  const client = getGeminiClient();
  const membersList = (teamMembers && teamMembers.length > 0)
    ? teamMembers.join(', ')
    : 'Project Lead, Tech Lead, Operations Specialist, QA Engineer';

  const targetDeadline = deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const prompt = `You are OpsPilot AI, an expert Operations Architect for high-velocity engineering and event teams.
Create a detailed operational execution plan for the following initiative:

Operation Name: "${name}"
Objective/Goal: "${goal}"
Final Deadline: ${targetDeadline}
Available Team Members: ${membersList}

Break this operation down into 5 to 7 realistic, sequential tasks.
Requirements:
1. Each task must have a clear title and actionable description.
2. Distribute tasks logically among the available team members (${membersList}).
3. Assign realistic due dates formatted as YYYY-MM-DD on or before ${targetDeadline}.
4. Assign priorities: "P0 - Critical", "P1 - High", "P2 - Medium", or "P3 - Low".
5. Set initial status to "To Do" or "In Progress" for the immediate first step.
6. Build realistic dependencies: task #2 can depend on task #1, task #3 on task #2, etc., using temporary dependency indexes (e.g. "step-1", "step-2").

Return ONLY valid JSON matching this exact structure:
{
  "summary": "Brief executive summary of the operational plan",
  "tasks": [
    {
      "tempId": "step-1",
      "title": "Task title",
      "description": "Clear explanation of what needs to be delivered",
      "owner": "Exact name from team members",
      "dueDate": "YYYY-MM-DD",
      "priority": "P0 - Critical",
      "status": "To Do",
      "dependencies": []
    },
    {
      "tempId": "step-2",
      "title": "Next task title",
      "description": "...",
      "owner": "Exact name from team members",
      "dueDate": "YYYY-MM-DD",
      "priority": "P1 - High",
      "status": "To Do",
      "dependencies": ["step-1"]
    }
  ]
}`;

  if (client) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const responseText = response.text ? response.text.trim() : '';
        const parsed = JSON.parse(responseText);
        if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          return {
            source: `Gemini AI (${modelName})`,
            summary: parsed.summary || `AI operational roadmap synthesized for ${name}`,
            tasks: formatGeneratedTasks(parsed.tasks, targetDeadline, teamMembers)
          };
        }
      } catch (err) {
        console.warn(`Gemini API call with ${modelName} failed:`, err.message);
      }
    }
  }

  // Fallback / Offline demo generator if no API key or network error
  return {
    source: client ? 'OpsPilot Heuristic Planner (API quota fallback)' : 'OpsPilot Heuristic Planner (Demo Mode)',
    summary: `Structured operational roadmap synthesized for "${name}".`,
    tasks: generateHeuristicPlan(name, goal, targetDeadline, teamMembers)
  };
}

/**
 * AI Recovery Planner: Inspects deterministic risks & blocked tasks,
 * recommending concrete human-in-the-loop corrective actions.
 */
export async function generateRecoveryPlan({ operation, risks, blockedTaskIds }) {
  const client = getGeminiClient();
  const tasks = operation.tasks || [];

  const prompt = `You are OpsPilot AI Recovery Specialist.
Analyze the following operational risks and blocked dependencies, then recommend 2 to 4 concrete corrective recovery actions.

Operation: "${operation.name}"
Deadline: ${operation.deadline}
Team: ${operation.teamMembers?.join(', ') || 'Team'}

Current Tasks:
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, owner: t.owner, dueDate: t.dueDate, priority: t.priority, status: t.status, dependencies: t.dependencies })), null, 2)}

Identified Risks & Blockers:
${JSON.stringify(risks, null, 2)}

Recommend specific, high-impact corrective recovery actions to unblock the critical path.
Allowed Action Types:
- "EXTEND_DEADLINE": Push out an unrealistic deadline to give breathing room.
- "REASSIGN_OWNER": Shift an overburdened task to an available teammate.
- "DECOUPLE_DEPENDENCY": Allow downstream work to proceed concurrently by removing or softening the blocker.
- "PRIORITIZE_ACCELERATION": Elevate priority to P0 and rally team focus.

Return ONLY valid JSON matching this exact structure:
{
  "diagnosis": "Executive diagnosis of what caused the operational bottleneck",
  "actions": [
    {
      "id": "rec-1",
      "actionType": "EXTEND_DEADLINE",
      "targetTaskId": "target task ID from the list",
      "targetTaskTitle": "target task title",
      "proposedChanges": {
        "newDueDate": "YYYY-MM-DD",
        "newOwner": "optional new owner",
        "newPriority": "optional new priority",
        "removeDependencyId": "optional blocker ID to remove"
      },
      "reason": "Detailed explanation of why this action resolves the issue",
      "impact": "Expected operational relief and unblocking effect"
    }
  ]
}`;

  if (client) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const responseText = response.text ? response.text.trim() : '';
        const parsed = JSON.parse(responseText);
        if (parsed && Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          return {
            source: `Gemini AI (${modelName})`,
            diagnosis: parsed.diagnosis || 'Operational bottlenecks detected in current milestone schedule.',
            actions: validateRecoveryActions(parsed.actions, tasks)
          };
        }
      } catch (err) {
        console.warn(`Gemini Recovery call with ${modelName} failed:`, err.message);
      }
    }
  }

  // Heuristic Recovery Plan based on active detected risks
  return {
    source: client ? 'OpsPilot Recovery Engine (Fallback)' : 'OpsPilot Recovery Engine (Demo Mode)',
    diagnosis: `Identified critical timeline slippage and ${blockedTaskIds?.length || 0} downstream blocked tasks on the critical path.`,
    actions: generateHeuristicRecovery(tasks, risks, operation)
  };
}

/**
 * Normalizes and assigns true IDs to AI-generated tasks
 */
function formatGeneratedTasks(rawTasks, finalDeadline, teamMembers) {
  const members = (teamMembers && teamMembers.length > 0)
    ? teamMembers
    : ['Project Lead', 'DevOps Lead', 'Operations Lead', 'QA Lead'];

  const idMap = new Map();
  const createdTasks = [];

  rawTasks.forEach((raw, idx) => {
    const realId = `task-${Date.now()}-${idx + 1}`;
    if (raw.tempId) {
      idMap.set(raw.tempId, realId);
    }

    const assignedOwner = members.find((m) => m === raw.owner) || members[idx % members.length];

    createdTasks.push({
      id: realId,
      tempId: raw.tempId,
      title: raw.title || `Milestone ${idx + 1}`,
      description: raw.description || '',
      owner: assignedOwner,
      dueDate: raw.dueDate || finalDeadline,
      priority: raw.priority || (idx === 0 ? 'P0 - Critical' : 'P1 - High'),
      status: raw.status || 'To Do',
      rawDependencies: Array.isArray(raw.dependencies) ? raw.dependencies : []
    });
  });

  // Map temporary dependency references to real IDs
  return createdTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    owner: t.owner,
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    dependencies: t.rawDependencies
      .map((dep) => idMap.get(dep))
      .filter(Boolean)
  }));
}

/**
 * Validates recovery actions against active tasks
 */
function validateRecoveryActions(actions, tasks) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return actions
    .map((action, idx) => {
      const target = taskMap.get(action.targetTaskId);
      return {
        id: action.id || `rec-${Date.now()}-${idx + 1}`,
        actionType: action.actionType || 'EXTEND_DEADLINE',
        targetTaskId: action.targetTaskId,
        targetTaskTitle: target ? target.title : (action.targetTaskTitle || 'Affected Task'),
        proposedChanges: action.proposedChanges || {},
        reason: action.reason || 'Resolves timeline conflict and unblocks downstream tasks.',
        impact: action.impact || 'Restores schedule viability.'
      };
    })
    .filter((a) => a.targetTaskId && taskMap.has(a.targetTaskId));
}

/**
 * Fallback heuristic planner when Gemini API key is not yet set
 */
function generateHeuristicPlan(name, goal, finalDeadline, teamMembers) {
  const members = (teamMembers && teamMembers.length > 0)
    ? teamMembers
    : ['Alex Rivera (Lead)', 'Sarah Chen (DevOps)', 'Marcus Brody (Logistics)', 'Elena Rostova (QA)'];

  const now = new Date();
  const targetDate = new Date(finalDeadline);
  const totalDays = Math.max(3, Math.round((targetDate - now) / (1000 * 60 * 60 * 24)));

  const offsetDate = (dayOffset) => {
    const d = new Date(now.getTime() + dayOffset * 86400000);
    return d.toISOString().split('T')[0];
  };

  const id1 = `task-${Date.now()}-1`;
  const id2 = `task-${Date.now()}-2`;
  const id3 = `task-${Date.now()}-3`;
  const id4 = `task-${Date.now()}-4`;
  const id5 = `task-${Date.now()}-5`;
  const id6 = `task-${Date.now()}-6`;

  const isFestOrEvent = /fest|hackathon|college|event|expo|symposium|conference/i.test(`${name} ${goal}`);

  if (isFestOrEvent) {
    return [
      {
        id: id1,
        title: 'Core Committee Formation & Budget Sanctioning',
        description: 'Establish organizing team verticals (Tech, Logistics, Sponsors, PR) and allocate financial funds.',
        owner: members[0],
        dueDate: offsetDate(Math.min(2, Math.floor(totalDays * 0.15))),
        priority: 'P0 - Critical',
        status: 'In Progress',
        dependencies: []
      },
      {
        id: id2,
        title: 'Auditorium Booking & Campus Network / Wi-Fi Verification',
        description: 'Reserve college main hall, inspect sound/projectors, and verify gigabit LAN/Wi-Fi bandwidth with IT cell.',
        owner: members[1 % members.length],
        dueDate: offsetDate(Math.min(4, Math.floor(totalDays * 0.35))),
        priority: 'P0 - Critical',
        status: 'To Do',
        dependencies: [id1]
      },
      {
        id: id3,
        title: 'Sponsorship Outreach & Industry Judge Confirmation',
        description: 'Send sponsorship packages, confirm AI/tech judges, and finalize jury evaluation rubrics.',
        owner: members[2 % members.length],
        dueDate: offsetDate(Math.min(6, Math.floor(totalDays * 0.55))),
        priority: 'P1 - High',
        status: 'To Do',
        dependencies: [id1]
      },
      {
        id: id4,
        title: 'Fest Registration Portal & Campus PR Blitz',
        description: 'Deploy online participant registration website, post posters across departments, and coordinate social media.',
        owner: members[3 % members.length],
        dueDate: offsetDate(Math.min(7, Math.floor(totalDays * 0.70))),
        priority: 'P1 - High',
        status: 'To Do',
        dependencies: [id2]
      },
      {
        id: id5,
        title: 'Technical Problem Statements & Hacker Kits Preparation',
        description: 'Curate challenge problem statements, configure cloud compute credits, and assemble hacker badges/swag.',
        owner: members[1 % members.length],
        dueDate: offsetDate(Math.min(9, Math.floor(totalDays * 0.85))),
        priority: 'P1 - High',
        status: 'To Do',
        dependencies: [id3]
      },
      {
        id: id6,
        title: 'Full Logistics Dry Run & Grand Inauguration Readiness',
        description: 'Complete final sound check, volunteer briefing, stage flow coordination, and welcome VIP guests.',
        owner: members[0],
        dueDate: finalDeadline,
        priority: 'P0 - Critical',
        status: 'To Do',
        dependencies: [id4, id5]
      }
    ];
  }

  return [
    {
      id: id1,
      title: `Architecture & Requirements Alignment: ${name}`,
      description: `Formulate core technical specifications and milestones for "${goal}".`,
      owner: members[0],
      dueDate: offsetDate(Math.min(2, Math.floor(totalDays * 0.2))),
      priority: 'P0 - Critical',
      status: 'In Progress',
      dependencies: []
    },
    {
      id: id2,
      title: 'Infrastructure & Operational Tooling Provisioning',
      description: 'Configure runtime environments, cloud permissions, logging, and monitoring.',
      owner: members[1 % members.length],
      dueDate: offsetDate(Math.min(4, Math.floor(totalDays * 0.4))),
      priority: 'P0 - Critical',
      status: 'To Do',
      dependencies: [id1]
    },
    {
      id: id3,
      title: 'Core Workflow Implementation & Integration',
      description: 'Implement essential functional modules and automated pipelines.',
      owner: members[2 % members.length],
      dueDate: offsetDate(Math.min(7, Math.floor(totalDays * 0.7))),
      priority: 'P1 - High',
      status: 'To Do',
      dependencies: [id2]
    },
    {
      id: id4,
      title: 'Quality Assurance, Load Simulation & Vulnerability Check',
      description: 'Execute stress testing, failure mode recovery tests, and security audits.',
      owner: members[3 % members.length],
      dueDate: offsetDate(Math.min(9, Math.floor(totalDays * 0.85))),
      priority: 'P2 - Medium',
      status: 'To Do',
      dependencies: [id3]
    },
    {
      id: id5,
      title: 'Deployment Readiness Review & Final Sign-off',
      description: 'Conduct go/no-go stakeholder briefing and release runbook.',
      owner: members[0],
      dueDate: finalDeadline,
      priority: 'P1 - High',
      status: 'To Do',
      dependencies: [id4]
    }
  ];
}

/**
 * Heuristic recovery generator
 */
function generateHeuristicRecovery(tasks, risks, operation) {
  const actions = [];
  const members = operation.teamMembers || [];

  // Overdue task remedy
  const overdueRisks = risks.filter((r) => r.type.includes('OVERDUE'));
  overdueRisks.forEach((risk, i) => {
    const task = tasks.find((t) => t.id === risk.taskId);
    if (!task) return;

    // Suggest deadline extension by 3 days
    const nextDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    actions.push({
      id: `rec-ext-${task.id}`,
      actionType: 'EXTEND_DEADLINE',
      targetTaskId: task.id,
      targetTaskTitle: task.title,
      proposedChanges: {
        newDueDate: nextDate
      },
      reason: `Task is currently overdue and stalling the downstream critical path. Extending target to ${nextDate} allows achievable completion.`,
      impact: `Removes active overdue breach and gives ${task.owner} breathing room to complete delivery without cut-corners.`
    });

    // If owner has too many tasks, suggest reassigning
    if (members.length > 1) {
      const altOwner = members.find((m) => m !== task.owner) || members[0];
      actions.push({
        id: `rec-reassign-${task.id}`,
        actionType: 'REASSIGN_OWNER',
        targetTaskId: task.id,
        targetTaskTitle: task.title,
        proposedChanges: {
          newOwner: altOwner
        },
        reason: `Reassign ${task.title} to ${altOwner} to double throughput and expedite bottleneck clearance.`,
        impact: `Reduces single-point-of-failure risk and unblocks downstream tasks.`
      });
    }
  });

  // Blocked dependency remedy
  const blockerRisks = risks.filter((r) => r.type === 'BLOCKED_DEPENDENCY');
  if (blockerRisks.length > 0 && actions.length < 3) {
    const bRisk = blockerRisks[0];
    actions.push({
      id: `rec-decouple-${bRisk.taskId}`,
      actionType: 'DECOUPLE_DEPENDENCY',
      targetTaskId: bRisk.taskId,
      targetTaskTitle: bRisk.taskTitle,
      proposedChanges: {
        removeDependencyId: bRisk.blockerTaskId,
        newPriority: 'P0 - Critical'
      },
      reason: `Decouple dependency on "${bRisk.blockerTaskTitle}". Work can begin with mock APIs or parallel staging.`,
      impact: `Unblocks "${bRisk.taskTitle}" immediately, saving an estimated 48 hours of idle time.`
    });
  }

  return actions;
}

/**
 * Autonomous Agent Simulator:
 * Executes progressive operational phases simulating agent actions,
 * delay detection, resource reallocation, and human-in-the-loop approval.
 */
export async function simulateAgentStep({ operation, currentPhase = 0 }) {
  const tasks = operation.tasks ? JSON.parse(JSON.stringify(operation.tasks)) : [];
  const members = (operation.teamMembers && operation.teamMembers.length > 0)
    ? operation.teamMembers
    : ['Alex Rivera (Project Lead)', 'Sarah Chen (DevOps)', 'Marcus Brody (Logistics)', 'Priya Patel (Finance)'];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const addDays = (baseDateStr, days) => {
    try {
      const d = new Date(baseDateStr || todayStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return todayStr;
    }
  };

  const nextPhase = (currentPhase + 1) % 5;
  let perception = '';
  let reasoning = '';
  let actionSummary = '';
  let requiresHumanApproval = false;
  let pendingApprovalAction = null;
  const updatedTasks = [...tasks];
  const newActivityEvents = [];

  const rootTasks = updatedTasks.filter((t) => !t.dependencies || t.dependencies.length === 0);
  const dependentTasks = updatedTasks.filter((t) => t.dependencies && t.dependencies.length > 0);

  if (currentPhase === 0) {
    // Stage 1: Day 1 - Kickoff & Initial Autonomous Task Dispatch
    rootTasks.forEach((t) => {
      if (t.status !== 'Completed') {
        t.status = 'In Progress';
      }
    });

    dependentTasks.forEach((t) => {
      if (t.status !== 'Completed') {
        t.status = 'Blocked';
      }
    });

    perception = `Scanned operational plan "${operation.name}". Found ${rootTasks.length} unblocked initial milestone(s) and ${dependentTasks.length} prerequisite-gated stream(s).`;
    reasoning = `To maximize team throughput, unblocked tasks were dispatched immediately to their assigned owners (${rootTasks.map((t) => t.owner).join(', ')}). Downstream milestones were explicitly marked "Blocked" to prevent premature execution and wasted effort.`;
    actionSummary = `Dispatched ${rootTasks.length} kickoff tasks to In Progress. Sequenced ${dependentTasks.length} gated tasks into Blocked status.`;

    newActivityEvents.push({
      id: `act_${Date.now()}_sim1`,
      timestamp: new Date().toISOString(),
      type: 'AI_DISPATCH',
      message: `[SIMULATED AGENT ACTION] Dispatched kickoff milestones to ${rootTasks.map((t) => t.owner).join(', ')}. Gated tasks marked Blocked.`,
      actor: 'OpsPilot Autonomous Agent',
      isSimulated: true,
      agentRationale: reasoning
    });
  } else if (currentPhase === 1) {
    // Stage 2: Day 3 - Milestone Completion & Downstream Dependency Unblocking
    const completedTask = rootTasks[0] || updatedTasks[0];
    if (completedTask) {
      completedTask.status = 'Completed';
    }

    const unblockedTasks = dependentTasks.filter((t) =>
      t.dependencies && t.dependencies.includes(completedTask?.id)
    );

    unblockedTasks.forEach((t) => {
      t.status = 'In Progress';
    });

    perception = `Prerequisite milestone "${completedTask?.title || 'Initial Milestone'}" has delivered quality sign-off. Evaluating downstream dependencies.`;
    reasoning = `With prerequisite "${completedTask?.title}" verified complete, the agent unblocked ${unblockedTasks.length} dependent task(s) (${unblockedTasks.map((t) => `"${t.title}"`).join(', ')}), shifting them from "Blocked" to "In Progress".`;
    actionSummary = `Marked "${completedTask?.title}" Completed. Unblocked downstream milestone for ${unblockedTasks.map((t) => t.owner).join(', ')}.`;

    newActivityEvents.push({
      id: `act_${Date.now()}_sim2`,
      timestamp: new Date().toISOString(),
      type: 'TASK_COMPLETED',
      message: `[SIMULATED AGENT ACTION] Completed "${completedTask?.title}". Unblocked ${unblockedTasks.length} downstream workstream(s).`,
      actor: 'OpsPilot Autonomous Agent',
      isSimulated: true,
      agentRationale: reasoning
    });
  } else if (currentPhase === 2) {
    // Stage 3: Day 5 - Unexpected Operational Delay Injection & Bottleneck Flag
    const targetTask = updatedTasks.find((t) => t.status === 'In Progress') || updatedTasks[0];
    if (targetTask) {
      targetTask.dueDate = addDays(todayStr, -2);
      targetTask.priority = 'P0 - Critical';
    }

    const stalledTasks = updatedTasks.filter((t) =>
      t.dependencies && t.dependencies.includes(targetTask?.id)
    );
    stalledTasks.forEach((t) => {
      if (t.status !== 'Completed') t.status = 'Blocked';
    });

    perception = `CRITICAL ALERT: Detected unforeseen vendor delivery disruption on "${targetTask?.title}". Schedule breached by 48 hours. ${stalledTasks.length} downstream stream(s) critically stalled.`;
    reasoning = `Deterministic risk audit calculates a cascading critical-path delay. Target task is overdue; downstream engineering cannot proceed. Risk score has spiked to CRITICAL. Formulating emergency recovery plan.`;
    actionSummary = `Injected realistic vendor delay on "${targetTask?.title}". Triggered Risk Radar Critical Alert (Cascading Blocker on ${stalledTasks.map((t) => `"${t.title}"`).join(', ')}).`;

    newActivityEvents.push({
      id: `act_${Date.now()}_sim3`,
      timestamp: new Date().toISOString(),
      type: 'RISK_DETECTED',
      message: `[SIMULATED AGENT ACTION] Bottleneck Detected! Task "${targetTask?.title}" is overdue, creating cascading block on ${stalledTasks.length} dependent task(s).`,
      actor: 'OpsPilot Autonomous Agent',
      isSimulated: true,
      agentRationale: reasoning
    });
  } else if (currentPhase === 3) {
    // Stage 4: Day 7 - Consequential Recovery Proposal [REQUIRES HUMAN APPROVAL]
    const targetTask = updatedTasks.find((t) => t.dueDate && new Date(t.dueDate.split('T')[0]) < new Date(todayStr)) || updatedTasks[0];
    const stalledTask = updatedTasks.find((t) => t.dependencies && t.dependencies.includes(targetTask?.id)) || updatedTasks[1];
    const alternateOwner = members.find((m) => m !== targetTask?.owner) || members[1] || 'Sarah Chen (DevOps)';
    const newDueDate = addDays(todayStr, 3);

    requiresHumanApproval = true;
    pendingApprovalAction = {
      id: `sim_action_${Date.now()}`,
      actionType: 'RESOURCE_REALLOCATION_AND_DECOUPLING',
      title: `Reallocate Teammate & Decouple Blocker on "${targetTask?.title}"`,
      targetTaskId: targetTask?.id,
      targetTaskTitle: targetTask?.title,
      proposedChanges: {
        newOwner: alternateOwner,
        newDueDate: newDueDate,
        decoupleTaskId: stalledTask?.id,
        removeDependencyId: targetTask?.id
      },
      agentRationale: `Reallocating ${alternateOwner} to co-own "${targetTask?.title}" cuts delivery time by 50% to clear the vendor bottleneck. Concurrently decoupling prerequisite dependency on "${stalledTask?.title}" allows the team to proceed in parallel with mock infrastructure.`,
      expectedImpact: `Recovers 3 lost days, unblocks ${stalledTask?.owner || 'team'}, and reduces risk from CRITICAL (75) to LOW (15).`,
      isConsequential: true
    };

    perception = `Critical path bottleneck isolated on "${targetTask?.title}". Formulated multi-vector corrective recovery: Resource Reallocation, Schedule Rebalancing, and Dependency Decoupling.`;
    reasoning = `Consequential changes (reassigning human team members and decoupling dependencies) require strict human-in-the-loop authorization before execution. Agent has paused simulation to await Ops Lead approval.`;
    actionSummary = `Agent formulated consequential recovery action. Simulation paused awaiting Human Approval.`;

    newActivityEvents.push({
      id: `act_${Date.now()}_sim4`,
      timestamp: new Date().toISOString(),
      type: 'HUMAN_APPROVAL_PENDING',
      message: `[SIMULATED AGENT ACTION] Consequential Recovery Plan formulated for "${targetTask?.title}". Awaiting Human Sign-off before reallocating ${alternateOwner}.`,
      actor: 'OpsPilot Autonomous Agent',
      isSimulated: true,
      agentRationale: reasoning
    });
  } else if (currentPhase === 4) {
    // Stage 5: Day 10 - Final Milestone Delivery & Full Resolution
    updatedTasks.forEach((t) => {
      t.status = 'Completed';
    });

    perception = `All ${updatedTasks.length} operational workstreams delivered and verified. Zero active blockers or schedule breaches.`;
    reasoning = `Human-approved recovery plan resolved earlier bottlenecks. All subsequent milestones executed smoothly. Operational progress has reached 100%.`;
    actionSummary = `Operation delivered successfully! 100% milestones complete, Risk Level: LOW (0/100).`;

    newActivityEvents.push({
      id: `act_${Date.now()}_sim5`,
      timestamp: new Date().toISOString(),
      type: 'OPERATION_COMPLETED',
      message: `[SIMULATED AGENT ACTION] Grand Initiative Delivered! All ${updatedTasks.length} milestones successfully finalized.`,
      actor: 'OpsPilot Autonomous Agent',
      isSimulated: true,
      agentRationale: reasoning
    });
  }

  return {
    phase: currentPhase,
    nextPhase,
    phaseName: getPhaseName(currentPhase),
    simulatedDay: getSimulatedDay(currentPhase),
    perception,
    reasoning,
    actionSummary,
    requiresHumanApproval,
    pendingApprovalAction,
    updatedTasks,
    newActivityEvents
  };
}

function getPhaseName(phase) {
  switch (phase) {
    case 0: return 'Day 1: Autonomous Kickoff & Initial Milestone Dispatch';
    case 1: return 'Day 3: Velocity Check & Downstream Dependency Unblocking';
    case 2: return 'Day 5: Unforeseen Operational Delay & Cascading Risk Detection';
    case 3: return 'Day 7: Consequential Recovery Intervention (Awaiting Human Approval)';
    case 4: return 'Day 10: Final Delivery & Operational Resolution';
    default: return `Phase ${phase + 1}`;
  }
}

function getSimulatedDay(phase) {
  switch (phase) {
    case 0: return 1;
    case 1: return 3;
    case 2: return 5;
    case 3: return 7;
    case 4: return 10;
    default: return (phase + 1) * 2;
  }
}

