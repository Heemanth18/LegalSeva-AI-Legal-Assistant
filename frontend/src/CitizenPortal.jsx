import { useState, useRef, useEffect } from "react";
import { CitizenDocumentAnalyser } from "./DocumentAnalyser.jsx";
import { api } from "./api";
import ReactMarkdown from "react-markdown";

const QUICK_ACTIONS = [
  { id: "rights", icon: "⚖", label: "Know your rights",  desc: "Understand any law in plain language", prompt: "What are my legal rights if I am arrested?" },
  { id: "fir",    icon: "📋", label: "File a complaint", desc: "Step-by-step FIR guidance",             prompt: "How do I file an FIR? What are the steps?" },
];

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" },  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" }, { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },  { code: "ml", label: "മലയാളം" },
];

export default function CitizenPortal({ onBack, existingToken, onEnterWorkspace }) {
  const [messages,    setMessages]    = useState([{ role: "assistant", text: "Hello! I'm your legal assistant. Ask me about your rights, how to file a complaint, or any legal situation you're facing. I'll explain everything in simple language." }]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [language,    setLanguage]    = useState("en");
  const [suggestions, setSuggestions] = useState([]);
  const [mode,        setMode]        = useState("chat"); // "chat" | "document"
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text) {
    const query = (text || input).trim();
    if (!query) return;
    setInput(""); setSuggestions([]);
    setMessages(m => [...m, { role: "user", text: query }]);
    setLoading(true);
    try {
      const res = await api.analyzePublic(query, language);
      setMessages(m => [...m, { role: "assistant", text: res.answer, intent: res.intent }]);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Sorry, something went wrong. Please try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell citizen">
      <header className="header citizen-header">
        <div className="header-brand">
          <div className="brand-icon citizen-icon">⚖</div>
          <div>
            <div className="brand-name">LegalSeva</div>
            <div className="brand-sub">Free public legal guidance</div>
          </div>
        </div>
        <div className="header-actions">
          {/* Mode toggle */}
          <div className="citizen-mode-toggle">
            <button className={`mode-toggle-btn ${mode === "chat" ? "active" : ""}`} onClick={() => setMode("chat")}>
              💬 Ask a question
            </button>
            <button className={`mode-toggle-btn ${mode === "document" ? "active" : ""}`} onClick={() => setMode("document")}>
              📄 Explain my document
            </button>
          </div>
          <select className="lang-select" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {onBack && <button className="btn-outline" onClick={onBack}>← Home</button>}
          {existingToken
            ? <button className="btn-outline" onClick={onEnterWorkspace}>Advocate workspace →</button>
            : null}
        </div>
      </header>

      <div className="portal-body">
        {/* ── Document mode ── */}
        {mode === "document" && (
          <div className="citizen-doc-panel">
            <CitizenDocumentAnalyser language={language} />
          </div>
        )}

        {/* ── Chat mode ── */}
        {mode === "chat" && (
          <>
            {messages.length <= 1 && (
              <div className="quick-actions">
                <p className="quick-label">How can we help you today?</p>
                <div className="quick-grid">
                  {QUICK_ACTIONS.map(q => (
                    <button key={q.id} className="quick-card" onClick={() => send(q.prompt)}>
                      <span className="quick-icon">{q.icon}</span>
                      <span className="quick-title">{q.label}</span>
                      <span className="quick-desc">{q.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="chat-area">
              {messages.map((m, i) => (
                <div key={i} className={`bubble-row ${m.role}`}>
                  {m.role === "assistant" && <div className="avatar citizen-avatar">⚖</div>}
                  <div className={`bubble ${m.role} ${m.error ? "error" : ""}`}>
                    {m.role === "assistant" ? <ReactMarkdown>{m.text}</ReactMarkdown> : <p>{m.text}</p>}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="bubble-row assistant">
                  <div className="avatar citizen-avatar">⚖</div>
                  <div className="bubble assistant loading-bubble">
                    <span className="dot"/><span className="dot"/><span className="dot"/>
                  </div>
                </div>
              )}
              {suggestions.length > 0 && !loading && (
                <div className="chips">
                  {suggestions.map((s, i) => <button key={i} className="chip" onClick={() => send(s)}>{s}</button>)}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="input-bar">
              <textarea
                className="input-field"
                placeholder="Describe your situation in any language…"
                value={input} rows={1}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={loading}
              />
              <button className="btn-send citizen-send" onClick={() => send()} disabled={loading || !input.trim()}>↑</button>
            </div>
          </>
        )}

        <p className="disclaimer">This is general legal information, not legal advice. For court proceedings, consult a qualified advocate.</p>
      </div>
    </div>
  );
}