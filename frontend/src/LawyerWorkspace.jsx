import { useState, useRef } from "react";
import { LawyerDocumentAnalyser } from "./DocumentAnalyser.jsx";
import ReactMarkdown from "react-markdown";

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
  { id: "bail_application", label: "Bail Application", icon: "description", task: "draft", doc_type: "bail_application", desc: "Generate automated bail drafts for local courts." },
  { id: "strategy", label: "Strategy Planner", icon: "strategy", task: "strategy", desc: "AI-driven analysis for defense or prosecution." },
  { id: "similar", label: "Similar Cases", icon: "travel_explore", task: "similar", desc: "Find relevant precedents and citations instantly." },
  { id: "judgement_bot", label: "Judgement Bot", icon: "gavel", task: "research", desc: "Predict outcomes based on current evidence." },
  { id: "citation_finder", label: "Citation Finder", icon: "history_edu", task: "research", desc: "Lookup SCC and AIR citations automatically." },
  { id: "case_summary", label: "Case Summary", icon: "summarize", task: "research", desc: "Summarize 100+ pages of case law in seconds." },
  { id: "ocr", label: "Document Analysis", icon: "quick_reference_all", task: "ocr", desc: "Read, brief & verify physical docs via OCR." },
];

const COURT_FILTERS = [
  { value: "all", label: "All Courts" },
  { value: "supreme", label: "Supreme Court" },
  { value: "high", label: "High Court" },
  { value: "district", label: "District Courts" },
];

const COURT_KW = {
  supreme: ["supreme court", "sc"],
  high: ["high court", "hc"],
  district: ["district court", "sessions court", "magistrate", "cjm", "additional sessions"],
};

function filterCourts(cases, filter) {
  if (!filter || filter === "all") return cases;
  const kws = COURT_KW[filter] || [];
  return cases.filter(c => kws.some(k => (c?.court || "").toLowerCase().includes(k)));
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ══════════════════════════════════════════════════════════════════════════════
// CASE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

function CaseDashboard({ cases, onNewCase, onOpenCase, onEditCase, onDeleteCase, meta }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = cases
    .filter(c => {
      if (filter !== "all" && c.caseType !== filter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (c.clientName || "").toLowerCase().includes(s) ||
        (c.accusedName || "").toLowerCase().includes(s) ||
        (c.sections || "").toLowerCase().includes(s) ||
        (c.description || "").toLowerCase().includes(s) ||
        (c.firNumber || "").toLowerCase().includes(s) ||
        (c.court || "").toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
      return 0;
    });

  return (
    <section className="flex flex-col gap-[1.5rem] animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-white">My Cases</h1>
          <p className="text-on-surface-variant font-body-md opacity-80 mt-1">Welcome back, <strong>{meta?.name || "Advocate"}</strong> · {cases.length} active case files.</p>
        </div>
        <button className="gold-bg-gradient text-on-primary-fixed py-[9px] px-[20px] rounded-[10px] font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/20" onClick={onNewCase}>
          <span className="material-symbols-outlined align-middle">add</span>
          New Case
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-[1rem] bg-surface-container p-2 rounded-[16px] border border-white/5">
        <div className="flex-grow min-w-[240px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 align-middle">search</span>
          <input 
            className="w-full bg-surface-container-low border border-white/5 rounded-[10px] pl-10 pr-4 py-[9px] text-body-md text-white focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/20" 
            placeholder="Search cases..." 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="bg-surface-container-low border border-white/5 rounded-[10px] px-4 py-[9px] text-label-md font-bold text-on-surface focus:border-primary outline-none transition-all cursor-pointer" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Types</option>
          {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="bg-surface-container-low border border-white/5 rounded-[10px] px-4 py-[9px] text-label-md font-bold text-on-surface focus:border-primary outline-none transition-all cursor-pointer" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Latest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[1.25rem]">
        {filtered.map(c => (
          <div key={c.id} className="bg-surface-container-low p-[1.25rem] rounded-[16px] border border-white/5 flex flex-col gap-[8px] hover:translate-y-[-4px] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 group relative">
            <div className="flex justify-between items-start">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-[6px] font-bold text-[10px] uppercase tracking-widest">{c.caseType || "Criminal"}</span>
              <span className="text-on-surface-variant/40 font-bold text-[10px] uppercase tracking-widest">{formatDate(c.updatedAt)}</span>
            </div>
            <h3 className="font-headline-md text-base text-white line-clamp-2 mt-2">{c.clientName} vs. {c.accusedName || "State"}</h3>
            <p className="text-xs text-on-surface-variant/60 line-clamp-2 leading-relaxed">{c.description}</p>
            <div className="mt-auto flex gap-2 pt-4 border-t border-white/5">
              <button className="flex-grow py-[6px] px-[14px] bg-white/5 hover:gold-bg-gradient hover:text-on-primary-fixed rounded-[10px] font-bold text-[11px] uppercase tracking-widest transition-all" onClick={() => onOpenCase(c)}>Open</button>
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-[10px] transition-colors" onClick={() => onEditCase(c)}><span className="material-symbols-outlined text-sm align-middle">edit</span></button>
              <button className="p-2 bg-white/5 hover:bg-error/10 text-error rounded-[10px] transition-colors" onClick={() => setConfirmDel(c.id)}><span className="material-symbols-outlined text-sm align-middle">delete</span></button>
            </div>
            {confirmDel === c.id && (
              <div className="absolute inset-0 bg-surface/95 backdrop-blur-sm flex flex-col items-center justify-center p-[1.25rem] rounded-[16px] z-10 text-center gap-4">
                <p className="text-xs font-bold uppercase tracking-widest">Delete Case File?</p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-error text-white rounded-[10px] text-[10px] font-bold uppercase tracking-widest" onClick={() => { onDeleteCase(c.id); setConfirmDel(null); }}>Confirm</button>
                  <button className="px-4 py-2 bg-white/10 rounded-[10px] text-[10px] font-bold uppercase tracking-widest" onClick={() => setConfirmDel(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-surface-container rounded-[16px] border border-white/5 border-dashed">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/10 align-middle">folder_open</span>
            <p className="text-on-surface-variant/30 mt-4 font-bold uppercase tracking-[0.3em] text-[10px]">Empty Archive</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── STEP 2: Case Description Form ────────────────────────────────────────────
function CaseDescriptionForm({ onSubmit, initialData, onBack }) {
  const [form, setForm] = useState(initialData || {
    clientName: "",
    accusedName: "",
    caseType: "Criminal",
    sections: "",
    description: "",
    witnesses: "",
    policeStation: "",
    firNumber: "",
    court: "",
  });
  const [error, setError] = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError(""); }

  function submit(e) {
    e.preventDefault();
    if (!form.description.trim()) { setError("Description required."); return; }
    onSubmit(form);
  }

  return (
    <section className="bg-surface-container p-[1.5rem] md:p-[2rem] rounded-[16px] border border-white/5 flex flex-col gap-[1.5rem] animate-fade-in shadow-2xl">
      <div className="border-b border-white/5 pb-4">
        <h2 className="font-headline-lg text-headline-md text-white">Case Intake</h2>
        <p className="text-on-surface-variant font-body-md mt-1 opacity-60">High-fidelity metadata for AI legal drafting.</p>
      </div>
      <form className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-y-[1rem] gap-x-[1.25rem]" onSubmit={submit}>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Client Name</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Full Name" />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Accused Name</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.accusedName} onChange={e => set("accusedName", e.target.value)} placeholder="State vs. ..." />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Type of Case</label>
          <select className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all cursor-pointer" value={form.caseType} onChange={e => set("caseType", e.target.value)}>
            {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Sections</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.sections} onChange={e => set("sections", e.target.value)} placeholder="IPC / CrPC Sections" />
        </div>
        <div className="flex flex-col col-span-full">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Facts/Description</label>
          <textarea className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all resize-none placeholder:text-on-surface-variant/10 min-h-[160px] leading-relaxed" rows="5" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Chronological facts..."></textarea>
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Witnesses</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.witnesses} onChange={e => set("witnesses", e.target.value)} placeholder="Witness details" />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Court</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.court} onChange={e => set("court", e.target.value)} placeholder="e.g. Sessions Court" />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">Police Station</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.policeStation} onChange={e => set("policeStation", e.target.value)} placeholder="e.g. Vasant Kunj" />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mb-[6px] ml-1">FIR Number</label>
          <input className="bg-surface-container-low border border-white/5 rounded-[10px] text-body-md text-white focus:border-primary py-[9px] px-[12px] outline-none transition-all placeholder:text-on-surface-variant/10" value={form.firNumber} onChange={e => set("firNumber", e.target.value)} placeholder="e.g. 123/2024" />
        </div>
      </form>
      {error && <p className="text-error text-[10px] font-bold ml-1 uppercase tracking-[0.3em]">⚠️ {error}</p>}
      <footer className="flex justify-between items-center pt-6 border-t border-white/5 mt-4">
        <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white flex items-center gap-2 transition-colors" onClick={onBack}>
          <span className="material-symbols-outlined align-middle">arrow_back</span>
          Dashboard
        </button>
        <button className="gold-bg-gradient text-on-primary-fixed py-[9px] px-[20px] rounded-[10px] font-bold flex items-center gap-2 hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 uppercase tracking-widest text-[11px]" onClick={submit}>
          Next Step
          <span className="material-symbols-outlined align-middle">arrow_forward</span>
        </button>
      </footer>
    </section>
  );
}

// ── STEP 3: Tool Selector ─────────────────────────────────────────────────────
function ToolSelector({ caseData, onSelect, onBack }) {
  return (
    <section className="flex flex-col gap-[1.5rem] animate-fade-in">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="font-headline-lg text-headline-md text-white tracking-tight">Intelligence Suite</h2>
          <p className="text-on-surface-variant font-body-md opacity-60">Working on: <strong className="text-primary">{caseData.clientName}</strong></p>
        </div>
        <button className="text-on-surface-variant hover:text-on-surface flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] border border-white/10 rounded-full px-4 py-1.5 bg-white/5 transition-all" onClick={onBack}>
          <span className="material-symbols-outlined text-sm align-middle">edit</span> Edit Intake
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-[12px]">
        {TOOLS.map(tool => (
          <div key={tool.id} className="bg-surface-container-low p-[1.5rem] rounded-[16px] border border-white/5 flex flex-col items-start gap-[8px] cursor-pointer hover:border-primary/40 group transition-all shadow-lg" onClick={() => onSelect(tool)}>
            <span className="material-symbols-outlined gold-text-gradient text-4xl group-hover:scale-110 transition-transform mb-2 align-middle">{tool.icon}</span>
            <h4 className="font-bold text-sm text-white tracking-wide uppercase">{tool.label}</h4>
            <p className="text-[11px] text-on-surface-variant/60 leading-relaxed font-medium">{tool.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── STEP 4: Result Panel ──────────────────────────────────────────────────────
function ResultPanel({ tool, result, docResult, loading, error, courtFilter, setCourtFilter, token, onBack, onCancel }) {
  function copyDoc() {
    if (docResult?.document) navigator.clipboard.writeText(docResult.document).catch(() => { });
  }
  function downloadDoc() {
    if (!docResult?.document) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([docResult.document], { type: "text/plain" }));
    a.download = `${tool.doc_type || tool.id}_draft.txt`;
    a.click();
  }

  const allCases = result?.cases || [];
  const filteredCases = tool.task === "similar" ? filterCourts(allCases, courtFilter) : allCases;

  return (
    <section className="flex flex-col gap-[1.5rem] animate-fade-in">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-[10px] font-bold text-[10px] uppercase tracking-[0.25em] animate-pulse">Processing Neural Nodes...</span>
          ) : (
            <span className="gold-bg-gradient text-on-primary-fixed px-4 py-1.5 rounded-[10px] font-bold text-[10px] uppercase tracking-[0.25em] shadow-lg shadow-primary/20">Analysis Hydrated</span>
          )}
          <button className="text-on-surface-variant hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ml-4" onClick={onBack}>
            <span className="material-symbols-outlined text-sm align-middle">arrow_back_ios</span>
            Back to Tools
          </button>
        </div>
        {!loading && (
          <div className="flex gap-2">
            <button className="p-2 hover:bg-white/5 rounded-[10px] text-on-surface-variant transition-colors"><span className="material-symbols-outlined align-middle">ios_share</span></button>
            <button className="p-2 hover:bg-white/5 rounded-[10px] text-on-surface-variant transition-colors"><span className="material-symbols-outlined align-middle">print</span></button>
          </div>
        )}
      </div>

      {tool.task === "similar" && allCases.length > 0 && !loading && (
        <div className="flex flex-wrap gap-2 pb-2 px-1">
          {COURT_FILTERS.map(cf => (
            <button 
              key={cf.value}
              className={`py-[6px] px-[14px] rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${courtFilter === cf.value ? "gold-bg-gradient text-on-primary-fixed shadow-lg shadow-primary/10" : "bg-white/5 text-on-surface-variant/60 hover:bg-white/10 border border-white/10"}`}
              onClick={() => setCourtFilter(cf.value)}
            >
              {cf.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-[1.5rem]">
          <div className="bg-surface-container rounded-[16px] p-[3rem] border border-white/5 flex flex-col gap-4 items-center text-center shadow-2xl">
            <div className="flex gap-2 items-center py-4">
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce"></span>
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-on-surface-variant/40">Aggregating Legal Precedents</p>
            <button className="mt-8 py-[6px] px-[14px] rounded-[10px] border border-white/5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40 hover:text-white transition-all" onClick={onCancel}>Abort Inference</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error/5 rounded-[16px] p-[2.5rem] border border-error/20 flex flex-col items-center gap-3 animate-fade-in shadow-xl">
          <span className="material-symbols-outlined text-error text-4xl align-middle">report</span>
          <h3 className="text-error font-bold uppercase tracking-[0.3em] text-[10px]">Inference Disrupted</h3>
          <p className="text-on-surface-variant/80 text-sm font-medium">{error}</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1.5rem]">
          <div className="lg:col-span-2 flex flex-col gap-[1.5rem]">
            {docResult && (
              <div className="bg-surface-container rounded-[16px] overflow-hidden border border-white/5 shadow-2xl">
                <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/5">
                  <span className="font-bold text-[9px] text-on-surface-variant/60 uppercase tracking-[0.3em]">Draft Preview</span>
                  <div className="flex gap-4">
                    <button className="gold-text-gradient font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:brightness-125 transition-all" onClick={copyDoc}><span className="material-symbols-outlined text-sm align-middle">content_copy</span> Copy</button>
                    <button className="gold-text-gradient font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:brightness-125 transition-all" onClick={downloadDoc}><span className="material-symbols-outlined text-sm align-middle">download</span> Save</button>
                  </div>
                </div>
                <div className="p-[2.5rem] font-serif text-on-surface/90 whitespace-pre-wrap leading-loose text-sm bg-surface-container-low/20">
                  {docResult.document}
                </div>
              </div>
            )}
            
            {result && (
              <div className="bg-surface-container rounded-[16px] p-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-8xl">verified</span>
                </div>
                <div className="prose prose-invert max-w-none prose-p:text-on-surface/80 prose-headings:gold-text-gradient prose-headings:tracking-tight prose-headings:font-bold prose-p:leading-relaxed prose-strong:text-white">
                  <ReactMarkdown>{result.answer}</ReactMarkdown>
                </div>
                {result.applicable_sections && (
                   <div className="flex flex-wrap gap-2 mt-10 pt-10 border-t border-white/5">
                      {result.applicable_sections.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/5 text-primary rounded-[6px] text-[9px] font-bold border border-primary/20 uppercase tracking-[0.2em]">
                          § {typeof s === 'string' ? s : s.section}
                        </span>
                      ))}
                   </div>
                )}
              </div>
            )}

            {tool.task === "ocr" && <LawyerDocumentAnalyser token={token} />}
          </div>

          <div className="flex flex-col gap-[1.5rem]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/30 px-2">Library Citations</h3>
            <div className="flex flex-col gap-[12px]">
              {filteredCases.map((c, i) => (
                <CaseCard key={i} c={c} />
              ))}
              {filteredCases.length === 0 && !loading && (
                <div className="px-4 py-12 bg-white/5 rounded-[16px] text-center border border-dashed border-white/5 opacity-40">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em]">Zero Matches Found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CaseCard({ c }) {
  const [open, setOpen] = useState(false);
  const outcome = c?.outcome_for_client || "";
  const color = outcome === "favourable" ? "#4ADE80" : outcome === "unfavourable" ? "#F87171" : "#9CA3AF";
  
  return (
    <div className={`bg-surface-container-low p-[1.5rem] rounded-[16px] border transition-all cursor-pointer ${open ? "border-primary/40 bg-primary/5 shadow-2xl" : "border-white/5 hover:border-white/10"}`} onClick={() => setOpen(!open)}>
      <h4 className="font-bold gold-text-gradient mb-2 text-sm tracking-wide">{c?.case_name || c?.title || "Untitled Case"}</h4>
      <p className={`text-[11px] text-on-surface-variant/80 leading-relaxed font-medium ${open ? "" : "line-clamp-2"}`}>
        {c?.key_holding || c?.key_principle || c?.summary || "Decision details pending further analysis."}
      </p>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
         <span className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">{c?.year || c?.citation || "CITE_PENDING"}</span>
         {outcome && <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-[4px] bg-white/5" style={{ color }}>{outcome}</span>}
      </div>
      {open && (
        <div className="mt-4 pt-4 text-[11px] text-on-surface-variant space-y-4 border-t border-white/5 opacity-80">
          {c?.similarity_reason && <p><strong className="text-white uppercase tracking-widest text-[9px] opacity-40">Similarity Reason</strong><br/><span className="mt-1 block">{c.similarity_reason}</span></p>}
          {c?.relevance && <p><strong className="text-white uppercase tracking-widest text-[9px] opacity-40">Court Relevance</strong><br/><span className="mt-1 block">{c.relevance}</span></p>}
        </div>
      )}
    </div>
  );
}

// ── Main Workspace ────────────────────────────────────────────────────────────
export default function LawyerWorkspace({ token, meta, onLogout }) {
  const [step, setStep] = useState("dashboard"); // dashboard | form | tools | result
  const [cases, setCases] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ls_cases") || "[]"); }
    catch { return []; }
  });
  const [caseData, setCaseData] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [docResult, setDocResult] = useState(null);
  const [error, setError] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const abortRef = useRef(null);

  function handleCaseSubmit(data) {
    const existingId = caseData?.id;
    setCaseData(data);
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

    if (tool.task === "ocr") return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    const text = buildPrompt(caseData, tool);

    try {
      const body = {
        text: text.slice(0, 3000),
        task: tool.task,
        doc_type: tool.doc_type || null,
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
    if (d.clientName) lines.push(`Client: ${d.clientName}`);
    if (d.accusedName) lines.push(`Accused: ${d.accusedName}`);
    if (d.caseType) lines.push(`Case type: ${d.caseType}`);
    if (d.sections) lines.push(`Sections: ${d.sections}`);
    if (d.description) lines.push(`Facts: ${d.description}`);
    if (d.witnesses) lines.push(`Witnesses: ${d.witnesses}`);
    if (d.court) lines.push(`Court: ${d.court}`);
    if (d.policeStation) lines.push(`Police station: ${d.policeStation}`);
    if (d.firNumber) lines.push(`FIR: ${d.firNumber}`);
    lines.push(`\nTask: ${tool.label}`);
    return lines.join("\n");
  }

  function cancelRequest() {
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
  }

  const stepIndex = step === "dashboard" ? 0 : step === "form" ? 1 : step === "tools" ? 2 : 3;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface text-on-surface font-body-md selection:bg-primary/30 overflow-x-hidden">
      {/* Sticky Top Header Harmonization */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-[8px] border-b border-white/5 py-[0.75rem] px-[1rem] md:px-[1.5rem] flex justify-between items-center h-16 shadow-lg shadow-black/20">
        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[10px] cursor-pointer group" onClick={() => setStep("dashboard")}>
            <span className="material-symbols-outlined gold-text-gradient text-[28px] align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
            <span className="font-headline-md text-headline-md font-bold gold-text-gradient tracking-tight">LegalSeva</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 ml-10">
            <button className={`text-[10px] font-bold uppercase tracking-[0.3em] relative transition-all ${step === "dashboard" ? "text-primary after:content-[''] after:absolute after:-bottom-[20px] after:left-0 after:w-full after:h-0.5 after:gold-bg-gradient" : "text-on-surface-variant/60 hover:text-white"}`} onClick={() => setStep("dashboard")}>Terminal</button>
            <button className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/60 hover:text-white transition-colors">Library</button>
            <button className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/60 hover:text-white transition-colors">Archives</button>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-5 border-r border-white/10 pr-6 hidden md:flex">
            <span className="material-symbols-outlined text-on-surface-variant/40 cursor-pointer hover:text-primary transition-all align-middle">notifications</span>
            <span className="material-symbols-outlined text-on-surface-variant/40 cursor-pointer hover:text-primary transition-all align-middle">analytics</span>
          </div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] leading-none">{meta?.name || "Verified Advocate"}</p>
              <p className="text-[9px] text-primary font-bold uppercase tracking-[0.1em] mt-1 opacity-80">Enterprise Node</p>
            </div>
            <div className="h-10 w-10 rounded-[12px] gold-bg-gradient flex items-center justify-center text-on-primary-fixed font-bold text-sm shadow-xl shadow-primary/20 border border-white/10">
              {meta?.name?.charAt(0) || "A"}
            </div>
          </div>
          <button className="text-on-surface-variant/40 hover:text-error transition-colors ml-2" title="Logout" onClick={onLogout}>
            <span className="material-symbols-outlined align-middle">power_settings_new</span>
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center py-[2.5rem]">
        <div className="w-full max-w-[900px] mx-auto px-[1.5rem] flex flex-col gap-[2rem]">
          
          {/* Workspace Progress Tracker */}
          <nav className="w-full bg-surface-container/60 p-5 rounded-[20px] border border-white/5 shadow-inner">
            <div className="flex items-center justify-between relative px-4">
              <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -z-0 -translate-y-1/2"></div>
              
              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all ${stepIndex >= 0 ? "gold-bg-gradient text-on-primary-fixed shadow-xl shadow-primary/30" : "bg-white/5 text-on-surface-variant/40"}`} onClick={() => setStep("dashboard")}>
                  <span className="material-symbols-outlined text-xl align-middle">inventory_2</span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.4em] transition-all ${stepIndex >= 0 ? "text-primary" : "text-on-surface-variant/20"} hidden min-[520px]:block`}>Cases</span>
              </div>

              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all ${stepIndex >= 1 ? "gold-bg-gradient text-on-primary-fixed shadow-xl shadow-primary/30" : "bg-white/5 text-on-surface-variant/40"}`} onClick={() => stepIndex > 1 && setStep("form")}>
                  <span className="material-symbols-outlined text-xl align-middle">fact_check</span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.4em] transition-all ${stepIndex >= 1 ? "text-primary" : "text-on-surface-variant/20"} hidden min-[520px]:block`}>Details</span>
              </div>

              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all ${stepIndex >= 2 ? "gold-bg-gradient text-on-primary-fixed shadow-xl shadow-primary/30" : "bg-white/5 text-on-surface-variant/40"}`} onClick={() => stepIndex > 2 && setStep("tools")}>
                  <span className="material-symbols-outlined text-xl align-middle">psychology</span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.4em] transition-all ${stepIndex >= 2 ? "text-primary" : "text-on-surface-variant/20"} hidden min-[520px]:block`}>Action</span>
              </div>

              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all ${stepIndex >= 3 ? "gold-bg-gradient text-on-primary-fixed shadow-xl shadow-primary/30" : "bg-white/5 text-on-surface-variant/40"}`}>
                  <span className="material-symbols-outlined text-xl align-middle">verified</span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.4em] transition-all ${stepIndex >= 3 ? "text-primary" : "text-on-surface-variant/20"} hidden min-[520px]:block`}>Result</span>
              </div>
            </div>
          </nav>

          <div className="flex flex-col gap-[2rem]">
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
      </main>

      <footer className="w-full py-[2rem] bg-surface-container-lowest border-t border-white/5 flex flex-col md:flex-row justify-between items-center px-[2rem] mt-auto gap-4">
        <div className="flex items-center gap-3 opacity-30">
          <span className="material-symbols-outlined gold-text-gradient text-xl align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">© 2024 LegalSeva Intelligence. Secure Professional Gateway.</span>
        </div>
        <div className="flex gap-8">
          <a className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 hover:text-white transition-all hover:tracking-[0.4em]" href="#">System.status</a>
          <a className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 hover:text-white transition-all hover:tracking-[0.4em]" href="#">Protocol.privacy</a>
        </div>
      </footer>
    </div>
  );
}