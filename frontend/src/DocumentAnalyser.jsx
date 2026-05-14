import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const BASE   = "http://localhost:8000";
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.txt";

const CITIZEN_TIPS = ["📄 FIR copies", "⚖ Court notices", "📜 Legal orders", "📋 Bail papers", "📨 Legal notices"];
const LAWYER_TIPS  = ["📄 FIR reports", "⚖ Judgements", "📜 Bail applications", "📋 Charge sheets", "📨 Legal notices", "✍ Vakalatnama", "🏛 Petitions", "📝 Affidavits", "📑 Agreements"];

function fileIcon(name) {
  const ext = (name||"").split(".").pop().toLowerCase();
  if (ext==="pdf") return "description";
  if (["png","jpg","jpeg","bmp","tiff","tif"].includes(ext)) return "image";
  if (ext==="txt") return "article";
  return "attach_file";
}

// ── Shared drop zone ──────────────────────────────────────────────────────────
function DropZone({ file, onFile, onRemove, lawyer }) {
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef();
  return (
    <div
      className={`relative w-full border-2 border-dashed rounded-[16px] p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer ${file ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface-container-low/40 hover:border-primary/20"} ${dragOver ? "border-primary bg-primary/10 scale-[1.01]" : ""}`}
      onClick={() => !file && ref.current?.click()}
      onDragOver={e=>{e.preventDefault();setDragOver(true)}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{e.preventDefault();setDragOver(false);onFile(e.dataTransfer.files[0])}}
    >
      <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={e=>onFile(e.target.files[0])} />
      {file ? (
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-[12px] bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl align-middle">{fileIcon(file.name)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-body-md font-bold text-white truncate max-w-[200px]">{file.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Ready for analysis</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-error/10 hover:text-error transition-all flex items-center justify-center ml-4" onClick={e=>{e.stopPropagation();onRemove();}}>
            <span className="material-symbols-outlined text-sm align-middle">close</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl align-middle">upload_file</span>
          </div>
          <div className="text-label-md font-bold text-on-surface uppercase tracking-widest">Drag & drop or <span className="text-primary hover:underline">browse</span></div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/20">{ACCEPT.replace(/\./g, "").toUpperCase()} SUPPORTED</div>
        </div>
      )}
    </div>
  );
}

// ── CITIZEN ───────────────────────────────────────────────────────────────────
export function CitizenDocumentAnalyser({ language = "en" }) {
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");

  function reset() { setFile(null); setResult(null); setError(""); }

  async function analyse() {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("language", language);
      const res  = await fetch(`${BASE}/ocr/citizen`, { method:"POST", body:form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail||`Error ${res.status}`);
      setResult(data);
    } catch(e) { setError(e.message||"Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-surface-container p-[1.5rem] md:p-[2rem] rounded-[16px] border border-white/5 flex flex-col gap-[1.5rem] animate-fade-in shadow-2xl">
      <div className="flex items-start gap-4 border-b border-white/5 pb-4">
        <div className="w-12 h-12 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <span className="material-symbols-outlined text-2xl align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>policy</span>
        </div>
        <div>
          <h2 className="font-headline-lg text-headline-md text-white tracking-tight">Legal Insight Engine</h2>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mt-1 opacity-60">Upload any document for plain-language clarification</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CITIZEN_TIPS.map((t,i)=>(
          <span key={i} className="px-3 py-1 bg-white/5 text-on-surface-variant rounded-[6px] text-[10px] font-bold border border-white/5 uppercase tracking-[0.2em] opacity-60">
            {t}
          </span>
        ))}
      </div>

      {!result && (
        <div className="flex flex-col gap-[1.5rem]">
          <DropZone file={file} onFile={f=>{setFile(f);setError("");}} onRemove={reset} />
          <button className="gold-bg-gradient text-on-primary-fixed py-[12px] px-[20px] rounded-[10px] font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-30" onClick={analyse} disabled={!file||loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-primary-fixed animate-bounce"></span>
                Inference Processing
              </span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px] align-middle">psychology</span>
                Explain Document
              </>
            )}
          </button>
          {loading && <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 animate-pulse">Running OCR & neural analysis...</p>}
        </div>
      )}

      {error && (
        <div className="bg-error/5 border border-error/20 p-4 rounded-[12px] flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-xl align-middle">error</span>
          <span className="text-[11px] font-bold uppercase tracking-widest">{error}</span>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-[1.5rem] animate-fade-in">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-[12px] border border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary align-middle">task</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">Detection: {result.doc_type}</span>
            </div>
            <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white transition-all" onClick={reset}>Analyze Another</button>
          </div>
          <div className="prose prose-invert max-w-none prose-p:text-on-surface/80 prose-headings:gold-text-gradient bg-surface-container-low/40 p-6 rounded-[16px] border border-white/5 leading-relaxed">
            <ReactMarkdown>{result.summary}</ReactMarkdown>
          </div>
          {result.characters_extracted && (
            <div className="flex justify-center">
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-on-surface-variant/30">Extracted: {result.characters_extracted.toLocaleString()} symbols verified</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LAWYER ────────────────────────────────────────────────────────────────────
export function LawyerDocumentAnalyser({ token }) {
  const [file,    setFile]    = useState(null);
  const [mode,    setMode]    = useState("both");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("brief");

  function reset() { setFile(null); setResult(null); setError(""); }

  async function analyse() {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      const res  = await fetch(`${BASE}/ocr/lawyer`, { method:"POST", headers:{Authorization:`Bearer ${token}`}, body:form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail||`Error ${res.status}`);
      setResult(data);
      setTab(mode==="verify"?"verify":"brief");
    } catch(e) { setError(e.message||"Something went wrong."); }
    finally { setLoading(false); }
  }

  const modeLabel = mode==="verify" ? "Execute Error Check" : mode==="brief" ? "Generate Intelligence Brief" : "Complete Neural Audit";

  return (
    <div className="bg-surface-container p-[1.5rem] md:p-[2rem] rounded-[16px] border border-white/5 flex flex-col gap-[1.5rem] animate-fade-in shadow-2xl">
      <div className="flex items-start gap-4 border-b border-white/5 pb-4">
        <div className="w-12 h-12 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <span className="material-symbols-outlined text-2xl align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
        </div>
        <div>
          <h2 className="font-headline-lg text-headline-md text-white tracking-tight">Legal Verification Terminal</h2>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-on-surface-variant mt-1 opacity-60">Professional neural audit for complex legal documentation</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {LAWYER_TIPS.map((t,i)=>(
          <span key={i} className="px-3 py-1 bg-white/5 text-on-surface-variant rounded-[6px] text-[10px] font-bold border border-white/5 uppercase tracking-[0.2em] opacity-40">
            {t}
          </span>
        ))}
      </div>

      {!result && (
        <div className="flex flex-col gap-[1.5rem]">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 ml-1">Operational Mode</span>
            <div className="flex gap-2 p-1 bg-surface-container-low rounded-[12px] border border-white/5">
              {[{v:"both",l:"Full Audit"},{v:"brief",l:"Brief Only"},{v:"verify",l:"Verification"}].map(m=>(
                <button key={m.v} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[10px] transition-all ${mode===m.v?"bg-primary/10 text-primary":"text-on-surface-variant/60 hover:text-white"}`} onClick={()=>setMode(m.v)}>{m.l}</button>
              ))}
            </div>
          </div>
          <DropZone file={file} onFile={f=>{setFile(f);setError("");}} onRemove={reset} lawyer />
          <button className="gold-bg-gradient text-on-primary-fixed py-[12px] px-[20px] rounded-[10px] font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-30" onClick={analyse} disabled={!file||loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-primary-fixed animate-bounce"></span>
                Processing Neural Audit
              </span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px] align-middle">rocket_launch</span>
                {modeLabel}
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-error/5 border border-error/20 p-4 rounded-[12px] flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-xl align-middle">gpp_maybe</span>
          <span className="text-[11px] font-bold uppercase tracking-widest">{error}</span>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-[1.5rem] animate-fade-in">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-[12px] border border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary align-middle">verified</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">System Result: {result.doc_type}</span>
            </div>
            <div className="flex items-center gap-4">
              {result.characters_extracted && <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-on-surface-variant/30 hidden sm:block">Symbols: {result.characters_extracted.toLocaleString()}</span>}
              <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white transition-all" onClick={reset}>New Terminal Session</button>
            </div>
          </div>

          {result.brief && result.verification && (
            <div className="flex gap-2 p-1 bg-surface-container-low rounded-[12px] border border-white/5">
              <button className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.3em] rounded-[10px] transition-all flex items-center justify-center gap-2 ${tab==="brief"?"bg-primary/10 text-primary":"text-on-surface-variant/60 hover:text-white"}`} onClick={()=>setTab("brief")}>
                <span className="material-symbols-outlined text-sm align-middle">description</span> Intelligence Brief
              </button>
              <button className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.3em] rounded-[10px] transition-all flex items-center justify-center gap-2 ${tab==="verify"?"bg-primary/10 text-primary":"text-on-surface-variant/60 hover:text-white"}`} onClick={()=>setTab("verify")}>
                <span className="material-symbols-outlined text-sm align-middle">verified_user</span> Verification Audit
              </button>
            </div>
          )}

          <div className="bg-surface-container-low/40 p-[2rem] rounded-[16px] border border-white/5 shadow-inner relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined gold-text-gradient text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
             </div>
             <div className="prose prose-invert max-w-none prose-p:text-on-surface/80 prose-headings:gold-text-gradient prose-headings:tracking-tight prose-headings:font-bold prose-strong:text-white leading-relaxed">
               <ReactMarkdown>{tab==="brief"?result.brief:result.verification}</ReactMarkdown>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}