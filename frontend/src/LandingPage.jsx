import React from "react";

const QUOTES = [
  { text: "Equal justice under law.", attr: "— Inscribed on the US Supreme Court" },
  { text: "The law is reason, free from passion.", attr: "— Aristotle" },
  { text: "Justice delayed is justice denied.", attr: "— William E. Gladstone" },
];

export default function LandingPage({ onCitizen, onAdvocate }) {
  const q = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface text-on-surface font-body-md overflow-x-hidden selection:bg-primary/30">
      {/* Sticky Top Header Harmonization */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-[8px] border-b border-white/5 py-[0.75rem] px-[1rem] md:px-[1.5rem] flex justify-between items-center h-16 shadow-lg shadow-black/20">
        <div className="flex items-center gap-[10px]">
          <div className="flex items-center gap-[10px]">
            <span className="material-symbols-outlined gold-text-gradient text-[28px] align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
            <span className="font-headline-md text-headline-md font-bold gold-text-gradient tracking-tight">LegalSeva</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Free · Fair · For Every Indian</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        {/* Hero Section with Depth */}
        <section className="w-full flex flex-col items-center justify-center text-center py-[4rem] px-[1rem] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
          <div className="max-w-[760px] flex flex-col items-center gap-[1.5rem] animate-fade-in">
            <h1 className="font-display-lg text-display-lg text-white leading-tight">Your rights. Your <span className="gold-text-gradient">justice</span>.</h1>
            <p className="text-body-lg text-on-surface-variant opacity-80 max-w-[600px]">
              Understand Indian law in plain language — IPC, BNS, CrPC, consumer rights and more.
              Expert legal intelligence for citizens and verified advocates.
            </p>
          </div>

          {/* Portal Grid - Unified Spatial Rhythm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem] w-full max-w-[760px] mt-16 px-[1rem]">
            {/* Citizen Portal Card - Custom Background & Enhanced Glassmorphism */}
            <div 
              className="group rounded-[32px] border border-white/5 overflow-hidden transition-all shadow-2xl relative min-h-[420px] flex flex-col bg-surface"
              style={{ 
                backgroundImage: "url('/assets/citizen_portal_bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
            >
              {/* Reduced Glass Layer Blur */}
              <div className="absolute inset-0 bg-surface/30 backdrop-blur-[2px] group-hover:backdrop-blur-none transition-all duration-500"></div>
              
              {/* Bottom Edge Masking Layer */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-surface via-surface/90 to-transparent z-[1]"></div>

              <div className="p-8 md:p-10 flex flex-col items-start text-left gap-[1rem] relative z-10 mt-auto">
                <div className="w-12 h-12 rounded-[14px] bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-primary/10">
                  <span className="text-2xl align-middle">👤</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-white tracking-tight">Citizen Portal</h3>
                <p className="text-body-md text-on-surface-variant opacity-90 leading-relaxed max-w-[300px]">Know your rights, file FIRs, and get legal guidance in 12+ Indian languages.</p>
                <button 
                  className="mt-4 py-[12px] px-[20px] gold-bg-gradient text-on-primary-fixed font-bold rounded-[10px] flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 w-full justify-center group/btn"
                  onClick={onCitizen}
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest">Enter Citizen Portal</span>
                  <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform align-middle">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Advocate Portal Card - Custom Background & Enhanced Glassmorphism */}
            <div 
              className="group rounded-[32px] border border-white/5 overflow-hidden transition-all shadow-2xl relative min-h-[420px] flex flex-col bg-surface"
              style={{ 
                backgroundImage: "url('/assets/advocate_hub_bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
            >
              {/* Reduced Glass Layer Blur */}
              <div className="absolute inset-0 bg-surface/30 backdrop-blur-[2px] group-hover:backdrop-blur-none transition-all duration-500"></div>

              {/* Bottom Edge Masking Layer */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-surface via-surface/90 to-transparent z-[1]"></div>

              <div className="p-8 md:p-10 flex flex-col items-start text-left gap-[1rem] relative z-10 mt-auto">
                <div className="w-12 h-12 rounded-[14px] bg-white/5 flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                  <span className="text-2xl align-middle">🏛</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-white tracking-tight">Advocate Portal</h3>
                <p className="text-body-md text-on-surface-variant opacity-90 leading-relaxed max-w-[300px]">AI-powered drafting, strategy, and research for verified legal practitioners.</p>
                <button 
                  className="mt-4 py-[12px] px-[20px] border border-primary/40 text-primary hover:bg-primary/5 font-bold rounded-[10px] flex items-center gap-2 transition-all w-full justify-center group/btn"
                  onClick={onAdvocate}
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest">Advocate Login</span>
                  <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform align-middle">login</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Quote Strip */}
        <div className="w-full py-4 bg-surface-container-low/50 text-center border-t border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40">
          "{q.text}" — {q.attr}
        </div>

        {/* Feature Stats Matrix */}
        <section className="w-full max-w-[760px] grid grid-cols-1 md:grid-cols-3 gap-[1.5rem] py-[4rem] px-[1.5rem]">
           <div className="flex flex-col items-center text-center gap-3 p-6 bg-surface-container-low rounded-[20px] border border-white/5 shadow-inner">
              <span className="material-symbols-outlined text-primary text-3xl">database</span>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">15+ IPC datasets</h4>
              <p className="text-[11px] text-on-surface-variant opacity-40">Extensive legal knowledge base</p>
           </div>
           <div className="flex flex-col items-center text-center gap-3 p-6 bg-surface-container-low rounded-[20px] border border-white/5 shadow-inner">
              <span className="material-symbols-outlined text-primary text-3xl">translate</span>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">12 Indian languages</h4>
              <p className="text-[11px] text-on-surface-variant opacity-40">Multilingual legal accessibility</p>
           </div>
           <div className="flex flex-col items-center text-center gap-3 p-6 bg-surface-container-low rounded-[20px] border border-white/5 shadow-inner">
              <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">100% Free</h4>
              <p className="text-[11px] text-on-surface-variant opacity-40">Justice for every Indian citizen</p>
           </div>
        </section>
      </main>

      <footer className="w-full py-[3rem] bg-surface-container-lowest border-t border-white/5 flex flex-col md:flex-row justify-between items-center px-[1.5rem] gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined gold-text-gradient text-[24px] align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
            <span className="font-headline-md text-headline-md font-bold gold-text-gradient tracking-tight">LegalSeva</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40">Empowering justice for every Indian citizen.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <a className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white transition-all opacity-60" href="#">Privacy Hub</a>
          <a className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white transition-all opacity-60" href="#">Terms.Protocol</a>
          <a className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white transition-all opacity-60" href="#">Network.Status</a>
        </div>
      </footer>
    </div>
  );
}