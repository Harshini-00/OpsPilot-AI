import React, { useState } from 'react';
import { Sparkles, ArrowRight, Wand2, CheckCircle2, Calendar, Users, Rocket } from 'lucide-react';

export default function GoalPromptBar({ onGeneratePlan, isGenerating }) {
  const [goalText, setGoalText] = useState('');

  const samplePrompts = [
    {
      title: '🎓 College Technical Fest (10 Days)',
      prompt: 'Organize our college technical fest in 10 days with auditorium booking, guest speakers, sponsorship, and hackathon tracks.',
      name: 'College Technical Fest 2026',
      days: 10,
      team: 'Alex Rivera (Fest Lead), Marcus Brody (Logistics & Venue), Priya Patel (Sponsorship), Sarah Chen (Tech Lead), Elena Rostova (PR & Media)'
    },
    {
      title: '🚀 48-Hour AI Hackathon',
      prompt: 'Launch a 48-hour inter-college AI hackathon for 500 hackers with cloud GPU instances, live leaderboard, and industry judges.',
      name: 'Tri-City Inter-College AI Hackathon',
      days: 7,
      team: 'Alex Rivera (Event Chair), Sarah Chen (Cloud Infrastructure), Marcus Brody (Auditorium & LAN), Elena Rostova (Judges & Mentors)'
    },
    {
      title: '⚡ Cloud Migration Sprint',
      prompt: 'Migrate on-premise compute cluster to AWS cloud with zero downtime, data validation, and rollback drills.',
      name: 'Cloud Infrastructure Migration Sprint',
      days: 14,
      team: 'Sarah Chen (DevOps Lead), Marcus Brody (SysAdmin), Alex Rivera (Project Lead), Elena Rostova (QA & Security)'
    }
  ];

  const handleSelectSample = (sample) => {
    setGoalText(sample.prompt);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const prompt = goalText.trim() || 'Organize our college technical fest in 10 days';

    // Parse duration from text if present (e.g. "in 10 days", "in 7 days")
    let targetDays = 10;
    const matchDays = prompt.match(/in\s+(\d+)\s+days?/i);
    if (matchDays && matchDays[1]) {
      targetDays = parseInt(matchDays[1], 10);
    } else {
      const matchHours = prompt.match(/in\s+(\d+)\s+hours?/i);
      if (matchHours && matchHours[1]) {
        targetDays = Math.max(2, Math.ceil(parseInt(matchHours[1], 10) / 24));
      }
    }

    const calculatedDeadline = new Date(Date.now() + targetDays * 86400000)
      .toISOString()
      .split('T')[0];

    // Determine intuitive operation name
    let opName = 'College Technical Fest 2026';
    if (/hackathon/i.test(prompt)) {
      opName = 'Tri-City Inter-College AI Hackathon';
    } else if (/cloud|migration/i.test(prompt)) {
      opName = 'Cloud Infrastructure Migration';
    } else if (/fest/i.test(prompt)) {
      opName = 'College Technical Fest 2026';
    } else {
      opName = prompt.length > 40 ? `${prompt.substring(0, 36)}...` : prompt;
    }

    const team = [
      'Alex Rivera (Project Lead)',
      'Marcus Brody (Logistics & Venue)',
      'Sarah Chen (DevOps & Tech)',
      'Priya Patel (Finance & Sponsors)',
      'Elena Rostova (Mentors & PR)'
    ];

    const executePlan = (startSimulation = false) => {
      onGeneratePlan(
        {
          name: opName,
          goal: prompt,
          deadline: calculatedDeadline,
          teamMembers: team,
          useAiPlan: true
        },
        startSimulation
      );
    };

    executePlan(true); // Default to simulation mode when hitting Enter
  };

  const handleStandardPlan = (e) => {
    e.preventDefault();
    const prompt = goalText.trim() || 'Organize our college technical fest in 10 days';
    let targetDays = 10;
    const matchDays = prompt.match(/in\s+(\d+)\s+days?/i);
    if (matchDays && matchDays[1]) targetDays = parseInt(matchDays[1], 10);
    const calculatedDeadline = new Date(Date.now() + targetDays * 86400000).toISOString().split('T')[0];

    let opName = 'College Technical Fest 2026';
    if (/hackathon/i.test(prompt)) opName = 'Tri-City Inter-College AI Hackathon';
    else if (/cloud|migration/i.test(prompt)) opName = 'Cloud Infrastructure Migration';
    else if (/fest/i.test(prompt)) opName = 'College Technical Fest 2026';
    else opName = prompt.length > 40 ? `${prompt.substring(0, 36)}...` : prompt;

    const team = [
      'Alex Rivera (Project Lead)',
      'Marcus Brody (Logistics & Venue)',
      'Sarah Chen (DevOps & Tech)',
      'Priya Patel (Finance & Sponsors)',
      'Elena Rostova (Mentors & PR)'
    ];

    onGeneratePlan(
      {
        name: opName,
        goal: prompt,
        deadline: calculatedDeadline,
        teamMembers: team,
        useAiPlan: true
      },
      false
    );
  };

  return (
    <div className="glass-panel goal-prompt-section" id="goal-prompt-bar">
      <div className="goal-prompt-header">
        <div className="goal-prompt-title-wrap">
          <div className="goal-prompt-badge">
            <Sparkles size={14} />
            <span>AI Operations Agent Dispatcher</span>
          </div>
          <h3>What project or operational goal do you want OpsPilot AI to organize?</h3>
          <p>
            Describe any real-world goal. OpsPilot AI will automatically decompose it into sequential milestones,
            assign deadlines, balance team workload, and construct the critical path.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="goal-prompt-form" id="form-goal-prompt">
        <div className="goal-input-wrapper">
          <Wand2 size={20} className="goal-input-icon" />
          <input
            id="input-ai-goal-prompt"
            type="text"
            className="goal-input"
            placeholder='e.g. "Organize our college technical fest in 10 days with venue booking, sponsorships, and hackathon tracks"'
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            disabled={isGenerating}
          />
          <div className="goal-action-buttons">
            <button
              id="btn-submit-ai-simulation"
              type="submit"
              className="btn btn-primary goal-submit-btn"
              disabled={isGenerating}
              title="Decompose goal and immediately engage Autonomous Agent Simulation Mode"
            >
              {isGenerating ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }}></div>
                  <span>Synthesizing Plan...</span>
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  <span>🚀 Synthesize & Launch Simulation</span>
                </>
              )}
            </button>

            <button
              id="btn-submit-ai-goal-standard"
              type="button"
              className="btn btn-secondary goal-submit-btn-secondary"
              onClick={handleStandardPlan}
              disabled={isGenerating}
              title="Generate standard operational roadmap"
            >
              <Sparkles size={15} />
              <span>Standard Plan</span>
            </button>
          </div>
        </div>

        {/* 1-Click Example Presets */}
        <div className="goal-presets-row">
          <span className="goal-presets-label">1-Click Demonstration Goals:</span>
          <div className="goal-presets-chips">
            {samplePrompts.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                className="goal-preset-chip"
                onClick={() => handleSelectSample(sample)}
                disabled={isGenerating}
                title={sample.prompt}
              >
                <span>{sample.title}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
