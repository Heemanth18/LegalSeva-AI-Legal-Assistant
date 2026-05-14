import { useState } from "react";
import { api } from "./api.js";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
];

export default function LawyerLogin({ onVerified, onBack }) {
  const [tab, setTab] = useState("signin"); // "signin" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    bar_council_id: "", state: "Karnataka",
    phone: "", specialization: "General Practice",
  });

  function clearError() { setError(""); }

  async function handleSignIn(e) {
    if (e) e.preventDefault();
    if (!signIn.email.trim() || !signIn.password.trim()) {
      setError("Credentials required."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await api.loginLawyer(signIn);
      onVerified(res.access_token, {
        name: res.lawyer_name,
        bar_id: res.bar_council_id,
        email: res.email,
      });
    } catch (e) {
      setError(e?.detail || "Authentication failed.");
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    if (e) e.preventDefault();
    if (!reg.name.trim() || !reg.email.trim() || !reg.password.trim() || !reg.bar_council_id.trim()) {
      setError("All fields are mandatory."); return;
    }
    if (reg.password !== reg.confirmPassword) { setError("Passwords mismatch."); return; }

    setLoading(true); setError("");
    try {
      const res = await api.registerLawyer({
        name: reg.name,
        email: reg.email,
        password: reg.password,
        bar_council_id: reg.bar_council_id.toUpperCase(),
        state: reg.state,
        phone: reg.phone,
        specialization: reg.specialization,
      });
      onVerified(res.access_token, {
        name: res.lawyer_name,
        bar_id: res.bar_council_id,
        email: res.email,
      });
    } catch (e) {
      setError(e?.detail || "Registration failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface text-on-surface font-body-md selection:bg-primary/30 overflow-x-hidden">
      {/* Sticky Top Header Harmonization */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-[8px] border-b border-white/5 py-[0.75rem] px-[1rem] md:px-[1.5rem] flex justify-between items-center h-16">
        <div className="flex-1 flex items-center">
          <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white transition-all group" onClick={onBack}>
            <span className="material-symbols-outlined text-lg align-middle group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span>Return</span>
          </button>
        </div>
        <div className="flex items-center gap-[10px]">
          <span className="material-symbols-outlined gold-text-gradient text-[28px] align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
          <span className="font-headline-md text-headline-md font-bold gold-text-gradient tracking-tight">LegalSeva</span>
        </div>
        <div className="flex-1 flex justify-end items-center">
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hidden md:block">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40">
              Verified Professional Gateway
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center py-[4rem] px-[1rem] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center">
          {/* Branding Above Card */}
          <div className="mb-[2.5rem] flex flex-col items-center gap-[12px] animate-fade-in">
            <div className="w-14 h-14 rounded-[16px] bg-surface-container flex items-center justify-center border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-3xl gold-text-gradient align-middle">verified_user</span>
            </div>
            <div className="text-center">
              <h1 className="font-headline-md text-headline-md text-white tracking-tight">Advocate Access</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface-variant mt-3 opacity-40">Identity Verification Required</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="glass-card-premium rounded-[20px] border border-white/10 w-full overflow-hidden shadow-2xl animate-fade-in [animation-delay:0.1s]">
            {/* Tab Header */}
            <div className="p-1.5 flex gap-1 bg-white/5 border-b border-white/5">
              <button 
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-[14px] transition-all ${tab === "signin" ? "bg-primary/10 text-primary shadow-inner" : "text-on-surface-variant/60 hover:text-white"}`}
                onClick={() => { setTab("signin"); clearError(); }}
              >
                Sign In
              </button>
              <button 
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-[14px] transition-all ${tab === "register" ? "bg-primary/10 text-primary shadow-inner" : "text-on-surface-variant/60 hover:text-white"}`}
                onClick={() => { setTab("register"); clearError(); }}
              >
                Register
              </button>
            </div>

            {/* Form Content */}
            <form className="p-[2rem] flex flex-col gap-[1.5rem]" onSubmit={tab === "signin" ? handleSignIn : handleRegister}>
              {tab === "signin" ? (
                <>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Work Email</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/20 text-[20px] align-middle">alternate_email</span>
                      <input 
                        className="w-full pl-10 pr-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-body-md text-white outline-none focus:border-primary/50 transition-all placeholder:text-on-surface-variant/10 shadow-inner" 
                        placeholder="advocate@example.com" 
                        type="email"
                        value={signIn.email}
                        onChange={(e) => { setSignIn(s=>({...s,email:e.target.value})); clearError(); }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Passphrase</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/20 text-[20px] align-middle">key</span>
                      <input 
                        className="w-full pl-10 pr-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-body-md text-white outline-none focus:border-primary/50 transition-all placeholder:text-on-surface-variant/10 shadow-inner" 
                        placeholder="Enter your password" 
                        type="password"
                        value={signIn.password}
                        onChange={(e) => { setSignIn(s=>({...s,password:e.target.value})); clearError(); }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Full Name</label>
                      <input className="w-full px-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-sm text-white outline-none focus:border-primary/50 transition-all shadow-inner" placeholder="Advocate Name" value={reg.name} onChange={(e) => setReg(r=>({...r,name:e.target.value}))} />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Work Email</label>
                      <input className="w-full px-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-sm text-white outline-none focus:border-primary/50 transition-all shadow-inner" placeholder="advocate@example.com" value={reg.email} onChange={(e) => setReg(r=>({...r,email:e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Passphrase</label>
                      <input className="w-full px-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-sm text-white outline-none focus:border-primary/50 transition-all shadow-inner" type="password" placeholder="Enter password" value={reg.password} onChange={(e) => setReg(r=>({...r,password:e.target.value}))} />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Confirm</label>
                      <input className="w-full px-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-sm text-white outline-none focus:border-primary/50 transition-all shadow-inner" type="password" placeholder="Repeat password" value={reg.confirmPassword} onChange={(e) => setReg(r=>({...r,confirmPassword:e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 mb-[8px] ml-1">Bar Council Registration ID</label>
                    <input className="w-full px-4 py-[11px] bg-surface-container-low border border-white/5 rounded-[12px] text-sm text-white outline-none focus:border-primary/50 transition-all shadow-inner" placeholder="KA/2015/12345" value={reg.bar_council_id} onChange={(e) => setReg(r=>({...r,bar_council_id:e.target.value.toUpperCase()}))} />
                  </div>
                </div>
              )}

              {error && <p className="text-error text-[9px] font-bold text-center uppercase tracking-[0.4em] animate-pulse">⚠️ {error}</p>}

              <button 
                className="w-full py-[12px] px-[20px] gold-bg-gradient text-on-primary-fixed font-bold rounded-[12px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:brightness-110 shadow-xl shadow-primary/20 group disabled:opacity-50 mt-2"
                type="submit"
                disabled={loading}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{loading ? "Verifying..." : tab === "signin" ? "Sign In" : "Create Account"}</span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1 align-middle">arrow_forward</span>
              </button>

              <div className="flex flex-col items-center gap-[1.25rem] mt-2">
                {tab === "signin" && <button type="button" className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 hover:text-white transition-colors">Credential Recovery</button>}
                
                <p className="text-[10px] font-bold text-on-surface-variant/60 text-center uppercase tracking-[0.2em]">
                  {tab === "signin" ? "Not enrolled?" : "Already verified?"}
                  <button type="button" className="gold-text-gradient font-bold hover:brightness-125 ml-3" onClick={() => { setTab(tab === "signin" ? "register" : "signin"); clearError(); }}>
                    {tab === "signin" ? "Register here" : "Sign in here"}
                  </button>
                </p>
              </div>
            </form>
          </div>

          <p className="mt-10 text-[9px] text-on-surface-variant/20 text-center max-w-[340px] leading-relaxed font-bold uppercase tracking-[0.3em] px-4">
            Authorized professional access only. Neural encryption enabled.
          </p>
        </div>
      </main>

      <footer className="w-full py-[1.5rem] bg-surface-container-low/50 border-t border-white/5 flex flex-col md:flex-row justify-between items-center px-[1.5rem] mt-auto gap-4">
        <p className="text-[9px] text-on-surface-variant/30 font-bold uppercase tracking-[0.4em]">
          LegalSeva Neural Terminal v4.2.0
        </p>
        <div className="flex gap-8">
          <a className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/30 hover:text-white transition-all opacity-100" href="#">Compliance</a>
          <a className="text-[9px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/30 hover:text-white transition-all opacity-100" href="#">Terms</a>
        </div>
      </footer>
    </div>
  );
}