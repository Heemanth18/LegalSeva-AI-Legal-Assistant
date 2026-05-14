const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (networkErr) {
    throw { detail: "Cannot reach the backend. Make sure python Start.py is running." };
  }
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const api = {
  // ── Citizen ──────────────────────────────────────────────────────────────
  analyzePublic(text, language = "en") {
    return request("/analyze", {
      method: "POST",
      body: JSON.stringify({ text, role: "citizen", language }),
    });
  },

  // ── Lawyer Auth ───────────────────────────────────────────────────────────
  registerLawyer({ name, email, password, bar_council_id, state, phone, specialization }) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, bar_council_id, state, phone, specialization }),
    });
  },

  loginLawyer({ email, password }) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // Keep old method for backward compatibility
  verifyBarCouncil({ name, bar_council_id, state }) {
    return request("/auth/verify-bar-council", {
      method: "POST",
      body: JSON.stringify({ name, bar_council_id, state }),
    });
  },

  // ── Lawyer AI ─────────────────────────────────────────────────────────────
  lawyerAnalyze(text, task, doc_type = null, token, case_meta = null) {
    return request("/lawyer/analyze", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, task, doc_type, case_meta }),
    });
  },

  // ── Lawyer Profile & Cases ────────────────────────────────────────────────
  lawyerMe(token) {
    return request("/lawyer/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  saveLawyerCase(caseData, token) {
    return request("/lawyer/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(caseData),
    });
  },

  getLawyerCases(token) {
    return request("/lawyer/cases", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getLawyerActivity(token) {
    return request("/lawyer/activity", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};