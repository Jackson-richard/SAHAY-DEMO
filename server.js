const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'sahay-ai-app')));

// --- IN-MEMORY DATABASE (Persists as long as server runs) ---

let mockCase = {
  id: 'VCT-2024-00847',
  stages: [
    { id: 'registration', label: 'Registration', status: 'completed', date: '2024-03-15' },
    { id: 'investigation', label: 'Investigation', status: 'active', date: '2024-03-22' },
    { id: 'trial', label: 'Trial', status: 'pending', date: null },
    { id: 'compensation', label: 'Compensation', status: 'pending', date: null },
    { id: 'rehabilitation', label: 'Rehabilitation', status: 'pending', date: null },
  ],
  alerts: [
    { id: 'a1', type: 'elevated_distress', message: 'Safety concern detected in latest check-in', date: '2026-08-27', reviewed: false },
  ],
};

let mockCheckins = [
  { week: 'W1', score: 32, date: '2026-08-04', signals: ['mild_anxiety'], status: 'stable' },
  { week: 'W2', score: 39, date: '2026-08-11', signals: ['mild_anxiety', 'sleep_light'], status: 'stable' },
  { week: 'W3', score: 51, date: '2026-08-18', signals: ['fear', 'sleep_difficulty'], status: 'increasing' },
  { week: 'W4', score: 67, date: '2026-08-27', signals: ['fear', 'sleep_difficulty', 'safety_concern'], status: 'elevated' },
];

let mockDashboardCases = [
  {
    id: 'VCT-2024-00847',
    name: 'Priya S.',
    status: 'elevated',
    lastCheckin: '2026-08-27',
    trend: [32, 39, 51, 67],
    alertCount: 1,
    reviewNeeded: true,
    signals: ['Fear-related signal', 'Sleep difficulty', 'Safety concern'],
    officer: 'Smt. A. Krishnan'
  },
  {
    id: 'VCT-2024-00712',
    name: 'Meena R.',
    status: 'increasing',
    lastCheckin: '2026-08-29',
    trend: [28, 31, 42, 48],
    alertCount: 0,
    reviewNeeded: false,
    signals: ['Anxiety increasing', 'Social withdrawal noted'],
    officer: 'Smt. A. Krishnan'
  },
  {
    id: 'VCT-2024-00634',
    name: 'Sunita K.',
    status: 'stable',
    lastCheckin: '2026-08-30',
    trend: [40, 38, 35, 33],
    alertCount: 0,
    reviewNeeded: false,
    signals: ['All signals stable', 'Improving trend'],
    officer: 'Smt. A. Krishnan'
  },
  {
    id: 'VCT-2024-00591',
    name: 'Lakshmi P.',
    status: 'increasing',
    lastCheckin: '2026-08-28',
    trend: [22, 29, 38, 45],
    alertCount: 0,
    reviewNeeded: true,
    signals: ['Fear signal emerging', 'Sleep quality declining'],
    officer: 'Smt. A. Krishnan'
  },
];

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// GET Case Details
app.get('/api/case/:id', (req, res) => {
  res.json(mockCase);
});

// GET Case Checkins
app.get('/api/checkins/:id', (req, res) => {
  res.json(mockCheckins);
});

// GET Dashboard Cases
app.get('/api/dashboard', (req, res) => {
  res.json(mockDashboardCases);
});


function getStatusFromScore(score) {
    if (score < 40) return 'stable';
    if (score < 60) return 'increasing';
    return 'elevated';
}

function processAnalysis(chatLog) {
  // Demo processing of user messages
  let sleep_difficulty = false;
  let safety_concern = false;
  let fear = false;
  let scoreIncrease = 0;
  
  const userMessages = chatLog.filter(m => m.role === 'user').map(m => m.text.toLowerCase());
  
  userMessages.forEach(msg => {
      if (msg.includes('poorly') || msg.includes('varies') || msg.includes('sleep')) {
          sleep_difficulty = true;
          scoreIncrease += 8;
      }
      if (msg.includes('unsafe') || msg.includes('happened') || msg.includes('threaten')) {
          safety_concern = true;
          scoreIncrease += 20;
      }
      if (msg.includes('worried') || msg.includes('anx') || msg.includes('fear')) {
          fear = true;
          scoreIncrease += 10;
      }
  });

  // Calculate new score based on last checkin
  const lastCheckinScore = mockCheckins[mockCheckins.length - 1]?.score || 30;
  const newScore = Math.min(100, Math.max(0, lastCheckinScore - 5 + scoreIncrease));
  
  let signals = [];
  if (fear) signals.push('fear');
  if (sleep_difficulty) signals.push('sleep_difficulty');
  if (safety_concern) signals.push('safety_concern');

  const status = getStatusFromScore(newScore);
  
  return {
      newScore, status, signals, sleep_difficulty, safety_concern, fear
  };
}

// POST new check-in analysis
app.post('/api/analyze', (req, res) => {
  const { chatLog } = req.body;
  
  const analysis = processAnalysis(chatLog);
  
  const weekNum = mockCheckins.length + 1;
  const dateStr = new Date().toISOString().split('T')[0];
  
  const newCheckin = {
      week: 'W' + weekNum,
      score: analysis.newScore,
      date: dateStr,
      signals: analysis.signals,
      status: analysis.status
  };
  
  mockCheckins.push(newCheckin);
  
  if (analysis.safety_concern || analysis.status !== 'stable') {
      mockCase.alerts.push({
          id: 'a' + (mockCase.alerts.length + 1),
          type: analysis.safety_concern ? 'safety_concern' : 'elevated_distress',
          message: analysis.safety_concern ? 'Emergency safety concern indicated' : 'Increasing distress noticed',
          date: dateStr,
          reviewed: false
      });
  }
  
  // Update dashboard case list for this user
  const dbCase = mockDashboardCases.find(c => c.id === mockCase.id);
  if (dbCase) {
      dbCase.status = analysis.status;
      dbCase.lastCheckin = dateStr;
      dbCase.trend.push(analysis.newScore);
      if (dbCase.trend.length > 4) dbCase.trend.shift();
      if (analysis.safety_concern || analysis.status === 'elevated') {
          dbCase.reviewNeeded = true;
          dbCase.alertCount += 1;
      }
      dbCase.signals = analysis.signals.map(s => {
          if (s === 'fear') return 'Fear-related signal';
          if (s === 'safety_concern') return 'Safety concern';
          if (s === 'sleep_difficulty') return 'Sleep difficulty';
          return s;
      });
  }
  
  res.json({
      success: true,
      checkin: newCheckin,
      signals: analysis.signals,
      safety_concern: analysis.safety_concern
  });
});

app.post('/api/review', (req, res) => {
    const { caseId } = req.body;
    const dbCase = mockDashboardCases.find(c => c.id === caseId);
    if (dbCase) {
        dbCase.reviewNeeded = false;
        dbCase.alertCount = 0;
    }
    mockCase.alerts.forEach(a => a.reviewed = true);
    res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`SAHAY-AI Server running on port ${PORT}`);
});
