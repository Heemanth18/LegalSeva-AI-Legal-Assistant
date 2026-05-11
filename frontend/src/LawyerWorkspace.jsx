import { useState, useRef } from "react";
import { LawyerDocumentAnalyser } from "./DocumentAnalyser.jsx";

const BASE = "http://localhost:8000";

async function lawyerRequest(path, body, token, signal) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request cancelled.");
    throw e;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CASE_TYPES = [
  "Criminal", "Civil", "Family", "Consumer", "Constitutional / PIL",
  "Cybercrime", "Labour / Employment", "Property / Land", "Other",
];

const TOOLS = [
  { id: "bail_application", label: "Bail Application",   icon: "🔓", task: "draft",    doc_type: "bail_application", desc: "Sec 437/439 CrPC" },
  { id: "strategy",         label: "Strategy Planner",   icon: "🧠", task: "strategy", desc: "AI case strategy memo" },
  { id: "similar",          label: "Similar Cases",      icon: "⚖", task: "similar",  desc: "Precedents across courts" },
  { id: "legal_notice",     label: "Legal Notice",       icon: "📨", task: "draft",    doc_type: "legal_notice", desc: "Civil / defamation" },
  { id: "vakalatnama",      label: "Vakalatnama",         icon: "✍", task: "draft",    doc_type: "vakalatnama", desc: "Authority to appear" },
  { id: "petition",         label: "Petition / Writ",    icon: "📜", task: "draft",    doc_type: "petition", desc: "PIL, HC, SC" },
  { id: "complaint",        label: "Complaint Draft",    icon: "📋", task: "draft",    doc_type: "complaint", desc: "Police / Magistrate" },
  { id: "research",         label: "Case Research",      icon: "🔍", task: "research", desc: "Judgements & IPC sections" },
  { id: "ocr",              label: "Document Analysis",  icon: "📋", task: "ocr",      desc: "Read, brief & verify docs" },
];

const COURT_FILTERS = [
  { value: "all",      label: "All Courts" },
  { value: "supreme",  label: "Supreme Court" },
  { value: "high",     label: "High Court (States)" },
  { value: "district", label: "District Courts" },
];

const COURT_KW = {
  supreme:  ["supreme court", "sc"],
  high:     ["high court", "hc"],
  district: ["district court", "sessions court", "magistrate", "cjm", "additional sessions"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function filterCourts(cases, filter) {
  if (!filter || filter === "all") return cases;
  const kws = COURT_KW[filter] || [];
  return cases.filter(c => kws.some(k => (c?.court || "").toLowerCase().includes(k)));
}

function SimpleMarkdown({ text }) {
  if (!text) return null;
  return (
    <div className="md-body">
      {String(text).split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="md-h2">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="md-h3">{line.slice(4)}</h4>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} className="md-li">• {line.slice(2)}</div>;
        if (line.match(/^\d+\. /)) return <div key={i} className="md-li">{line}</div>;
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return <p key={i} className="md-p">{parts.map((p, j) => p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</p>;
      })}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CASE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
  "Criminal":            { bg: "#fef2f2", color: "#b91c1c", border: "#fca5a5" },
  "Civil":               { bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd" },
  "Family":              { bg: "#fdf4ff", color: "#7e22ce", border: "#d8b4fe" },
  "Consumer":            { bg: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  "Constitutional / PIL":{ bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  "Cybercrime":          { bg: "#f0f9ff", color: "#0369a1", border: "#7dd3fc" },
  "Labour / Employment": { bg: "#fefce8", color: "#a16207", border: "#fde047" },
  "Property / Land":     { bg: "#fdf6e9", color: "#92400e", border: "#fcd34d" },
  "Other":               { bg: "#f5f5f5", color: "#525252", border: "#d4d4d4" },
};

function getStatusStyle(type) {
  return STATUS_COLORS[type] || STATUS_COLORS["Other"];
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

function CaseDashboard({ cases, onNewCase, onOpenCase, onEditCase, onDeleteCase, meta }) {
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [sortBy,    setSortBy]    = useState("newest");
  const [confirmDel,setConfirmDel]= useState(null);

  const caseTypes = ["all", ...Array.from(new Set(cases.map(c => c.caseType).filter(Boolean)))];

  const filtered = cases
    .filter(c => {
      if (filter !== "all" && c.caseType !== filter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (c.clientName  || "").toLowerCase().includes(s) ||
        (c.accusedName || "").toLowerCase().includes(s) ||
        (c.sections    || "").toLowerCase().includes(s) ||
        (c.description || "").toLowerCase().includes(s) ||
        (c.firNumber   || "").toLowerCase().includes(s) ||
        (c.court       || "").toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sortBy === "client") return (a.clientName||"").localeCompare(b.clientName||"");
      return 0;
    });

  return (
    <div className="dashboard-shell">
      {/* Header row */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">My Cases</h2>
          <p className="dashboard-sub">
            Welcome back, <strong>{meta?.name || "Advocate"}</strong> · {cases.length} case{cases.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <button className="btn-primary lawyer-btn dashboard-new-btn" onClick={onNewCase}>
          + New Case
        </button>
      </div>

      {/* Empty state */}
      {cases.length === 0 && (
        <div className="dashboard-empty">
          <div className="dashboard-empty-icon">📁</div>
          <div className="dashboard-empty-title">No cases yet</div>
          <div className="dashboard-empty-sub">Click "New Case" to add your first case description</div>
          <button className="btn-primary lawyer-btn" onClick={onNewCase} style={{marginTop:"1rem"}}>
            + Add First Case
          </button>
        </div>
      )}

      {cases.length > 0 && (
        <>
          {/* Search + filter bar */}
          <div className="dashboard-controls">
            <input
              className="form-input dashboard-search"
              placeholder="🔍  Search by client, accused, FIR, section, court…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="form-input dashboard-filter" value={filter} onChange={e => setFilter(e.target.value)}>
              {caseTypes.map(t => <option key={t} value={t}>{t === "all" ? "All types" : t}</option>)}
            </select>
            <select className="form-input dashboard-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="client">Client A–Z</option>
            </select>
          </div>

          {/* Stats row */}
          <div className="dashboard-stats-row">
            {Object.entries(
              cases.reduce((acc, c) => { acc[c.caseType || "Other"] = (acc[c.caseType || "Other"] || 0) + 1; return acc; }, {})
            ).map(([type, count]) => {
              const s = getStatusStyle(type);
              return (
                <button key={type} className="dash-stat-pill"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                  onClick={() => setFilter(filter === type ? "all" : type)}>
                  {type} · {count}
                </button>
              );
            })}
          </div>

          {/* Case grid */}
          {filtered.length === 0 ? (
            <div className="dashboard-empty" style={{padding:"2rem"}}>
              <div style={{fontSize:13,color:"var(--text-tertiary)"}}>No cases match your search.</div>
            </div>
          ) : (
            <div className="case-cards-grid">
              {filtered.map(c => {
                const s = getStatusStyle(c.caseType);
                return (
                  <div key={c.id} className="case-dash-card">
                    {/* Type badge */}
                    <div className="case-dash-top">
                      <span className="case-dash-type" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                        {c.caseType || "General"}
                      </span>
                      <span className="case-dash-date">{formatDate(c.updatedAt)}</span>
                    </div>

                    {/* Client / accused */}
                    <div className="case-dash-client">
                      {c.clientName || <span style={{color:"var(--text-tertiary)"}}>Unnamed client</span>}
                    </div>
                    {c.accusedName && (
                      <div className="case-dash-accused">vs. {c.accusedName}</div>
                    )}

                    {/* Sections */}
                    {c.sections && (
                      <div className="case-dash-sections">{c.sections}</div>
                    )}

                    {/* Description preview */}
                    {c.description && (
                      <div className="case-dash-desc">
                        {c.description.slice(0, 100)}{c.description.length > 100 ? "…" : ""}
                      </div>
                    )}

                    {/* Meta chips */}
                    <div className="case-dash-meta">
                      {c.court        && <span className="case-dash-chip">🏛 {c.court}</span>}
                      {c.firNumber    && <span className="case-dash-chip">📋 FIR {c.firNumber}</span>}
                      {c.policeStation&& <span className="case-dash-chip">🚔 {c.policeStation}</span>}
                      {c.witnesses    && <span className="case-dash-chip">👁 {c.witnesses}</span>}
                    </div>

                    {/* Actions */}
                    <div className="case-dash-actions">
                      <button className="btn-primary lawyer-btn sm" onClick={() => onOpenCase(c)}>
                        Open Case →
                      </button>
                      <button className="btn-outline sm" onClick={() => onEditCase(c)}>Edit</button>
                      <button className="btn-outline sm danger-outline"
                        onClick={() => setConfirmDel(c.id)}>Delete</button>
                    </div>

                    {/* Delete confirm */}
                    {confirmDel === c.id && (
                      <div className="case-dash-confirm">
                        <span style={{fontSize:13,color:"var(--danger)"}}>Delete this case?</span>
                        <button className="btn-outline sm" style={{color:"var(--danger)",borderColor:"var(--danger)"}}
                          onClick={() => { onDeleteCase(c.id); setConfirmDel(null); }}>Yes, delete</button>
                        <button className="btn-outline sm" onClick={() => setConfirmDel(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── STEP 1: Case Description Form ────────────────────────────────────────────
function CaseDescriptionForm({ onSubmit, initialData, onBack }) {
  const [form, setForm] = useState(initialData || {
    clientName:    "",
    accusedName:   "",
    caseType:      "",
    sections:      "",
    description:   "",
    witnesses:     "",
    policeStation: "",
    firNumber:     "",
    court:         "",
  });
  const [error, setError] = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError(""); }

  function submit() {
    if (!form.description.trim()) { setError("Please provide a case description."); return; }
    if (!form.caseType) { setError("Please select a case type."); return; }
    onSubmit(form);
  }

  return (
    <div className="case-form-shell">
      <div className="case-form-header">
        <div className="case-form-icon">📁</div>
        <div>
          <h2 className="case-form-title">Case Description</h2>
          <p className="case-form-sub">Fill in the details — then choose what you need</p>
        </div>
      </div>

      <div className="case-form-grid">
        {/* Row 1 */}
        <div className="form-group">
          <label className="form-label">Client Name</label>
          <input className="form-input" placeholder="e.g. Rajesh Kumar" value={form.clientName}
            onChange={e => set("clientName", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Accused / Opposite Party Name</label>
          <input className="form-input" placeholder="e.g. Suresh Rao" value={form.accusedName}
            onChange={e => set("accusedName", e.target.value)} />
        </div>

        {/* Row 2 */}
        <div className="form-group">
          <label className="form-label">Type of Case <span className="req">*</span></label>
          <select className="form-input" value={form.caseType} onChange={e => set("caseType", e.target.value)}>
            <option value="">Select type…</option>
            {CASE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Sections Filed / Framed</label>
          <input className="form-input" placeholder="e.g. IPC 302, 307, 34" value={form.sections}
            onChange={e => set("sections", e.target.value)} />
        </div>

        {/* Row 3 - full width */}
        <div className="form-group full-width">
          <label className="form-label">Description of Crime / Case <span className="req">*</span></label>
          <textarea className="form-input facts-area" rows={5}
            placeholder="Describe the facts: what happened, when, where, how. Include any prior orders, bail history, key evidence…"
            value={form.description} onChange={e => set("description", e.target.value)} />
        </div>

        {/* Row 4 */}
        <div className="form-group">
          <label className="form-label">Witnesses Available</label>
          <input className="form-input" placeholder="Names or count, e.g. 2 eyewitnesses" value={form.witnesses}
            onChange={e => set("witnesses", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Court (if known)</label>
          <input className="form-input" placeholder="e.g. Sessions Court, Bengaluru" value={form.court}
            onChange={e => set("court", e.target.value)} />
        </div>

        {/* Row 5 */}
        <div className="form-group">
          <label className="form-label">Police Station</label>
          <input className="form-input" placeholder="e.g. Indiranagar PS" value={form.policeStation}
            onChange={e => set("policeStation", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">FIR Number (if registered)</label>
          <input className="form-input" placeholder="e.g. 123/2024" value={form.firNumber}
            onChange={e => set("firNumber", e.target.value)} />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div style={{display:"flex",gap:"8px",marginTop:"0.5rem"}}>
        {onBack && <button className="btn-outline" style={{flex:"0 0 auto"}} onClick={onBack}>← Dashboard</button>}
        <button className="btn-primary lawyer-btn" style={{flex:1}} onClick={submit}>
          Continue — Choose Action →
        </button>
      </div>
    </div>
  );
}

// ── STEP 2: Tool Selector ─────────────────────────────────────────────────────
function ToolSelector({ caseData, onSelect, onBack, onDashboard }) {
  return (
    <div className="tool-selector-shell">
      <div className="tool-selector-header">
        <button className="back-link" onClick={onBack}>← Edit case details</button>
        {onDashboard && <button className="back-link" style={{marginLeft:"auto",color:"var(--primary)"}} onClick={onDashboard}>📁 Dashboard</button>}
        <div className="case-pill-summary">
          <span className="case-pill-type">{caseData.caseType}</span>
          {caseData.clientName && <span className="case-pill-client">{caseData.clientName}</span>}
          {caseData.sections && <span className="case-pill-sections">{caseData.sections}</span>}
        </div>
      </div>
      <h2 className="tool-selector-title">What do you need?</h2>
      <p className="tool-selector-sub">Select an action based on your case</p>
      <div className="tools-grid">
        {TOOLS.map(tool => (
          <button key={tool.id} className="tool-card" onClick={() => onSelect(tool)}>
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
            <span className="tool-desc">{tool.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── STEP 3: Result Panel ──────────────────────────────────────────────────────
function ResultPanel({ tool, result, docResult, loading, error, courtFilter, setCourtFilter, token, onBack, onCancel }) {
  function copyDoc() {
    if (docResult?.document) navigator.clipboard.writeText(docResult.document).catch(() => {});
  }
  function downloadDoc() {
    if (!docResult?.document) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([docResult.document], { type: "text/plain" }));
    a.download = `${tool.doc_type || tool.id}_draft.txt`;
    a.click();
  }

  const allCases      = result?.cases || [];
  const filteredCases = tool.task === "similar" ? filterCourts(allCases, courtFilter) : allCases;

  return (
    <div className="result-panel-shell">
      <div className="result-panel-header">
        <button className="back-link" onClick={onBack}>← Back to tools</button>
        <div className="result-tool-badge">
          <span>{tool.icon}</span> {tool.label}
        </div>
      </div>

      {loading && (
        <>
          <div className="result-loading-msg">
            ⏳ {tool.task === "draft" ? "Drafting document" : tool.task === "strategy" ? "Building strategy" : "Searching"} — please wait…
            <button className="btn-outline sm" style={{ marginLeft: 12 }} onClick={onCancel}>Cancel</button>
          </div>
          <div className="skeleton-area">
            <div className="skeleton-line w80" /><div className="skeleton-line w60" />
            <div className="skeleton-line w90" /><div className="skeleton-line w50" />
          </div>
        </>
      )}

      {error && (
        <div className="error-box">
          <div className="error-title">Something went wrong</div>
          <div className="error-short">{error}</div>
          <div style={{ fontSize: 12, color: "#9a9a9a", marginTop: 6 }}>Make sure Ollama is running: <code>ollama serve</code></div>
        </div>
      )}

      {/* Draft result */}
      {!loading && docResult && (
        <div className="result-area">
          <div className="draft-toolbar">
            <h3 className="section-heading">Draft — {(tool.doc_type || "").replace(/_/g, " ")}</h3>
            <div className="draft-actions">
              <button className="btn-outline sm" onClick={copyDoc}>Copy</button>
              <button className="btn-outline sm" onClick={downloadDoc}>Download .txt</button>
            </div>
          </div>
          {docResult.instructions && <div className="instructions-box">ℹ {docResult.instructions}</div>}
          <pre className="draft-text">{docResult.document}</pre>
        </div>
      )}

      {/* Research / Strategy / Similar result */}
      {!loading && result && (
        <div className="result-area">
          {result.answer && (
            <div className={`result-answer ${tool.task === "strategy" ? "strategy-result" : ""}`}>
              <SimpleMarkdown text={result.answer} />
            </div>
          )}

          {Array.isArray(result.applicable_sections) && result.applicable_sections.length > 0 && (
            <div className="section-chips">
              {result.applicable_sections.map((s, i) => (
                <span key={i} className="section-chip">§ {s?.section || s} {s?.title || ""}</span>
              ))}
            </div>
          )}

          {/* OCR panel */}
      {tool.task === "ocr" && !loading && (
        <LawyerDocumentAnalyser token={token} />
      )}

      {/* Court filter for similar cases */}
          {tool.task === "similar" && allCases.length > 0 && (
            <div className="court-filter-row" style={{ marginTop: "1rem" }}>
              <span className="court-filter-label">Filter by court:</span>
              <div className="court-filter-pills">
                {COURT_FILTERS.map(cf => (
                  <button key={cf.value}
                    className={`court-pill ${courtFilter === cf.value ? "active" : ""}`}
                    onClick={() => setCourtFilter(cf.value)}>
                    {cf.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCases.length > 0 && (
            <div className="cases-list" style={{ marginTop: "1rem" }}>
              <div className="cases-list-header">
                <h3 className="section-heading" style={{ margin: 0 }}>
                  {tool.task === "strategy" ? "Key precedents" : tool.task === "similar" ? "Similar cases" : "Relevant cases"}
                </h3>
                {tool.task === "similar" && (
                  <span className="cases-count-badge">
                    {filteredCases.length === allCases.length ? `${allCases.length} found` : `${filteredCases.length} of ${allCases.length}`}
                  </span>
                )}
              </div>
              {filteredCases.length === 0 ? (
                <div className="no-cases-msg">No cases for selected court. Try "All Courts".</div>
              ) : filteredCases.map((c, i) => <CaseCard key={i} c={c} showSimilarity={tool.task === "similar"} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CaseCard({ c, showSimilarity }) {
  const [open, setOpen] = useState(false);
  const outcome = c?.outcome_for_client || "";
  const color = outcome === "favourable" ? "#0d5c3a" : outcome === "unfavourable" ? "#b91c1c" : "#6b7280";
  return (
    <div className="case-card" onClick={() => setOpen(o => !o)}>
      <div className="case-card-top">
        <div className="case-name">{c?.case_name || c?.title || "Untitled"}</div>
        <div className="case-meta-row">
          {c?.court && <span className="badge gray">{c.court}</span>}
          {c?.year  && <span className="badge gray">{c.year}</span>}
          {outcome  && <span className="badge" style={{ color, borderColor: color }}>{outcome}</span>}
        </div>
      </div>
      {c?.citation && <div className="case-citation">{c.citation}</div>}
      <div className="case-holding">{c?.key_holding || c?.key_principle || ""}</div>
      {open && (
        <div className="case-expanded">
          {c?.similarity_reason && <p><strong>Why similar:</strong> {c.similarity_reason}</p>}
          {c?.relevance          && <p><strong>Relevance:</strong> {c.relevance}</p>}
          {showSimilarity && outcome && <p><strong>Outcome for client:</strong> <span style={{ color }}>{outcome}</span></p>}
        </div>
      )}
      <div className="case-toggle">{open ? "▲ less" : "▼ more"}</div>
    </div>
  );
}

// ── Main Workspace ────────────────────────────────────────────────────────────
export default function LawyerWorkspace({ token, meta, onLogout }) {
  // Steps: "dashboard" | "form" → "tools" → "result"
  const [step,         setStep]         = useState("dashboard");
  const [cases,        setCases]        = useState(() => {
    try { return JSON.parse(localStorage.getItem("ls_cases") || "[]"); }
    catch { return []; }
  });
  const [caseData,     setCaseData]     = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [docResult,    setDocResult]    = useState(null);
  const [error,        setError]        = useState("");
  const [courtFilter,  setCourtFilter]  = useState("all");
  const abortRef = useRef(null);

  function handleCaseSubmit(data, existingId = null) {
    setCaseData(data);
    // Save/update case in localStorage
    const now = new Date().toISOString();
    let updated;
    if (existingId) {
      updated = cases.map(c => c.id === existingId ? { ...c, ...data, updatedAt: now } : c);
    } else {
      const newCase = { ...data, id: Date.now().toString(), createdAt: now, updatedAt: now };
      updated = [newCase, ...cases];
    }
    setCases(updated);
    localStorage.setItem("ls_cases", JSON.stringify(updated));
    setStep("tools");
  }

  function handleDeleteCase(id) {
    const updated = cases.filter(c => c.id !== id);
    setCases(updated);
    localStorage.setItem("ls_cases", JSON.stringify(updated));
  }

  async function handleToolSelect(tool) {
    setSelectedTool(tool);
    setStep("result");
    setResult(null);
    setDocResult(null);
    setError("");
    setCourtFilter("all");

    // OCR tool renders its own UI — no LLM call needed here
    if (tool.task === "ocr") return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    // Build text from caseData
    const text = buildPrompt(caseData, tool);

    try {
      const body = {
        text:      text.slice(0, 3000),
        task:      tool.task,
        doc_type:  tool.doc_type || null,
        case_meta: caseData,
      };
      const data = await lawyerRequest("/lawyer/analyze", body, token, ctrl.signal);
      if (tool.task === "draft") setDocResult(data);
      else setResult(data);
    } catch (e) {
      if (e?.message !== "Request cancelled.") setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function buildPrompt(d, tool) {
    const lines = [];
    if (d.clientName)    lines.push(`Client: ${d.clientName}`);
    if (d.accusedName)   lines.push(`Accused: ${d.accusedName}`);
    if (d.caseType)      lines.push(`Case type: ${d.caseType}`);
    if (d.sections)      lines.push(`Sections: ${d.sections}`);
    if (d.description)   lines.push(`Facts: ${d.description}`);
    if (d.witnesses)     lines.push(`Witnesses: ${d.witnesses}`);
    if (d.court)         lines.push(`Court: ${d.court}`);
    if (d.policeStation) lines.push(`Police station: ${d.policeStation}`);
    if (d.firNumber)     lines.push(`FIR: ${d.firNumber}`);
    lines.push(`\nTask: ${tool.label}`);
    return lines.join("\n");
  }

  function cancelRequest() {
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
  }

  return (
    <div className="app-shell lawyer">
      <header className="header lawyer-header">
        <div className="header-brand">
          <div className="brand-icon lawyer-icon">⚖</div>
          <div>
            <div className="brand-name">LegalSeva — Advocate Workspace</div>
            <div className="brand-sub verified-badge">✓ Verified · Bar Council of India</div>
          </div>
        </div>
        {/* Step breadcrumb */}
        <div className="step-breadcrumb">
          <span className={`step-crumb ${step === "dashboard" ? "active" : ""}`}>📁 Cases</span>
          <span className="step-sep">›</span>
          <span className={`step-crumb ${step === "form" ? "active" : ["tools","result"].includes(step) ? "done" : ""}`}>1 Case Details</span>
          <span className="step-sep">›</span>
          <span className={`step-crumb ${step === "tools" ? "active" : step === "result" ? "done" : ""}`}>2 Choose Action</span>
          <span className="step-sep">›</span>
          <span className={`step-crumb ${step === "result" ? "active" : ""}`}>3 Result</span>
        </div>
        <div className="header-actions">
          <button className={`btn-outline ${step==="dashboard"?"btn-outline-active":""}`} onClick={() => setStep("dashboard")}>📁 My Cases ({cases.length})</button>
          <div className="advocate-pill">{meta?.name || "Advocate"}</div>
          <button className="btn-outline" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="workspace-body">
        {step === "dashboard" && (
          <CaseDashboard
            cases={cases}
            onNewCase={() => { setCaseData(null); setStep("form"); }}
            onOpenCase={(c) => { setCaseData(c); setStep("tools"); }}
            onEditCase={(c) => { setCaseData(c); setStep("form"); }}
            onDeleteCase={handleDeleteCase}
            meta={meta}
          />
        )}
        {step === "form" && (
          <CaseDescriptionForm onSubmit={handleCaseSubmit} initialData={caseData} onBack={() => setStep("dashboard")} />
        )}
        {step === "tools" && (
          <ToolSelector
            caseData={caseData}
            onSelect={handleToolSelect}
            onBack={() => setStep("form")}
            onDashboard={() => setStep("dashboard")}
          />
        )}
        {step === "result" && (
          <ResultPanel
            tool={selectedTool}
            result={result}
            docResult={docResult}
            loading={loading}
            error={error}
            courtFilter={courtFilter}
            setCourtFilter={setCourtFilter}
            token={token}
            onBack={() => { setStep("tools"); setResult(null); setDocResult(null); setError(""); }}
            onCancel={cancelRequest}
          />
        )}
      </div>
    </div>
  );
}