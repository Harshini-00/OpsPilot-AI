/**
 * Deterministic Risk Detection Engine for OpsPilot AI
 * Accurately calculates project KPIs, overdue tasks, blocked dependencies,
 * and workload imbalances without hallucination.
 */

export function analyzeOperationRisks(operation) {
  if (!operation || !Array.isArray(operation.tasks)) {
    return {
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        toDoTasks: 0,
        pendingTasks: 0,
        overdueCount: 0,
        progressPercent: 0,
      },
      overallRisk: {
        level: 'LOW',
        score: 0,
        summary: 'No tasks in operation'
      },
      risks: [],
      blockedTaskIds: [],
      taskRiskMap: {}
    };
  }

  const tasks = operation.tasks;
  const now = new Date();
  // Strip time for clean date comparisons
  const todayStr = now.toISOString().split('T')[0];
  const today = new Date(todayStr);

  const taskMap = new Map();
  tasks.forEach((t) => taskMap.set(t.id, t));

  let completedTasks = 0;
  let inProgressTasks = 0;
  let toDoTasks = 0;
  const overdueTasks = [];
  const risks = [];
  const blockedTaskIds = new Set();
  const taskRiskMap = {}; // taskId -> array of risk tags

  // Pre-calculate downstream dependents map: parentTaskId -> array of dependent tasks
  const dependentsMap = {};
  tasks.forEach((t) => {
    dependentsMap[t.id] = [];
  });
  tasks.forEach((t) => {
    if (Array.isArray(t.dependencies)) {
      t.dependencies.forEach((depId) => {
        if (dependentsMap[depId]) {
          dependentsMap[depId].push({
            id: t.id,
            title: t.title,
            owner: t.owner,
            dueDate: t.dueDate,
            status: t.status
          });
        }
      });
    }
  });

  // 1. Basic status counts & overdue detection
  tasks.forEach((task) => {
    taskRiskMap[task.id] = [];

    if (task.status === 'Completed') {
      completedTasks++;
      return;
    }

    if (task.status === 'In Progress') {
      inProgressTasks++;
    } else if (task.status === 'Blocked') {
      blockedTaskIds.add(task.id);
    } else {
      toDoTasks++;
    }

    if (task.dueDate) {
      const taskDue = new Date(task.dueDate.split('T')[0]);
      if (taskDue < today) {
        const diffDays = Math.max(1, Math.round((today - taskDue) / (1000 * 60 * 60 * 24)));
        overdueTasks.push({ ...task, daysOverdue: diffDays });
        const isCritical = (task.priority || '').includes('P0');
        const severity = isCritical ? 'CRITICAL' : 'HIGH';
        const affected = dependentsMap[task.id] || [];

        const cascadeNote = affected.length > 0
          ? ` Cascading delay stalls ${affected.length} downstream dependent task(s): ${affected.map((a) => `"${a.title}"`).join(', ')}.`
          : '';

        risks.push({
          id: `risk-overdue-${task.id}`,
          severity,
          type: isCritical ? 'OVERDUE_CRITICAL' : 'OVERDUE',
          taskId: task.id,
          taskTitle: task.title,
          owner: task.owner,
          dueDate: task.dueDate,
          affectedTasks: affected,
          message: `Task is ${diffDays} day(s) overdue (Due: ${task.dueDate}). Priority: ${task.priority}.${cascadeNote}`,
          remedyRecommendation: affected.length > 0
            ? `Extend deadline and decouple or re-sequence ${affected.length} blocked dependent task(s) to restore pipeline velocity.`
            : 'Extend deadline or reassign task to avoid further delay.'
        });

        taskRiskMap[task.id].push(severity === 'CRITICAL' ? 'OVERDUE_CRITICAL' : 'OVERDUE');
      }
    }
  });

  const totalTasks = tasks.length;
  const pendingTasks = inProgressTasks + toDoTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Dependency blocker detection
  tasks.forEach((task) => {
    if (task.status === 'Completed') return;

    if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
      task.dependencies.forEach((depId) => {
        const depTask = taskMap.get(depId);
        if (!depTask) return;

        if (depTask.status !== 'Completed') {
          blockedTaskIds.add(task.id);
          const isDepOverdue = depTask.dueDate && new Date(depTask.dueDate.split('T')[0]) < today;
          const severity = isDepOverdue ? 'CRITICAL' : 'HIGH';

          risks.push({
            id: `risk-blocker-${task.id}-${depId}`,
            severity,
            type: 'BLOCKED_DEPENDENCY',
            taskId: task.id,
            taskTitle: task.title,
            owner: task.owner,
            blockerTaskId: depId,
            blockerTaskTitle: depTask.title,
            blockerOwner: depTask.owner,
            message: `Blocked by unfinished prerequisite "${depTask.title}" (${depTask.status}${isDepOverdue ? ', OVERDUE' : ''}).`,
            remedyRecommendation: `Accelerate completion of "${depTask.title}" or decouple dependency.`
          });

          taskRiskMap[task.id].push('BLOCKED');
        }

        // Timeline conflict: if task is due before or on the same day as its prerequisite
        if (task.dueDate && depTask.dueDate) {
          const taskDueDate = new Date(task.dueDate.split('T')[0]);
          const depDueDate = new Date(depTask.dueDate.split('T')[0]);
          if (taskDueDate <= depDueDate && task.status !== 'Completed' && depTask.status !== 'Completed') {
            risks.push({
              id: `risk-timeline-${task.id}-${depId}`,
              severity: 'HIGH',
              type: 'TIMELINE_CONFLICT',
              taskId: task.id,
              taskTitle: task.title,
              owner: task.owner,
              message: `Due date (${task.dueDate}) is on or before prerequisite due date (${depTask.dueDate}). Infeasible schedule sequence.`,
              remedyRecommendation: 'Re-sequence dates: push downstream deadline past prerequisite delivery.'
            });

            taskRiskMap[task.id].push('TIMELINE_CONFLICT');
          }
        }
      });
    }
  });

  // 3. Workload bottleneck detection
  const ownerLoad = {};
  tasks.forEach((t) => {
    if (t.status !== 'Completed') {
      const owner = t.owner || 'Unassigned';
      ownerLoad[owner] = (ownerLoad[owner] || 0) + 1;
    }
  });

  Object.entries(ownerLoad).forEach(([owner, count]) => {
    if (count >= 3) {
      risks.push({
        id: `risk-workload-${encodeURIComponent(owner)}`,
        severity: count >= 4 ? 'HIGH' : 'MEDIUM',
        type: 'WORKLOAD_BOTTLENECK',
        owner,
        message: `${owner} is assigned to ${count} active tasks concurrently. Risk of burnout or delivery delay.`,
        remedyRecommendation: 'Rebalance workload across other available team members.'
      });
    }
  });

  // 4. Overall Risk Rating Computation
  let riskScore = 0;
  risks.forEach((r) => {
    if (r.severity === 'CRITICAL') riskScore += 30;
    else if (r.severity === 'HIGH') riskScore += 15;
    else if (r.severity === 'MEDIUM') riskScore += 8;
    else riskScore += 3;
  });

  let overallLevel = 'LOW';
  let riskSummary = 'All streams running smoothly with no critical blockers.';

  if (riskScore >= 40 || risks.some((r) => r.severity === 'CRITICAL')) {
    overallLevel = 'CRITICAL';
    riskSummary = `Critical bottlenecks identified! ${overdueTasks.length} overdue task(s) and ${blockedTaskIds.size} blocked downstream workstream(s) requiring immediate intervention.`;
  } else if (riskScore >= 20 || overdueTasks.length > 0 || blockedTaskIds.size > 0) {
    overallLevel = 'HIGH';
    riskSummary = `Elevated operational risk: ${overdueTasks.length} overdue item(s) and ${blockedTaskIds.size} downstream dependencies blocked.`;
  } else if (riskScore > 0) {
    overallLevel = 'MEDIUM';
    riskSummary = 'Moderate warnings detected in workload distribution or upcoming deadlines.';
  }

  return {
    metrics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      toDoTasks,
      pendingTasks,
      blockedCount: blockedTaskIds.size,
      overdueCount: overdueTasks.length,
      progressPercent
    },
    overallRisk: {
      level: overallLevel,
      score: Math.min(100, riskScore),
      summary: riskSummary
    },
    risks,
    blockedTaskIds: Array.from(blockedTaskIds),
    taskRiskMap,
    dependentsMap
  };
}
