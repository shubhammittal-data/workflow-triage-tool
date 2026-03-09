import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Data
const IOA_WORKFLOWS = [
  { name: "Policy Renewal Reminders to Clients", desc: "Emails sent 60-90 days before policy expiration to start the renewal process and collect updated client information." },
  { name: "Certificate of Insurance Requests", desc: "Generating and sending proof-of-coverage documents when requested by clients, vendors, or third parties." },
  { name: "Endorsement Processing Notifications", desc: "Communicating mid-term policy changes (vehicles, locations, limits) between clients, carriers, and internal teams." },
  { name: "New Business Submission to Carriers", desc: "Packaging and sending client applications to multiple carriers for quotes, then managing follow-up questions." },
  { name: "Claims Status Update Emails", desc: "Coordinating between clients and carriers/adjusters to relay claim progress, requests, and resolutions." },
  { name: "Billing Discrepancy Reconciliation", desc: "Resolving mismatches between carrier invoices, system records, and client billing through multi-party email threads." },
  { name: "AOR Letter Distribution", desc: "Sending signed Agent of Record letters to carriers when a client transfers their book of business to your brokerage." },
  { name: "Carrier Quote Follow-ups", desc: "Tracking and chasing responses from carriers who have not replied to submission requests within expected timeframes." },
  { name: "Client Onboarding Documentation Requests", desc: "Collecting required documents (applications, loss history, financials) from new clients through multiple rounds of follow-up." },
  { name: "Compliance/Licensing Renewal Alerts", desc: "Tracking and notifying producers about upcoming license expirations and continuing education requirements by state." },
  { name: "Loss Run Requests", desc: "Requesting claims history reports from current and prior carriers, each with different submission methods and response times." },
  { name: "Audit Notification Processing", desc: "Coordinating annual policy audits between carriers and clients, including document collection and dispute resolution." },
  { name: "Internal Team Status Updates", desc: "Keeping producers, managers, and support teams informed about account activity, renewals, and open items via email." },
  { name: "Policy Cancellation/Reinstatement Notices", desc: "Urgently communicating cancellation threats (usually for non-payment) and coordinating reinstatement with carriers and clients." },
  { name: "Producer Onboarding Coordination", desc: "Managing new hire setup across HR, licensing, IT, carrier appointments, and training through parallel email threads." },
];

const SCORING_SECTIONS = [
  {
    title: "Workload",
    subtitle: "How much time and capacity does this workflow consume?",
    questions: [
      {
        key: "volume",
        label: "Email Volume",
        desc: "How many emails per week does this workflow generate?",
        tip: "Higher volume workflows recover more hours when automated.",
        options: ["1-10", "11-25", "26-50", "50+"],
        scores: { "1-10": 20, "11-25": 50, "26-50": 75, "50+": 100 },
      },
      {
        key: "effort",
        label: "Manual Effort",
        desc: "Average minutes spent per email thread",
        tip: "Longer handling time means more savings per transaction automated.",
        options: ["Under 5 min", "5-15 min", "15-30 min", "30+ min"],
        scores: { "Under 5 min": 20, "5-15 min": 50, "15-30 min": 75, "30+ min": 100 },
      },
      {
        key: "turnaround",
        label: "Turnaround Sensitivity",
        desc: "How fast does this workflow need to be completed?",
        tip: "Time-critical workflows benefit most from automation because delays directly impact outcomes.",
        options: ["Flexible timeline", "Within a week", "Within 2 to 3 days", "Same day required"],
        scores: { "Flexible timeline": 20, "Within a week": 45, "Within 2 to 3 days": 75, "Same day required": 100 },
      },
    ],
  },
  {
    title: "Process Maturity",
    subtitle: "How ready is this workflow for improvement?",
    questions: [
      {
        key: "standardization",
        label: "Standardization",
        desc: "How consistent is this workflow every time?",
        tip: "Highly consistent workflows are easier to automate. Variable ones need standardization first.",
        options: ["1 (Always different)", "2", "3", "4", "5 (Always the same)"],
        scores: { "1 (Always different)": 20, "2": 40, "3": 60, "4": 80, "5 (Always the same)": 100 },
      },
      {
        key: "documentation",
        label: "Current Documentation",
        desc: "How well is this process documented today?",
        tip: "Well-documented processes are faster to automate. Undocumented ones need discovery work first.",
        options: ["No documentation", "Informal notes only", "Partial SOP exists", "Fully documented"],
        scores: { "No documentation": 20, "Informal notes only": 45, "Partial SOP exists": 70, "Fully documented": 100 },
      },
      {
        key: "errorRisk",
        label: "Error Risk",
        desc: "How often do mistakes happen in this workflow?",
        tip: "High error rates mean high rework costs. Automation reduces human error.",
        options: ["Rarely", "Sometimes", "Often", "Very Often"],
        scores: { Rarely: 20, Sometimes: 50, Often: 75, "Very Often": 100 },
      },
    ],
  },
  {
    title: "Business Impact",
    subtitle: "What is the organizational impact of this workflow?",
    questions: [
      {
        key: "downstreamImpact",
        label: "Downstream Impact",
        desc: "What happens if this workflow is delayed?",
        tip: "Workflows that cause compliance risk or revenue loss when delayed should be prioritized.",
        options: ["Minor inconvenience", "Client frustration", "Compliance risk", "Revenue impact"],
        scores: { "Minor inconvenience": 20, "Client frustration": 50, "Compliance risk": 85, "Revenue impact": 100 },
      },
      {
        key: "clientVisibility",
        label: "Client Visibility",
        desc: "How visible is this workflow to clients?",
        tip: "Client-facing workflows directly affect retention and satisfaction. Improving them has outsized impact.",
        options: ["Fully internal", "Client aware but indirect", "Client receives the output", "Client initiates the request"],
        scores: { "Fully internal": 20, "Client aware but indirect": 45, "Client receives the output": 75, "Client initiates the request": 100 },
      },
      {
        key: "systemTouchpoints",
        label: "System Touchpoints",
        desc: "How many systems does this workflow touch?",
        tip: "More systems mean more manual data entry and round-tripping between platforms.",
        options: ["1 system", "2-3 systems", "4+ systems"],
        scores: { "1 system": 20, "2-3 systems": 60, "4+ systems": 100 },
      },
    ],
  },
];

const ALL_QUESTIONS = SCORING_SECTIONS.flatMap(s => s.questions);

const SITUATIONAL_QUESTIONS = [
  {
    key: "market",
    label: "Market Environment",
    desc: "What best describes your current insurance market?",
    options: [
      { value: "soft", label: "Soft Market", detail: "Competitive, easy placements, carriers are responsive" },
      { value: "hardening", label: "Hardening Market", detail: "Tightening terms, more work per placement" },
      { value: "hard", label: "Hard Market", detail: "Very competitive, frequent declinations, high workload" },
    ],
  },
  {
    key: "growth",
    label: "Growth Phase",
    desc: "What best describes your organization's current trajectory?",
    options: [
      { value: "stable", label: "Stable", detail: "Maintaining current book of business" },
      { value: "moderate", label: "Moderate Growth", detail: "Steady new client acquisition" },
      { value: "rapid", label: "Rapid Growth", detail: "Acquisitions, major expansion, lots of new hires" },
    ],
  },
  {
    key: "painPoint",
    label: "Biggest Pain Point",
    desc: "If you could fix ONE area immediately, what would it be?",
    options: [
      { value: "speed", label: "Client Response Time", detail: "We're too slow getting back to clients" },
      { value: "errors", label: "Error Reduction", detail: "Too many mistakes and rework" },
      { value: "capacity", label: "Staff Capacity", detail: "Team is overwhelmed, can't keep up" },
      { value: "compliance", label: "Compliance Exposure", detail: "Worried about regulatory risk" },
    ],
  },
  {
    key: "readiness",
    label: "Change Readiness",
    desc: "How would you describe your team's comfort with new tools and process changes?",
    options: [
      { value: "resistant", label: "Resistant", detail: "People prefer the way things are" },
      { value: "cautious", label: "Cautious", detail: "Open to change but need convincing" },
      { value: "ready", label: "Ready", detail: "Actively asking for better tools" },
      { value: "eager", label: "Eager", detail: "Already experimenting with automation" },
    ],
  },
];

// Dynamic weight calculation
function getWeights(context) {
  let w = {
    volume: 0.14, effort: 0.14, turnaround: 0.08,
    standardization: 0.14, documentation: 0.06, errorRisk: 0.12,
    downstreamImpact: 0.12, clientVisibility: 0.08, systemTouchpoints: 0.08,
  };

  if (!context || !context.market) {
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    Object.keys(w).forEach(k => w[k] = w[k] / sum);
    return w;
  }

  if (context.market === "hard") {
    w.volume += 0.03; w.turnaround += 0.03; w.effort += 0.02;
    w.documentation -= 0.02; w.clientVisibility -= 0.02; w.systemTouchpoints -= 0.02;
  } else if (context.market === "hardening") {
    w.volume += 0.02; w.turnaround += 0.01;
    w.documentation -= 0.02; w.systemTouchpoints -= 0.01;
  }

  if (context.painPoint === "speed") {
    w.turnaround += 0.04; w.clientVisibility += 0.03;
    w.documentation -= 0.03; w.systemTouchpoints -= 0.02;
  } else if (context.painPoint === "errors") {
    w.errorRisk += 0.04; w.standardization += 0.02;
    w.turnaround -= 0.03; w.clientVisibility -= 0.02;
  } else if (context.painPoint === "capacity") {
    w.volume += 0.04; w.effort += 0.03;
    w.clientVisibility -= 0.03; w.documentation -= 0.02;
  } else if (context.painPoint === "compliance") {
    w.downstreamImpact += 0.04; w.errorRisk += 0.02;
    w.turnaround -= 0.02; w.clientVisibility -= 0.02;
  }

  if (context.growth === "rapid") {
    w.volume += 0.02; w.documentation += 0.02; w.standardization -= 0.02;
  }

  Object.keys(w).forEach(k => { if (w[k] < 0.02) w[k] = 0.02; });
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  Object.keys(w).forEach(k => w[k] = Math.round((w[k] / sum) * 1000) / 1000);
  return w;
}

function calculateAPS(answers, weights) {
  let total = 0;
  for (const q of ALL_QUESTIONS) {
    const val = answers[q.key];
    if (val == null) return null;
    total += q.scores[val] * (weights[q.key] || 0);
  }
  return Math.round(total);
}

function getTier(score, readiness) {
  if (score >= 70) {
    let rec = "High volume and high standardization make this a strong automation candidate. Consider Applied Epic workflow rules, email triggers, or RPA.";
    if (readiness === "resistant") rec += " Start with a small pilot to demonstrate value before full rollout.";
    else if (readiness === "cautious") rec += " Involve the team early in solution design to build buy-in.";
    return { label: "Automate Now", color: "#DC3545", bg: "#FDF2F2", rec };
  }
  if (score >= 40) {
    let rec = "Standardize this process first. Document the steps, reduce variance, then automate.";
    if (readiness === "resistant") rec += " Focus on showing quick wins from standardization alone before introducing tools.";
    return { label: "Standardize First", color: "#D4920A", bg: "#FFFBEB", rec };
  }
  return { label: "Monitor", color: "#16803C", bg: "#F0FDF4", rec: "Low ROI on automation right now. Revisit when volume or complexity increases." };
}

function estimateHours(answers) {
  const volMap = { "1-10": 5, "11-25": 18, "26-50": 38, "50+": 65 };
  const effMap = { "Under 5 min": 3, "5-15 min": 10, "15-30 min": 22, "30+ min": 40 };
  const v = volMap[answers.volume] || 10;
  const e = effMap[answers.effort] || 10;
  return Math.round((v * e) / 60 * 10) / 10;
}

function getRecoveryRate(score) {
  if (score >= 70) return 0.65;
  if (score >= 40) return 0.30;
  return 0.12;
}

// Styles
const NAVY = "#1B3A6B";
const GOLD = "#E8A020";
const BG = "#F4F5F7";
const CARD = "#FFFFFF";
const font = `'DM Sans', 'Segoe UI', system-ui, sans-serif`;
const baseBtn = {
  fontFamily: font, fontWeight: 600, fontSize: 15, border: "none", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
};

// Tooltip
function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 6, cursor: "pointer" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <span style={{
        width: 18, height: 18, borderRadius: "50%", background: "#E5E7EB", color: "#6B7280",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
      }}>?</span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: NAVY, color: "#fff", padding: "10px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.5,
          width: 240, textAlign: "left", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontWeight: 400,
        }}>
          {text}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
            borderTop: `6px solid ${NAVY}`,
          }} />
        </span>
      )}
    </span>
  );
}

// Welcome Screen
function WelcomeScreen({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(165deg, ${NAVY} 0%, #0F2444 55%, #162D54 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <div style={{ maxWidth: 620, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(232,160,32,0.15)", borderRadius: 40, padding: "6px 20px", marginBottom: 28 }}>
          <span style={{ color: GOLD, fontSize: 13, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>Process Excellence Tool</span>
        </div>
        <h1 style={{ color: "#fff", fontSize: 42, fontWeight: 700, lineHeight: 1.2, margin: "0 0 16px" }}>
          Workflow Triage<br />
          <span style={{ color: GOLD }}>Prioritization Engine</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, lineHeight: 1.7, margin: "0 0 40px", maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
          Score email-dependent workflows across 9 dimensions to identify which are worth automating first. Calibrated to your business environment.
        </p>
        <button
          onClick={onStart}
          style={{ ...baseBtn, background: GOLD, color: NAVY, padding: "16px 40px", fontSize: 17, boxShadow: "0 4px 24px rgba(232,160,32,0.35)" }}
          onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.target.style.transform = "translateY(0)"}
        >
          Start Assessment
        </button>
        <div style={{ marginTop: 56, display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {[["9", "Scoring Dimensions"], ["15", "Pre-loaded Workflows"], ["4", "Context Calibrators"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ color: GOLD, fontSize: 28, fontWeight: 700 }}>{n}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Context Screen
function ContextScreen({ onNext, onBack }) {
  const [answers, setAnswers] = useState({});
  const allAnswered = SITUATIONAL_QUESTIONS.every(q => answers[q.key]);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: font, padding: "40px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Step 1 of 4</div>
          <h2 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Calibrate Your Environment</h2>
          <p style={{ color: "#6B7280", fontSize: 15, marginTop: 8 }}>These 4 quick questions adjust the scoring weights to match your business situation. Takes about 30 seconds.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {SITUATIONAL_QUESTIONS.map((q) => (
            <div key={q.key} style={{ background: CARD, borderRadius: 14, padding: "24px 28px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 4 }}>{q.label}</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>{q.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map(opt => {
                  const active = answers[q.key] === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setAnswers({ ...answers, [q.key]: opt.value })}
                      style={{
                        padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${active ? NAVY : "#E5E7EB"}`,
                        background: active ? "rgba(27,58,107,0.06)" : "#FAFAFA",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, color: active ? NAVY : "#374151" }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{opt.detail}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ ...baseBtn, padding: "12px 28px", background: CARD, color: NAVY, border: "1.5px solid #CBD5E1" }}>
            Back
          </button>
          <button
            disabled={!allAnswered}
            onClick={() => onNext(answers)}
            style={{ ...baseBtn, padding: "14px 32px", background: allAnswered ? GOLD : "#D1D5DB", color: allAnswered ? NAVY : "#9CA3AF" }}
          >
            Next: Select Workflows
          </button>
        </div>
      </div>
    </div>
  );
}

// Workflow Selector
function WorkflowSelector({ onNext, onBack }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (name) => {
    const s = new Set(selected);
    s.has(name) ? s.delete(name) : s.add(name);
    setSelected(s);
  };

  const canProceed = selected.size > 0;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: font, padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Step 2 of 4</div>
          <h2 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Select Workflows to Assess</h2>
          <p style={{ color: "#6B7280", fontSize: 15, marginTop: 8 }}>Choose the email-dependent workflows relevant to your team.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {IOA_WORKFLOWS.map((w) => {
            const active = selected.has(w.name);
            return (
              <div
                key={w.name}
                onClick={() => toggle(w.name)}
                style={{
                  background: active ? "rgba(27,58,107,0.07)" : CARD,
                  border: `2px solid ${active ? NAVY : "#E5E7EB"}`,
                  borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                  display: "flex", alignItems: "flex-start", gap: 12, transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, border: `2px solid ${active ? NAVY : "#CBD5E1"}`,
                  background: active ? NAVY : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
                }}>
                  {active && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? NAVY : "#374151" }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, lineHeight: 1.5 }}>{w.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ ...baseBtn, padding: "12px 28px", background: CARD, color: NAVY, border: "1.5px solid #CBD5E1" }}>
            Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#6B7280", fontSize: 14 }}>{selected.size} selected</span>
            <button
              disabled={!canProceed}
              onClick={() => onNext([...selected])}
              style={{ ...baseBtn, padding: "14px 32px", background: canProceed ? GOLD : "#D1D5DB", color: canProceed ? NAVY : "#9CA3AF" }}
            >
              Score Workflows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scoring Screen
function ScoringScreen({ workflows, onFinish, onBack }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allAnswers, setAllAnswers] = useState(() => workflows.map(() => ({})));

  const wf = workflows[currentIdx];
  const answers = allAnswers[currentIdx];
  const total = workflows.length;
  const progress = ((currentIdx + 1) / total) * 100;

  const setAnswer = (key, val) => {
    const updated = [...allAnswers];
    updated[currentIdx] = { ...updated[currentIdx], [key]: val };
    setAllAnswers(updated);
  };

  const allAnswered = ALL_QUESTIONS.every(q => answers[q.key] != null);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: font, padding: "40px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Step 3 of 4</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ color: NAVY, fontSize: 24, fontWeight: 700, margin: 0 }}>Score Each Workflow</h2>
            <span style={{ color: "#6B7280", fontSize: 14, fontWeight: 600 }}>{currentIdx + 1} of {total}</span>
          </div>
          <div style={{ marginTop: 12, height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${NAVY}, ${GOLD})`, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
        </div>

        <div style={{ background: CARD, borderRadius: 14, padding: "28px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>
          <h3 style={{ color: NAVY, fontSize: 20, fontWeight: 700, margin: "0 0 28px", borderBottom: `3px solid ${GOLD}`, paddingBottom: 12, display: "inline-block" }}>{wf}</h3>

          {SCORING_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>{section.title}</span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>{section.subtitle}</div>

              {section.questions.map((q) => (
                <div key={q.key} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{q.label}</span>
                    <InfoTip text={q.tip} />
                  </div>
                  <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 10 }}>{q.desc}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {q.options.map(opt => {
                      const active = answers[q.key] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswer(q.key, opt)}
                          style={{
                            ...baseBtn, fontSize: 13, fontWeight: active ? 600 : 500, padding: "8px 16px",
                            background: active ? NAVY : "#F3F4F6", color: active ? "#fff" : "#4B5563",
                            border: `1.5px solid ${active ? NAVY : "#E5E7EB"}`,
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => currentIdx === 0 ? onBack() : setCurrentIdx(currentIdx - 1)}
            style={{ ...baseBtn, padding: "12px 28px", background: CARD, color: NAVY, border: "1.5px solid #CBD5E1" }}
          >
            {currentIdx === 0 ? "Back to Selection" : "Previous"}
          </button>
          {currentIdx < total - 1 ? (
            <button
              disabled={!allAnswered}
              onClick={() => setCurrentIdx(currentIdx + 1)}
              style={{ ...baseBtn, padding: "12px 28px", background: allAnswered ? GOLD : "#D1D5DB", color: allAnswered ? NAVY : "#9CA3AF" }}
            >
              Next
            </button>
          ) : (
            <button
              disabled={!allAnswered}
              onClick={() => onFinish(allAnswers)}
              style={{ ...baseBtn, padding: "12px 28px", background: allAnswered ? GOLD : "#D1D5DB", color: allAnswered ? NAVY : "#9CA3AF" }}
            >
              View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Results Dashboard
function ResultsDashboard({ workflows, answers, context, onRestart }) {
  const weights = useMemo(() => getWeights(context), [context]);

  const results = useMemo(() => {
    return workflows.map((w, i) => {
      const score = calculateAPS(answers[i], weights);
      const tier = getTier(score, context.readiness);
      const hours = estimateHours(answers[i]);
      const recoveryRate = getRecoveryRate(score);
      const recoverable = Math.round(hours * recoveryRate * 10) / 10;
      return { name: w, score, tier, hours, recoverable, recoveryRate, answers: answers[i] };
    }).sort((a, b) => b.score - a.score);
  }, [workflows, answers, weights, context]);

  const totals = useMemo(() => {
    const automate = results.filter(r => r.score >= 70);
    const standardize = results.filter(r => r.score >= 40 && r.score < 70);
    const monitor = results.filter(r => r.score < 40);
    const totalHours = results.reduce((s, r) => s + r.hours, 0);
    const totalRecoverable = results.reduce((s, r) => s + r.recoverable, 0);
    const biggestWin = results.reduce((best, r) => r.recoverable > best.recoverable ? r : best, results[0]);
    return { automate, standardize, monitor, total: results.length, totalHours: Math.round(totalHours * 10) / 10, totalRecoverable: Math.round(totalRecoverable * 10) / 10, biggestWin };
  }, [results]);

  const chartData = results.map(r => ({ name: r.name.length > 28 ? r.name.slice(0, 26) + "..." : r.name, score: r.score, fill: r.tier.color }));

  const contextLabels = {
    market: { soft: "Soft Market", hardening: "Hardening Market", hard: "Hard Market" },
    growth: { stable: "Stable", moderate: "Moderate Growth", rapid: "Rapid Growth" },
    painPoint: { speed: "client response time", errors: "error reduction", capacity: "staff capacity", compliance: "compliance exposure" },
    readiness: { resistant: "Resistant", cautious: "Cautious", ready: "Ready", eager: "Eager" },
  };

  // Generate executive summary
  const summary = useMemo(() => {
    const totalH = totals.totalHours;
    const recoverH = totals.totalRecoverable;
    const annualRec = Math.round(recoverH * 52);
    const top = results[0];
    const pain = contextLabels.painPoint[context.painPoint];

    let finding = "";
    if (totals.automate.length > 0 && totals.standardize.length > 0) {
      finding = `${totals.automate.length} workflow${totals.automate.length > 1 ? "s are" : " is"} ready for immediate automation, while ${totals.standardize.length} need${totals.standardize.length === 1 ? "s" : ""} standardization before automation will be effective.`;
    } else if (totals.automate.length > 0) {
      finding = `All ${totals.automate.length} assessed workflow${totals.automate.length > 1 ? "s are" : " is"} ready for immediate automation.`;
    } else if (totals.standardize.length > 0 && totals.monitor.length > 0) {
      finding = `${totals.standardize.length} workflow${totals.standardize.length > 1 ? "s" : ""} need${totals.standardize.length === 1 ? "s" : ""} process standardization before automation, and ${totals.monitor.length} can be monitored for now.`;
    } else if (totals.standardize.length > 0) {
      finding = `All ${totals.standardize.length} assessed workflows need process standardization before automation will be effective.`;
    } else {
      finding = `The assessed workflows currently show low ROI for automation. Consider reassessing as volume grows.`;
    }

    let quickWin = "";
    if (totals.biggestWin && totals.biggestWin.recoverable > 0) {
      quickWin = `Your biggest opportunity is ${totals.biggestWin.name}, where process improvement could recover an estimated ${totals.biggestWin.recoverable} hours per week (from ${totals.biggestWin.hours}h total weekly effort).`;
    }

    let contextNote = "";
    if (context.painPoint === "speed") {
      contextNote = `Because your priority is ${pain}, workflows with tight turnaround requirements and high client visibility were weighted more heavily in the scoring.`;
    } else if (context.painPoint === "errors") {
      contextNote = `Because your priority is ${pain}, workflows with high error rates and low standardization were weighted more heavily in the scoring.`;
    } else if (context.painPoint === "capacity") {
      contextNote = `Because your priority is ${pain}, workflows with high volume and significant manual effort were weighted more heavily in the scoring.`;
    } else if (context.painPoint === "compliance") {
      contextNote = `Because your priority is ${pain}, workflows with downstream compliance risk and high error rates were weighted more heavily in the scoring.`;
    }

    return { finding, quickWin, contextNote, totalH, recoverH, annualRec, top };
  }, [results, totals, context]);

  // Generate action plan per tier
  const actionPlan = useMemo(() => {
    const plan = [];
    if (totals.automate.length > 0) {
      plan.push({
        tier: "Automate Now",
        color: "#DC3545",
        bg: "#FDF2F2",
        icon: "1",
        items: totals.automate.map(r => r.name),
        hours: Math.round(totals.automate.reduce((s, r) => s + r.recoverable, 0) * 10) / 10,
        totalHours: Math.round(totals.automate.reduce((s, r) => s + r.hours, 0) * 10) / 10,
        actions: [
          "Map the current-state process with swim lanes to confirm all steps",
          "Identify which steps can be handled by Applied Epic workflow rules or email triggers",
          "Build a pilot automation for the highest-volume workflow first",
          "Measure cycle time and error rate before and after to validate improvement",
        ],
      });
    }
    if (totals.standardize.length > 0) {
      plan.push({
        tier: "Standardize First",
        color: "#D4920A",
        bg: "#FFFBEB",
        icon: totals.automate.length > 0 ? "2" : "1",
        items: totals.standardize.map(r => r.name),
        hours: Math.round(totals.standardize.reduce((s, r) => s + r.recoverable, 0) * 10) / 10,
        totalHours: Math.round(totals.standardize.reduce((s, r) => s + r.hours, 0) * 10) / 10,
        actions: [
          "Document the current process step by step with the team who does the work",
          "Identify variations and agree on one standard approach",
          "Create templates, checklists, or standard email responses",
          "Train the team on the standard process and monitor adoption for 4-6 weeks",
          "Once consistent, reassess for automation readiness",
        ],
      });
    }
    if (totals.monitor.length > 0) {
      plan.push({
        tier: "Monitor",
        color: "#16803C",
        bg: "#F0FDF4",
        icon: String(plan.length + 1),
        items: totals.monitor.map(r => r.name),
        hours: Math.round(totals.monitor.reduce((s, r) => s + r.recoverable, 0) * 10) / 10,
        totalHours: Math.round(totals.monitor.reduce((s, r) => s + r.hours, 0) * 10) / 10,
        actions: [
          "No immediate action required",
          "Reassess in 3-6 months or if volume increases significantly",
          "Track informally whether error rates or complaints increase",
        ],
      });
    }
    return plan;
  }, [totals]);

  const downloadCSV = useCallback(() => {
    const headers = ["Workflow", "Score", "Tier", "Current Weekly Hours", "Recoverable Hours/Week", "Recovery Rate", "Volume", "Effort", "Turnaround", "Standardization", "Documentation", "Error Risk", "Downstream Impact", "Client Visibility", "System Touchpoints"];
    const rows = results.map(r => [
      r.name, r.score, r.tier.label, r.hours, r.recoverable, Math.round(r.recoveryRate * 100) + "%",
      r.answers.volume, r.answers.effort, r.answers.turnaround, r.answers.standardization,
      r.answers.documentation, r.answers.errorRisk, r.answers.downstreamImpact,
      r.answers.clientVisibility, r.answers.systemTouchpoints
    ]);
    const ctxLabels = { market: { soft: "Soft Market", hardening: "Hardening Market", hard: "Hard Market" }, growth: { stable: "Stable", moderate: "Moderate Growth", rapid: "Rapid Growth" }, painPoint: { speed: "Client Response Time", errors: "Error Reduction", capacity: "Staff Capacity", compliance: "Compliance Exposure" }, readiness: { resistant: "Resistant", cautious: "Cautious", ready: "Ready", eager: "Eager" } };
    const contextRows = [
      [], ["Business Context"],
      ["Market", ctxLabels.market[context.market]],
      ["Growth", ctxLabels.growth[context.growth]],
      ["Pain Point", ctxLabels.painPoint[context.painPoint]],
      ["Readiness", ctxLabels.readiness[context.readiness]],
    ];
    const csv = [headers, ...rows, ...contextRows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Workflow_Triage_Results.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [results, context]);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: font, padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Results</div>
          <h2 style={{ color: NAVY, fontSize: 28, fontWeight: 700, margin: 0 }}>Assessment Findings</h2>
        </div>

        {/* Executive Summary */}
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0F2444 100%)`, borderRadius: 16, padding: "32px 36px", marginBottom: 28, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Executive Summary</div>

          <div style={{ display: "flex", gap: 32, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GOLD }}>{totals.total}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Workflows Assessed</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GOLD }}>{summary.totalH}h</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Current Weekly Hours</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GOLD }}>{summary.recoverH}h</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Recoverable per Week</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: GOLD }}>~{summary.annualRec}h</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Annual Hours Recoverable</div>
            </div>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", margin: "0 0 12px" }}>
            {summary.finding}
          </p>
          {summary.quickWin && (
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", margin: "0 0 12px" }}>
              {summary.quickWin}
            </p>
          )}
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", margin: 0, fontStyle: "italic" }}>
            {summary.contextNote}
          </p>
        </div>

        {/* Scoring context pills */}
        <div style={{ background: "rgba(27,58,107,0.06)", borderRadius: 12, padding: "14px 22px", marginBottom: 28, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Scored for:</span>
          {[
            contextLabels.market[context.market] || "",
            contextLabels.growth[context.growth] || "",
            "Focus: " + (contextLabels.painPoint[context.painPoint] || ""),
            "Team: " + ({ resistant: "Resistant", cautious: "Cautious", ready: "Ready", eager: "Eager" }[context.readiness] || ""),
          ].map(label => (
            <span key={label} style={{ fontSize: 12, color: "#4B5563", background: "#fff", padding: "4px 12px", borderRadius: 20, fontWeight: 500 }}>{label}</span>
          ))}
        </div>

        {/* Action Plan */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: NAVY, fontSize: 20, fontWeight: 700, margin: "0 0 18px" }}>Recommended Action Plan</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {actionPlan.map((plan) => (
              <div key={plan.tier} style={{ background: CARD, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                <div style={{ background: plan.bg, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: plan.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
                      {plan.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: plan.color }}>{plan.tier}</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{plan.items.length} workflow{plan.items.length > 1 ? "s" : ""} · ~{plan.hours}h/week recoverable (from {plan.totalHours}h total)</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>
                    <strong style={{ color: NAVY }}>Workflows:</strong> {plan.items.join(", ")}
                  </div>
                  <div style={{ fontSize: 13, color: NAVY, fontWeight: 600, marginBottom: 8 }}>Next Steps:</div>
                  {plan.actions.map((action, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#4B5563", lineHeight: 1.6 }}>
                      <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Chart */}
        <div style={{ background: CARD, borderRadius: 14, padding: "24px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 28 }}>
          <h3 style={{ color: NAVY, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Priority Ranking</h3>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 18px" }}>Automation Priority Score (0-100) based on 9 weighted dimensions</p>
          <ResponsiveContainer width="100%" height={Math.max(200, results.length * 52)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12, fill: "#4B5563" }} />
              <Tooltip formatter={(v) => [`${v} / 100`, "APS"]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={28}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Workflow Cards */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ color: NAVY, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Detailed Breakdown</h3>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 18px" }}>Individual scores and key metrics for each assessed workflow</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {results.map((r, idx) => (
              <div key={idx} style={{ background: CARD, borderRadius: 14, padding: "22px 26px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: `5px solid ${r.tier.color}`, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 70, textAlign: "center" }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: r.tier.color, lineHeight: 1 }}>{r.score}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>APS</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>{r.name}</span>
                    <span style={{ background: r.tier.bg, color: r.tier.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {r.tier.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 10 }}>{r.tier.rec}</div>
                  <div style={{ display: "flex", gap: 0, flexWrap: "wrap", fontSize: 12 }}>
                    {[
                      { label: "Current Hours", value: `${r.hours}h/wk`, bold: false },
                      { label: "Recoverable", value: `~${r.recoverable}h/wk`, bold: true },
                      { label: "Volume", value: r.answers.volume },
                      { label: "Effort", value: r.answers.effort },
                      { label: "Turnaround", value: r.answers.turnaround },
                      { label: "Client Facing", value: r.answers.clientVisibility },
                    ].map((m, mi) => (
                      <div key={mi} style={{ padding: "6px 12px", borderRight: mi < 5 ? "1px solid #F0F0F0" : "none" }}>
                        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 13, color: m.bold ? NAVY : "#4B5563", fontWeight: m.bold ? 700 : 500 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", paddingBottom: 60 }}>
          <button onClick={downloadCSV} style={{ ...baseBtn, padding: "14px 28px", background: NAVY, color: "#fff" }}>
            Download CSV
          </button>
          <button onClick={onRestart} style={{ ...baseBtn, padding: "14px 28px", background: CARD, color: NAVY, border: `2px solid ${NAVY}` }}>
            Start Over
          </button>
        </div>

        <div style={{ textAlign: "center", paddingBottom: 32, fontSize: 12, color: "#9CA3AF" }}>
          Built by Shubham Mittal · Workflow Triage Prioritization Engine
        </div>
      </div>
    </div>
  );
}

// App
export default function App() {
  const [step, setStep] = useState("welcome");
  const [context, setContext] = useState({});
  const [selectedWorkflows, setSelectedWorkflows] = useState([]);
  const [scoredAnswers, setScoredAnswers] = useState([]);

  if (step === "welcome") return <WelcomeScreen onStart={() => setStep("context")} />;

  if (step === "context") return (
    <ContextScreen
      onBack={() => setStep("welcome")}
      onNext={(ctx) => { setContext(ctx); setStep("select"); }}
    />
  );

  if (step === "select") return (
    <WorkflowSelector
      onBack={() => setStep("context")}
      onNext={(wfs) => { setSelectedWorkflows(wfs); setStep("score"); }}
    />
  );

  if (step === "score") return (
    <ScoringScreen
      workflows={selectedWorkflows}
      onBack={() => setStep("select")}
      onFinish={(ans) => { setScoredAnswers(ans); setStep("results"); }}
    />
  );

  if (step === "results") return (
    <ResultsDashboard
      workflows={selectedWorkflows}
      answers={scoredAnswers}
      context={context}
      onRestart={() => { setStep("welcome"); setContext({}); setSelectedWorkflows([]); setScoredAnswers([]); }}
    />
  );

  return null;
}
