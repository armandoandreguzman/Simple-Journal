"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#070b11;--bg2:#0b0f18;--bg3:#0f1520;
  --card:#111720;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
  --teal:#00d4b4;--teal2:#00bfa0;--teal-faint:rgba(0,212,180,0.07);
  --text:#d8e4f0;--text2:#7a8fa8;--text3:#3e4e62;
  --green:#0fbe88;--red:#e8514a;
  --sans:'Sora',sans-serif;--mono:'DM Mono',monospace;
  --rad:10px;--rad-lg:16px;
}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased}
.wrap{width:100%;max-width:420px;padding:1.5rem}
.logo-ring{
  width:64px;height:64px;border-radius:50%;
  background:radial-gradient(circle at 40% 40%,#142240,#0a1628);
  border:1.5px solid rgba(0,212,180,0.3);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 24px rgba(0,212,180,0.12);
  font-family:var(--mono);font-size:14px;font-weight:500;color:var(--teal);
  margin:0 auto 1.25rem;letter-spacing:1px;
}
.title{font-size:22px;font-weight:700;text-align:center;margin-bottom:6px}
.sub{font-size:13px;color:var(--text2);text-align:center;margin-bottom:2rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg);padding:2rem}
.tabs{display:flex;background:var(--bg3);border-radius:var(--rad);padding:3px;margin-bottom:1.5rem;gap:2px}
.tab{flex:1;padding:8px;border:none;background:transparent;color:var(--text2);font-size:13px;font-weight:500;cursor:pointer;border-radius:8px;transition:all 0.15s;font-family:var(--sans)}
.tab.active{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,0.3)}
.f-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.f-label{font-size:10px;font-weight:600;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase}
.f-input{background:var(--bg3);border:1px solid var(--border2);border-radius:var(--rad);padding:10px 14px;color:var(--text);font-size:13px;outline:none;transition:border-color 0.15s;width:100%;font-family:var(--sans)}
.f-input:focus{border-color:rgba(0,212,180,0.4);box-shadow:0 0 0 3px rgba(0,212,180,0.07)}
.btn{width:100%;padding:11px;border:none;border-radius:var(--rad);font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.15s;margin-top:6px;font-family:var(--sans)}
.btn-teal{background:linear-gradient(135deg,var(--teal2),var(--teal));color:#000}
.btn-teal:hover{opacity:0.85}
.btn:disabled{opacity:0.5;cursor:not-allowed}
.msg{padding:10px 14px;border-radius:var(--rad);font-size:12px;margin-bottom:14px;line-height:1.5}
.msg.error{background:rgba(232,81,74,0.1);border:1px solid rgba(232,81,74,0.25);color:var(--red)}
.msg.success{background:rgba(15,190,136,0.1);border:1px solid rgba(15,190,136,0.25);color:var(--green)}
.divider{height:1px;background:var(--border);margin:1.25rem 0;position:relative}
.divider span{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--card);padding:0 10px;font-size:11px;color:var(--text3)}
.footer{text-align:center;margin-top:1.25rem;font-size:12px;color:var(--text3)}
`;

export default function LoginPage() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      window.location.href = "/";
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!name.trim()) { setMsg({ type: "error", text: "Please enter your name." }); return; }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Account created! Check your email to confirm, then log in." });
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") tab === "login" ? handleLogin() : handleSignup();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="logo-ring">JKIS</div>
        <div className="title">Simple Journal</div>
        <div className="sub">Your personal trading edge tracker</div>

        <div className="card">
          <div className="tabs">
            <button className={`tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); setMsg(null); }}>Sign In</button>
            <button className={`tab${tab === "signup" ? " active" : ""}`} onClick={() => { setTab("signup"); setMsg(null); }}>Create Account</button>
          </div>

          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

          {tab === "signup" && (
            <div className="f-group">
              <label className="f-label">Your Name</label>
              <input className="f-input" placeholder="Armando" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKeyDown} />
            </div>
          )}

          <div className="f-group">
            <label className="f-label">Email</label>
            <input className="f-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
          </div>

          <div className="f-group">
            <label className="f-label">Password</label>
            <input className="f-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
          </div>

          <button
            className="btn btn-teal"
            onClick={tab === "login" ? handleLogin : handleSignup}
            disabled={loading}>
            {loading ? "Please wait…" : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>

        <div className="footer">Edge Tracker Pro · Simple Journal</div>
      </div>
    </>
  );
}
