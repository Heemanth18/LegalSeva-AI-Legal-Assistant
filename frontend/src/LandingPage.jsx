import { useState } from "react";
import "./index.css";

const QUOTES = [
  { text: "Equal justice under law.", attr: "— Inscribed on the US Supreme Court" },
  { text: "The law is reason, free from passion.", attr: "— Aristotle" },
  { text: "Justice delayed is justice denied.", attr: "— William E. Gladstone" },
];

export default function LandingPage({ onCitizen, onAdvocate }) {
  const q = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  return (
    <div className="landing-shell">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-icon">⚖</span>
          <span className="landing-brand-name">LegalSeva</span>
        </div>
        <span className="landing-tagline">Free · Fair · For Every Indian</span>
      </nav>

      {/* Hero — centered */}
      <div className="landing-hero">
        <div className="landing-eyebrow">AI-Powered Indian Legal Assistance</div>

        <div className="landing-hero-text">
          <h1 className="landing-h1">
            Your rights.<br />
            Your <span className="landing-h1-accent">justice.</span>
          </h1>
          <p className="landing-desc">
            Understand Indian law in plain language — IPC, BNS, CrPC, consumer rights and more.
            Free for every citizen. Professional AI tools for verified advocates.
          </p>
        </div>

        {/* Portal cards — the primary CTA, vertically centered in page */}
        <div className="portal-cards">
          <button className="portal-card" onClick={onCitizen}>
            <div className="portal-card-icon">👤</div>
            <div className="portal-card-label">Citizen Portal</div>
            <div className="portal-card-sub">
              Ask about your rights, FIR filing, bail, legal notices — in any Indian language.
              Free and instant.
            </div>
            <div className="portal-features">
              <span className="pf-tag">🌐 12 languages</span>
              <span className="pf-tag">⚖ IPC / BNS</span>
              <span className="pf-tag">📋 FIR guidance</span>
              <span className="pf-tag">📄 Document reader</span>
            </div>
            <div className="portal-cta">Enter Citizen Portal →</div>
          </button>

          <div className="portal-divider">or</div>

          <button className="portal-card" onClick={onAdvocate}>
            <div className="portal-card-icon">🏛</div>
            <div className="portal-card-label">Advocate Portal</div>
            <div className="portal-card-sub">
              Case strategy, document drafting, precedent research and document verification
              — for Bar Council verified advocates.
            </div>
            <div className="portal-features">
              <span className="pf-tag">📄 Draft docs</span>
              <span className="pf-tag">🔍 Case research</span>
              <span className="pf-tag">🧠 Strategy AI</span>
              <span className="pf-tag">📋 Doc analysis</span>
            </div>
            <div className="portal-cta">Advocate Login →</div>
          </button>
        </div>
      </div>

      {/* Law quote strip */}
      <div className="law-quote-strip">
        "{q.text}" <strong>{q.attr}</strong>
      </div>

      {/* Stats */}
      <div className="landing-stats">
        <div className="stat-item"><span className="stat-num">15+</span><span className="stat-label">IPC datasets</span></div>
        <div className="stat-divider" />
        <div className="stat-item"><span className="stat-num">12</span><span className="stat-label">Indian languages</span></div>
        <div className="stat-divider" />
        <div className="stat-item"><span className="stat-num">100%</span><span className="stat-label">Free for citizens</span></div>
        <div className="stat-divider" />
        <div className="stat-item"><span className="stat-num">Local</span><span className="stat-label">AI — on device</span></div>
      </div>

      <footer className="landing-footer">
        LegalSeva provides general legal information, not legal advice. Always consult a qualified advocate for court proceedings.
      </footer>
    </div>
  );
}