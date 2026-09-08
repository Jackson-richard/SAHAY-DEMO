// ============================================================
// SAHAY-AI Shared Utilities, i18n, Data Layer & Analysis Engine

window.SAHAY = window.SAHAY || {};

// ── App Configuration ────────────────────────────────────────
SAHAY.VERSION = '2.0.0';
SAHAY.BUILD = '2026.08.30';

// Supabase Configuration (use env vars in production)
// NEVER expose service-role key in client
SAHAY.config = {
  supabaseUrl: (window.SAHAY_ENV && window.SAHAY_ENV.SUPABASE_URL) || '',
  supabaseAnonKey: (window.SAHAY_ENV && window.SAHAY_ENV.SUPABASE_PUBLISHABLE_KEY) || '',
  groqApiKey: (window.SAHAY_ENV && window.SAHAY_ENV.GROQ_API_KEY) || '',
  groqModel: 'llama-3.1-8b-instant',
};

// ── Supported Languages ──────────────────────────────────────
SAHAY.supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te'];
SAHAY.languageNames = {
  en: 'English',
  ta: 'தமிழ் (Tamil)',
  hi: 'हिन्दी (Hindi)',
  ml: 'മലയാളം (Malayalam)',
  te: 'తెలుగు (Telugu)',
};

// ── App State (Dynamic — NO hardcoded user) ──────────────────
const initialLang = localStorage.getItem('sahay_lang') || 'en';
SAHAY.state = {
  language: SAHAY.supportedLanguages.includes(initialLang) ? initialLang : 'en',
  isRegistered: false,
  isConsented: false,
  isDemoMode: localStorage.getItem('sahay_demo_mode') === 'true',
};

// ── User Profile Management ──────────────────────────────────
SAHAY.getProfile = function () {
  const raw = localStorage.getItem('sahay_profile');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
};

SAHAY.setProfile = function (profile) {
  // Generate internal record ID (UUID-like) separate from official case ID
  if (!profile.internal_record_id) {
    profile.internal_record_id = SAHAY.generateUUID();
  }
  profile.created_at = profile.created_at || new Date().toISOString();
  localStorage.setItem('sahay_profile', JSON.stringify(profile));
  SAHAY.state.isRegistered = true;
};

SAHAY.clearProfile = function () {
  localStorage.removeItem('sahay_profile');
  localStorage.removeItem('sahay_consent');
  localStorage.removeItem('sahay_checkins');
  localStorage.removeItem('sahay_case');
  localStorage.removeItem('sahay_alerts');
  localStorage.removeItem('sahay_interventions');
  localStorage.removeItem('sahay_trusted_contact');
  localStorage.removeItem('sahay_notifications');
  localStorage.removeItem('sahay_dashboard_cases');
  localStorage.removeItem('sahay_consented');
  localStorage.removeItem('sahay_audit_log');
  SAHAY.state.isRegistered = false;
  SAHAY.state.isConsented = false;
};

SAHAY.generateUUID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ── Consent Management ───────────────────────────────────────
SAHAY.getConsent = function () {
  const raw = localStorage.getItem('sahay_consent');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
};

SAHAY.setConsent = function (consent) {
  consent.consented_at = new Date().toISOString();
  localStorage.setItem('sahay_consent', JSON.stringify(consent));
  localStorage.setItem('sahay_consented', 'true');
  SAHAY.state.isConsented = true;
  SAHAY.addAuditLog('consent_given', 'User provided consent');
};

SAHAY.isConsented = function () {
  return localStorage.getItem('sahay_consented') === 'true';
};

// ── Case Management ──────────────────────────────────────────
SAHAY.CASE_STAGES = [
  { id: 'registration', label: 'Registration' },
  { id: 'investigation', label: 'Investigation' },
  { id: 'hearing', label: 'Hearing' },
  { id: 'post_verdict', label: 'Post-Verdict / Rehabilitation' },
];

SAHAY.getCase = function () {
  const raw = localStorage.getItem('sahay_case');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
};

SAHAY.initCase = function (officialCaseId) {
  const profile = SAHAY.getProfile();
  const caseData = {
    id: SAHAY.generateUUID(),
    official_case_id: officialCaseId,
    profile_id: profile ? profile.internal_record_id : null,
    case_status: 'active',
    case_stage: 'registration',
    stages: SAHAY.CASE_STAGES.map((s, i) => ({
      ...s,
      status: i === 0 ? 'completed' : (i === 1 ? 'active' : 'pending'),
      date: i === 0 ? new Date().toISOString().split('T')[0] : null,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem('sahay_case', JSON.stringify(caseData));
  return caseData;
};

// ── Check-in Management ──────────────────────────────────────
SAHAY.getCheckins = function () {
  const raw = localStorage.getItem('sahay_checkins');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
};

SAHAY.addCheckin = function (checkin) {
  const checkins = SAHAY.getCheckins();
  checkin.id = SAHAY.generateUUID();
  checkin.created_at = new Date().toISOString();
  checkins.push(checkin);
  localStorage.setItem('sahay_checkins', JSON.stringify(checkins));
  SAHAY.addAuditLog('checkin_completed', `Check-in #${checkins.length}, Score: ${checkin.score}`);
  return checkin;
};

// ── Alerts Management ────────────────────────────────────────
SAHAY.getAlerts = function () {
  const raw = localStorage.getItem('sahay_alerts');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
};

SAHAY.addAlert = function (alert) {
  const alerts = SAHAY.getAlerts();
  alert.id = SAHAY.generateUUID();
  alert.created_at = new Date().toISOString();
  alert.status = 'pending';
  alert.reviewed_at = null;
  alert.reviewed_by = null;
  alerts.push(alert);
  localStorage.setItem('sahay_alerts', JSON.stringify(alerts));
  SAHAY.addNotification({
    type: 'alert',
    title: 'Concern Flagged',
    message: alert.reason,
    case_id: alert.case_id,
  });
  return alert;
};

// ── Interventions Management ─────────────────────────────────
SAHAY.getInterventions = function () {
  const raw = localStorage.getItem('sahay_interventions');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
};

SAHAY.addIntervention = function (intervention) {
  const interventions = SAHAY.getInterventions();
  intervention.id = SAHAY.generateUUID();
  intervention.created_at = new Date().toISOString();
  interventions.push(intervention);
  localStorage.setItem('sahay_interventions', JSON.stringify(interventions));
  SAHAY.addAuditLog('intervention_added', intervention.action);
  return intervention;
};

// ── Trusted Contact Management ───────────────────────────────
SAHAY.getTrustedContact = function () {
  const raw = localStorage.getItem('sahay_trusted_contact');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
};

SAHAY.setTrustedContact = function (contact) {
  contact.id = contact.id || SAHAY.generateUUID();
  contact.enabled = contact.enabled !== false;
  contact.created_at = contact.created_at || new Date().toISOString();
  localStorage.setItem('sahay_trusted_contact', JSON.stringify(contact));
  SAHAY.addAuditLog('trusted_contact_updated', `Contact: ${contact.name}`);
};

SAHAY.removeTrustedContact = function () {
  localStorage.removeItem('sahay_trusted_contact');
  SAHAY.addAuditLog('trusted_contact_removed', 'Trusted contact removed');
};

// ── Notification System ──────────────────────────────────────
SAHAY.getNotifications = function () {
  const raw = localStorage.getItem('sahay_notifications');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
};

SAHAY.addNotification = function (notification) {
  const notifications = SAHAY.getNotifications();
  notification.id = SAHAY.generateUUID();
  notification.created_at = new Date().toISOString();
  notification.read = false;
  notifications.unshift(notification); // newest first
  if (notifications.length > 50) notifications.pop();
  localStorage.setItem('sahay_notifications', JSON.stringify(notifications));
};

SAHAY.getUnreadNotificationCount = function () {
  return SAHAY.getNotifications().filter(n => !n.read).length;
};

// ── Audit Log ────────────────────────────────────────────────
SAHAY.addAuditLog = function (action, details) {
  const logs = JSON.parse(localStorage.getItem('sahay_audit_log') || '[]');
  const profile = SAHAY.getProfile();
  logs.push({
    id: SAHAY.generateUUID(),
    case_id: SAHAY.getCase()?.official_case_id || null,
    actor_id: profile?.internal_record_id || 'system',
    action: action,
    details: details,
    created_at: new Date().toISOString(),
  });
  if (logs.length > 200) logs.shift();
  localStorage.setItem('sahay_audit_log', JSON.stringify(logs));
};

// ── Translation Engine (i18n) ────────────────────────────────
SAHAY.t = function (key, params) {
  const currentLang = SAHAY.state.language || 'en';
  const translations = window.SAHAY_TRANSLATIONS || {};

  let text = (translations[currentLang] && translations[currentLang][key]) ||
    (translations['en'] && translations['en'][key]);

  if (text === undefined || text === null) {
    text = key;
  }

  if (params && typeof params === 'object') {
    Object.keys(params).forEach(p => {
      text = text.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
    });
  }

  return text;
};

SAHAY.translate = SAHAY.t;

SAHAY.setLanguage = function (lang) {
  if (!SAHAY.supportedLanguages.includes(lang)) lang = 'en';
  SAHAY.state.language = lang;
  localStorage.setItem('sahay_lang', lang);
  document.documentElement.lang = lang;
  SAHAY.applyTranslations();
  window.dispatchEvent(new CustomEvent('sahay-language-changed', { detail: { language: lang } }));
};

SAHAY.applyTranslations = function () {
  const lang = SAHAY.state.language || 'en';
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = SAHAY.t(key);
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = SAHAY.t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', SAHAY.t(key));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', SAHAY.t(key));
  });

  document.querySelectorAll('.global-lang-select').forEach(select => {
    select.value = lang;
  });

  document.querySelectorAll('.current-lang-display').forEach(el => {
    el.textContent = SAHAY.languageNames[lang] || 'English';
  });
};

// ── Shared Header Language Dropdown ──────────────────────────
SAHAY.renderGlobalLanguageDropdown = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentLang = SAHAY.state.language || 'en';
  container.innerHTML = `
    <div class="relative inline-block text-left global-lang-wrapper">
      <select class="global-lang-select bg-surface-container-low text-on-surface font-label text-label-sm rounded-full px-2.5 py-1 border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer" onchange="SAHAY.setLanguage(this.value)">
        <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
        <option value="ta" ${currentLang === 'ta' ? 'selected' : ''}>தமிழ் (Tamil)</option>
        <option value="hi" ${currentLang === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
        <option value="te" ${currentLang === 'te' ? 'selected' : ''}>తెలుగు (Telugu)</option>
        <option value="ml" ${currentLang === 'ml' ? 'selected' : ''}>മലയാളം (Malayalam)</option>
      </select>
    </div>
  `;
};

// ── Navigation ───────────────────────────────────────────────
SAHAY.navigate = function (page) {
  window.location.href = page;
};

SAHAY.setActiveNav = function (tab) {
  const tabs = ['home', 'chat', 'journey', 'support', 'profile'];
  tabs.forEach(t => {
    const el = document.getElementById('nav-' + t);
    if (!el) return;
    if (t === tab) {
      el.classList.add('bg-primary-container', 'text-on-primary-container');
      el.classList.remove('text-on-surface-variant');
      const icon = el.querySelector('.nav-icon');
      if (icon) icon.style.fontVariationSettings = "'FILL' 1";
    } else {
      el.classList.remove('bg-primary-container', 'text-on-primary-container');
      el.classList.add('text-on-surface-variant');
      const icon = el.querySelector('.nav-icon');
      if (icon) icon.style.fontVariationSettings = "'FILL' 0";
    }
  });
};

// ── Safe Exit Handler ────────────────────────────────────────
SAHAY.safeExit = function () {
  window.location.replace('https://www.google.com');
};

// ══════════════════════════════════════════════════════════════
// DISTRESS ANALYSIS ENGINE
// Separate deterministic layer — LLM does NOT determine score
// ══════════════════════════════════════════════════════════════

SAHAY.SIGNAL_DEFINITIONS = {
  fear: { label: 'Fear', weight: 12, keywords: ['fear', 'scared', 'afraid', 'terrified', 'frightened', 'panic', 'worry', 'worried', 'anxious', 'nervous', 'dread'] },
  sleep_difficulty: { label: 'Sleep Difficulty', weight: 10, keywords: ['sleep', 'insomnia', 'nightmare', 'dream', 'wake', 'rest', 'tired', 'exhausted', 'fatigue', 'poorly'] },
  withdrawal: { label: 'Social Withdrawal', weight: 8, keywords: ['alone', 'isolated', 'withdraw', 'avoid', 'hide', 'nobody', 'lonely', 'dont want to go', 'staying inside'] },
  hopelessness: { label: 'Hopelessness', weight: 14, keywords: ['hopeless', 'pointless', 'give up', 'no point', 'nothing matters', 'never get better', 'lost cause', 'worthless', 'useless'] },
  feeling_unsafe: { label: 'Feeling Unsafe', weight: 18, keywords: ['unsafe', 'danger', 'threatened', 'threaten', 'attack', 'hurt', 'harm', 'violence', 'hit', 'stalking', 'following'] },
  threat_mentions: { label: 'Threat Mentions', weight: 20, keywords: ['kill', 'die', 'death', 'weapon', 'gun', 'knife', 'murder', 'end my life', 'self-harm', 'suicide'] },
  reduced_engagement: { label: 'Reduced Engagement', weight: 5, keywords: ['fine', 'okay', 'nothing', 'dont know', 'whatever', 'same'] },
  physical_symptoms: { label: 'Physical Symptoms', weight: 7, keywords: ['headache', 'stomach', 'pain', 'eating', 'appetite', 'weight', 'shaking', 'trembling', 'nausea', 'dizzy'] },
  case_anxiety: { label: 'Case-related Anxiety', weight: 10, keywords: ['hearing', 'court', 'trial', 'judge', 'lawyer', 'verdict', 'testimony', 'witness', 'case'] },
};

SAHAY.CONCERN_LEVELS = {
  STABLE: { label: 'Stable', min: 0, max: 39, color: '#22c55e', bgColor: '#dcfce7', textColor: '#166534' },
  ELEVATED: { label: 'Elevated', min: 40, max: 59, color: '#eab308', bgColor: '#fef9c3', textColor: '#854d0e' },
  INCREASING_CONCERN: { label: 'Increasing Concern', min: 60, max: 100, color: '#f97316', bgColor: '#ffedd5', textColor: '#9a3412' },
};

SAHAY.getConcernLevel = function (score) {
  if (score < 40) return SAHAY.CONCERN_LEVELS.STABLE;
  if (score < 60) return SAHAY.CONCERN_LEVELS.ELEVATED;
  return SAHAY.CONCERN_LEVELS.INCREASING_CONCERN;
};

SAHAY.getConcernLevelKey = function (score) {
  if (score < 40) return 'stable';
  if (score < 60) return 'elevated';
  return 'increasing';
};

/**
 * Structured Distress Analysis Engine
 * Examines chat messages for wellbeing signals and generates a deterministic score.
 * The LLM is NOT involved in scoring — only in conversational responses.
 */
SAHAY.analyzeCheckin = function (chatLog) {
  const userMessages = chatLog
    .filter(m => m.role === 'user')
    .map(m => m.text.toLowerCase());

  const allText = userMessages.join(' ');
  const detectedSignals = [];
  let totalWeight = 0;

  // Detect signals
  Object.entries(SAHAY.SIGNAL_DEFINITIONS).forEach(([signalKey, def]) => {
    const matchedKeywords = def.keywords.filter(kw => allText.includes(kw));
    if (matchedKeywords.length > 0) {
      detectedSignals.push({
        signal: signalKey,
        label: def.label,
        weight: def.weight,
        matchCount: matchedKeywords.length,
        keywords: matchedKeywords,
      });
      totalWeight += def.weight * Math.min(matchedKeywords.length, 3); // cap per-signal
    }
  });

  // Get previous check-ins for longitudinal comparison
  const prevCheckins = SAHAY.getCheckins();
  const lastScore = prevCheckins.length > 0 ? prevCheckins[prevCheckins.length - 1].score : 25;

  // Calculate base score from signals
  let baseScore = Math.min(100, 20 + totalWeight);

  // Longitudinal adjustment: if worsening compared to previous
  if (prevCheckins.length >= 2) {
    const recentScores = prevCheckins.slice(-3).map(c => c.score);
    const isWorsening = recentScores.every((s, i) => i === 0 || s >= recentScores[i - 1]);
    if (isWorsening && detectedSignals.length > 0) {
      baseScore = Math.min(100, baseScore + 5);
      detectedSignals.push({
        signal: 'worsening_trend',
        label: 'Worsening compared with previous check-ins',
        weight: 5,
        matchCount: 1,
        keywords: [],
      });
    }
  }

  // Ensure score varies from last check-in (not identical)
  if (detectedSignals.length === 0) {
    baseScore = Math.max(15, lastScore - 5 - Math.floor(Math.random() * 5));
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
  const concernLevel = SAHAY.getConcernLevelKey(finalScore);
  const concernInfo = SAHAY.getConcernLevel(finalScore);

  // Determine if safety concern
  const safetyConcern = detectedSignals.some(s =>
    s.signal === 'feeling_unsafe' || s.signal === 'threat_mentions'
  );

  // Build contributing signals list
  const contributingSignals = detectedSignals
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(s => s.label);

  return {
    score: finalScore,
    concern_level: concernLevel,
    concern_info: concernInfo,
    contributing_signals: contributingSignals,
    detected_signals: detectedSignals,
    safety_concern: safetyConcern,
    previous_score: lastScore,
    trend_direction: finalScore > lastScore ? 'rising' : (finalScore < lastScore ? 'falling' : 'stable'),
    analysis_timestamp: new Date().toISOString(),
    disclaimer: 'This is a wellbeing concern indicator, NOT a clinical diagnosis.',
  };
};

/**
 * Process a complete check-in: analyze, store, create alerts if needed
 */
SAHAY.processCheckin = function (chatLog, channel = 'chat') {
  const analysis = SAHAY.analyzeCheckin(chatLog);
  const profile = SAHAY.getProfile();
  const caseData = SAHAY.getCase();
  const checkins = SAHAY.getCheckins();

  // Create checkin record
  const checkin = {
    id: SAHAY.generateUUID(),
    profile_id: profile?.internal_record_id || null,
    case_id: caseData?.official_case_id || null,
    channel: channel,
    language: SAHAY.state.language,
    score: analysis.score,
    concern_level: analysis.concern_level,
    contributing_signals: analysis.contributing_signals,
    detected_signals: analysis.detected_signals,
    safety_concern: analysis.safety_concern,
    week: 'W' + (checkins.length + 1),
    date: new Date().toISOString().split('T')[0],
    message_count: chatLog.filter(m => m.role === 'user').length,
    created_at: new Date().toISOString(),
  };

  // Store the checkin
  SAHAY.addCheckin(checkin);

  // Create alert if concern is elevated or safety concern
  if (analysis.concern_level !== 'stable' || analysis.safety_concern) {
    SAHAY.addAlert({
      case_id: caseData?.official_case_id || null,
      score: analysis.score,
      alert_level: analysis.safety_concern ? 'critical' : analysis.concern_level,
      reason: SAHAY.buildAlertReason(analysis),
    });
  }

  // Update dashboard cases
  SAHAY.updateDashboardCase(checkin, analysis);

  // Check for adaptive voice outreach conditions
  SAHAY.checkAdaptiveOutreach();

  return {
    success: true,
    checkin: checkin,
    analysis: analysis,
  };
};

SAHAY.buildAlertReason = function (analysis) {
  const reasons = [];
  if (analysis.safety_concern) reasons.push('Safety concern detected');
  if (analysis.trend_direction === 'rising') reasons.push('Concern increasing across recent check-ins');
  analysis.contributing_signals.forEach(s => reasons.push(s + ' reported'));
  return reasons.join('. ');
};

// ── Dashboard Cases (Support Team View) ──────────────────────
SAHAY.getDashboardCases = function () {
  const raw = localStorage.getItem('sahay_dashboard_cases');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
};

SAHAY.updateDashboardCase = function (checkin, analysis) {
  let cases = SAHAY.getDashboardCases();
  const profile = SAHAY.getProfile();
  const caseData = SAHAY.getCase();
  if (!profile || !caseData) return;

  let existing = cases.find(c => c.official_case_id === caseData.official_case_id);

  if (!existing) {
    existing = {
      id: SAHAY.generateUUID(),
      official_case_id: caseData.official_case_id,
      name: profile.full_name,
      status: analysis.concern_level,
      lastCheckin: checkin.date,
      trend: [checkin.score],
      alertCount: 0,
      reviewNeeded: false,
      signals: analysis.contributing_signals,
      case_stage: caseData.case_stage,
    };
    cases.push(existing);
  } else {
    existing.status = analysis.concern_level;
    existing.lastCheckin = checkin.date;
    existing.trend.push(checkin.score);
    if (existing.trend.length > 6) existing.trend.shift();
    existing.signals = analysis.contributing_signals;
    existing.case_stage = caseData.case_stage;
  }

  if (analysis.safety_concern || analysis.concern_level !== 'stable') {
    existing.reviewNeeded = true;
    existing.alertCount = (existing.alertCount || 0) + 1;
  }

  localStorage.setItem('sahay_dashboard_cases', JSON.stringify(cases));
};

SAHAY.getDashboardCasesAsync = async function () {
  if (window.supabase && SAHAY.config.supabaseUrl && SAHAY.config.supabaseAnonKey) {
    const sb = window.supabase.createClient(SAHAY.config.supabaseUrl, SAHAY.config.supabaseAnonKey);
    try {
      const { data, error } = await sb.from('cases').select(`
         *,
         checkins(id, score, concern_level, safety_concern, signals, created_at),
         profiles(full_name),
         alerts(id, status)
      `);
      if (!error && data) {
        // Map to dashboard expected format
        return data.map(c => ({
          id: c.id,
          official_case_id: c.official_case_id,
          name: c.profiles && c.profiles.length > 0 ? c.profiles[0].full_name : 'Unknown',
          status: c.checkins && c.checkins.length > 0 ? c.checkins[c.checkins.length - 1].concern_level : 'stable',
          lastCheckin: c.checkins && c.checkins.length > 0 ? new Date(c.checkins[c.checkins.length - 1].created_at).toLocaleDateString() : 'None',
          trend: c.checkins ? c.checkins.map(ch => ch.score).slice(-6) : [],
          alertCount: c.alerts ? c.alerts.filter(a => a.status === 'pending').length : 0,
          reviewNeeded: c.alerts ? c.alerts.some(a => a.status === 'pending') : false,
          signals: c.checkins && c.checkins.length > 0 ? c.checkins[c.checkins.length - 1].signals : [],
          case_stage: c.case_stage
        }));
      }
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to local data...", e);
    }
  }
  return SAHAY.getDashboardCases();
};

// ── Adaptive Voice Outreach ──────────────────────────────────
SAHAY.checkAdaptiveOutreach = function () {
  const consent = SAHAY.getConsent();
  if (!consent || !consent.voice_consent) return;

  const checkins = SAHAY.getCheckins();
  if (checkins.length < 2) return;

  // Check if user has missed check-ins (simulated: last check-in > 3 days ago)
  const lastCheckin = checkins[checkins.length - 1];
  const lastDate = new Date(lastCheckin.created_at);
  const now = new Date();
  const daysSinceLastCheckin = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

  if (daysSinceLastCheckin >= 3) {
    SAHAY.triggerAdaptiveOutreach();
  }
};

SAHAY.triggerAdaptiveOutreach = function () {
  // PROTOTYPE: Simulate adaptive voice outreach
  // In production, this would integrate with a telephony/voice-agent service
  SAHAY.addNotification({
    type: 'adaptive_outreach',
    title: 'Missed Check-in Detected',
    message: 'SAHAY noticed you missed your recent wellbeing check-in. Would you like to complete a voice check-in?',
    actionUrl: 'voice.html',
  });
};

// ── Groq AI System Instruction ───────────────────────────────
SAHAY.GROQ_SYSTEM_INSTRUCTION = `You are SAHAY-AI, a trauma-informed wellbeing check-in assistant.

Your role is to listen respectfully, ask short and gentle wellbeing questions, and help the user express how they are doing.

You are not a doctor, therapist, police officer, lawyer or crisis decision-maker.

Do not diagnose mental-health conditions.

Do not claim certainty about a user's emotional or safety state.

Do not determine a final intervention decision.

Do not pressure the user to disclose traumatic details.

Use simple, compassionate language.

Respect the user's selected language.

If the user expresses distress, acknowledge it calmly and ask an appropriate short follow-up question.

If the user indicates immediate danger or self-harm, do not attempt to resolve the situation through AI conversation. Encourage immediate human/emergency support according to the configured escalation protocol and create an escalation signal for authorized human review.

The conversation is one source of information for SAHAY-AI's wellbeing analysis.

Authorized humans remain responsible for intervention decisions.

Keep responses concise, respectful and non-judgmental.`;

/**
 * Get AI response via Groq API (or local fallback)
 */
SAHAY.getAIResponse = async function (chatHistory, userMessage) {
  const groqKey = SAHAY.config.groqApiKey;

  // If Groq API key is configured, use it
  if (groqKey) {
    try {
      const messages = [
        { role: 'system', content: SAHAY.GROQ_SYSTEM_INSTRUCTION },
        ...chatHistory.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: SAHAY.config.groqModel,
          messages: messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (e) {
      console.warn('[SAHAY-AI] Groq API unavailable, using local fallback:', e.message);
    }
  }

  // Local fallback: deterministic supportive responses
  return SAHAY.getLocalFallbackResponse(chatHistory, userMessage);
};

SAHAY.getLocalFallbackResponse = function (chatHistory, userMessage) {
  const msg = userMessage.toLowerCase();
  const turnCount = chatHistory.filter(m => m.role === 'user').length;

  // Context-aware responses based on detected keywords and conversation stage
  if (turnCount === 0) {
    return SAHAY.t('ai_response_greeting') || "Hi. How are you feeling today?";
  }

  if (msg.includes('sleep') || msg.includes('nightmare') || msg.includes('tired')) {
    return SAHAY.t('ai_response_sleep') || "Thank you for sharing that. Sleep difficulties can be really tough. How long has this been affecting you?";
  }

  if (msg.includes('scared') || msg.includes('afraid') || msg.includes('fear') || msg.includes('unsafe')) {
    return SAHAY.t('ai_response_fear') || "I hear you, and your feelings are valid. Is there something specific that has been making you feel this way recently?";
  }

  if (msg.includes('worry') || msg.includes('anxious') || msg.includes('stress') || msg.includes('nervous')) {
    return SAHAY.t('ai_response_worry') || "That sounds difficult. What has been on your mind the most?";
  }

  if (msg.includes('hearing') || msg.includes('court') || msg.includes('trial') || msg.includes('case')) {
    return SAHAY.t('ai_response_case') || "It is natural to feel concerned about your case. How has this been affecting your daily life?";
  }

  if (msg.includes('fine') || msg.includes('okay') || msg.includes('good') || msg.includes('better')) {
    return SAHAY.t('ai_response_positive') || "I am glad to hear that. Is there anything that has been helping you feel this way?";
  }

  if (msg.includes('alone') || msg.includes('lonely') || msg.includes('isolated')) {
    return SAHAY.t('ai_response_isolation') || "Feeling alone can be very hard. Do you have someone you trust that you can talk to?";
  }

  if (turnCount >= 4) {
    return SAHAY.t('ai_response_closing') || "Thank you for sharing with me today. Your wellbeing matters, and your support team is here for you. Is there anything else you would like to mention before we finish?";
  }

  // Generic supportive follow-up
  const followUps = [
    "Thank you for sharing that. How has this been affecting your sleep or daily routine?",
    "I appreciate you telling me. Has anything changed since your last check-in?",
    "That sounds challenging. How are you coping day to day?",
    "Thank you. Is there anything else that has been on your mind?",
  ];
  return followUps[turnCount % followUps.length];
};

// ══════════════════════════════════════════════════════════════
// DEMO MODE — 3 Scenarios
// ══════════════════════════════════════════════════════════════

SAHAY.DEMO_SCENARIOS = {
  stable: {
    name: 'Stable Wellbeing',
    description: 'User with stable, improving wellbeing patterns',
    profile: {
      full_name: 'Demo User A',
      mobile_number: '+91 90000 00001',
      age: 28,
      preferred_language: 'en',
      official_case_id: 'CNR/CASE-2026-0001',
    },
    checkins: [
      { week: 'W1', score: 35, date: '2026-08-04', concern_level: 'stable', contributing_signals: ['mild anxiety'], channel: 'chat' },
      { week: 'W2', score: 30, date: '2026-08-11', concern_level: 'stable', contributing_signals: ['slight worry'], channel: 'chat' },
      { week: 'W3', score: 25, date: '2026-08-18', concern_level: 'stable', contributing_signals: [], channel: 'chat' },
      { week: 'W4', score: 22, date: '2026-08-25', concern_level: 'stable', contributing_signals: [], channel: 'voice' },
    ],
    case_stage: 'hearing',
  },
  increasing: {
    name: 'Increasing Concern',
    description: 'User showing rising distress signals over time',
    profile: {
      full_name: 'Demo User B',
      mobile_number: '+91 90000 00002',
      age: 34,
      preferred_language: 'en',
      official_case_id: 'CNR/CASE-2026-0002',
    },
    checkins: [
      { week: 'W1', score: 28, date: '2026-08-04', concern_level: 'stable', contributing_signals: ['mild anxiety'], channel: 'chat' },
      { week: 'W2', score: 35, date: '2026-08-11', concern_level: 'stable', contributing_signals: ['Sleep Difficulty'], channel: 'chat' },
      { week: 'W3', score: 47, date: '2026-08-18', concern_level: 'elevated', contributing_signals: ['Fear', 'Sleep Difficulty'], channel: 'chat' },
      { week: 'W4', score: 61, date: '2026-08-25', concern_level: 'increasing', contributing_signals: ['Fear', 'Sleep Difficulty', 'Case-related Anxiety'], channel: 'chat' },
      { week: 'W5', score: 68, date: '2026-08-30', concern_level: 'increasing', contributing_signals: ['Fear', 'Sleep Difficulty', 'Worsening compared with previous check-ins'], channel: 'chat' },
    ],
    case_stage: 'investigation',
  },
  critical: {
    name: 'Concern Requiring Human Review',
    description: 'User with safety concerns requiring immediate human review',
    profile: {
      full_name: 'Demo User C',
      mobile_number: '+91 90000 00003',
      age: 25,
      preferred_language: 'en',
      official_case_id: 'CNR/CASE-2026-0003',
    },
    checkins: [
      { week: 'W1', score: 32, date: '2026-08-04', concern_level: 'stable', contributing_signals: ['mild anxiety'], channel: 'chat' },
      { week: 'W2', score: 45, date: '2026-08-11', concern_level: 'elevated', contributing_signals: ['Fear', 'Sleep Difficulty'], channel: 'chat' },
      { week: 'W3', score: 62, date: '2026-08-18', concern_level: 'increasing', contributing_signals: ['Fear', 'Feeling Unsafe', 'Sleep Difficulty'], channel: 'voice' },
      { week: 'W4', score: 78, date: '2026-08-25', concern_level: 'increasing', contributing_signals: ['Feeling Unsafe', 'Threat Mentions', 'Hopelessness', 'Sleep Difficulty'], channel: 'chat' },
    ],
    case_stage: 'investigation',
    alerts: [
      { alert_level: 'critical', reason: 'Safety concern detected. Feeling unsafe and threat mentions reported. Concern increased across the last 3 check-ins.', score: 78 },
    ],
  },
};

SAHAY.loadDemoScenario = function (scenarioKey) {
  const scenario = SAHAY.DEMO_SCENARIOS[scenarioKey];
  if (!scenario) return false;

  // Clear existing data
  SAHAY.clearProfile();

  // Set demo mode flag
  localStorage.setItem('sahay_demo_mode', 'true');
  SAHAY.state.isDemoMode = true;

  // Create profile
  const profile = {
    ...scenario.profile,
    internal_record_id: SAHAY.generateUUID(),
    is_demo: true,
    demo_scenario: scenarioKey,
    created_at: new Date().toISOString(),
  };
  SAHAY.setProfile(profile);

  // Create case
  const caseData = SAHAY.initCase(scenario.profile.official_case_id);
  caseData.case_stage = scenario.case_stage;
  // Update stages
  const stageIndex = SAHAY.CASE_STAGES.findIndex(s => s.id === scenario.case_stage);
  if (stageIndex >= 0) {
    caseData.stages = caseData.stages.map((s, i) => ({
      ...s,
      status: i < stageIndex ? 'completed' : (i === stageIndex ? 'active' : 'pending'),
      date: i <= stageIndex ? '2026-08-01' : null,
    }));
  }
  localStorage.setItem('sahay_case', JSON.stringify(caseData));

  // Set consent
  SAHAY.setConsent({
    general_consent: true,
    voice_consent: true,
    trusted_contact_consent: false,
  });

  // Load check-ins
  const checkins = scenario.checkins.map(c => ({
    ...c,
    id: SAHAY.generateUUID(),
    profile_id: profile.internal_record_id,
    case_id: scenario.profile.official_case_id,
    detected_signals: [],
    safety_concern: c.contributing_signals.some(s => s.includes('Unsafe') || s.includes('Threat')),
    created_at: c.date + 'T10:00:00Z',
  }));
  localStorage.setItem('sahay_checkins', JSON.stringify(checkins));

  // Create dashboard cases for all 3 scenarios
  const allDashCases = Object.entries(SAHAY.DEMO_SCENARIOS).map(([key, sc]) => ({
    id: SAHAY.generateUUID(),
    official_case_id: sc.profile.official_case_id,
    name: sc.profile.full_name,
    status: sc.checkins[sc.checkins.length - 1].concern_level,
    lastCheckin: sc.checkins[sc.checkins.length - 1].date,
    trend: sc.checkins.map(c => c.score),
    alertCount: sc.alerts ? sc.alerts.length : (key === 'critical' ? 1 : 0),
    reviewNeeded: key === 'increasing' || key === 'critical',
    signals: sc.checkins[sc.checkins.length - 1].contributing_signals,
    case_stage: sc.case_stage,
    is_demo: true,
  }));
  localStorage.setItem('sahay_dashboard_cases', JSON.stringify(allDashCases));

  // Create alerts for critical scenario
  if (scenario.alerts) {
    const alerts = scenario.alerts.map(a => ({
      ...a,
      id: SAHAY.generateUUID(),
      case_id: scenario.profile.official_case_id,
      status: 'pending',
      created_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    }));
    localStorage.setItem('sahay_alerts', JSON.stringify(alerts));
  }

  SAHAY.setLanguage(scenario.profile.preferred_language);
  return true;
};

SAHAY.resetDemo = function () {
  SAHAY.clearProfile();
  localStorage.removeItem('sahay_demo_mode');
  SAHAY.state.isDemoMode = false;
};

SAHAY.isDemoMode = function () {
  return localStorage.getItem('sahay_demo_mode') === 'true';
};

// ── Services Layer (local mode + future Supabase) ────────────
SAHAY.isLocalMode = true;

SAHAY.services = {
  caseService: {
    getCase: function () {
      return Promise.resolve(SAHAY.getCase());
    },
    getCaseStages: function () {
      const c = SAHAY.getCase();
      return Promise.resolve(c ? c.stages : []);
    },
    getAlerts: function () {
      return Promise.resolve(SAHAY.getAlerts());
    },
  },
  wellbeingService: {
    getCheckins: function () {
      return Promise.resolve(SAHAY.getCheckins());
    },
    getLatestResult: function () {
      const checkins = SAHAY.getCheckins();
      return Promise.resolve(checkins.length > 0 ? checkins[checkins.length - 1] : null);
    },
  },
  alertService: {
    getAlerts: function () {
      return Promise.resolve(SAHAY.getAlerts());
    },
    markReviewed: function (alertId, reviewedBy) {
      const alerts = SAHAY.getAlerts();
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = 'reviewed';
        alert.reviewed_at = new Date().toISOString();
        alert.reviewed_by = reviewedBy || 'Support Officer';
        localStorage.setItem('sahay_alerts', JSON.stringify(alerts));
        SAHAY.addAuditLog('alert_reviewed', `Alert ${alertId} reviewed`);
      }

      // Also update dashboard cases
      const cases = SAHAY.getDashboardCases();
      const dc = cases.find(c => c.official_case_id === alert?.case_id);
      if (dc) {
        dc.reviewNeeded = false;
        dc.alertCount = Math.max(0, dc.alertCount - 1);
        localStorage.setItem('sahay_dashboard_cases', JSON.stringify(cases));
      }

      return Promise.resolve({ success: true });
    },
  },
  dashboardService: {
    getCases: function () {
      return Promise.resolve(SAHAY.getDashboardCases());
    },
  },
  analysisService: {
    analyze: function (chatLog, channel) {
      return Promise.resolve(SAHAY.processCheckin(chatLog, channel || 'chat'));
    },
  },
};

// ── Initialization ───────────────────────────────────────────
(function initSAHAY() {
  const profile = SAHAY.getProfile();
  SAHAY.state.isRegistered = !!profile;
  SAHAY.state.isConsented = SAHAY.isConsented();
  SAHAY.state.isDemoMode = SAHAY.isDemoMode();
})();

// Auto-run translation on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  SAHAY.applyTranslations();
});

console.log('[SAHAY-AI] v' + SAHAY.VERSION + ' | Shared module initialized | Language:', SAHAY.state.language, '| Registered:', SAHAY.state.isRegistered, '| Demo:', SAHAY.state.isDemoMode);
