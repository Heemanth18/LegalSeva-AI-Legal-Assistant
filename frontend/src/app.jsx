import { useState } from "react";
import LandingPage     from "./LandingPage.jsx";
import CitizenPortal   from "./CitizenPortal.jsx";
import LawyerLogin     from "./LawyerLogin.jsx";
import LawyerWorkspace from "./LawyerWorkspace.jsx";
import "./index.css";

export default function App() {
  const [view, setView] = useState("landing"); // landing | citizen | lawyer-login | lawyer
  const [lawyerToken, setLawyerToken] = useState(() => sessionStorage.getItem("ls_token") || null);
  const [lawyerMeta,  setLawyerMeta]  = useState(() => JSON.parse(sessionStorage.getItem("ls_meta") || "null"));

  function handleLawyerVerified(token, meta) {
    sessionStorage.setItem("ls_token", token);
    sessionStorage.setItem("ls_meta", JSON.stringify(meta));
    setLawyerToken(token);
    setLawyerMeta(meta);
    setView("lawyer");
  }

  function handleLogout() {
    sessionStorage.clear();
    setLawyerToken(null);
    setLawyerMeta(null);
    setView("landing");
  }

  if (view === "landing")      return <LandingPage onCitizen={() => setView("citizen")} onAdvocate={() => lawyerToken ? setView("lawyer") : setView("lawyer-login")} />;
  if (view === "citizen")      return <CitizenPortal onBack={() => setView("landing")} existingToken={lawyerToken} onEnterWorkspace={() => setView("lawyer")} />;
  if (view === "lawyer-login") return <LawyerLogin onVerified={handleLawyerVerified} onBack={() => setView("landing")} />;
  return <LawyerWorkspace token={lawyerToken} meta={lawyerMeta} onLogout={handleLogout} />;
}