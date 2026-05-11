import { useState } from "react";
import { api } from "./api.js";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi",
];

const SPECIALIZATIONS = [
  "Criminal Law","Civil Law","Family Law","Consumer Law","Corporate Law",
  "Constitutional Law","Cyber Law","Labour Law","Property Law","General Practice",
];

export default function LawyerLogin({ onVerified, onBack }) {
  const [tab,     setTab]     = useState("signin"); // "signin" | "register"
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Sign in fields
  const [signIn, setSignIn] = useState({ email: "", password: "" });

  // Register fields
  const [reg, setReg] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    bar_council_id: "", state: "Karnataka",
    phone: "", specialization: "General Practice",
  });

  function clearError() { setError(""); }

  // ── Sign In ──────────────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!signIn.email.trim() || !signIn.password.trim()) {
      setError("Please enter your email and password."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await api.loginLawyer(signIn);
      onVerified(res.access_token, {
        name:   res.lawyer_name,
        bar_id: res.bar_council_id,
        email:  res.email,
      });
    } catch (e) {
      setError(e?.detail || "Sign in failed. Check your email and password.");
    } finally { setLoading(false); }
  }

  // ── Register ─────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!reg.name.trim())           { setError("Full name is required.");          return; }
    if (!reg.email.trim())          { setError("Email is required.");              return; }
    if (!reg.password.trim())       { setError("Password is required.");           return; }
    if (reg.password.length < 6)    { setError("Password must be at least 6 characters."); return; }
    if (reg.password !== reg.confirmPassword) { setError("Passwords do not match."); return; }
    if (!reg.bar_council_id.trim()) { setError("Bar Council ID is required.");     return; }

    setLoading(true); setError("");
    try {
      const res = await api.registerLawyer({
        name:           reg.name,
        email:          reg.email,
        password:       reg.password,
        bar_council_id: reg.bar_council_id.toUpperCase(),
        state:          reg.state,
        phone:          reg.phone,
        specialization: reg.specialization,
      });
      onVerified(res.access_token, {
        name:   res.lawyer_name,
        bar_id: res.bar_council_id,
        email:  res.email,
      });
    } catch (e) {
      setError(e?.detail || "Registration failed. Please check your details.");
    } finally { setLoading(false); }
  }

  return (
    <div className="app-shell lawyer">
      <div className="login-center">
        <div className="login-card">

          {/* Back button */}
          <button className="back-btn" onClick={onBack}>← Back to home</button>

          {/* Header */}
          <div className="login-icon">⚖</div>
          <h1 className="login-title">Advocate Portal</h1>
          <p className="login-sub">
            Verified access for Bar Council of India enrolled advocates.
          </p>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === "signin" ? "active" : ""}`}
              onClick={() => { setTab("signin"); clearError(); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${tab === "register" ? "active" : ""}`}
              onClick={() => { setTab("register"); clearError(); }}
            >
              Register
            </button>
          </div>

          {/* ── SIGN IN FORM ── */}
          {tab === "signin" && (
            <div className="auth-form">
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="advocate@example.com"
                  value={signIn.email}
                  onChange={(e) => { setSignIn(s=>({...s,email:e.target.value})); clearError(); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter your password"
                  value={signIn.password}
                  onChange={(e) => { setSignIn(s=>({...s,password:e.target.value})); clearError(); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button
                className="btn-primary lawyer-btn full-width"
                onClick={handleSignIn}
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>

              <p className="auth-switch">
                Don't have an account?{" "}
                <button className="link-btn" onClick={() => { setTab("register"); clearError(); }}>
                  Register here
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === "register" && (
            <div className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full name *</label>
                  <input
                    className="form-input"
                    placeholder="Adv. Rajesh Kumar"
                    value={reg.name}
                    onChange={(e) => { setReg(r=>({...r,name:e.target.value})); clearError(); }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email address *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="advocate@example.com"
                    value={reg.email}
                    onChange={(e) => { setReg(r=>({...r,email:e.target.value})); clearError(); }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={reg.password}
                    onChange={(e) => { setReg(r=>({...r,password:e.target.value})); clearError(); }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm password *</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat password"
                    value={reg.confirmPassword}
                    onChange={(e) => { setReg(r=>({...r,confirmPassword:e.target.value})); clearError(); }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bar Council ID *</label>
                  <input
                    className="form-input"
                    placeholder="KA/2015/12345"
                    value={reg.bar_council_id}
                    onChange={(e) => { setReg(r=>({...r,bar_council_id:e.target.value.toUpperCase()})); clearError(); }}
                  />
                  <span className="form-hint">Format: STATE/YEAR/NUMBER</span>
                </div>
                <div className="form-group">
                  <label className="form-label">State Bar Council *</label>
                  <select
                    className="form-input"
                    value={reg.state}
                    onChange={(e) => setReg(r=>({...r,state:e.target.value}))}
                  >
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <input
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={reg.phone}
                    onChange={(e) => setReg(r=>({...r,phone:e.target.value}))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <select
                    className="form-input"
                    value={reg.specialization}
                    onChange={(e) => setReg(r=>({...r,specialization:e.target.value}))}
                  >
                    {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <button
                className="btn-primary lawyer-btn full-width"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account & Enter Workspace →"}
              </button>

              <p className="auth-switch">
                Already registered?{" "}
                <button className="link-btn" onClick={() => { setTab("signin"); clearError(); }}>
                  Sign in here
                </button>
              </p>
            </div>
          )}

          <p className="login-note">
            Your session is valid for 8 hours. All queries are logged for audit compliance.
          </p>
        </div>
      </div>
    </div>
  );
}