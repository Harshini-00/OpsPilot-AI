export const sampleTechFestOperation = {
  id: "op_techfest_2026",
  name: "TechFest 2026: Inter-College AI Hackathon & Tech Expo",
  goal: "Execute a premier 48-hour AI Hackathon for 500+ participants with cloud GPU infrastructure, mentor tracks, keynote presentations, and industry judging.",
  deadline: "2026-10-25",
  teamMembers: [
    "Alex Rivera (Project Lead)",
    "Sarah Chen (DevOps & Infrastructure)",
    "Marcus Brody (Logistics & Venue)",
    "Priya Patel (Sponsor & Finance)",
    "Elena Rostova (Judges & Mentors)"
  ],
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-10T08:00:00.000Z",
  tasks: [
    {
      id: "task-101",
      title: "Venue & High-Density Wi-Fi Infrastructure Setup",
      description: "Secure dual gigabit fiber connections, configure 15 enterprise Wi-Fi APs, and deploy backup power generators for main auditorium.",
      owner: "Marcus Brody (Logistics & Venue)",
      dueDate: "2026-10-08",
      priority: "P0 - Critical",
      status: "In Progress",
      dependencies: []
    },
    {
      id: "task-102",
      title: "High-Performance Cloud GPU Cluster Provisioning",
      description: "Provision A100 GPU compute instances and distribute API tokens to hackathon teams for model fine-tuning.",
      owner: "Sarah Chen (DevOps & Infrastructure)",
      dueDate: "2026-10-12",
      priority: "P0 - Critical",
      status: "To Do",
      dependencies: ["task-101"]
    },
    {
      id: "task-103",
      title: "Automated Judging Platform & Live Leaderboard",
      description: "Deploy scoring web app, rubric calculators, and real-time projector dashboard for 12 industry judges.",
      owner: "Alex Rivera (Project Lead)",
      dueDate: "2026-10-15",
      priority: "P1 - High",
      status: "To Do",
      dependencies: ["task-102"]
    },
    {
      id: "task-104",
      title: "Keynote Speaker Itinerary & AV Production Run",
      description: "Confirm flight schedules, stage AV sound check, and presentation decks for 4 AI keynote speakers.",
      owner: "Elena Rostova (Judges & Mentors)",
      dueDate: "2026-10-16",
      priority: "P2 - Medium",
      status: "In Progress",
      dependencies: []
    },
    {
      id: "task-105",
      title: "Sponsor Swag & Prize Distribution Logistics",
      description: "Assemble $25k prize checks, customized trophies, and sponsor welcome packages for all hacker booths.",
      owner: "Priya Patel (Sponsor & Finance)",
      dueDate: "2026-10-05",
      priority: "P2 - Medium",
      status: "Completed",
      dependencies: []
    },
    {
      id: "task-106",
      title: "Participant Discord & Team Registration Finalization",
      description: "Verify team check-ins, send emergency broadcast channels, and release pre-hackathon setup documentation.",
      owner: "Alex Rivera (Project Lead)",
      dueDate: "2026-10-06",
      priority: "P1 - High",
      status: "Completed",
      dependencies: []
    }
  ],
  activityLog: [
    {
      id: "act-1",
      timestamp: "2026-10-01T09:00:00.000Z",
      type: "OPERATION_CREATED",
      message: "Operation initialized by Alex Rivera (Project Lead)",
      actor: "Alex Rivera"
    },
    {
      id: "act-2",
      timestamp: "2026-10-05T14:30:00.000Z",
      type: "TASK_COMPLETED",
      message: "Task 'Sponsor Swag & Prize Distribution Logistics' marked Completed",
      actor: "Priya Patel"
    },
    {
      id: "act-3",
      timestamp: "2026-10-06T18:10:00.000Z",
      type: "TASK_COMPLETED",
      message: "Task 'Participant Discord & Team Registration Finalization' marked Completed",
      actor: "Alex Rivera"
    },
    {
      id: "act-4",
      timestamp: "2026-10-08T11:00:00.000Z",
      type: "RISK_DETECTED",
      message: "Risk Alert: Task 'Venue & High-Density Wi-Fi' passed due date while still In Progress. Downstream task 'Cloud GPU Provisioning' is blocked.",
      actor: "OpsPilot Risk Engine"
    }
  ]
};
