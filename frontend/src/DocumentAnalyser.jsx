import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const BASE   = "http://localhost:8000";
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.txt";

const CITIZEN_TIPS = ["📄 FIR copies","⚖ Court notices","📜 Legal orders","📋 Bail papers","📨 Legal notices"];
const LAWYER_TIPS  = ["📄 FIR reports","⚖ Judgements","📜 Bail applications","📋 Charge sheets","📨 Legal notices","✍ Vakalatnama","🏛 Petitions","📝 Affidavits","📑 Agreements"];

function fileIcon(name) {
  const ext = (name||"").split(".").pop().toLowerCase();
  if (ext==="pdf") return "📄";
  if (["png","jpg","jpeg","bmp","tiff","tif"].includes(ext)) return "🖼";
  if (ext==="txt") return "📝";
  return "📎";
}

function SimpleMarkdown({ text }) {
  if (!text) return null;
  return (
    <div className="md-body">
      {String(text).split("\n").map((line, i) => {
        if (line.startsWith("## "))  return <h3 key={i} className="md-h2">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="md-h3">{line.slice(4)}</h4>;
        if (line.startsWith("- ")||line.startsWith("* ")) return <div key={i} className="md-li">• {line.slice(2)}</div>;
        if (line.match(/^\d+\. /)) return <div key={i} className="md-li">{line}</div>;
        if (!line.trim()) return <div key={i} style={{height:8}}/>;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return <p key={i} className="md-p">{parts.map((p,j)=>p.startsWith("**")&&p.endsWith("**")?<strong key={j}>{p.slice(2,-2)}</strong>:p)}</p>;
      })}
    </div>
  );
}

// ── Shared drop zone ──────────────────────────────────────────────────────────
function DropZone({ file, onFile, onRemove, lawyer }) {
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef();
  return (
    <div
      className={`drop-zone${lawyer?" lawyer-drop":""}${dragOver?" drag-active":""}${file?" has-file":""}`}
      onClick={() => !file && ref.current?.click()}
      onDragOver={e=>{e.preventDefault();setDragOver(true)}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{e.preventDefault();setDragOver(false);onFile(e.dataTransfer.files[0])}}
    >
      <input ref={ref} type="file" accept={ACCEPT} style={{display:"none"}} onChange={e=>onFile(e.target.files[0])} />
      {file ? (
        <div className="drop-file-name">
          <span className="drop-file-icon">{fileIcon(file.name)}</span>
          <span>{file.name}</span>
          <button className="drop-remove" onClick={e=>{e.stopPropagation();onRemove();}}>✕</button>
        </div>
      ) : (
        <div className="drop-placeholder">
          <div className="drop-big-icon">📂</div>
          <div className="drop-text">Drag &amp; drop or <span className="drop-link">browse</span></div>
          <div className="drop-hint">PDF, PNG, JPG, TIFF, TXT{lawyer?" · Scanned docs supported":""}</div>
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
    <div className="ocr-panel">
      <div className="ocr-header">
        <span className="ocr-icon">🔍</span>
        <div>
          <div className="ocr-title">Understand your legal document</div>
          <div className="ocr-sub">Upload any document — we'll explain it in plain, simple language</div>
        </div>
      </div>

      <div className="ocr-tips">
        {CITIZEN_TIPS.map((t,i)=><span key={i} className="ocr-tip">{t}</span>)}
      </div>

      {!result && (
        <>
          <DropZone file={file} onFile={f=>{setFile(f);setError("");}} onRemove={reset} />
          <button className="btn-primary ocr-btn" onClick={analyse} disabled={!file||loading}>
            {loading ? "Reading document…" : "Explain this document"}
          </button>
          {loading && <div className="ocr-loading-note">⏳ Extracting and analysing text — this may take 20–60 seconds…</div>}
        </>
      )}

      {error && <div className="error-box"><div className="error-title">Could not process</div><div className="error-short">{error}</div></div>}

      {result && (
        <div className="ocr-result">
          <div className="ocr-result-header">
            <div className="ocr-doc-badge">{fileIcon(file?.name||"")} {result.doc_type}</div>
            <button className="btn-outline sm" onClick={reset}>Analyse another</button>
          </div>
          <div className="ocr-summary">
            <ReactMarkdown>{result.summary}</ReactMarkdown>
          </div>
          {result.characters_extracted && <span className="ocr-chars">📊 {result.characters_extracted.toLocaleString()} characters extracted</span>}
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

  const modeLabel = mode==="verify" ? "Check for errors" : mode==="brief" ? "Generate brief" : "Analyse & verify";

  return (
    <div className="ocr-panel">
      <div className="ocr-header">
        <span className="ocr-icon">📋</span>
        <div>
          <div className="ocr-title">Document Analysis &amp; Verification</div>
          <div className="ocr-sub">Upload any legal document for a full brief and mistake check</div>
        </div>
      </div>

      <div className="ocr-tips">
        {LAWYER_TIPS.map((t,i)=><span key={i} className="ocr-tip lawyer-tip">{t}</span>)}
      </div>

      {!result && (
        <>
          <div className="ocr-mode-row">
            <span className="ocr-mode-label">Analysis type:</span>
            <div className="ocr-mode-pills">
              {[{v:"both",l:"Brief + Verify"},{v:"brief",l:"Brief only"},{v:"verify",l:"Error check only"}].map(m=>(
                <button key={m.v} className={`ocr-mode-pill${mode===m.v?" active":""}`} onClick={()=>setMode(m.v)}>{m.l}</button>
              ))}
            </div>
          </div>
          <DropZone file={file} onFile={f=>{setFile(f);setError("");}} onRemove={reset} lawyer />
          <button className="btn-primary ocr-btn" onClick={analyse} disabled={!file||loading}>
            {loading ? "Analysing…" : modeLabel}
          </button>
          {loading && <div className="ocr-loading-note lawyer-loading-note">⏳ {mode==="both"?"Running brief + error check":mode==="verify"?"Checking for errors":"Generating brief"} — 30–90 seconds…</div>}
        </>
      )}

      {error && <div className="error-box"><div className="error-title">Could not process</div><div className="error-short">{error}</div></div>}

      {result && (
        <div className="ocr-result">
          <div className="ocr-result-header">
            <div className="ocr-doc-badge lawyer-doc-badge">{fileIcon(file?.name||"")} {result.doc_type}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {result.characters_extracted && <span className="ocr-chars">📊 {result.characters_extracted.toLocaleString()} chars</span>}
              <button className="btn-outline sm" onClick={reset}>Analyse another</button>
            </div>
          </div>

          {result.brief && result.verification && (
            <div className="ocr-result-tabs">
              <button className={`ocr-tab${tab==="brief"?" active":""}`} onClick={()=>setTab("brief")}>📋 Document Brief</button>
              <button className={`ocr-tab${tab==="verify"?" active":""}`} onClick={()=>setTab("verify")}>🔍 Error Check</button>
            </div>
          )}

          {(tab==="brief"||!result.verification) && result.brief && (
            <div className="ocr-brief"><SimpleMarkdown text={result.brief} /></div>
          )}
          {(tab==="verify"||!result.brief) && result.verification && (
            <div className="ocr-verify"><SimpleMarkdown text={result.verification} /></div>
          )}
        </div>
      )}
    </div>
  );
}