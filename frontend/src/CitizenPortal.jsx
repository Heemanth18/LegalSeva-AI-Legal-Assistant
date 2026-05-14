import { useState, useRef, useEffect } from "react";
import { CitizenDocumentAnalyser } from "./DocumentAnalyser.jsx";
import { api } from "./api";
import ReactMarkdown from "react-markdown";

const QUICK_ACTIONS = [
  { id: "rights", icon: "gavel", label: "Know your rights", desc: "Understand any law in plain language", prompt: "What are my legal rights if I am arrested?" },
  { id: "fir", icon: "edit_document", label: "File a complaint", desc: "Step-by-step FIR guidance", prompt: "How do I file an FIR? What are the steps?" },
];

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" }, { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" }, { code: "mr", label: "ಮರಾठी" },
  { code: "bn", label: "বাংলা" }, { code: "ml", label: "മലയാളം" },
];

export default function CitizenPortal({ onBack, existingToken, onEnterWorkspace }) {
  const [messages, setMessages] = useState([{ role: "assistant", text: "Namaste! I am your LegalSeva assistant. Whether you need to understand consumer rights or want help drafting a simple affidavit, I am here to assist you in your native language." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [suggestions, setSuggestions] = useState([]);
  const [mode, setMode] = useState("chat"); // "chat" | "document"
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

  const currentLangLabel = LANGUAGES.find(l => l.code === language)?.label || "English";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface text-on-surface font-body-md overflow-x-hidden selection:bg-primary/30">
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-[8px] border-b border-white/5 py-[0.75rem] px-[1rem] md:px-[1.5rem] flex justify-between items-center h-16">
        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[10px] cursor-pointer" onClick={onBack}>
            <span className="material-symbols-outlined gold-text-gradient text-[28px] align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
            <span className="font-headline-md text-headline-md font-bold gold-text-gradient tracking-tight">LegalSeva</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 ml-8">
            <button 
              className={`text-label-md font-medium flex items-center gap-2 transition-colors ${mode === "chat" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setMode("chat")}
            >
              <span>💬</span> Ask a question
            </button>
            <button 
              className={`text-label-md font-medium flex items-center gap-2 transition-colors ${mode === "document" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setMode("document")}
            >
              <span>📄</span> Explain my document
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Free · Fair · For Every Indian</span>
          
          <div className="relative group">
            <button className="flex items-center gap-2 py-[6px] px-[14px] bg-white/5 hover:bg-white/10 rounded-[10px] border border-white/10 transition-all">
              <span className="material-symbols-outlined text-sm align-middle">language</span>
              <span className="text-label-md font-semibold">{currentLangLabel}</span>
              <span className="material-symbols-outlined text-xs align-middle">expand_more</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-[14px] overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50 shadow-2xl">
              <div className="p-2 bg-surface-container">
                {LANGUAGES.map(l => (
                  <button 
                    key={l.code}
                    className="w-full text-left px-4 py-2 text-label-md font-medium hover:bg-primary/10 hover:text-primary rounded-[6px] transition-colors"
                    onClick={() => setLanguage(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {existingToken && (
            <button className="hidden md:flex items-center gap-2 py-[9px] px-[20px] bg-primary/10 text-primary hover:bg-primary/20 rounded-[10px] border border-primary/20 transition-all text-label-md font-bold" onClick={onEnterWorkspace}>
              Advocate Portal
            </button>
          )}
        </div>
      </header>

      {/* Main Content Viewport Shell */}
      <main className="flex-grow flex flex-col items-center py-[2rem]">
        <div className="w-full max-w-[760px] mx-auto px-[1rem] md:px-0 flex flex-col gap-[1.5rem]">
          
          {mode === "document" ? (
            <div className="animate-fade-in">
              <CitizenDocumentAnalyser language={language} />
            </div>
          ) : (
            <>
              {/* Hero Section */}
              {messages.length <= 1 && (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-[1.5rem] animate-fade-in">
                  <div className="space-y-4">
                    <h1 className="font-headline-lg text-headline-lg text-white">Welcome to Citizen Portal</h1>
                    <p className="text-body-lg text-on-surface-variant max-w-lg mx-auto opacity-80">Your bridge to justice. Accessible, expert-driven legal assistance in your native language.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1rem] w-full max-w-lg">
                    {QUICK_ACTIONS.map(q => (
                      <button key={q.id} className="group flex items-center justify-between p-5 rounded-[16px] border border-white/5 bg-surface-container/40 hover:border-primary/40 hover:bg-surface-container/60 transition-all" onClick={() => send(q.prompt)}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all shadow-lg shadow-primary/5">
                            <span className="material-symbols-outlined text-xl align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>{q.icon}</span>
                          </div>
                          <span className="text-label-md font-bold text-on-surface uppercase tracking-widest">{q.label}</span>
                        </div>
                        <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all align-middle">arrow_forward</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Area - Rhythms and Alignment */}
              <div className="flex flex-col gap-[1.5rem] pb-32">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-[10px] items-start w-full ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex flex-col max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`py-[0.75rem] px-[1rem] rounded-[16px] shadow-sm ${m.role === "assistant" ? "bg-surface-container-high rounded-tl-[4px]" : "bg-primary text-on-primary rounded-tr-[4px] font-medium"} ${m.error ? "border-error/50 bg-error/5" : ""}`}>
                        <div className="text-body-md leading-relaxed whitespace-pre-wrap">
                          {m.role === "assistant" ? <ReactMarkdown>{m.text}</ReactMarkdown> : <p>{m.text}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
                          {m.role === "assistant" ? "LegalSeva AI" : "You"} · Just now
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-[10px] items-start w-full flex-row">
                    <div className="py-[0.75rem] px-[1rem] rounded-[16px] bg-surface-container-high rounded-tl-[4px] max-w-[75%]">
                      <div className="flex gap-1.5 items-center py-2 px-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Sticky Bottom Docked Input Bar */}
      {mode === "chat" && (
        <div className="sticky bottom-0 left-0 right-0 p-[1.5rem] z-10 bg-surface/90 backdrop-blur-2xl border-t border-white/5">
          <div className="max-w-[760px] mx-auto flex flex-col gap-[1rem]">
            {/* Suggestion Chips */}
            {suggestions.length > 0 && !loading && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    className="flex-none py-[6px] px-[14px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all whitespace-nowrap"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Main Input System */}
            <div className="bg-surface-container-low border border-white/10 rounded-[16px] p-2 flex items-end gap-2 focus-within:border-primary/50 transition-all shadow-2xl">
              <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors">
                <span className="material-symbols-outlined align-middle">attach_file</span>
              </button>
              <textarea 
                className="flex-1 bg-transparent border-none focus:ring-0 text-body-md text-white py-[9px] px-[12px] resize-none max-h-32 placeholder:text-on-surface-variant/20" 
                placeholder="Describe your situation in any language…" 
                rows="1"
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={loading}
              ></textarea>
              <button 
                className="w-10 h-10 bg-primary text-on-primary rounded-[10px] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-[0.98] transition-all disabled:opacity-50"
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                <span className="material-symbols-outlined font-bold align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
            <p className="text-center text-[10px] text-on-surface-variant/30 font-bold uppercase tracking-[0.25em]">
              Expert Legal Intelligence · Always verify critical details
            </p>
          </div>
        </div>
      )}
    </div>
  );
}