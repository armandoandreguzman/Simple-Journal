"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SESSIONS = ["New York", "London", "Asia", "London/NY Overlap", "Pre-Market"];
const DAILY_BIAS_OPTIONS = ["Bullish", "Bearish", "Neutral", "Range"];
const PREV_CANDLE_OPTIONS = ["Bullish", "Bearish", "Doji", "Inside Bar", "Engulfing"];
const CONDITIONS = ["Market Mechanics", "Failed Auction", "Breakout Continuation", "POC"];
const LTFC_OPTIONS = ["Gap", "Inverse Gap", "M3 Engulfing", "M5 Engulfing", "VAL Close", "VAH Close", "LVN Rejection"];
const EXECUTION_TYPES = ["Market Execution", "Limit Order", "Stop Order"];
const TRADE_STATUS_OPTIONS = ["T/P", "S/L", "B/E", "Partial", "Manual Close", "Running"];
const SETUP_TYPES = ["Reversal", "Breakout", "Other"];
const MISTAKE_TYPES = ["None", "Early Entry", "Late Entry", "Wrong Stop", "Oversize", "FOMO Entry", "Ignored Plan", "Chased Price", "Poor R:R", "News Event", "Emotional Exit", "No Setup", "Other"];
const EMOTIONS = ["Calm", "Confident", "Focused", "Anxious", "FOMO", "Frustrated", "Overconfident", "Fearful", "Disciplined", "Greedy"];
const STORAGE_KEY = "wwa_journal_v3";
const ACCOUNTS_KEY = "sj_accounts_v1";
const ACCOUNT_TYPES = ["Funded/Live", "Prop Challenge", "Personal", "Demo"];
const ACCOUNT_TYPE_COLORS = {
  "Funded/Live": "#00d4b4",
  "Prop Challenge": "#a78bfa",
  "Personal": "#0fbe88",
  "Demo": "#e8a838",
};
const DEFAULT_ACCOUNTS = [];

const defaultForm = {
  symbol: "", date: new Date().toISOString().slice(0, 10),
  tradeStatus: "", tradeType: "Long", session: "", netPnL: "",
  dailyBias: "", prevCandleClose: "", condition: "",
  ltfcTags: [], executionType: "", setupType: "",
  openPrice: "", closePrice: "", stopLoss: "", takeProfit: "",
  entryTime: "", exitTime: "",
  riskPct: "", rr: "", pips: "", lotSize: "", grossPnL: "", commissions: "", riskAmount: "", resultR: "",
  emotionBefore: "", emotionDuring: "", emotionAfter: "",
  confidenceLevel: 7, followedRules: "Yes", mistakeType: "None",
  notes: "", lessonsLearned: "", screenshotUrl: "",
  accountId: "",
};

// ─────────────────────────────────────────────
// RULE-BASED AI COACH
// TODO: Replace body with real API call when ready
// ─────────────────────────────────────────────
function analyzeTradeWithAI(trade) {
  const r = parseFloat(trade.resultR) || 0;
  const followed = trade.followedRules === "Yes";
  const mistake = trade.mistakeType;
  const confidence = parseInt(trade.confidenceLevel);
  const emo = trade.emotionBefore;
  const isValid = followed && mistake === "None" && trade.setupType && trade.session && trade.ltfcTags?.length > 0;
  let execScore = 10;
  if (!followed) execScore -= 3;
  if (mistake !== "None") execScore -= 2;
  if (confidence < 4) execScore -= 1;
  if (["FOMO","Anxious","Greedy","Frustrated"].includes(emo)) execScore -= 2;
  execScore = Math.max(0, Math.min(10, execScore));
  let riskScore = 10;
  if (!trade.stopLoss) riskScore -= 3;
  if (!trade.riskAmount) riskScore -= 1;
  if (["Oversize","Wrong Stop"].includes(mistake)) riskScore -= 3;
  if (r < -2) riskScore -= 2;
  riskScore = Math.max(0, Math.min(10, riskScore));
  let psychPattern = "Disciplined execution";
  if (["FOMO","Greedy"].includes(emo)) psychPattern = "Greed-driven decision making";
  else if (["Anxious","Fearful"].includes(emo)) psychPattern = "Fear affecting entry/exit timing";
  else if (!followed) psychPattern = "Plan deviation — impulsive behavior";
  else if (confidence > 8 && !isValid) psychPattern = "Overconfidence leading to poor setups";
  const mainMistake = mistake !== "None" ? mistake : followed ? "None identified" : "Rule violation";
  let advice = "Strong execution. Keep journaling to surface subtle patterns.";
  if (!followed) advice = "Read your rules before each session. Build a pre-trade checklist.";
  else if (["FOMO","Greedy"].includes(emo)) advice = "When FOMO or greed appear, step away 5 min. Another setup will come.";
  else if (mistake !== "None") advice = `Target eliminating "${mistake}" with a specific pre-trade checklist item.`;
  else if (r < 0) advice = "A loss on a valid setup is fine. Outcomes ≠ quality. Keep the process.";
  const reminder = isValid && r > 0 ? "Stay process-focused, not profit-focused." : !followed ? "Next trade: read your rules out loud first." : "Wait for A-grade setups only.";
  return { isValid, mainMistake, psychPattern, execScore, riskScore, advice, reminder };
}

// ─────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Sora:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root {
  --bg:#070b11;
  --bg2:#0b0f18;
  --bg3:#0f1520;
  --bg4:#141b27;
  --bg5:#19212f;
  --card:#111720;
  --card2:#161e2c;
  --border:rgba(255,255,255,0.055);
  --border2:rgba(255,255,255,0.09);
  --border3:rgba(255,255,255,0.14);
  --teal:#00d4b4;
  --teal2:#00bfa0;
  --teal-glow:rgba(0,212,180,0.15);
  --teal-faint:rgba(0,212,180,0.07);
  --purple:#9b7fe8;
  --purple-faint:rgba(155,127,232,0.12);
  --blue:#4a90d9;
  --blue-faint:rgba(74,144,217,0.1);
  --green:#0fbe88;
  --green-faint:rgba(15,190,136,0.1);
  --red:#e8514a;
  --red-faint:rgba(232,81,74,0.1);
  --amber:#e8a838;
  --text:#d8e4f0;
  --text2:#7a8fa8;
  --text3:#3e4e62;
  --mono:'DM Mono',monospace;
  --sans:'Sora',sans-serif;
  --rad:10px;
  --rad-lg:14px;
  --rad-xl:18px;
}

body{background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.5;font-size:14px;-webkit-font-smoothing:antialiased}
input,select,textarea,button{font-family:var(--sans);color:inherit}
button{cursor:pointer}

::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-thumb{background:#1c2840;border-radius:3px}
::-webkit-scrollbar-track{background:transparent}

/* ── LAYOUT ── */
.layout{display:flex;min-height:100vh}

/* ── SIDEBAR ── */
.sidebar{
  width:228px;min-width:228px;
  background:var(--bg2);
  border-right:1px solid var(--border);
  display:flex;flex-direction:column;
  position:fixed;height:100vh;z-index:20;
  overflow-y:auto;overflow-x:hidden;
}

.sb-logo-area{
  padding:1.4rem 1.25rem 1.2rem;
  border-bottom:1px solid var(--border);
  display:flex;flex-direction:column;align-items:center;gap:10px;
}
.sb-logo-ring{
  width:58px;height:58px;border-radius:50%;
  background:radial-gradient(circle at 40% 40%,#142240,#0a1628);
  border:1.5px solid rgba(0,212,180,0.3);
  display:flex;align-items:center;justify-content:center;
  position:relative;
  box-shadow:0 0 20px rgba(0,212,180,0.12),inset 0 0 12px rgba(0,212,180,0.06);
}
.sb-logo-ring::after{
  content:'';position:absolute;inset:-1px;border-radius:50%;
  background:conic-gradient(from 180deg,rgba(0,212,180,0.5) 0deg,transparent 120deg,rgba(155,127,232,0.3) 240deg,transparent 360deg);
  z-index:0;animation:ring-spin 10s linear infinite;
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 1.5px),#fff calc(100% - 1.5px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 1.5px),#fff calc(100% - 1.5px));
}
@keyframes ring-spin{to{transform:rotate(360deg)}}
.sb-logo-inner{position:relative;z-index:1;font-family:var(--mono);font-size:12px;font-weight:500;color:var(--teal);letter-spacing:1px}
.sb-app-name{font-size:13px;font-weight:600;color:var(--text);letter-spacing:0.06em}
.sb-app-sub{font-size:9.5px;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase}

.sb-nav{padding:0.85rem 0.75rem;flex:1;display:flex;flex-direction:column;gap:1px}
.sb-section-label{font-size:9px;color:var(--text3);letter-spacing:0.14em;text-transform:uppercase;padding:0.8rem 0.85rem 0.3rem;font-weight:600}

.sb-item{
  display:flex;align-items:center;gap:9px;
  padding:0.58rem 0.85rem;border:none;background:transparent;
  color:var(--text2);border-radius:var(--rad);
  font-size:12.5px;font-weight:500;width:100%;text-align:left;
  transition:all 0.14s;position:relative;
}
.sb-item:hover{background:rgba(255,255,255,0.04);color:var(--text)}
.sb-item.active{
  background:rgba(0,212,180,0.08);color:var(--teal);
}
.sb-item.active::before{
  content:'';position:absolute;left:0;top:20%;bottom:20%;
  width:2px;border-radius:0 2px 2px 0;
  background:var(--teal);box-shadow:0 0 8px var(--teal);
}
.sb-item svg{width:15px;height:15px;opacity:0.65;flex-shrink:0;transition:opacity 0.14s}
.sb-item.active svg{opacity:1}

.sb-footer{
  padding:1rem 1.25rem;border-top:1px solid var(--border);
  font-size:11px;color:var(--text3);display:flex;align-items:center;gap:8px;
}
.sb-avatar{
  width:28px;height:28px;border-radius:50%;
  background:linear-gradient(135deg,#1a3060,#2a4a9f);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:600;color:#7aadff;flex-shrink:0;
}

/* ── MAIN ── */
.main{margin-left:228px;flex:1;min-height:100vh;display:flex;flex-direction:column}

.topbar{
  background:var(--bg2);border-bottom:1px solid var(--border);
  padding:0 1.75rem;height:52px;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:10;
}
.tb-left{display:flex;align-items:center;gap:10px}
.tb-title{font-size:14px;font-weight:600;color:var(--text)}
.tb-right{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--text3);font-family:var(--mono)}
.live-pip{width:6px;height:6px;border-radius:50%;background:var(--teal);box-shadow:0 0 8px var(--teal);animation:pulse 2.5s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
@keyframes spin{to{transform:rotate(360deg)}}

.page{padding:1.5rem 1.75rem;flex:1}

/* ── CARDS ── */
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg)}
.sec-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg);overflow:visible;margin-bottom:12px}
.sec-head{
  padding:13px 18px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:9px;
}
.sec-accent{width:2.5px;height:16px;border-radius:2px;flex-shrink:0}
.sec-accent.teal{background:var(--teal);box-shadow:0 0 8px var(--teal)}
.sec-accent.purple{background:var(--purple);box-shadow:0 0 8px var(--purple)}
.sec-accent.blue{background:var(--blue);box-shadow:0 0 8px var(--blue)}
.sec-title{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text2)}
.sec-body{padding:16px 18px}

/* ── DASHBOARD KPI ROW (like WWA top bar) ── */
.kpi-bar{
  background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg);
  display:grid;grid-template-columns:repeat(4,1fr);
  margin-bottom:12px;
}
.kpi-bar-item{
  padding:1.1rem 1.4rem;display:flex;flex-direction:column;gap:5px;
  border-right:1px solid var(--border);
}
.kpi-bar-item:last-child{border-right:none}
.kpi-bar-label{font-size:9.5px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;font-weight:600}
.kpi-bar-val{font-family:var(--mono);font-size:22px;font-weight:500;letter-spacing:-0.5px}
.kpi-bar-val.pos{color:var(--green)}
.kpi-bar-val.neg{color:var(--red)}
.kpi-bar-val.teal{color:var(--teal)}
.kpi-bar-val.muted{color:var(--text2)}

/* ── STAT CARDS GRID ── */
.stat-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:12px}
.stat-card{
  background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg);
  padding:1rem 1.1rem;display:flex;flex-direction:column;gap:5px;
}
.stat-label{font-size:9.5px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:600}
.stat-val{font-family:var(--mono);font-size:18px;font-weight:500}
.stat-val.pos{color:var(--green)}
.stat-val.neg{color:var(--red)}
.stat-val.teal{color:var(--teal)}
.stat-val.muted{color:var(--text2)}
.stat-sub{font-size:10px;color:var(--text3)}

/* ── TABLE ── */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
thead tr{border-bottom:1px solid var(--border)}
th{padding:9px 12px;text-align:left;font-size:9px;font-weight:600;color:var(--text3);letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text2);white-space:nowrap;font-size:12.5px}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,0.012)}
.td-sym{font-family:var(--mono);font-weight:600;color:var(--text);font-size:13px}
.td-r{font-family:var(--mono);font-weight:600}
.td-r.pos{color:var(--green)}
.td-r.neg{color:var(--red)}

/* ── BADGES ── */
.bdg{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:600;white-space:nowrap;letter-spacing:0.02em}
.bdg.long{background:var(--green-faint);color:var(--green);border:1px solid rgba(15,190,136,0.2)}
.bdg.short{background:var(--red-faint);color:var(--red);border:1px solid rgba(232,81,74,0.2)}
.bdg.valid{background:var(--green-faint);color:var(--green)}
.bdg.invalid{background:var(--red-faint);color:var(--red)}
.bdg.sess{background:var(--teal-faint);color:var(--teal);border:1px solid rgba(0,212,180,0.18)}
.bdg.stat{background:var(--teal-faint);color:var(--teal);border:1px solid rgba(0,212,180,0.25);padding:4px 12px;font-size:11px;border-radius:8px}

/* ── ANALYTICS PLACEHOLDERS ── */
.ana-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.acc-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.acc-type-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg);padding:1rem 1.25rem;display:flex;flex-direction:column;gap:6px;cursor:default}
.acc-type-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.acc-type-label{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;display:flex;align-items:center;gap:6px}
.acc-type-count{font-family:var(--mono);font-size:22px;font-weight:500;color:var(--text)}
.acc-filter-row{display:flex;gap:2px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--rad);padding:3px;margin-bottom:14px;width:fit-content}
.acc-filter-btn{padding:5px 16px;border-radius:7px;border:none;background:transparent;color:var(--text3);font-size:12px;font-weight:500;cursor:pointer;transition:all 0.13s}
.acc-filter-btn:hover{color:var(--text)}
.acc-filter-btn.active{background:var(--card2);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,0.3)}
.donut-wrap{display:flex;align-items:center;justify-content:center;padding:2rem 0 1.5rem;position:relative}
.donut-center{position:absolute;text-align:center;pointer-events:none}
.donut-val{font-family:var(--mono);font-size:20px;font-weight:600;color:var(--text)}
.donut-sub{font-size:10px;color:var(--text3);margin-top:2px}
.donut-legend{display:flex;gap:18px;justify-content:center;padding-bottom:1.25rem}
.donut-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)}
.acc-list-item{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;border-bottom:1px solid var(--border);
  transition:background 0.13s;cursor:default;
}
.acc-list-item:last-child{border-bottom:none}
.acc-list-item:hover{background:rgba(255,255,255,0.02)}
.acc-name{font-size:14px;font-weight:600;color:var(--text)}
.acc-firm-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:6px;font-size:10px;font-weight:600;margin-left:8px}
.acc-stats{display:flex;gap:28px;align-items:center}
.acc-stat{display:flex;flex-direction:column;gap:2px;text-align:right}
.acc-stat-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em}
.acc-stat-val{font-family:var(--mono);font-size:13px;font-weight:500}
.acc-actions{display:flex;gap:8px;align-items:center;margin-left:16px}
/* Add account modal */
.add-acc-form{display:flex;flex-direction:column;gap:14px}
/* ── CALENDAR ── */
.cal-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border)}
.cal-tabs{display:flex;gap:0;border-bottom:1px solid var(--border)}
.cal-tab{padding:11px 22px;border:none;background:transparent;color:var(--text3);font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.14s;margin-bottom:-1px}
.cal-tab:hover{color:var(--text)}
.cal-tab.active{color:var(--teal);border-bottom-color:var(--teal)}
.cal-nav{display:flex;align-items:center;gap:12px}
.cal-nav-btn{width:28px;height:28px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.13s;font-size:14px}
.cal-nav-btn:hover{border-color:var(--teal);color:var(--teal)}
.cal-month-label{font-size:15px;font-weight:600;color:var(--text);min-width:130px;text-align:center}
.cal-today-btn{padding:5px 14px;border-radius:7px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;transition:all 0.13s}
.cal-today-btn:hover{border-color:var(--teal);color:var(--teal)}
.cal-stats-bar{display:flex;align-items:center;gap:20px;font-size:12px;color:var(--text3)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);border-left:1px solid var(--border);border-top:1px solid var(--border)}
.cal-day-header{padding:10px 14px;font-size:10px;font-weight:600;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg2)}
.cal-cell{min-height:105px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:10px 12px;position:relative;transition:background 0.12s;cursor:default}
.cal-cell.other-month{opacity:0.35}
.cal-cell.today-cell{background:rgba(0,212,180,0.04)}
.cal-cell.has-trades.profit{background:rgba(15,190,136,0.12)}
.cal-cell.has-trades.loss{background:rgba(232,81,74,0.1)}
.cal-cell-num{font-size:12px;color:var(--text3);font-weight:500;margin-bottom:8px}
.cal-cell.today-cell .cal-cell-num{color:var(--teal);font-weight:700}
.cal-cell-pnl{font-family:var(--mono);font-size:14px;font-weight:700;margin-bottom:4px}
.cal-cell-pnl.pos{color:var(--green)}
.cal-cell-pnl.neg{color:var(--red)}
.cal-cell-trades{font-size:10px;color:var(--text3)}
.cal-equity-wrap{padding:1.25rem 1.5rem}

.acc-tabbar{
  display:flex;align-items:center;gap:0;
  background:var(--bg2);border-bottom:1px solid var(--border);
  padding:0 1.75rem;overflow-x:auto;
}
.acc-tabbar::-webkit-scrollbar{height:0}
.acc-tab{
  padding:11px 20px;border:none;background:transparent;
  color:var(--text3);font-size:13px;font-weight:500;cursor:pointer;
  border-bottom:2px solid transparent;white-space:nowrap;
  transition:all 0.14s;margin-bottom:-1px;display:flex;align-items:center;gap:6px;
}
.acc-tab:hover{color:var(--text)}
.acc-tab.active{color:var(--text);border-bottom-color:var(--teal);font-weight:600}
.chart-ph{
  height:170px;background:var(--bg3);border-radius:var(--rad);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:7px;color:var(--text3);font-size:11.5px;
  border:1px dashed var(--border2);
}

/* ═══════════════════════════════════
   LOG TRADE FORM — WWA Style
═══════════════════════════════════ */

/* Trade Overview Card */
.to-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rad-lg);overflow:visible;margin-bottom:12px}
.to-top{padding:20px 22px;border-bottom:1px solid var(--border)}
.to-sym-row{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
.to-sym{font-family:var(--mono);font-size:26px;font-weight:700;color:var(--text);letter-spacing:1px;background:transparent;border:none;outline:none;width:200px}
.to-sym::placeholder{color:var(--text3)}
.to-pnl{font-family:var(--mono);font-size:26px;font-weight:600;margin-top:4px}
.to-pnl.pos{color:var(--green)}
.to-pnl.neg{color:var(--red)}
.to-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border)}
.to-meta-item{padding:13px 18px;display:flex;flex-direction:column;gap:5px;border-right:1px solid var(--border)}
.to-meta-item:last-child{border-right:none}
.to-meta-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;font-weight:600}
.to-meta-val{font-size:13.5px;font-weight:500}
.to-meta-val.teal{color:var(--teal)}
.to-meta-val.green{color:var(--green)}
.to-meta-val.red{color:var(--red)}

/* Pill selections */
.pill-row{display:flex;flex-wrap:wrap;gap:7px}
.pill{
  padding:6px 15px;border-radius:999px;font-size:12px;font-weight:500;
  border:1px solid var(--border2);background:transparent;color:var(--text2);
  transition:all 0.13s;white-space:nowrap;
}
.pill:hover{border-color:var(--teal);color:var(--text)}
.pill.sel{background:var(--teal-glow);border-color:var(--teal);color:var(--teal);font-weight:600}
.pill.sel-purple{background:var(--purple-faint);border-color:var(--purple);color:var(--purple)}
.pill.sel-blue{background:var(--blue-faint);border-color:var(--blue);color:var(--blue)}

/* Chip tags (like LTFC) */
.chip{
  padding:6px 13px;border-radius:8px;font-size:12px;font-weight:500;
  border:1px solid var(--border2);background:var(--bg3);color:var(--text2);
  transition:all 0.13s;
}
.chip:hover{border-color:var(--border3);color:var(--text)}
.chip.sel{background:var(--teal-glow);border-color:rgba(0,212,180,0.4);color:var(--teal)}

/* Direction toggle */
.dir-toggle{display:flex;border:1px solid var(--border2);border-radius:var(--rad);overflow:hidden;width:fit-content}
.dir-opt{padding:9px 32px;border:none;font-size:13px;font-weight:600;background:transparent;color:var(--text3);transition:all 0.15s}
.dir-opt.long.sel{background:rgba(15,190,136,0.15);color:var(--green)}
.dir-opt.short.sel{background:rgba(232,81,74,0.15);color:var(--red)}

/* Session selector */
.sess-group{display:flex;gap:7px;flex-wrap:wrap}
.sess-pill{
  padding:7px 16px;border-radius:var(--rad);font-size:12px;font-weight:500;
  border:1px solid var(--border2);background:transparent;color:var(--text2);transition:all 0.13s;
}
.sess-pill:hover{border-color:var(--teal);color:var(--text)}
.sess-pill.sel{background:var(--teal-faint);border-color:rgba(0,212,180,0.35);color:var(--teal)}

/* Status selector */
.status-group{display:flex;gap:7px;flex-wrap:wrap}
.status-pill{
  padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;
  border:1px solid var(--border2);background:transparent;color:var(--text2);transition:all 0.13s;
}
.status-pill:hover{border-color:var(--border3);color:var(--text)}
.status-pill.sel{background:var(--teal-faint);border-color:rgba(0,212,180,0.4);color:var(--teal);box-shadow:0 0 12px rgba(0,212,180,0.08)}

/* Condition highlight box (like WWA) */
.condition-box{
  border-left:2.5px solid var(--purple);border-radius:0 var(--rad) var(--rad) 0;
  background:linear-gradient(90deg,rgba(155,127,232,0.06),transparent);
  padding:12px 16px;
}
.condition-box-label{font-size:9px;color:var(--purple);text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:5px}
.condition-box-val{font-size:14px;font-weight:600;color:var(--text)}

/* Execution type highlight box */
.exec-box{
  border-left:2.5px solid var(--teal);border-radius:0 var(--rad) var(--rad) 0;
  background:linear-gradient(90deg,rgba(0,212,180,0.06),transparent);
  padding:12px 16px;
}
.exec-box-label{font-size:9px;color:var(--teal);text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:5px}
.exec-box-val{font-size:14px;font-weight:600;color:var(--teal)}

/* Price details grid (like WWA) */
.price-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border)}
.price-cell{background:var(--card);padding:16px 18px}
.price-cell-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:8px}
.price-cell-input{
  font-family:var(--mono);font-size:20px;font-weight:500;color:var(--text);
  background:transparent;border:none;outline:none;width:100%;
}
.price-cell-input::placeholder{color:var(--text3)}

/* Timing section */
.time-display{display:flex;align-items:flex-end;gap:14px;margin-top:12px}
.time-block{display:flex;flex-direction:column;gap:5px}
.time-block-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:600}
.time-chip{
  background:var(--bg4);border:1px solid rgba(0,212,180,0.2);border-radius:7px;
  padding:6px 16px;font-family:var(--mono);font-size:15px;font-weight:500;color:var(--teal);
  display:flex;align-items:center;gap:4px;
}
.time-sep{font-size:12px;color:var(--text3);margin-bottom:10px}

/* Financial grid (like WWA) */
.fin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.fin-item{display:flex;flex-direction:column;gap:6px}
.fin-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:600}
.fin-input{
  font-family:var(--mono);font-size:17px;font-weight:500;color:var(--text);
  background:transparent;border:none;border-bottom:1px solid var(--border2);
  outline:none;padding:3px 0;width:100%;transition:border-color 0.15s;
}
.fin-input:focus{border-color:var(--teal)}
.fin-input::placeholder{color:var(--text3)}
.net-pnl-bar{
  margin-top:14px;
  background:linear-gradient(90deg,rgba(15,190,136,0.12),rgba(15,190,136,0.04));
  border:1px solid rgba(15,190,136,0.18);border-radius:var(--rad);
  padding:14px 18px;display:flex;align-items:center;justify-content:space-between;
}
.net-pnl-bar.neg{background:linear-gradient(90deg,rgba(232,81,74,0.1),rgba(232,81,74,0.03));border-color:rgba(232,81,74,0.18)}
.net-pnl-label{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;font-weight:600}
.net-pnl-val{font-family:var(--mono);font-size:24px;font-weight:700;color:var(--green)}
.net-pnl-val.neg{color:var(--red)}

/* Form inputs */
.f-group{display:flex;flex-direction:column;gap:5px}
.f-label{font-size:9.5px;font-weight:600;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase}
.f-input,.f-select,.f-textarea{
  background:var(--bg4);border:1px solid var(--border2);
  border-radius:var(--rad);padding:9px 12px;color:var(--text);
  font-size:13px;outline:none;transition:border-color 0.15s,box-shadow 0.15s;width:100%;
}
.f-input:focus,.f-select:focus,.f-textarea:focus{
  border-color:rgba(0,212,180,0.4);box-shadow:0 0 0 3px rgba(0,212,180,0.07);
}
.f-select option{background:var(--bg3)}
.f-textarea{resize:vertical;min-height:85px;line-height:1.6}

/* Hide native date/time browser chrome */
/* Hide number input spinners globally */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type="number"]{-moz-appearance:textfield;appearance:textfield}

input[type="date"],input[type="time"]{
  -webkit-appearance:none;appearance:none;
  color-scheme:dark;
}
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator{
  display:none;-webkit-appearance:none;
}
input[type="date"]::-webkit-inner-spin-button,
input[type="time"]::-webkit-inner-spin-button{display:none}
input[type="date"]::-webkit-clear-button,
input[type="time"]::-webkit-clear-button{display:none}

/* Custom date/time wrapper */
.dt-wrap{position:relative;display:flex;align-items:center}

/* ── CUSTOM DATE PICKER ── */
.datepicker-wrap{position:relative;display:inline-block}
.datepicker-trigger{
  display:flex;align-items:center;gap:10px;
  background:var(--bg4);border:1px solid var(--border2);
  border-radius:var(--rad);padding:9px 14px;cursor:pointer;
  transition:border-color 0.15s,box-shadow 0.15s;min-width:170px;
}
.datepicker-trigger:hover{border-color:rgba(0,212,180,0.4)}
.datepicker-trigger.open{border-color:rgba(0,212,180,0.4);box-shadow:0 0 0 3px rgba(0,212,180,0.07)}
.datepicker-display{font-family:var(--mono);font-size:13px;color:var(--text);flex:1;letter-spacing:0.03em}
.datepicker-icon{color:var(--text3);flex-shrink:0;width:15px;height:15px}
.datepicker-dropdown{
  position:absolute;top:calc(100% + 8px);left:0;z-index:9999;
  background:var(--bg2);border:1px solid var(--border2);
  border-radius:var(--rad-lg);padding:14px;width:280px;
  box-shadow:0 16px 48px rgba(0,0,0,0.5);
}
.datepicker-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.datepicker-month-label{font-size:13px;font-weight:600;color:var(--text)}
.datepicker-nav{
  width:28px;height:28px;border-radius:7px;border:1px solid var(--border2);
  background:transparent;color:var(--text2);cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;transition:all 0.13s;
}
.datepicker-nav:hover{border-color:var(--teal);color:var(--teal)}
.datepicker-days-header{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px}
.datepicker-day-label{text-align:center;font-size:9px;font-weight:600;color:var(--text3);letter-spacing:0.08em;padding:4px 0}
.datepicker-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.datepicker-day{
  aspect-ratio:1;display:flex;align-items:center;justify-content:center;
  border-radius:7px;font-size:12px;color:var(--text2);cursor:pointer;
  border:none;background:transparent;transition:all 0.12s;
}
.datepicker-day:hover:not(.empty):not(.selected){background:rgba(255,255,255,0.06);color:var(--text)}
.datepicker-day.other-month{color:var(--text3);opacity:0.4}
.datepicker-day.today{color:var(--teal);font-weight:600}
.datepicker-day.selected{background:var(--teal);color:#000;font-weight:700}
.datepicker-day.empty{cursor:default}
.datepicker-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.datepicker-today-btn{font-size:11px;color:var(--teal);background:transparent;border:none;cursor:pointer;font-weight:500}
.datepicker-today-btn:hover{opacity:0.8}
.datepicker-clear-btn{font-size:11px;color:var(--text3);background:transparent;border:none;cursor:pointer}
.datepicker-clear-btn:hover{color:var(--text)}

/* ── CUSTOM TIME PICKER ── */
.timepicker-wrap{position:relative;display:inline-block;width:100%}
.timepicker-trigger{
  display:flex;align-items:center;gap:10px;
  background:var(--bg4);border:1px solid var(--border2);
  border-radius:var(--rad);padding:9px 14px;cursor:pointer;
  transition:border-color 0.15s,box-shadow 0.15s;width:100%;
}
.timepicker-trigger:hover{border-color:rgba(0,212,180,0.4)}
.timepicker-trigger.open{border-color:rgba(0,212,180,0.4);box-shadow:0 0 0 3px rgba(0,212,180,0.07)}
.timepicker-display{font-family:var(--mono);font-size:13px;color:var(--text);flex:1;letter-spacing:0.06em}
.timepicker-display.empty{color:var(--text3)}
.timepicker-icon{color:var(--text3);flex-shrink:0;width:15px;height:15px}
.timepicker-dropdown{
  position:absolute;top:calc(100% + 8px);left:0;z-index:9999;
  background:var(--bg2);border:1px solid var(--border2);
  border-radius:var(--rad-lg);padding:16px;width:220px;
  box-shadow:0 16px 48px rgba(0,0,0,0.5);
}
.timepicker-cols{display:flex;gap:8px;align-items:flex-start}
.timepicker-col{flex:1;display:flex;flex-direction:column;gap:3px;max-height:200px;overflow-y:auto}
.timepicker-col::-webkit-scrollbar{width:2px}
.timepicker-col::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.timepicker-col-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;text-align:center}
.timepicker-option{
  padding:6px 8px;border-radius:6px;border:none;background:transparent;
  color:var(--text2);font-family:var(--mono);font-size:12px;cursor:pointer;
  text-align:center;transition:all 0.1s;
}
.timepicker-option:hover{background:rgba(255,255,255,0.06);color:var(--text)}
.timepicker-option.selected{background:var(--teal-glow);color:var(--teal);font-weight:600;border:1px solid rgba(0,212,180,0.3)}
.timepicker-sep{font-size:20px;color:var(--text3);padding-top:24px;font-weight:300}
.timepicker-footer{display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.timepicker-clear-btn{font-size:11px;color:var(--text3);background:transparent;border:none;cursor:pointer}
.timepicker-clear-btn:hover{color:var(--text)}
.timepicker-now-btn{font-size:11px;color:var(--teal);background:transparent;border:none;cursor:pointer;font-weight:500}
.timepicker-now-btn:hover{opacity:0.8}

.dt-wrap .f-input{padding-right:36px;cursor:text;font-family:var(--mono);letter-spacing:0.04em}
.dt-icon{
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  color:var(--text3);pointer-events:none;width:15px;height:15px;
}

/* Confidence slider */
.conf-wrap{display:flex;align-items:center;gap:12px}
input[type=range].conf-slider{
  flex:1;-webkit-appearance:none;height:3px;
  background:linear-gradient(to right, var(--teal) 0%, var(--teal) var(--val,70%), var(--border2) var(--val,70%));
  border-radius:2px;outline:none;cursor:pointer;
}
input[type=range].conf-slider::-webkit-slider-thumb{
  -webkit-appearance:none;width:16px;height:16px;border-radius:50%;
  background:var(--teal);border:2px solid var(--bg);
  box-shadow:0 0 10px rgba(0,212,180,0.5);cursor:pointer;
}
.conf-num{font-family:var(--mono);font-size:15px;color:var(--teal);font-weight:500;min-width:32px}

/* Rules toggle */
.rules-row{display:flex;gap:7px}
.rules-btn{padding:7px 18px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--border2);background:transparent;color:var(--text2);transition:all 0.13s}
.rules-btn.yes.sel{background:var(--green-faint);border-color:rgba(15,190,136,0.35);color:var(--green)}
.rules-btn.partial.sel{background:rgba(232,168,56,0.1);border-color:rgba(232,168,56,0.3);color:var(--amber)}
.rules-btn.no.sel{background:var(--red-faint);border-color:rgba(232,81,74,0.3);color:var(--red)}

/* Emotion pills */
.emo-row{display:flex;flex-wrap:wrap;gap:6px}
.emo-pill{padding:5px 13px;border-radius:999px;font-size:11.5px;border:1px solid var(--border);background:transparent;color:var(--text3);transition:all 0.12s}
.emo-pill:hover{border-color:var(--border2);color:var(--text2)}
.emo-pill.sel{background:var(--teal-faint);border-color:rgba(0,212,180,0.3);color:var(--teal)}

/* 2/3/4 col grids */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.gfull{grid-column:1/-1}

/* BUTTONS */
.btn-teal{
  background:linear-gradient(135deg,var(--teal2),var(--teal));
  color:#000;border:none;border-radius:var(--rad);
  padding:10px 22px;font-size:13px;font-weight:700;
  transition:opacity 0.15s;letter-spacing:0.02em;
}
.btn-teal:hover{opacity:0.84}
.btn-ghost{
  background:transparent;border:1px solid var(--border2);
  color:var(--text2);border-radius:var(--rad);
  padding:9px 20px;font-size:13px;transition:all 0.15s;
}
.btn-ghost:hover{border-color:var(--teal);color:var(--teal)}
.btn-sm{
  padding:4px 12px;font-size:11px;border-radius:6px;
  border:1px solid var(--border2);background:transparent;
  color:var(--teal);transition:all 0.15s;
}
.btn-sm:hover{background:var(--teal-faint)}
.btn-danger{color:var(--red);border-color:rgba(232,81,74,0.25)}
.btn-danger:hover{background:var(--red-faint)}
.form-btn-row{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding-top:1.25rem;border-top:1px solid var(--border);margin-top:0.5rem}

/* AI COACH */
.ai-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:600}
.ai-badge.valid{background:var(--green-faint);border:1px solid rgba(15,190,136,0.25);color:var(--green)}
.ai-badge.invalid{background:var(--red-faint);border:1px solid rgba(232,81,74,0.25);color:var(--red)}
.score-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.score-track{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:12px}
.score-fill{height:3px;border-radius:2px;transition:width 0.8s cubic-bezier(0.25,1,0.5,1)}
.ai-kv{margin-bottom:11px}
.ai-kv-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px}
.ai-kv-val{font-size:13px;color:var(--text);line-height:1.5}
.ai-next{margin-top:14px;padding:12px 15px;background:var(--teal-faint);border:1px solid rgba(0,212,180,0.18);border-radius:var(--rad);font-size:13px;color:var(--teal);line-height:1.6}
.ai-next-label{font-size:9px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;margin-bottom:4px;font-weight:600}

/* PREVIEW CARD */
.preview-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)}
.preview-row:last-child{border-bottom:none}
.preview-key{font-size:11px;color:var(--text3)}
.preview-val{font-size:12px;font-weight:500;color:var(--text)}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:100;padding:1.5rem}
.modal{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--rad-xl);width:660px;max-height:88vh;overflow-y:auto;padding:1.75rem}
.modal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem}
.modal-title{font-size:15px;font-weight:600}
.modal-close{background:transparent;border:none;color:var(--text3);font-size:22px;line-height:1;transition:color 0.13s}
.modal-close:hover{color:var(--text)}
.md-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem}
.md-item{background:var(--bg3);border-radius:var(--rad);padding:10px 13px}
.md-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em}
.md-val{font-size:13px;color:var(--text);margin-top:3px;font-weight:500}
.divider{height:1px;background:var(--border);margin:1.2rem 0}
.empty{padding:3rem;text-align:center;color:var(--text3);font-size:13px}

@media(max-width:1100px){.stat-grid{grid-template-columns:repeat(3,1fr)}.ana-grid{grid-template-columns:1fr}}
@media(max-width:860px){
  .sidebar{width:58px;min-width:58px}
  .sb-app-name,.sb-app-sub,.sb-section-label{display:none}
  .sb-item span{display:none}
  .sb-item{justify-content:center;padding:0.75rem}
  .sb-logo-ring{width:38px;height:38px}
  .main{margin-left:58px}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .g3,.g4,.fin-grid{grid-template-columns:1fr 1fr}
  .price-grid{grid-template-columns:1fr 1fr}
}
`;

// ─────────────────────────────────────────────
// NAV ICONS
// ─────────────────────────────────────────────
const Ico = {
  dash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  log: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  trades: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/></svg>,
  analytics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  ai: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>,
  accounts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

// ─────────────────────────────────────────────
// EQUITY CURVE
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// STYLED NUMBER INPUT COMPONENT
// ─────────────────────────────────────────────
function NumInput({ value, onChange, placeholder = "0", step = 1 }) {
  const v = value === "" ? "" : value;
  const adjust = (dir) => {
    const cur = parseFloat(v) || 0;
    const s = parseFloat(step) || 1;
    const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
    onChange(String(+(cur + dir * s).toFixed(decimals)));
  };
  return (
    <div style={{display:"flex",alignItems:"center",background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:"var(--rad)",overflow:"hidden",transition:"border-color 0.15s"}}
      onFocus={e=>e.currentTarget.style.borderColor="rgba(0,212,180,0.4)"}
      onBlur={e=>e.currentTarget.style.borderColor=""}>
      <button type="button"
        onClick={()=>adjust(-1)}
        style={{width:32,height:38,border:"none",background:"transparent",color:"var(--text3)",fontSize:16,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s",borderRight:"1px solid var(--border)"}}>
        −
      </button>
      <input
        type="number"
        value={v}
        placeholder={placeholder}
        step={step}
        onChange={e=>onChange(e.target.value)}
        style={{flex:1,background:"transparent",border:"none",outline:"none",padding:"9px 8px",color:"var(--text)",fontSize:13,fontFamily:"var(--mono)",textAlign:"center",width:0,minWidth:0}}
      />
      <button type="button"
        onClick={()=>adjust(1)}
        style={{width:32,height:38,border:"none",background:"transparent",color:"var(--text3)",fontSize:16,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s",borderLeft:"1px solid var(--border)"}}>
        +
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// CUSTOM TIME PICKER COMPONENT
// ─────────────────────────────────────────────
function TimePicker({ value, onChange, placeholder = "Select time" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hours = Array.from({length:24},(_,i)=>String(i).padStart(2,"0"));
  const minutes = ["00","05","10","15","20","25","30","35","40","45","50","55"];

  const selH = value ? value.split(":")[0] : "";
  const selM = value ? value.split(":")[1] : "";

  const select = (h, m) => {
    onChange(`${h}:${m}`);
    if (h && m) setOpen(false);
  };

  const setNow = () => {
    const n = new Date();
    const h = String(n.getHours()).padStart(2,"0");
    const m = minutes.reduce((prev,curr) =>
      Math.abs(parseInt(curr)-n.getMinutes()) < Math.abs(parseInt(prev)-n.getMinutes()) ? curr : prev
    );
    onChange(`${h}:${m}`);
    setOpen(false);
  };

  const fmt = (v) => {
    if (!v) return null;
    const [h,m] = v.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const h12 = hr % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="timepicker-wrap" ref={ref}>
      <div className={`timepicker-trigger${open?" open":""}`} onClick={()=>setOpen(o=>!o)}>
        <svg className="timepicker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
        </svg>
        <span className={`timepicker-display${!value?" empty":""}`}>{fmt(value) || placeholder}</span>
        <svg style={{width:12,height:12,color:"var(--text3)",flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div className="timepicker-dropdown">
          <div className="timepicker-cols">
            <div className="timepicker-col">
              <div className="timepicker-col-label">Hour</div>
              {hours.map(h=>(
                <button key={h} className={`timepicker-option${selH===h?" selected":""}`}
                  onClick={()=>select(h, selM||"00")}>
                  {fmt(`${h}:00`)?.split(":")[0] + (parseInt(h)>=12?" PM":" AM")}
                </button>
              ))}
            </div>
            <div className="timepicker-sep">:</div>
            <div className="timepicker-col">
              <div className="timepicker-col-label">Min</div>
              {minutes.map(m=>(
                <button key={m} className={`timepicker-option${selM===m?" selected":""}`}
                  onClick={()=>select(selH||"09", m)}>
                  :{m}
                </button>
              ))}
            </div>
          </div>
          <div className="timepicker-footer">
            <button className="timepicker-clear-btn" onClick={()=>{onChange("");setOpen(false);}}>Clear</button>
            <button className="timepicker-now-btn" onClick={setNow}>Now</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CUSTOM DATE PICKER COMPONENT
// ─────────────────────────────────────────────
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const [nav, setNav] = useState(() => {
    const d = value ? new Date(value + "T12:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["M","T","W","T","F","S","S"];

  const selected = value ? new Date(value + "T12:00:00") : null;
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  const firstDow = (new Date(nav.year, nav.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(nav.year, nav.month + 1, 0).getDate();
  const daysInPrev = new Date(nav.year, nav.month, 0).getDate();

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, cur: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDow + 1, cur: false });

  const selectDay = (day, cur) => {
    if (!cur) return;
    const m = String(nav.month + 1).padStart(2,"0");
    const d = String(day).padStart(2,"0");
    onChange(`${nav.year}-${m}-${d}`);
    setOpen(false);
  };

  const goToday = () => {
    const n = new Date();
    setNav({ year: n.getFullYear(), month: n.getMonth() });
    onChange(todayStr);
    setOpen(false);
  };

  const fmt = (v) => {
    if (!v) return "Select date";
    const d = new Date(v + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isSelected = (day, cur) => {
    if (!cur || !selected) return false;
    return selected.getFullYear() === nav.year && selected.getMonth() === nav.month && selected.getDate() === day;
  };

  const isToday = (day, cur) => {
    if (!cur) return false;
    const t = new Date();
    return t.getFullYear() === nav.year && t.getMonth() === nav.month && t.getDate() === day;
  };

  return (
    <div className="datepicker-wrap" ref={ref}>
      <div className={`datepicker-trigger${open?" open":""}`} onClick={()=>setOpen(o=>!o)}>
        <svg className="datepicker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="datepicker-display">{fmt(value)}</span>
        <svg style={{width:12,height:12,color:"var(--text3)",flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div className="datepicker-dropdown">
          <div className="datepicker-header">
            <button className="datepicker-nav" onClick={()=>setNav(p=>{ const d=new Date(p.year,p.month-1,1); return {year:d.getFullYear(),month:d.getMonth()}; })}>‹</button>
            <div className="datepicker-month-label">{MONTHS[nav.month]} {nav.year}</div>
            <button className="datepicker-nav" onClick={()=>setNav(p=>{ const d=new Date(p.year,p.month+1,1); return {year:d.getFullYear(),month:d.getMonth()}; })}>›</button>
          </div>
          <div className="datepicker-days-header">
            {DAYS.map((d,i)=><div key={i} className="datepicker-day-label">{d}</div>)}
          </div>
          <div className="datepicker-days">
            {cells.map((cell,i)=>(
              <button key={i}
                className={["datepicker-day",
                  !cell.cur?"other-month":"",
                  isSelected(cell.day,cell.cur)?"selected":"",
                  isToday(cell.day,cell.cur)&&!isSelected(cell.day,cell.cur)?"today":"",
                ].join(" ")}
                onClick={()=>selectDay(cell.day,cell.cur)}>
                {cell.day}
              </button>
            ))}
          </div>
          <div className="datepicker-footer">
            <button className="datepicker-clear-btn" onClick={()=>{onChange("");setOpen(false);}}>Clear</button>
            <button className="datepicker-today-btn" onClick={goToday}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EquityCurve({ trades, startingBalance = 0 }) {
  const { points, labels } = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cum = startingBalance;
    const points = [startingBalance, ...sorted.map(t => {
      cum += parseFloat(t.netPnL) || 0;
      return +cum.toFixed(2);
    })];
    const labels = ["Start", ...sorted.map(t => { const d = new Date(t.date + "T12:00:00"); return (d.getMonth()+1)+"/"+d.getDate(); })];
    return { points, labels };
  }, [trades, startingBalance]);

  if (!trades.length) return (
    <div className="chart-ph">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3e4e62" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <span>Log trades to generate your equity curve</span>
    </div>
  );

  const W = 580, H = 160, px = 52, py = 16, pb = 26;
  const ch = H - py - pb;
  const mn = Math.min(...points), mx = Math.max(...points);
  const range = mx - mn || 1;
  const toX = i => px + i / (points.length - 1) * (W - px - 12);
  const toY = v => py + ch - (v - mn) / range * ch;
  const pts = points.map((v, i) => `${toX(i)},${toY(v)}`);
  const col = points[points.length - 1] >= 0 ? "#00d4b4" : "#e8514a";
  const area = `M${pts[0]} L${pts.join(" L")} L${toX(points.length-1)},${py+ch} L${toX(0)},${py+ch} Z`;
  const gridVals = [mn, mn + range * 0.5, mx];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <defs>
        <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={col} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* grid lines + y labels */}
      {gridVals.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={px} y1={y} x2={W-12} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,4"/>
            <text x={px-5} y={y+3} textAnchor="end" fontSize="9" fill="#4e5a6b">{v>=0?"+":""}{v.toFixed(0)}</text>
          </g>
        );
      })}
      {/* zero line when curve crosses */}
      {mn < 0 && mx > 0 && <line x1={px} y1={toY(0)} x2={W-12} y2={toY(0)} stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>}
      {/* area fill + line */}
      <path d={area} fill="url(#eq)"/>
      <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* dots */}
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",");
        return <circle key={i} cx={x} cy={y} r={points.length > 20 ? 2 : 3} fill={col} fillOpacity="0.9"/>;
      })}
      {/* x-axis labels */}
      {labels.map((l, i) => {
        const x = toX(i);
        if (labels.length > 8 && i > 0 && i < labels.length - 1 && i % Math.ceil(labels.length / 6) !== 0) return null;
        return <text key={i} x={x} y={H-4} textAnchor="middle" fontSize="9" fill="#4e5a6b">{l}</text>;
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────
export default function TradingJournal() {
  const [view, setView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [aiResult, setAiResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [detailTrade, setDetailTrade] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accFilter, setAccFilter] = useState("All Accounts");
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [accForm, setAccForm] = useState({ name:"", firm:"", type:"Funded/Live", balance:"", currency:"USD" });
  const [calDate, setCalDate] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [calTab, setCalTab] = useState("Calendar");
  const [activeAccountId, setActiveAccountId] = useState("all"); // "all" or account id string
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [parsedTrades, setParsedTrades] = useState([]);
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [showTradovate, setShowTradovate] = useState(false);
  const [tvStep, setTvStep] = useState("login"); // login | select | done
  const [tvLoading, setTvLoading] = useState(false);
  const [tvError, setTvError] = useState("");
  const [tvToken, setTvToken] = useState("");
  const [tvEnv, setTvEnv] = useState("live");
  const [tvAccounts, setTvAccounts] = useState([]);
  const [tvSelAccount, setTvSelAccount] = useState("");
  const [tvTrades, setTvTrades] = useState([]);
  const [tvSelected, setTvSelected] = useState([]);
  const [tvResult, setTvResult] = useState(null);
  const [tvCreds, setTvCreds] = useState({ username:"", password:"" });

  // ── AUTH + DATA LOADING ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);
      await Promise.all([loadTrades(session.user.id), loadAccounts(session.user.id)]);
      setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.href = "/login";
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadTrades = async (uid) => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTrades(data.map(t => ({
        id: t.id, symbol: t.symbol||"", date: t.date||"",
        tradeStatus: t.trade_status||"", tradeType: t.trade_type||"Long",
        session: t.session||"", netPnL: t.net_pnl||"",
        dailyBias: t.daily_bias||"", prevCandleClose: t.prev_candle_close||"",
        condition: t.condition||"", ltfcTags: t.ltfc_tags||[],
        executionType: t.execution_type||"", setupType: t.setup_type||"",
        openPrice: t.open_price||"", closePrice: t.close_price||"",
        stopLoss: t.stop_loss||"", takeProfit: t.take_profit||"",
        entryTime: t.entry_time||"", exitTime: t.exit_time||"",
        riskPct: t.risk_pct||"", rr: t.rr||"", pips: t.pips||"",
        lotSize: t.lot_size||"", grossPnL: t.gross_pnl||"",
        commissions: t.commissions||"", riskAmount: t.risk_amount||"",
        resultR: t.result_r||"", emotionBefore: t.emotion_before||"",
        emotionDuring: t.emotion_during||"", emotionAfter: t.emotion_after||"",
        confidenceLevel: t.confidence_level||7, followedRules: t.followed_rules||"Yes",
        mistakeType: t.mistake_type||"None", notes: t.notes||"",
        lessonsLearned: t.lessons_learned||"", screenshotUrl: t.screenshot_url||"",
        accountId: t.account_id||"", aiAnalysis: t.ai_analysis||null,
      })));
    }
  };

  const loadAccounts = async (uid) => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setAccounts(data.map(a => ({
        id: a.id, name: a.name, firm: a.firm||"",
        type: a.type, balance: a.balance||0, currency: a.currency||"USD",
      })));
    }
  };

  const addAccount = async () => {
    if (!accForm.name.trim() || !user) return;
    const { data, error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: accForm.name,
      firm: accForm.firm||null,
      type: accForm.type,
      balance: parseFloat(accForm.balance)||0,
      currency: accForm.currency||"USD",
    }).select().single();
    if (!error && data) {
      setAccounts(p => [...p, { id: data.id, name: data.name, firm: data.firm||"", type: data.type, balance: data.balance||0, currency: data.currency }]);
      setAccForm({ name:"", firm:"", type:"Funded/Live", balance:"", currency:"USD" });
      setShowAddAcc(false);
    }
  };

  const deleteAccount = async (id) => {
    await supabase.from("accounts").delete().eq("id", id);
    setAccounts(p => p.filter(a => String(a.id) !== String(id)));
    setTrades(p => p.map(t => t.accountId === String(id) ? {...t, accountId:""} : t));
  };

  const accStats = useMemo(() => {
    return accounts.map(acc => {
      const at = trades.filter(t => String(t.accountId) === String(acc.id));
      const rs = at.map(t => parseFloat(t.resultR)||0);
      const pnls = at.map(t => parseFloat(t.netPnL)||0);
      const wins = rs.filter(r=>r>0).length;
      const netPnL = pnls.reduce((a,b)=>a+b,0);
      const currentBalance = (parseFloat(acc.balance)||0) + netPnL;
      return { ...acc, tradeCount: at.length, wins, wr: at.length ? +(wins/at.length*100).toFixed(1) : 0, netPnL: +netPnL.toFixed(2), currentBalance: +currentBalance.toFixed(2) };
    });
  }, [accounts, trades]);

  // Active account filter — drives ALL views
  const activeAccount = useMemo(() => {
    if (activeAccountId === "all") return null;
    return accStats.find(a => String(a.id) === String(activeAccountId)) || null;
  }, [activeAccountId, accStats]);

  const activeTrades = useMemo(() => {
    if (activeAccountId === "all") return trades;
    return trades.filter(t => String(t.accountId) === String(activeAccountId));
  }, [activeAccountId, trades]);

  const activeStartingBalance = useMemo(() => {
    if (activeAccountId === "all") return accounts.reduce((s,a) => s+(parseFloat(a.balance)||0), 0);
    const acc = accounts.find(a => String(a.id) === String(activeAccountId));
    return acc ? (parseFloat(acc.balance)||0) : 0;
  }, [activeAccountId, accounts]);

  // Active account label for display
  const activeAccountLabel = useMemo(() => {
    if (activeAccountId === "all") return "All Accounts";
    const acc = accounts.find(a => String(a.id) === activeAccountId);
    return acc ? acc.name : "All Accounts";
  }, [activeAccountId, accounts]);

  // KPIs — always based on activeTrades
  const kpis = useMemo(() => {
    if (!activeTrades.length) return null;
    const rs = activeTrades.map(t => parseFloat(t.resultR) || 0);
    const wins = rs.filter(r => r > 0), losses = rs.filter(r => r < 0);
    const total = +(rs.reduce((a, b) => a + b, 0).toFixed(2));
    const wr = +(wins.length / activeTrades.length * 100).toFixed(1);
    const avgR = +(total / activeTrades.length).toFixed(2);
    const valid = activeTrades.filter(t => t.followedRules === "Yes" && t.mistakeType === "None");
    const validPct = +(valid.length / activeTrades.length * 100).toFixed(1);
    const gw = wins.reduce((a, b) => a + b, 0);
    const gl = Math.abs(losses.reduce((a, b) => a + b, 0));
    const pf = gl > 0 ? +(gw / gl).toFixed(2) : "∞";
    const pnls = activeTrades.map(t => parseFloat(t.netPnL) || 0);
    const best = +Math.max(...pnls).toFixed(2);
    const worst = +Math.min(...pnls).toFixed(2);
    let streak = 0, sType = "";
    for (let i = rs.length - 1; i >= 0; i--) {
      if (i === rs.length - 1) { sType = rs[i] > 0 ? "W" : "L"; streak = 1; }
      else if ((rs[i] > 0 && sType === "W") || (rs[i] < 0 && sType === "L")) streak++;
      else break;
    }
    const totalPnL = activeTrades.reduce((s,t) => s+(parseFloat(t.netPnL)||0), 0);
    return { total, totalPnL: +totalPnL.toFixed(2), wr, avgR, validPct, count: activeTrades.length, wins: wins.length, losses: losses.length, pf, best, worst, streak, sType };
  }, [activeTrades]);

  // Helpers
  const sf = f => v => setForm(p => ({ ...p, [f]: v }));
  const sfe = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  const toggleLtfc = tag => setForm(p => ({
    ...p, ltfcTags: p.ltfcTags.includes(tag) ? p.ltfcTags.filter(t => t !== tag) : [...p.ltfcTags, tag]
  }));

  const handleSubmit = async () => {
    if (!form.symbol.trim() || !form.date || !user) { alert("Please enter at least a symbol and date."); return; }
    const analysis = analyzeTradeWithAI(form);
    const { data, error } = await supabase.from("trades").insert({
      user_id: user.id,
      account_id: form.accountId || null,
      symbol: form.symbol, date: form.date,
      trade_status: form.tradeStatus||null, trade_type: form.tradeType,
      session: form.session||null, net_pnl: parseFloat(form.netPnL)||null,
      daily_bias: form.dailyBias||null, prev_candle_close: form.prevCandleClose||null,
      condition: form.condition||null, ltfc_tags: form.ltfcTags||[],
      execution_type: form.executionType||null, setup_type: form.setupType||null,
      open_price: parseFloat(form.openPrice)||null, close_price: parseFloat(form.closePrice)||null,
      stop_loss: parseFloat(form.stopLoss)||null, take_profit: parseFloat(form.takeProfit)||null,
      entry_time: form.entryTime||null, exit_time: form.exitTime||null,
      risk_pct: parseFloat(form.riskPct)||null, rr: parseFloat(form.rr)||null,
      pips: parseFloat(form.pips)||null, lot_size: parseFloat(form.lotSize)||null,
      gross_pnl: parseFloat(form.grossPnL)||null, commissions: parseFloat(form.commissions)||null,
      risk_amount: parseFloat(form.riskAmount)||null, result_r: parseFloat(form.resultR)||null,
      emotion_before: form.emotionBefore||null, emotion_during: form.emotionDuring||null,
      emotion_after: form.emotionAfter||null, confidence_level: parseInt(form.confidenceLevel)||7,
      followed_rules: form.followedRules, mistake_type: form.mistakeType,
      notes: form.notes||null, lessons_learned: form.lessonsLearned||null,
      screenshot_url: form.screenshotUrl||null, ai_analysis: analysis,
    }).select().single();
    if (!error && data) {
      const trade = { ...form, id: data.id, accountId: String(form.accountId||""), aiAnalysis: analysis };
      setTrades(p => [trade, ...p]);
      setAiResult(analysis);
      setSubmitted(true);
    } else {
      alert("Error saving trade: " + (error?.message || "Unknown error"));
    }
  };

  const clearForm = () => { setForm(defaultForm); setAiResult(null); setSubmitted(false); };
  const deleteTrade = async (id) => {
    await supabase.from("trades").delete().eq("id", id);
    setTrades(p => p.filter(t => String(t.id) !== String(id)));
  };

  const openEdit = (trade) => {
    setEditForm({ ...trade });
    setEditMode(true);
    setDetailTrade(trade);
  };
  const saveEdit = async () => {
    const analysis = analyzeTradeWithAI(editForm);
    const updated = { ...editForm, aiAnalysis: analysis };
    const { error } = await supabase.from("trades").update({
      account_id: editForm.accountId || null,
      symbol: editForm.symbol, date: editForm.date,
      trade_status: editForm.tradeStatus||null, trade_type: editForm.tradeType,
      session: editForm.session||null, net_pnl: parseFloat(editForm.netPnL)||null,
      daily_bias: editForm.dailyBias||null, prev_candle_close: editForm.prevCandleClose||null,
      condition: editForm.condition||null, ltfc_tags: editForm.ltfcTags||[],
      execution_type: editForm.executionType||null, setup_type: editForm.setupType||null,
      open_price: parseFloat(editForm.openPrice)||null, close_price: parseFloat(editForm.closePrice)||null,
      stop_loss: parseFloat(editForm.stopLoss)||null, take_profit: parseFloat(editForm.takeProfit)||null,
      entry_time: editForm.entryTime||null, exit_time: editForm.exitTime||null,
      risk_pct: parseFloat(editForm.riskPct)||null, rr: parseFloat(editForm.rr)||null,
      pips: parseFloat(editForm.pips)||null, lot_size: parseFloat(editForm.lotSize)||null,
      gross_pnl: parseFloat(editForm.grossPnL)||null, commissions: parseFloat(editForm.commissions)||null,
      risk_amount: parseFloat(editForm.riskAmount)||null, result_r: parseFloat(editForm.resultR)||null,
      emotion_before: editForm.emotionBefore||null, emotion_during: editForm.emotionDuring||null,
      emotion_after: editForm.emotionAfter||null, confidence_level: parseInt(editForm.confidenceLevel)||7,
      followed_rules: editForm.followedRules, mistake_type: editForm.mistakeType,
      notes: editForm.notes||null, lessons_learned: editForm.lessonsLearned||null,
      screenshot_url: editForm.screenshotUrl||null, ai_analysis: analysis,
    }).eq("id", editForm.id);
    if (!error) {
      setTrades(p => p.map(t => String(t.id) === String(updated.id) ? updated : t));
      setDetailTrade(updated);
      setEditMode(false);
    } else {
      alert("Error updating trade: " + error.message);
    }
  };
  const sef2 = f => e => setEditForm(p => ({ ...p, [f]: e.target.value }));

  // ── SCREENSHOT UPLOAD ──
  const uploadScreenshot = async (file) => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("screenshots")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) { console.error("Upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // ── TRADOVATE SYNC FUNCTIONS ──
  const resetTradovate = () => {
    setShowTradovate(false); setTvStep("login"); setTvLoading(false);
    setTvError(""); setTvToken(""); setTvAccounts([]); setTvSelAccount("");
    setTvTrades([]); setTvSelected([]); setTvResult(null);
    setTvCreds({ username:"", password:"" });
  };

  const tradovateLogin = async () => {
    setTvLoading(true); setTvError("");
    try {
      const res = await fetch("/api/tradovate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username: tvCreds.username, password: tvCreds.password }),
      });
      const data = await res.json();
      if (data.error) { setTvError(data.error); setTvLoading(false); return; }
      setTvToken(data.accessToken);
      setTvEnv(data.env);
      setTvAccounts(data.accounts || []);
      if (data.accounts?.length === 1) setTvSelAccount(String(data.accounts[0].id));
      setTvStep("select");
    } catch(e) { setTvError("Connection failed: " + e.message); }
    setTvLoading(false);
  };

  const tradovateFetchTrades = async () => {
    setTvLoading(true); setTvError("");
    try {
      const res = await fetch("/api/tradovate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tradovate-env": tvEnv },
        body: JSON.stringify({ action: "trades", accessToken: tvToken, accountId: tvSelAccount }),
      });
      const data = await res.json();
      if (data.error) { setTvError(data.error); setTvLoading(false); return; }
      setTvTrades(data.trades || []);
      setTvSelected((data.trades || []).map((_,i) => i));
      setTvStep("confirm");
    } catch(e) { setTvError("Failed: " + e.message); }
    setTvLoading(false);
  };

  const tradovateImport = async () => {
    if (!tvSelected.length || !user) return;
    setTvLoading(true);
    const toImport = tvTrades.filter((_,i) => tvSelected.includes(i));
    let success = 0, failed = 0;
    for (const t of toImport) {
      const analysis = analyzeTradeWithAI(t);
      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        account_id: activeAccountId !== "all" ? activeAccountId : null,
        symbol: t.symbol, date: t.date,
        trade_type: t.tradeType, trade_status: t.tradeStatus,
        entry_time: t.entryTime, lot_size: t.lotSize,
        open_price: t.openPrice, net_pnl: t.netPnL,
        commissions: t.commissions, followed_rules: t.followedRules,
        mistake_type: t.mistakeType, confidence_level: t.confidenceLevel,
        ltfc_tags: [], notes: t.notes, ai_analysis: analysis,
      });
      if (!error) success++; else failed++;
    }
    await loadTrades(user.id);
    setTvResult({ success, failed, total: toImport.length });
    setTvStep("done");
    setTvLoading(false);
  };

  // ── FTMO CSV IMPORT ──
  // ── TRADOVATE CSV IMPORT ──
  const parseFTMOcsv = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const rows = lines.slice(1);
    const trades = [];
    for (const line of rows) {
      const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
      if (cols.length < 9) continue;
      const symbol    = cols[0].replace(/[A-Z]\d+$/, "").toUpperCase();
      const qty       = parseFloat(cols[6]) || 0;
      const buyPrice  = parseFloat(cols[7]) || 0;
      const sellPrice = parseFloat(cols[8]) || 0;
      const pnlRaw    = cols[9].replace(/[$,]/g, "");
      const netPnL    = parseFloat(pnlRaw) || 0;
      const boughtTs  = cols[10] || "";
      const soldTs    = cols[11] || "";
      const parseTs = (ts) => {
        const [datePart, timePart] = ts.split(" ");
        if (!datePart) return { date: "", time: "" };
        const [mo, dy, yr] = datePart.split("/");
        const date = `${yr}-${mo?.padStart(2,"0")}-${dy?.padStart(2,"0")}`;
        const time = timePart?.slice(0, 5) || "";
        return { date, time };
      };
      const entry = parseTs(boughtTs);
      const exit  = parseTs(soldTs);
      const entryMs = new Date(boughtTs).getTime();
      const exitMs  = new Date(soldTs).getTime();
      const tradeType  = entryMs <= exitMs ? "Long" : "Short";
      const openPrice  = tradeType === "Long" ? buyPrice : sellPrice;
      const closePrice = tradeType === "Long" ? sellPrice : buyPrice;
      trades.push({
        date:       entry.date,
        entryTime:  entry.time,
        exitTime:   exit.time,
        symbol,
        tradeType,
        openPrice,
        closePrice,
        lotSize:    qty,
        netPnL,
        grossPnL:   netPnL,
        commissions: 0,
        pips:       0,
        resultR:    "",
        tradeStatus: netPnL > 0 ? "T/P" : netPnL < 0 ? "S/L" : "B/E",
        followedRules: "Yes",
        mistakeType:   "None",
        confidenceLevel: 7,
        ltfcTags: [],
        notes: `Imported from Tradovate · ${symbol} · ${cols[10]}`,
      });
    }
    return trades;
  };
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setImporting(true);
    setImportResult(null);
    const text = await file.text();
    const parsed = parseFTMOcsv(text);
    if (!parsed.length) {
      setImportResult({ error: "No trades found in file. Make sure it's an FTMO CSV export." });
      setImporting(false);
      return;
    }
    let success = 0, failed = 0;
    for (const t of parsed) {
      const analysis = analyzeTradeWithAI(t);
      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        account_id: activeAccountId !== "all" ? activeAccountId : null,
        symbol: t.symbol, date: t.date,
        trade_type: t.tradeType, trade_status: t.tradeStatus,
        open_price: t.openPrice, close_price: t.closePrice,
        stop_loss: t.stopLoss, take_profit: t.takeProfit,
        entry_time: t.entryTime, exit_time: t.exitTime,
        lot_size: t.lotSize, pips: t.pips,
        commissions: t.commissions, gross_pnl: t.grossPnL,
        result_r: t.resultR ? parseFloat(t.resultR) : null,
        net_pnl: t.netPnL, followed_rules: t.followedRules,
        mistake_type: t.mistakeType, confidence_level: t.confidenceLevel,
        ltfc_tags: [], notes: t.notes, ai_analysis: analysis,
      });
      if (!error) success++; else failed++;
    }
    // Reload trades
    await loadTrades(user.id);
    setImportResult({ success, failed, total: parsed.length });
    setImporting(false);
  };
  const sf2 = f => v => setEditForm(p => ({ ...p, [f]: v }));
  const toggleLtfc2 = tag => setEditForm(p => ({
    ...p, ltfcTags: p.ltfcTags.includes(tag) ? p.ltfcTags.filter(t => t !== tag) : [...p.ltfcTags, tag]
  }));

  // Duration calc
  const duration = useMemo(() => {
    if (!form.entryTime || !form.exitTime) return null;
    const [eh, em] = form.entryTime.split(":").map(Number);
    const [xh, xm] = form.exitTime.split(":").map(Number);
    const d = (xh * 60 + xm) - (eh * 60 + em);
    if (d <= 0) return null;
    return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d}m`;
  }, [form.entryTime, form.exitTime]);

  const netPnLNum = parseFloat(form.netPnL || form.grossPnL) || 0;
  const pnlPos = netPnLNum >= 0;
  const rPos = parseFloat(form.resultR) >= 0;

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
        <div style={{width:48,height:48,border:"2px solid var(--teal-faint)",borderTop:"2px solid var(--teal)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <div style={{fontSize:13,color:"var(--text3)"}}>Loading your journal…</div>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="layout">

        {/* ─── SIDEBAR ─── */}
        <aside className="sidebar">
          <div className="sb-logo-area">
            <div className="sb-logo-ring"><div className="sb-logo-inner">JKIS</div></div>
            <div className="sb-app-name">Simple Journal</div>
            <div className="sb-app-sub">Edge Tracker Pro</div>
          </div>
          <nav className="sb-nav">
            <span className="sb-section-label">Overview</span>
            {[["dashboard","Dashboard",Ico.dash],["analytics","Analytics",Ico.analytics]].map(([k,l,ic]) => (
              <button key={k} className={`sb-item${view===k?" active":""}`} onClick={()=>setView(k)}>
                {ic}<span>{l}</span>
              </button>
            ))}
            <span className="sb-section-label">Accounts</span>
            {[["accounts","Accounts",Ico.accounts]].map(([k,l,ic]) => (
              <button key={k} className={`sb-item${view===k?" active":""}`} onClick={()=>setView(k)}>
                {ic}<span>{l}</span>
              </button>
            ))}
            <span className="sb-section-label">Trading</span>
            {[["log","Log Trade",Ico.log],["trades","All Trades",Ico.trades],["weekly","Weekly Report",Ico.calendar]].map(([k,l,ic]) => (
              <button key={k} className={`sb-item${view===k?" active":""}`} onClick={()=>setView(k)}>
                {ic}<span>{l}</span>
              </button>
            ))}
          </nav>
          <div className="sb-footer">
            <div className="sb-avatar">A</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,color:"var(--text2)",fontSize:11}}>{user?.email?.split("@")[0] || "trader"}</div>
              <div style={{fontSize:9,color:"var(--text3)",marginTop:1}}>Live / Funded</div>
            </div>
            <button
              onClick={async()=>{
                const {supabase} = await import("../lib/supabase");
                await supabase.auth.signOut();
                window.location.href="/login";
              }}
              title="Sign out"
              style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--text3)",padding:"4px",borderRadius:6,display:"flex",alignItems:"center",transition:"color 0.15s",flexShrink:0}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--red)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ─── MAIN ─── */}
        <main className="main">
          <div className="topbar">
            <div className="tb-left">
              <div className="tb-title">
                {view==="dashboard"&&"Dashboard"}
                {view==="log"&&"Log a Trade"}
                {view==="trades"&&"Trade History"}
                {view==="analytics"&&"Analytics"}
                {view==="accounts"&&"Accounts"}
                {view==="weekly"&&"Weekly Report"}
              </div>
            </div>
            <div className="tb-right" style={{gap:12}}>
              <button
                onClick={()=>setShowImport(true)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:"var(--rad)",border:"1px solid var(--border2)",background:"transparent",color:"var(--text2)",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--teal)";e.currentTarget.style.color="var(--teal)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="";e.currentTarget.style.color=""}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import FTMO
              </button>
              <button
                onClick={()=>setShowTradovate(true)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:"var(--rad)",border:"1px solid rgba(99,102,241,0.4)",background:"transparent",color:"#818cf8",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#818cf8";e.currentTarget.style.background="rgba(99,102,241,0.08)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(99,102,241,0.4)";e.currentTarget.style.background="transparent"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Sync Tradovate
              </button>
              <div className="live-pip"/>
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
            </div>
          </div>

          {/* ── ACCOUNT TAB BAR ── */}
          {accounts.length > 0 && view !== "log" && (
            <div className="acc-tabbar">
              <button
                className={`acc-tab${activeAccountId==="all"?" active":""}`}
                onClick={()=>{ setActiveAccountId("all"); setAccFilter("All Accounts"); }}>
                All Accounts
              </button>
              {["Funded/Live","Prop Challenge","Personal","Demo"].map(type => {
                const accsOfType = accounts.filter(a=>a.type===type);
                if (!accsOfType.length) return null;
                return accsOfType.map(acc=>(
                  <button key={acc.id}
                    className={`acc-tab${String(activeAccountId)===String(acc.id)?" active":""}`}
                    style={String(activeAccountId)===String(acc.id)?{borderBottomColor:ACCOUNT_TYPE_COLORS[type],color:ACCOUNT_TYPE_COLORS[type]}:{}}
                    onClick={()=>{ setActiveAccountId(String(acc.id)); setAccFilter("All Accounts"); }}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[type],display:"inline-block",marginRight:6,verticalAlign:"middle"}}/>
                    {acc.name}
                  </button>
                ));
              })}
            </div>
          )}

          <div className="page">

            {/* ════════════════════════════════
                DASHBOARD
            ════════════════════════════════ */}
            {view==="dashboard" && <>
              {/* WWA-style KPI bar */}
              <div className="kpi-bar">
                {[
                  {label:"Accounts", val: activeAccountId==="all" ? accounts.length : 1, cls:"muted"},
                  {label:"Balance", val:`$${(activeStartingBalance + (kpis?kpis.totalPnL:0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, cls:"muted"},
                  {label:"P&L", val: kpis ? (kpis.totalPnL>=0?`+$${kpis.totalPnL.toFixed(2)}`:`-$${Math.abs(kpis.totalPnL).toFixed(2)}`) : "+$0.00", cls: kpis?(kpis.totalPnL>=0?"pos":"neg"):"teal"},
                  {label:"Trades", val: activeTrades.length, cls:"muted"},
                ].map(({label,val,cls})=>(
                  <div key={label} className="kpi-bar-item">
                    <div className="kpi-bar-label">{label}</div>
                    <div className={`kpi-bar-val ${cls}`}>{val}</div>
                  </div>
                ))}
              </div>

              {/* ACTIVE ACCOUNT BANNER */}
              {activeAccount && (
                <div style={{background:`${ACCOUNT_TYPE_COLORS[activeAccount.type]}10`,border:`1px solid ${ACCOUNT_TYPE_COLORS[activeAccount.type]}30`,borderRadius:"var(--rad-lg)",padding:"10px 18px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:9,height:9,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[activeAccount.type],boxShadow:`0 0 8px ${ACCOUNT_TYPE_COLORS[activeAccount.type]}`}}/>
                    <span style={{fontSize:13,fontWeight:600,color:ACCOUNT_TYPE_COLORS[activeAccount.type]}}>{activeAccount.name}</span>
                    {activeAccount.firm&&<span style={{fontSize:11,color:"var(--text3)"}}>· {activeAccount.firm}</span>}
                    <span style={{fontSize:11,color:"var(--text3)"}}>· {activeAccount.type}</span>
                  </div>
                  <div style={{display:"flex",gap:20,alignItems:"center"}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Balance</div><div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:600,color:"var(--text)"}}>${activeAccount.currentBalance.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>P&L</div><div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:600,color:activeAccount.netPnL>=0?"var(--green)":"var(--red)"}}>{activeAccount.netPnL>=0?"+":"-"}${Math.abs(activeAccount.netPnL).toFixed(2)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Trades</div><div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:600,color:"var(--text)"}}>{activeAccount.tradeCount}</div></div>
                  </div>
                </div>
              )}

              {/* Stat cards */}
              {kpis ? (
                <div className="stat-grid">
                  {[
                    {l:"Net R", v:`${kpis.total>=0?"+":""}${kpis.total}R`, cls:kpis.total>=0?"pos":"neg", s:`${kpis.count} trades`},
                    {l:"Win Rate", v:`${kpis.wr}%`, cls:kpis.wr>=50?"pos":"neg", s:`${kpis.wins}W · ${kpis.losses}L`},
                    {l:"Avg R / Trade", v:`${kpis.avgR>=0?"+":""}${kpis.avgR}R`, cls:kpis.avgR>=0?"pos":"neg", s:"per trade"},
                    {l:"Valid Trades", v:`${kpis.validPct}%`, cls:"teal", s:"rule adherence"},
                    {l:"Profit Factor", v:kpis.pf, cls:parseFloat(kpis.pf)>=1.5?"pos":parseFloat(kpis.pf)<1?"neg":"teal", s:"gross W / L"},
                    {l:"Best Trade", v:`${kpis.best>=0?"+":"-"}$${Math.abs(kpis.best).toFixed(2)}`, cls:"pos", s:"single high"},
                    {l:"Worst Trade", v:`${kpis.worst>=0?"+":"-"}$${Math.abs(kpis.worst).toFixed(2)}`, cls:kpis.worst>=0?"pos":"neg", s:"single low"},
                    {l:"Streak", v:`${kpis.streak}${kpis.sType}`, cls:kpis.sType==="W"?"pos":"neg", s:kpis.sType==="W"?"winning":"losing"},
                    {l:"Wins / Losses", v:`${kpis.wins} / ${kpis.losses}`, cls:"teal", s:"all time"},
                    {l:"Valid Count", v:activeTrades.filter(t=>t.followedRules==="Yes"&&t.mistakeType==="None").length, cls:"muted", s:"of "+kpis.count},
                  ].map(({l,v,cls,s})=>(
                    <div key={l} className="stat-card">
                      <div className="stat-label">{l}</div>
                      <div className={`stat-val ${cls}`}>{v}</div>
                      <div className="stat-sub">{s}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sec-card"><div className="empty">No trades yet — log your first trade to see stats.</div></div>
              )}

              {/* Equity Curve */}
              <div className="sec-card">
                <div className="sec-head"><div className="sec-accent teal"/><div className="sec-title">Equity Curve</div></div>
                <div style={{padding:"1rem 1.25rem"}}><EquityCurve trades={activeTrades} startingBalance={activeStartingBalance}/></div>
              </div>

              {/* Recent trades */}
              <div className="sec-card">
                <div className="sec-head" style={{justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <div className="sec-accent blue"/><div className="sec-title">Recent Trades</div>
                  </div>
                  <button className="btn-sm" onClick={()=>setView("trades")}>View All →</button>
                </div>
                {trades.length===0
                  ? <div className="empty">No trades found. Start by adding your first trade.</div>
                  : <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>Symbol</th><th>Setup</th><th>Session</th><th>Dir</th><th>Result R</th><th>Status</th><th>Valid</th><th>Emotion</th></tr></thead>
                      <tbody>
                        {activeTrades.slice(0,6).map(t=>(
                          <tr key={t.id}>
                            <td style={{fontFamily:"var(--mono)",fontSize:11}}>{t.date}</td>
                            <td className="td-sym">{t.symbol}</td>
                            <td>{(() => { const a = accounts.find(a=>String(a.id)===t.accountId); return a ? <span style={{fontSize:11,color:ACCOUNT_TYPE_COLORS[a.type],fontWeight:500}}>{a.name}</span> : <span style={{color:"var(--text3)",fontSize:11}}>—</span>; })()}</td>
                            <td style={{fontSize:11,color:"var(--text3)"}}>{t.setupType||"—"}</td>
                            <td><span className="bdg sess">{(t.session||"—").split(" ")[0]}</span></td>
                            <td><span className={`bdg ${(t.tradeType||"long").toLowerCase()}`}>{t.tradeType||"—"}</span></td>
                            <td className={`td-r ${parseFloat(t.resultR)>=0?"pos":"neg"}`}>{parseFloat(t.resultR)>=0?"+":""}{t.resultR||"—"}R</td>
                            <td><span className="bdg stat">{t.tradeStatus||"—"}</span></td>
                            <td><span className={`bdg ${t.aiAnalysis?.isValid?"valid":"invalid"}`}>{t.aiAnalysis?.isValid?"Valid":"Invalid"}</span></td>
                            <td style={{fontSize:11}}>{t.emotionBefore||"—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </>}

            {/* ════════════════════════════════
                LOG TRADE  (WWA STYLE)
            ════════════════════════════════ */}
            {view==="log" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 350px",gap:14,alignItems:"start"}}>

                {/* ── LEFT: FORM SECTIONS ── */}
                <div>

                  {/* 1 · TRADE OVERVIEW */}
                  <div className="to-card">
                    <div className="to-top">

                      {/* Symbol + date row */}
                      <div className="to-sym-row">
                        <div>
                          <div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,marginBottom:8}}>Currency Pair</div>
                          <input
                            className="to-sym"
                            placeholder="GOLD / NQ / EUR"
                            value={form.symbol}
                            onChange={e=>setForm(p=>({...p,symbol:e.target.value.toUpperCase()}))}
                          />
                          {/* live P&L display */}
                          {(form.netPnL||form.resultR) && (
                            <div className={`to-pnl ${pnlPos?"pos":"neg"}`}>
                              {form.netPnL
                                ? `${netPnLNum>=0?"+":"-"}$${Math.abs(netPnLNum).toFixed(2)}`
                                : `${rPos?"+":""}${form.resultR}R`}
                            </div>
                          )}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end"}}>
                          <DatePicker value={form.date} onChange={v=>setForm(p=>({...p,date:v}))}/>
                          {form.tradeStatus && <span className="bdg stat" style={{fontSize:12,padding:"5px 14px"}}>{form.tradeStatus}</span>}
                        </div>
                      </div>

                      {/* Trade Status */}
                      <div style={{marginBottom:16}}>
                        <div className="f-label" style={{marginBottom:8}}>Trade Status</div>
                        <div className="status-group">
                          {TRADE_STATUS_OPTIONS.map(s=>(
                            <button key={s} className={`status-pill${form.tradeStatus===s?" sel":""}`} onClick={()=>sf("tradeStatus")(form.tradeStatus===s?"":s)}>{s}</button>
                          ))}
                        </div>
                      </div>

                      {/* Trade Type */}
                      <div style={{marginBottom:16}}>
                        <div className="f-label" style={{marginBottom:8}}>Trade Type</div>
                        <div className="dir-toggle">
                          <button className={`dir-opt long${form.tradeType==="Long"?" sel":""}`} onClick={()=>sf("tradeType")("Long")}>↑ Long</button>
                          <button className={`dir-opt short${form.tradeType==="Short"?" sel":""}`} onClick={()=>sf("tradeType")("Short")}>↓ Short</button>
                        </div>
                      </div>

                      {/* Session */}
                      <div>
                        <div className="f-label" style={{marginBottom:8}}>Session</div>
                        <div className="sess-group">
                          {SESSIONS.map(s=>(
                            <button key={s} className={`sess-pill${form.session===s?" sel":""}`} onClick={()=>sf("session")(form.session===s?"":s)}>{s}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="to-meta-grid">
                      <div className="to-meta-item">
                        <div className="to-meta-label">Trade Type</div>
                        <div className={`to-meta-val ${form.tradeType==="Long"?"green":"red"}`}>{form.tradeType||"—"}</div>
                      </div>
                      <div className="to-meta-item">
                        <div className="to-meta-label">Session</div>
                        <div className="to-meta-val teal">{form.session||"—"}</div>
                      </div>
                      <div className="to-meta-item">
                        <div className="to-meta-label">Date</div>
                        <div className="to-meta-val">{form.date}</div>
                      </div>
                    </div>
                  </div>

                  {/* 1b · ACCOUNT SELECTOR */}
                  {accounts.length > 0 && (
                    <div className="sec-card">
                      <div className="sec-head"><div className="sec-accent blue"/><div className="sec-title">Account</div></div>
                      <div className="sec-body">
                        <div className="f-label" style={{marginBottom:8}}>Select Account for this Trade</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                          {accounts.map(acc => (
                            <button key={acc.id}
                              onClick={() => sf("accountId")(String(form.accountId)===String(acc.id)?"":String(acc.id))}
                              style={{
                                padding:"8px 16px",borderRadius:"var(--rad)",border:`1px solid ${String(form.accountId)===String(acc.id)?ACCOUNT_TYPE_COLORS[acc.type]:"var(--border2)"}`,
                                background: String(form.accountId)===String(acc.id)?`${ACCOUNT_TYPE_COLORS[acc.type]}18`:"transparent",
                                color: String(form.accountId)===String(acc.id)?ACCOUNT_TYPE_COLORS[acc.type]:"var(--text2)",
                                fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.13s",display:"flex",alignItems:"center",gap:8,
                              }}>
                              <div style={{width:7,height:7,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[acc.type],flexShrink:0}}/>
                              {acc.name}
                              {acc.firm && <span style={{fontSize:10,opacity:0.6}}>· {acc.firm}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2 · DIRECTION */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent purple"/><div className="sec-title">Direction</div></div>
                    <div className="sec-body">
                      <div style={{marginBottom:16}}>
                        <div className="f-label" style={{marginBottom:8}}>Daily Bias</div>
                        <div className="pill-row">
                          {DAILY_BIAS_OPTIONS.map(o=>(
                            <button key={o} className={`pill${form.dailyBias===o?" sel":""}`} onClick={()=>sf("dailyBias")(form.dailyBias===o?"":o)}>{o}</button>
                          ))}
                        </div>
                      </div>

                      {/* Condition block (like WWA) */}
                      {form.condition ? (
                        <div className="condition-box" style={{marginBottom:16}}>
                          <div className="condition-box-label">Condition</div>
                          <div className="condition-box-val">{form.condition}</div>
                        </div>
                      ) : null}

                      <div style={{marginBottom:16}}>
                        <div className="f-label" style={{marginBottom:8}}>Condition</div>
                        <div className="pill-row">
                          {CONDITIONS.map(c=>(
                            <button key={c} className={`pill${form.condition===c?" sel-purple":""}`} onClick={()=>sf("condition")(form.condition===c?"":c)}>{c}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="f-label" style={{marginBottom:8}}>Previous Daily Candle Close</div>
                        <div className="pill-row">
                          {PREV_CANDLE_OPTIONS.map(o=>(
                            <button key={o} className={`pill${form.prevCandleClose===o?" sel":""}`} onClick={()=>sf("prevCandleClose")(form.prevCandleClose===o?"":o)}>{o}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 · LOWER TIMEFRAME CONFIRMATION */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent teal"/><div className="sec-title">Lower Timeframe Confirmation</div></div>
                    <div className="sec-body">
                      <div className="pill-row" style={{gap:8}}>
                        {LTFC_OPTIONS.map(tag=>(
                          <button key={tag} className={`chip${form.ltfcTags.includes(tag)?" sel":""}`} onClick={()=>toggleLtfc(tag)}>{tag}</button>
                        ))}
                      </div>
                      {form.ltfcTags.length>0 && (
                        <button style={{marginTop:12,fontSize:11,color:"var(--text3)",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setForm(p=>({...p,ltfcTags:[]}))}>
                          Done editing
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4 · TYPE OF EXECUTION */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent blue"/><div className="sec-title">Type of Execution</div></div>
                    <div className="sec-body">
                      <div style={{marginBottom:16}}>
                        <div className="f-label" style={{marginBottom:8}}>Execution Type</div>
                        <div className="pill-row">
                          {EXECUTION_TYPES.map(e=>(
                            <button key={e} className={`pill${form.executionType===e?" sel-blue":""}`} onClick={()=>sf("executionType")(form.executionType===e?"":e)}>{e}</button>
                          ))}
                        </div>
                      </div>

                      {/* Show selected execution type like WWA */}
                      {form.executionType && (
                        <div className="exec-box" style={{marginBottom:16}}>
                          <div className="exec-box-label">Execution Type</div>
                          <div className="exec-box-val">{form.executionType}</div>
                        </div>
                      )}

                      <div className="g2">
                        <div className="f-group">
                          <label className="f-label">Setup Type</label>
                          <select className="f-select" value={form.setupType} onChange={sfe("setupType")}>
                            <option value="">Select setup…</option>
                            {SETUP_TYPES.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="f-group">
                          <label className="f-label">Mistake Classification</label>
                          <select className="f-select" value={form.mistakeType} onChange={sfe("mistakeType")}>
                            {MISTAKE_TYPES.map(m=><option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5 · PRICE DETAILS */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent teal"/><div className="sec-title">Price Details</div></div>
                    <div className="sec-body">
                      <div className="g4">
                        {[["Open Price","openPrice"],["Close Price","closePrice"],["Stop Loss","stopLoss"],["Take Profit","takeProfit"]].map(([l,f])=>(
                          <div key={f} className="f-group">
                            <label className="f-label">{l}</label>
                            <NumInput value={form[f]} onChange={v=>setForm(p=>({...p,[f]:v}))} placeholder="0.00" step={0.01}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6 · TIMING */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent purple"/><div className="sec-title">Timing</div></div>
                    <div className="sec-body" style={{overflow:"visible"}}>
                      <div className="g3">
                        <div className="f-group">
                          <label className="f-label">Entry Time</label>
                          <TimePicker value={form.entryTime} onChange={v=>setForm(p=>({...p,entryTime:v}))} placeholder="Entry time"/>
                        </div>
                        <div className="f-group">
                          <label className="f-label">Exit Time</label>
                          <TimePicker value={form.exitTime} onChange={v=>setForm(p=>({...p,exitTime:v}))} placeholder="Exit time"/>
                        </div>
                        <div className="f-group">
                          <label className="f-label">Duration</label>
                          <div className="f-input" style={{color:"var(--teal)",fontFamily:"var(--mono)",fontWeight:500}}>{duration||"—"}</div>
                        </div>
                      </div>
                      {(form.entryTime||form.exitTime) && (
                        <div className="time-display">
                          <div className="time-block">
                            <div className="time-block-label">Entry</div>
                            <div className="time-chip">{form.entryTime?form.entryTime.replace(":"," : "):"—"}</div>
                          </div>
                          <div className="time-sep">→</div>
                          <div className="time-block">
                            <div className="time-block-label">Exit</div>
                            <div className="time-chip">{form.exitTime?form.exitTime.replace(":"," : "):"—"}</div>
                          </div>
                          {duration && (
                            <>
                              <div className="time-sep">·</div>
                              <div className="time-block">
                                <div className="time-block-label">Duration</div>
                                <div className="time-chip" style={{borderColor:"rgba(155,127,232,0.3)",color:"var(--purple)"}}>{duration}</div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 7 · FINANCIAL */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent blue"/><div className="sec-title">Financial</div></div>
                    <div className="sec-body">
                      <div className="g4" style={{marginBottom:16}}>
                        {[["Risk %","riskPct"],["RR","rr"],["Pips","pips"],["Lot Size","lotSize"],["Gross P&L","grossPnL"],["Commissions","commissions"],["Risk Amount ($)","riskAmount"]].map(([l,f])=>(
                          <div key={f} className="f-group">
                            <label className="f-label">{l}</label>
                            <NumInput value={form[f]} onChange={v=>setForm(p=>({...p,[f]:v}))} placeholder="0" step={0.01}/>
                          </div>
                        ))}
                      </div>
                      {/* Net P&L — always editable input + live preview bar */}
                      <div className="f-group">
                        <label className="f-label">Net P&L ($)</label>
                        <NumInput value={form.netPnL} onChange={v=>setForm(p=>({...p,netPnL:v}))} placeholder="0.00" step={0.01}/>
                      </div>
                      {form.netPnL && (
                        <div className={`net-pnl-bar${netPnLNum<0?" neg":""}`} style={{marginTop:10}}>
                          <span className="net-pnl-label">Net P&L</span>
                          <span className={`net-pnl-val${netPnLNum<0?" neg":""}`}>{netPnLNum>=0?"+":"-"}${Math.abs(netPnLNum).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 8 · PSYCHOLOGY */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent purple"/><div className="sec-title">Psychology</div></div>
                    <div className="sec-body">
                      {[["Emotion Before Trade","emotionBefore"],["Emotion During Trade","emotionDuring"],["Emotion After Trade","emotionAfter"]].map(([l,f])=>(
                        <div key={f} style={{marginBottom:16}}>
                          <div className="f-label" style={{marginBottom:8}}>{l}</div>
                          <div className="emo-row">
                            {EMOTIONS.map(e=>(
                              <button key={e} className={`emo-pill${form[f]===e?" sel":""}`} onClick={()=>sf(f)(form[f]===e?"":e)}>{e}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div style={{marginBottom:16}}>
                        <div className="f-label" style={{marginBottom:8}}>Confidence Level: {form.confidenceLevel}/10</div>
                        <div className="conf-wrap">
                          <input
                            type="range" className="conf-slider" min="1" max="10" step="1"
                            value={form.confidenceLevel}
                            style={{"--val":`${(form.confidenceLevel-1)/9*100}%`}}
                            onChange={e=>setForm(p=>({...p,confidenceLevel:parseInt(e.target.value)}))}
                          />
                          <span className="conf-num">{form.confidenceLevel}</span>
                        </div>
                      </div>
                      <div>
                        <div className="f-label" style={{marginBottom:8}}>Did I Follow My Rules?</div>
                        <div className="rules-row">
                          {[["Yes","yes"],["Partially","partial"],["No","no"]].map(([l,cls])=>(
                            <button key={l} className={`rules-btn ${cls}${form.followedRules===l?" sel":""}`} onClick={()=>sf("followedRules")(l)}>{l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 9 · NOTES & SCREENSHOT */}
                  <div className="sec-card">
                    <div className="sec-head"><div className="sec-accent teal"/><div className="sec-title">Notes & Media</div></div>
                    <div className="sec-body">
                      <div className="f-group" style={{marginBottom:13}}>
                        <label className="f-label">Trade Rationale / Notes</label>
                        <textarea className="f-textarea" placeholder="What was the setup? Why did you enter? What confirmation did you see?" value={form.notes} onChange={sfe("notes")}/>
                      </div>
                      <div className="f-group" style={{marginBottom:13}}>
                        <label className="f-label">Lessons Learned</label>
                        <textarea className="f-textarea" placeholder="What would you do differently? What did you execute well?" value={form.lessonsLearned} onChange={sfe("lessonsLearned")} style={{minHeight:70}}/>
                      </div>
                      <div className="f-group">
                        <label className="f-label">Chart Screenshot</label>
                        {form.screenshotUrl ? (
                          <div style={{position:"relative",borderRadius:"var(--rad-lg)",overflow:"hidden",border:"1px solid var(--border2)"}}>
                            <img src={form.screenshotUrl} alt="Trade chart" style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}}/>
                            <button
                              onClick={()=>setForm(p=>({...p,screenshotUrl:""}))}
                              style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.7)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              ×
                            </button>
                          </div>
                        ) : (
                          <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"1.5rem",border:"1.5px dashed var(--border2)",borderRadius:"var(--rad-lg)",cursor:"pointer",background:"var(--bg3)",transition:"border-color 0.15s"}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--teal)"}
                            onMouseLeave={e=>e.currentTarget.style.borderColor=""}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <div style={{fontSize:13,color:"var(--text2)",textAlign:"center"}}>Click to upload chart screenshot<br/><span style={{fontSize:11,color:"var(--text3)"}}>PNG, JPG up to 10MB</span></div>
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={async(e)=>{
                              const file = e.target.files[0];
                              if (!file) return;
                              const url = await uploadScreenshot(file);
                              if (url) setForm(p=>({...p,screenshotUrl:url}));
                            }}/>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-btn-row">
                    <button className="btn-ghost" onClick={clearForm}>Clear Form</button>
                    <button className="btn-teal" onClick={handleSubmit}>
                      {submitted ? "✓ Logged" : "Log Trade + AI Review →"}
                    </button>
                  </div>
                </div>

                {/* ── RIGHT: AI COACH + PREVIEW ── */}
                <div style={{position:"sticky",top:66,display:"flex",flexDirection:"column",gap:12}}>

                  {/* AI Coach */}
                  <div className="sec-card" style={{marginBottom:0}}>
                    <div className="sec-head" style={{justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <div className="sec-accent teal"/>
                        <div className="sec-title">AI Coach</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"var(--teal)"}}>
                        <div className="live-pip"/><span>Active</span>
                      </div>
                    </div>
                    <div className="sec-body">
                      {!aiResult ? (
                        <div style={{textAlign:"center",padding:"1.75rem 0"}}>
                          <div style={{fontSize:30,marginBottom:10}}>🤖</div>
                          <div style={{fontSize:12.5,color:"var(--text3)",lineHeight:1.8}}>
                            Complete the form and hit<br/>
                            <span style={{color:"var(--teal)",fontWeight:600}}>Log Trade + AI Review</span><br/>
                            for instant coaching feedback.
                          </div>
                          <div style={{marginTop:14,padding:"9px 13px",border:"1px dashed var(--border2)",borderRadius:"var(--rad)",fontSize:10,color:"var(--text3)",lineHeight:1.6}}>
                            {/* TODO: Replace analyzeTradeWithAI() with a fetch to your API */}
                            Currently rule-based · Connect Claude API for AI analysis
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                            <span className={`ai-badge ${aiResult.isValid?"valid":"invalid"}`}>
                              {aiResult.isValid?"✓ Valid Trade":"✗ Invalid Trade"}
                            </span>
                          </div>
                          {[["Execution Score",aiResult.execScore],["Risk Management",aiResult.riskScore]].map(([l,s])=>(
                            <div key={l} className="score-bar-wrap">
                              <div className="score-row">
                                <span style={{fontSize:12,color:"var(--text2)"}}>{l}</span>
                                <span style={{fontFamily:"var(--mono)",fontSize:12,color:s>=7?"var(--teal)":s>=4?"var(--amber)":"var(--red)"}}>{s}/10</span>
                              </div>
                              <div className="score-track">
                                <div className="score-fill" style={{width:`${s*10}%`,background:s>=7?"var(--teal)":s>=4?"var(--amber)":"var(--red)"}}/>
                              </div>
                            </div>
                          ))}
                          <div style={{height:1,background:"var(--border)",margin:"12px 0"}}/>
                          <div className="ai-kv"><div className="ai-kv-label">Main Mistake</div><div className="ai-kv-val">{aiResult.mainMistake}</div></div>
                          <div className="ai-kv"><div className="ai-kv-label">Psychology Pattern</div><div className="ai-kv-val">{aiResult.psychPattern}</div></div>
                          <div className="ai-kv"><div className="ai-kv-label">Advice</div><div className="ai-kv-val" style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>{aiResult.advice}</div></div>
                          <div className="ai-next"><div className="ai-next-label">Next Trade Reminder</div>{aiResult.reminder}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Trade Preview */}
                  {(form.symbol||form.resultR||form.tradeStatus) && (
                    <div className="sec-card" style={{marginBottom:0}}>
                      <div className="sec-head"><div className="sec-accent blue"/><div className="sec-title">Trade Preview</div></div>
                      <div className="sec-body">
                        {[
                          ["Symbol", form.symbol||"—", form.symbol?"var(--mono)":null, null],
                          ["Direction", form.tradeType, null, form.tradeType==="Long"?"var(--green)":"var(--red)"],
                          ["Session", form.session||"—", null, null],
                          ["Setup", form.setupType||"—", null, null],
                          ["Execution", form.executionType||"—", null, null],
                          ["LTFC", form.ltfcTags.length?form.ltfcTags.join(", "):"—", null, form.ltfcTags.length?"var(--teal)":null],
                          ["Result R", form.resultR?`${parseFloat(form.resultR)>=0?"+":""}${form.resultR}R`:"—", "var(--mono)", parseFloat(form.resultR)>=0?"var(--green)":"var(--red)"],
                          ["Condition", form.condition||"—", null, form.condition?"var(--purple)":null],
                        ].map(([k,v,ff,col])=>(
                          <div key={k} className="preview-row">
                            <span className="preview-key">{k}</span>
                            <span className="preview-val" style={{fontFamily:ff||"inherit",color:col||"var(--text)"}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                ALL TRADES
            ════════════════════════════════ */}
            {view==="trades" && (
              <div className="sec-card">
                <div className="sec-head" style={{justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <div className="sec-accent teal"/>
                    <div className="sec-title">All Trades ({activeTrades.length})</div>
                  </div>
                  <button className="btn-teal" style={{fontSize:12,padding:"7px 16px"}} onClick={()=>setView("log")}>+ Add Trade</button>
                </div>
                {trades.length===0
                  ? <div className="empty">No trades found. Start by adding your first trade.</div>
                  : <div className="table-wrap">
                    <table>
                      <thead><tr>
                        <th>Date</th><th>Symbol</th><th>Account</th><th>Setup</th><th>Session</th><th>Dir</th>
                        <th>Result R</th><th>Net P&L</th><th>Valid</th><th>Status</th>
                        <th>Emotion</th><th>Mistake</th><th></th>
                      </tr></thead>
                      <tbody>
                        {activeTrades.map(t=>(
                          <tr key={t.id}>
                            <td style={{fontFamily:"var(--mono)",fontSize:11}}>{t.date}</td>
                            <td className="td-sym">{t.symbol}</td>
                            <td>{(() => { const a = accounts.find(a=>String(a.id)===t.accountId); return a ? <span style={{fontSize:11,color:ACCOUNT_TYPE_COLORS[a.type],fontWeight:500}}>{a.name}</span> : <span style={{color:"var(--text3)",fontSize:11}}>—</span>; })()}</td>
                            <td style={{fontSize:11,color:"var(--text3)"}}>{t.setupType||"—"}</td>
                            <td><span className="bdg sess">{(t.session||"—").split(" ")[0]}</span></td>
                            <td><span className={`bdg ${(t.tradeType||"long").toLowerCase()}`}>{t.tradeType}</span></td>
                            <td className={`td-r ${parseFloat(t.resultR)>=0?"pos":"neg"}`}>{parseFloat(t.resultR)>=0?"+":""}{t.resultR||"—"}R</td>
                            <td style={{fontFamily:"var(--mono)",fontSize:12,color:parseFloat(t.netPnL)>=0?"var(--green)":"var(--red)"}}>
                              {t.netPnL?`${parseFloat(t.netPnL)>=0?"+":"-"}$${Math.abs(parseFloat(t.netPnL)).toFixed(2)}`:"—"}
                            </td>
                            <td><span className={`bdg ${t.aiAnalysis?.isValid?"valid":"invalid"}`}>{t.aiAnalysis?.isValid?"Valid":"Invalid"}</span></td>
                            <td><span className="bdg stat">{t.tradeStatus||"—"}</span></td>
                            <td style={{fontSize:11}}>{t.emotionBefore||"—"}</td>
                            <td style={{fontSize:11,color:t.mistakeType!=="None"?"var(--red)":"var(--text3)"}}>{t.mistakeType}</td>
                            <td style={{display:"flex",gap:6,alignItems:"center"}}>
<button className="btn-sm" onClick={()=>{setEditMode(false);setDetailTrade(t)}}>View</button>
<button className="btn-sm" style={{color:"var(--teal)"}} onClick={()=>openEdit(t)}>Edit</button>
<button className="btn-sm btn-danger" onClick={()=>{ if(window.confirm("Delete this trade?")) deleteTrade(t.id); }}>Delete</button>

                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            )}

            {/* ════════════════════════════════
                ACCOUNTS
            ════════════════════════════════ */}
            {view==="accounts" && (() => {
              // Single unified filter logic:
              // - global tab bar selects a specific account by id → show only that account
              // - accounts page type buttons select a type → show all accounts of that type
              // - "All Accounts" → show everything
              const visibleAccStats = activeAccountId==="all"
                ? (accFilter==="All Accounts" ? accStats : accStats.filter(a=>a.type===accFilter))
                : accStats.filter(a=>String(a.id)===String(activeAccountId));

              const filteredAccs = visibleAccStats;
              const totalBalance = visibleAccStats.reduce((s,a)=>s+a.currentBalance,0);
              const totalPnL = visibleAccStats.reduce((s,a)=>s+a.netPnL,0);
              const allWins = visibleAccStats.reduce((s,a)=>s+a.wins,0);
              const allTrades = visibleAccStats.reduce((s,a)=>s+a.tradeCount,0);
              const globalWR = allTrades ? +(allWins/allTrades*100).toFixed(1) : 0;
              // donut data — based on visible accounts only
              const donutData = ACCOUNT_TYPES.map(t => ({
                type: t, count: visibleAccStats.filter(a=>a.type===t).length, color: ACCOUNT_TYPE_COLORS[t]
              })).filter(d=>d.count>0);
              const total = donutData.reduce((s,d)=>s+d.count,0)||1;
              // build SVG donut arcs
              const buildArcs = () => {
                const cx=110,cy=110,r=80,sw=22;
                let ang=-90;
                return donutData.map((d,i)=>{
                  const pct=d.count/total, sweep=pct*360-2;
                  const toRad=a=>a*Math.PI/180;
                  const x1=cx+r*Math.cos(toRad(ang)),y1=cy+r*Math.sin(toRad(ang));
                  ang+=pct*360;
                  const x2=cx+r*Math.cos(toRad(ang-2)),y2=cy+r*Math.sin(toRad(ang-2));
                  const large=sweep>180?1:0;
                  return <path key={i} d={`M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}`} fill="none" stroke={d.color} strokeWidth={sw} strokeLinecap="round"/>;
                });
              };
              return <>
                {/* KPI bar */}
                <div className="kpi-bar" style={{marginBottom:14}}>
                  {[
                    {label:"Accounts", val:visibleAccStats.length, cls:"muted"},
                    {label:"Balance", val:`$${totalBalance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, cls:"muted"},
                    {label:"P&L", val:`${totalPnL>=0?"+":""}$${Math.abs(totalPnL).toFixed(2)}`, cls:totalPnL>=0?"pos":"neg"},
                    {label:"Win Rate", val:`${globalWR}%`, cls:globalWR>=50?"pos":"neg"},
                  ].map(({label,val,cls})=>(
                    <div key={label} className="kpi-bar-item">
                      <div className="kpi-bar-label">{label}</div>
                      <div className={`kpi-bar-val ${cls}`}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Type cards */}
                <div className="acc-type-grid">
                  {ACCOUNT_TYPES.map(type=>(
                    <div key={type} className="acc-type-card">
                      <div className="acc-type-label">
                        <div className="acc-type-dot" style={{background:ACCOUNT_TYPE_COLORS[type]}}/>
                        {type}
                      </div>
                      <div className="acc-type-count">{visibleAccStats.filter(a=>a.type===type).length}</div>
                    </div>
                  ))}
                </div>

                {/* Donut + account list */}
                <div className="sec-card">
                  <div className="sec-head" style={{justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div className="sec-accent teal"/>
                      <div className="sec-title">Accounts Overview</div>
                    </div>
                    <button className="btn-teal" style={{fontSize:12,padding:"7px 16px"}} onClick={()=>setShowAddAcc(true)}>+ Add Account</button>
                  </div>

                  {accounts.length===0 ? (
                    <div className="empty" style={{padding:"3rem"}}>
                      <div style={{fontSize:28,marginBottom:10}}>🏦</div>
                      No accounts yet. Click <strong style={{color:"var(--teal)"}}>+ Add Account</strong> to get started.
                    </div>
                  ) : <>
                    {/* Donut */}
                    <div className="donut-wrap">
                      <svg width="220" height="220" viewBox="0 0 220 220">
                        <circle cx="110" cy="110" r="80" fill="none" stroke="var(--bg3)" strokeWidth="22"/>
                        {buildArcs()}
                      </svg>
                      <div className="donut-center">
                        <div className="donut-val">${totalBalance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                        <div className="donut-sub">{activeAccountId==="all"?"Total Balance":activeAccount?.name||"Balance"}</div>
                      </div>
                    </div>
                    <div className="donut-legend">
                      {donutData.map(d=>(
                        <div key={d.type} className="donut-legend-item">
                          <div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/>
                          {d.type} ({d.count})
                        </div>
                      ))}
                    </div>

                    {/* Filter tabs */}
                    <div style={{padding:"0 18px"}}>
                      <div className="acc-filter-row">
                        {["All Accounts","Funded/Live","Prop Challenge","Personal","Demo"].map(f=>(
                          <button key={f}
                            className={`acc-filter-btn${accFilter===f&&activeAccountId==="all"?" active":""}`}
                            onClick={()=>{ setAccFilter(f); setActiveAccountId("all"); }}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account rows */}
                    <div style={{borderTop:"1px solid var(--border)"}}>
                      <div style={{padding:"9px 18px",display:"flex",alignItems:"center",gap:9,borderBottom:"1px solid var(--border)",background:"var(--bg3)"}}>
                        <span style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>Accounts {filteredAccs.length}</span>
                      </div>
                      {filteredAccs.length===0
                        ? <div className="empty">No accounts match this filter.</div>
                        : filteredAccs.map(acc=>(
                          <div key={acc.id} className="acc-list-item">
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:32,height:32,borderRadius:"50%",background:`${ACCOUNT_TYPE_COLORS[acc.type]}18`,border:`1px solid ${ACCOUNT_TYPE_COLORS[acc.type]}40`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <div style={{width:8,height:8,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[acc.type]}}/>
                              </div>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:7}}>
                                  <span className="acc-name">{acc.name}</span>
                                  {acc.firm&&<span className="acc-firm-badge" style={{background:`${ACCOUNT_TYPE_COLORS[acc.type]}14`,color:ACCOUNT_TYPE_COLORS[acc.type]}}>{acc.firm.toUpperCase()}</span>}
                                </div>
                                <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{acc.type}</div>
                              </div>
                            </div>
                            <div className="acc-stats">
                              <div className="acc-stat">
                                <span className="acc-stat-label">Balance</span>
                                <span className="acc-stat-val">${(acc.currentBalance||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                              </div>
                              <div className="acc-stat">
                                <span className="acc-stat-label">P&L</span>
                                <span className="acc-stat-val" style={{color:acc.netPnL>=0?"var(--green)":"var(--red)"}}>{acc.netPnL>=0?"+":""}${Math.abs(acc.netPnL).toFixed(2)}</span>
                              </div>
                              <div className="acc-stat">
                                <span className="acc-stat-label">Win Rate</span>
                                <span className="acc-stat-val" style={{color:acc.wr>=50?"var(--green)":"var(--red)"}}>{acc.wr}%</span>
                              </div>
                              <div className="acc-stat">
                                <span className="acc-stat-label">Trades</span>
                                <span className="acc-stat-val">{acc.tradeCount}</span>
                              </div>
                              <div className="acc-actions">
                                <button
                                  onClick={()=>{
                                    setActiveAccountId(String(acc.id));
                                    setForm({...defaultForm, accountId:String(acc.id), date:new Date().toISOString().slice(0,10)});
                                    setAiResult(null);
                                    setSubmitted(false);
                                    setView("log");
                                  }}
                                  style={{
                                    padding:"7px 16px",borderRadius:"var(--rad)",
                                    background:`${ACCOUNT_TYPE_COLORS[acc.type]}18`,
                                    border:`1px solid ${ACCOUNT_TYPE_COLORS[acc.type]}50`,
                                    color:ACCOUNT_TYPE_COLORS[acc.type],
                                    fontSize:12,fontWeight:600,cursor:"pointer",
                                    display:"flex",alignItems:"center",gap:6,
                                    transition:"all 0.15s",whiteSpace:"nowrap",
                                  }}>
                                  + Add Trade
                                </button>
                                <button className="btn-sm btn-danger" onClick={()=>deleteAccount(acc.id)}>✕</button>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </>}
                </div>
              </>;
            })()}

            {/* ════════════════════════════════
                WEEKLY REPORT / CALENDAR
            ════════════════════════════════ */}
            {view==="weekly" && (() => {
              const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
              const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
              const { year, month } = calDate;

              // Build calendar cells
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              // 0=Sun..6=Sat → convert to Mon-first (0=Mon..6=Sun)
              const startDow = (firstDay.getDay() + 6) % 7;
              const cells = [];
              // prev month pad
              for (let i = startDow - 1; i >= 0; i--) {
                const d = new Date(year, month, -i);
                cells.push({ date: d, cur: false });
              }
              // current month
              for (let d = 1; d <= lastDay.getDate(); d++) {
                cells.push({ date: new Date(year, month, d), cur: true });
              }
              // next month pad to fill grid
              let pad = 0;
              while ((cells.length + pad) % 7 !== 0) pad++;
              for (let d = 1; d <= pad; d++) cells.push({ date: new Date(year, month + 1, d), cur: false });

              // Group activeTrades by date string (respects account filter)
              const byDate = {};
              activeTrades.forEach(t => {
                const key = t.date;
                if (!byDate[key]) byDate[key] = [];
                byDate[key].push(t);
              });

              // Monthly stats
              const monthTrades = activeTrades.filter(t => {
                const d = new Date(t.date + "T12:00:00");
                return d.getFullYear() === year && d.getMonth() === month;
              });
              const monthPnL = monthTrades.reduce((s,t) => s + (parseFloat(t.netPnL)||0), 0);
              const tradingDays = new Set(monthTrades.map(t => t.date)).size;
              const today = new Date();
              const todayStr = today.toISOString().slice(0,10);

              // Equity curve for this month — uses netPnL, works with 1+ trades
              const monthSorted = [...monthTrades].sort((a,b)=>new Date(a.date)-new Date(b.date));
              const startBal = activeStartingBalance;
              let cumPnL = startBal;
              const eqPoints = [startBal, ...monthSorted.map(t => { cumPnL += parseFloat(t.netPnL)||0; return +cumPnL.toFixed(2); })];
              const eqLabels = ["Start", ...monthSorted.map(t => { const d=new Date(t.date+"T12:00:00"); return (d.getMonth()+1)+"/"+d.getDate(); })];

              const buildEqSvg = () => {
                const W=580,H=150,px=50,py=16,pb=24;
                const ch = H-py-pb;
                const mn=Math.min(...eqPoints),mx=Math.max(...eqPoints);
                const range=mx-mn||1;
                const pts=eqPoints.map((v,i)=>`${px+i/(eqPoints.length-1)*(W-px-12)},${py+ch-(v-mn)/range*ch}`);
                const col=eqPoints[eqPoints.length-1]>=0?"#00d4b4":"#e8514a";
                const area=`M${pts[0]} L${pts.join(" L")} L${px+(W-px-12)*(eqPoints.length-1)/(eqPoints.length-1)},${py+ch} L${px},${py+ch} Z`;
                // y-axis grid lines
                const gridVals = [mn, mn+range*0.5, mx];
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}}>
                    <defs>
                      <linearGradient id="weq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={col} stopOpacity="0.2"/>
                        <stop offset="100%" stopColor={col} stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* grid lines */}
                    {gridVals.map((v,i)=>{
                      const y=py+ch-(v-mn)/range*ch;
                      return <g key={i}>
                        <line x1={px} y1={y} x2={W-12} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,4"/>
                        <text x={px-4} y={y+3} textAnchor="end" fontSize="9" fill="#4e5a6b">{v>=0?"+":""}{v.toFixed(0)}</text>
                      </g>;
                    })}
                    {/* zero line */}
                    {mn<0&&mx>0&&<line x1={px} y1={py+ch-(-mn)/range*ch} x2={W-12} y2={py+ch-(-mn)/range*ch} stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>}
                    {/* area + line */}
                    <path d={area} fill="url(#weq)"/>
                    <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                    {/* dots */}
                    {pts.map((pt,i)=>{
                      const [x,y]=pt.split(",");
                      return <circle key={i} cx={x} cy={y} r="3" fill={col} fillOpacity="0.9"/>;
                    })}
                    {/* x-axis labels */}
                    {eqLabels.map((l,i)=>{
                      const x=px+i/(eqPoints.length-1)*(W-px-12);
                      if(eqLabels.length>8&&i>0&&i<eqLabels.length-1&&i%(Math.ceil(eqLabels.length/6))!==0) return null;
                      return <text key={i} x={x} y={H-4} textAnchor="middle" fontSize="9" fill="#4e5a6b">{l}</text>;
                    })}
                  </svg>
                );
              };

              return <>
                {/* Cal tabs */}
                <div className="sec-card" style={{padding:0,overflow:"visible"}}>
                  <div className="cal-tabs">
                    {["Calendar","Closed Trades"].map(t=>(
                      <button key={t} className={`cal-tab${calTab===t?" active":""}`} onClick={()=>setCalTab(t)}>{t}</button>
                    ))}
                  </div>

                  {/* Top bar */}
                  <div className="cal-topbar">
                    <div className="cal-nav">
                      <button className="cal-today-btn" onClick={()=>{const n=new Date();setCalDate({year:n.getFullYear(),month:n.getMonth()})}}>Today</button>
                      <button className="cal-nav-btn" onClick={()=>setCalDate(p=>{ const d=new Date(p.year,p.month-1,1); return {year:d.getFullYear(),month:d.getMonth()}; })}>‹</button>
                      <div className="cal-month-label">{MONTHS[month]} {year}</div>
                      <button className="cal-nav-btn" onClick={()=>setCalDate(p=>{ const d=new Date(p.year,p.month+1,1); return {year:d.getFullYear(),month:d.getMonth()}; })}>›</button>
                    </div>
                    <div className="cal-stats-bar">
                      {activeAccount && <span style={{color:ACCOUNT_TYPE_COLORS[activeAccount.type],fontWeight:600}}>{activeAccount.name}</span>}
                      <span>Monthly P&L:</span>
                      <span style={{fontFamily:"var(--mono)",fontWeight:600,color:monthPnL>=0?"var(--green)":"var(--red)"}}>
                        {monthPnL>=0?"+":""}${monthPnL.toFixed(2)}
                      </span>
                      <span>Days: <strong style={{color:"var(--text2)"}}>{tradingDays}</strong></span>
                      <span>Trades: <strong style={{color:"var(--text2)"}}>{monthTrades.length}</strong></span>
                    </div>
                  </div>

                  {calTab === "Calendar" && <>
                    {/* Day headers */}
                    <div className="cal-grid">
                      {DAYS.map(d=><div key={d} className="cal-day-header">{d}</div>)}
                      {cells.map((cell,i)=>{
                        const key = `${cell.date.getFullYear()}-${String(cell.date.getMonth()+1).padStart(2,"0")}-${String(cell.date.getDate()).padStart(2,"0")}`;
                        const dayTrades = byDate[key] || [];
                        const dayPnL = dayTrades.reduce((s,t)=>s+(parseFloat(t.netPnL)||0),0);
                        const hasTrades = dayTrades.length > 0;
                        const isToday = key === todayStr;
                        return (
                          <div key={i} className={[
                            "cal-cell",
                            !cell.cur?"other-month":"",
                            isToday?"today-cell":"",
                            hasTrades?(dayPnL>=0?"has-trades profit":"has-trades loss"):"",
                          ].join(" ")}>
                            <div className="cal-cell-num">{cell.date.getDate()}</div>
                            {hasTrades && <>
                              <div className={`cal-cell-pnl ${dayPnL>=0?"pos":"neg"}`}>
                                {dayPnL>=0?"+":""}${Math.abs(dayPnL).toFixed(2)}
                              </div>
                              <div className="cal-cell-trades">Trades: {dayTrades.length}</div>
                            </>}
                          </div>
                        );
                      })}
                    </div>
                  </>}

                  {calTab === "Closed Trades" && (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Date</th><th>Symbol</th><th>Dir</th><th>Session</th><th>Setup</th><th>Result R</th><th>Net P&L</th><th>Status</th></tr></thead>
                        <tbody>
                          {monthTrades.length===0
                            ? <tr><td colSpan={8} style={{textAlign:"center",color:"var(--text3)",padding:"2rem"}}>No trades this month.</td></tr>
                            : [...monthTrades].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>(
                              <tr key={t.id}>
                                <td style={{fontFamily:"var(--mono)",fontSize:11}}>{t.date}</td>
                                <td className="td-sym">{t.symbol}</td>
                                <td><span className={`bdg ${(t.tradeType||"long").toLowerCase()}`}>{t.tradeType}</span></td>
                                <td><span className="bdg sess">{(t.session||"—").split(" ")[0]}</span></td>
                                <td style={{fontSize:11,color:"var(--text3)"}}>{t.setupType||"—"}</td>
                                <td className={`td-r ${parseFloat(t.resultR)>=0?"pos":"neg"}`}>{parseFloat(t.resultR)>=0?"+":""}{t.resultR||"—"}R</td>
                                <td style={{fontFamily:"var(--mono)",fontSize:12,color:parseFloat(t.netPnL)>=0?"var(--green)":"var(--red)"}}>
                                  {t.netPnL?`${parseFloat(t.netPnL)>=0?"+":"-"}$${Math.abs(parseFloat(t.netPnL)).toFixed(2)}`:"—"}
                                </td>
                                <td><span className="bdg stat">{t.tradeStatus||"—"}</span></td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Monthly Equity Curve */}
                <div className="sec-card" style={{marginTop:14}}>
                  <div className="sec-head" style={{justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div className="sec-accent teal"/>
                      <div className="sec-title">Monthly Equity Curve · {MONTHS[month]} {year}</div>
                    </div>
                    <div style={{fontFamily:"var(--mono)",fontSize:12,color:monthPnL>=0?"var(--green)":"var(--red)",fontWeight:600}}>
                      {monthPnL>=0?"+":""}${monthPnL.toFixed(2)} this month
                    </div>
                  </div>
                  <div className="cal-equity-wrap">
                    {monthTrades.length === 0
                      ? <div className="chart-ph"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3e4e62" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span>No trades this month yet</span></div>
                      : buildEqSvg()
                    }
                  </div>
                </div>

                {/* Monthly KPI summary */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:14}}>
                  {[
                    {l:"Month P&L", v:`${monthPnL>=0?"+":""}$${Math.abs(monthPnL).toFixed(2)}`, c:monthPnL>=0?"pos":"neg"},
                    {l:"Trades", v:monthTrades.length, c:"muted"},
                    {l:"Trading Days", v:tradingDays, c:"teal"},
                    {l:"Win Rate", v:monthTrades.length?`${+(monthTrades.filter(t=>parseFloat(t.resultR)>0).length/monthTrades.length*100).toFixed(1)}%`:"—", c:"teal"},
                  ].map(({l,v,c})=>(
                    <div key={l} className="stat-card">
                      <div className="stat-label">{l}</div>
                      <div className={`stat-val ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
              </>;
            })()}

            {/* ════════════════════════════════
                ANALYTICS
            ════════════════════════════════ */}
            {view==="analytics" && <>
              <div className="sec-card" style={{marginBottom:12}}>
                <div className="sec-head"><div className="sec-accent teal"/><div className="sec-title">Equity Curve</div></div>
                <div style={{padding:"1rem 1.25rem"}}><EquityCurve trades={activeTrades} startingBalance={activeStartingBalance}/></div>
              </div>

              {/* ── PAIR PERFORMANCE ── */}
              <div className="sec-card" style={{marginBottom:12}}>
                <div className="sec-head"><div className="sec-accent teal"/><div className="sec-title">Pair Performance</div></div>
                {(() => {
                  const pairMap = {};
                  activeTrades.forEach(t => {
                    const sym = t.symbol?.trim().toUpperCase() || "UNKNOWN";
                    if (!pairMap[sym]) pairMap[sym] = { trades: 0, wins: 0, netPnL: 0, rs: [] };
                    const r = parseFloat(t.resultR) || 0;
                    const pnl = parseFloat(t.netPnL) || 0;
                    pairMap[sym].trades++;
                    if (r > 0) pairMap[sym].wins++;
                    pairMap[sym].netPnL += pnl;
                    pairMap[sym].rs.push(r);
                  });
                  const rows = Object.entries(pairMap)
                    .map(([pair, d]) => ({
                      pair,
                      trades: d.trades,
                      wins: d.wins,
                      wr: +(d.wins / d.trades * 100).toFixed(1),
                      netPnL: +d.netPnL.toFixed(2),
                      avgR: +(d.rs.reduce((a,b)=>a+b,0)/d.rs.length).toFixed(2),
                    }))
                    .sort((a, b) => b.netPnL - a.netPnL);
                  if (!rows.length) return <div className="empty">No trades logged yet.</div>;
                  return (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Pair</th>
                            <th>Trades</th>
                            <th>Wins</th>
                            <th>Win Rate</th>
                            <th>Avg R</th>
                            <th>Net P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(row => (
                            <tr key={row.pair}>
                              <td style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:14,color:"var(--text)"}}>{row.pair}</td>
                              <td style={{color:"var(--text2)"}}>{row.trades}</td>
                              <td style={{color:"var(--text2)"}}>{row.wins}</td>
                              <td style={{fontFamily:"var(--mono)",fontWeight:600,color:row.wr>=50?"var(--green)":"var(--red)"}}>{row.wr}%</td>
                              <td style={{fontFamily:"var(--mono)",color:row.avgR>=0?"var(--green)":"var(--red)"}}>{row.avgR>=0?"+":""}{row.avgR}R</td>
                              <td style={{fontFamily:"var(--mono)",fontWeight:700,color:row.netPnL>=0?"var(--green)":"var(--red)"}}>
                                {row.netPnL>=0?"+":"-"}${Math.abs(row.netPnL).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* ── ANALYTICS CHARTS (pure SVG, no deps) ── */}
              {(() => {
                if (!trades.length) return (
                  <div className="sec-card" style={{marginBottom:0}}>
                    <div className="empty">Log trades to see analytics charts.</div>
                  </div>
                );

                // ── helpers ──
                const W = 560, H = 200, PX = 48, PY = 20, PB = 36;
                const chartH = H - PY - PB;
                const noData = (label) => (
                  <div className="chart-ph" style={{height:200}}>
                    <span style={{fontSize:12,color:"var(--text3)"}}>Not enough data for {label}</span>
                  </div>
                );

                // bar chart helper
                const BarChart = ({ data, colorFn }) => {
                  if (!data.length) return noData("bar chart");
                  const maxV = Math.max(...data.map(d=>Math.abs(d.value)), 0.1);
                  const bw = Math.min(48, (W - PX - 20) / data.length - 8);
                  return (
                    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}}>
                      {/* zero line */}
                      <line x1={PX} y1={PY+chartH} x2={W-10} y2={PY+chartH} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                      {data.map((d, i) => {
                        const x = PX + i * ((W - PX - 20) / data.length) + ((W - PX - 20) / data.length - bw) / 2;
                        const barH = Math.max(3, (Math.abs(d.value) / maxV) * chartH);
                        const y = d.value >= 0 ? PY + chartH - barH : PY + chartH;
                        const col = colorFn ? colorFn(d) : (d.value >= 0 ? "#0fbe88" : "#e8514a");
                        return (
                          <g key={i}>
                            <rect x={x} y={y} width={bw} height={barH} rx="3" fill={col} fillOpacity="0.85"/>
                            <text x={x+bw/2} y={H-4} textAnchor="middle" fontSize="9" fill="#3e4e62">{d.label.length>7?d.label.slice(0,7):d.label}</text>
                            <text x={x+bw/2} y={y-4} textAnchor="middle" fontSize="8" fill={col}>{d.display||""}</text>
                          </g>
                        );
                      })}
                      {/* y axis */}
                      {[0,0.5,1].map(f=>{
                        const v = (maxV*f).toFixed(1);
                        const y = PY + chartH - f*chartH;
                        return <g key={f}>
                          <line x1={PX-4} y1={y} x2={W-10} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                          <text x={PX-6} y={y+3} textAnchor="end" fontSize="8" fill="#3e4e62">{v}</text>
                        </g>;
                      })}
                    </svg>
                  );
                };

                // donut / pie helper
                const DonutChart = ({ slices }) => {
                  if (!slices.length) return noData("chart");
                  const total = slices.reduce((s,d)=>s+d.value,0)||1;
                  const cx=120,cy=100,r=72,sw=28;
                  let ang=-90;
                  const arcs = slices.map((d,i)=>{
                    const pct=d.value/total, sweep=pct*360-1;
                    const toR=a=>a*Math.PI/180;
                    const x1=cx+r*Math.cos(toR(ang)),y1=cy+r*Math.sin(toR(ang));
                    ang+=pct*360;
                    const x2=cx+r*Math.cos(toR(ang-1)),y2=cy+r*Math.sin(toR(ang-1));
                    const large=sweep>180?1:0;
                    return {path:`M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}`, color:d.color, pct:+(pct*100).toFixed(1), label:d.label, value:d.value};
                  });
                  return (
                    <svg viewBox="0 0 560 200" style={{width:"100%",height:200}}>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
                      {arcs.map((a,i)=><path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round"/>)}
                      {arcs.map((a,i)=>(
                        <g key={i}>
                          <circle cx={270} cy={30+i*28} r={5} fill={a.color}/>
                          <text x={282} y={35+i*28} fontSize="11" fill="#7a8fa8">{a.label}</text>
                          <text x={480} y={35+i*28} textAnchor="end" fontSize="11" fill={a.color} fontWeight="600">{a.pct}% ({a.value})</text>
                        </g>
                      ))}
                    </svg>
                  );
                };

                // ── 1. Win Rate by Setup ──
                const setupMap = {};
                activeTrades.forEach(t => {
                  const s = t.setupType||"Other";
                  if (!setupMap[s]) setupMap[s]={wins:0,total:0};
                  setupMap[s].total++;
                  if ((parseFloat(t.resultR)||0)>0) setupMap[s].wins++;
                });
                const setupData = Object.entries(setupMap).map(([k,v])=>({
                  label:k, value:+(v.wins/v.total*100).toFixed(1), display:`${+(v.wins/v.total*100).toFixed(0)}%`
                })).sort((a,b)=>b.value-a.value);

                // ── 2. Avg R by Session ──
                const sessMap = {};
                activeTrades.forEach(t => {
                  const s=(t.session||"Unknown").split("/")[0].trim();
                  if (!sessMap[s]) sessMap[s]=[];
                  sessMap[s].push(parseFloat(t.resultR)||0);
                });
                const sessData = Object.entries(sessMap).map(([k,v])=>({
                  label:k, value:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2),
                  display:`${+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)}R`
                })).sort((a,b)=>b.value-a.value);

                // ── 3. Mistakes Frequency ──
                const mistakeMap = {};
                activeTrades.forEach(t => { const m=t.mistakeType||"None"; mistakeMap[m]=(mistakeMap[m]||0)+1; });
                const MISTAKE_COLORS = ["#00d4b4","#a78bfa","#4a90d9","#e8a838","#e8514a","#0fbe88","#f472b6","#38bdf8","#fb923c","#a3e635","#e879f9","#fbbf24","#34d399"];
                const mistakeSlices = Object.entries(mistakeMap)
                  .filter(([k])=>k!=="None")
                  .sort((a,b)=>b[1]-a[1])
                  .map(([k,v],i)=>({label:k,value:v,color:MISTAKE_COLORS[i%MISTAKE_COLORS.length]}));

                // ── 4. Emotion Impact ──
                const emoMap = {};
                activeTrades.forEach(t => {
                  const e=t.emotionBefore||"Unknown";
                  if (!emoMap[e]) emoMap[e]=[];
                  emoMap[e].push(parseFloat(t.resultR)||0);
                });
                const emoData = Object.entries(emoMap).map(([k,v])=>({
                  label:k, value:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2),
                  display:`${+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)}R`
                })).sort((a,b)=>b.value-a.value);

                // ── 5. Rule-Following vs P&L ──
                const ruleMap = {Yes:[],Partially:[],No:[]};
                activeTrades.forEach(t => { const r=t.followedRules||"Yes"; if(ruleMap[r]) ruleMap[r].push(parseFloat(t.resultR)||0); });
                const ruleData = Object.entries(ruleMap).map(([k,v])=>({
                  label:k, value:v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2):0,
                  display:v.length?`${+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)}R`:"—"
                }));

                // ── 6. Confidence vs Avg R (grouped) ──
                const confMap = {};
                activeTrades.forEach(t => {
                  const c=String(t.confidenceLevel||5);
                  if(!confMap[c]) confMap[c]=[];
                  confMap[c].push(parseFloat(t.resultR)||0);
                });
                const confData = Object.entries(confMap)
                  .sort((a,b)=>Number(a[0])-Number(b[0]))
                  .map(([k,v])=>({
                    label:`${k}/10`, value:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2),
                    display:`${+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)}R`
                  }));

                const charts = [
                  { title:"Win Rate by Setup Type", accent:"teal", content:<BarChart data={setupData} colorFn={d=>d.value>=50?"#0fbe88":"#e8514a"}/> },
                  { title:"Avg R by Session", accent:"blue", content:<BarChart data={sessData}/> },
                  { title:"Mistakes Frequency", accent:"purple", content: mistakeSlices.length ? <DonutChart slices={mistakeSlices}/> : <div className="chart-ph" style={{height:200}}><span style={{fontSize:12,color:"var(--text3)"}}>No mistakes logged 🎉</span></div> },
                  { title:"Emotion Impact on R", accent:"teal", content:<BarChart data={emoData}/> },
                  { title:"Rule-Following vs Avg R", accent:"blue", content:<BarChart data={ruleData} colorFn={d=>d.label==="Yes"?"#0fbe88":d.label==="No"?"#e8514a":"#e8a838"}/> },
                  { title:"Confidence vs Avg R", accent:"purple", content:<BarChart data={confData}/> },
                ];

                return (
                  <div className="ana-grid">
                    {charts.map(({title,accent,content})=>(
                      <div key={title} className="sec-card" style={{marginBottom:0}}>
                        <div className="sec-head"><div className={`sec-accent ${accent}`}/><div className="sec-title">{title}</div></div>
                        <div style={{padding:"0.75rem 1rem 0.5rem"}}>{content}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>}

          </div>
        </main>
      </div>

      {/* ════════════════════════════════
          TRADE DETAIL MODAL
      ════════════════════════════════ */}
      {detailTrade && (
        <div className="overlay" onClick={()=>{setDetailTrade(null);setEditMode(false)}}>
          <div className="modal" style={{maxWidth:700,width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-hdr">
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div className="modal-title">{detailTrade.symbol} · {detailTrade.date}</div>
                {editMode && <span style={{fontSize:10,color:"var(--teal)",background:"var(--teal-faint)",border:"1px solid rgba(0,212,180,0.25)",padding:"2px 10px",borderRadius:999,fontWeight:600,letterSpacing:"0.06em"}}>EDITING</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {!editMode && <button className="btn-sm" style={{color:"var(--teal)"}} onClick={()=>openEdit(detailTrade)}>✏ Edit</button>}
                <button className="modal-close" onClick={()=>{setDetailTrade(null);setEditMode(false)}}>×</button>
              </div>
            </div>

            {/* ── VIEW MODE ── */}
            {!editMode && <>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span className={`bdg ${(detailTrade.tradeType||"long").toLowerCase()}`} style={{fontSize:12,padding:"4px 14px"}}>{detailTrade.tradeType}</span>
                <span className="bdg stat" style={{fontSize:12,padding:"4px 14px"}}>{detailTrade.tradeStatus||"—"}</span>
                {detailTrade.netPnL&&<span style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:700,color:parseFloat(detailTrade.netPnL)>=0?"var(--green)":"var(--red)",marginLeft:"auto"}}>
                  {parseFloat(detailTrade.netPnL)>=0?"+":"-"}${Math.abs(parseFloat(detailTrade.netPnL)).toFixed(2)}
                </span>}
              </div>
              <div className="md-grid">
                {[["Session",detailTrade.session||"—"],["Setup",detailTrade.setupType||"—"],["Execution",detailTrade.executionType||"—"],
                  ["Result R",`${parseFloat(detailTrade.resultR)>=0?"+":""}${detailTrade.resultR||"—"}R`],
                  ["Open Price",detailTrade.openPrice||"—"],["Close Price",detailTrade.closePrice||"—"],
                  ["Stop Loss",detailTrade.stopLoss||"—"],["Take Profit",detailTrade.takeProfit||"—"],
                  ["Entry",detailTrade.entryTime||"—"],["Exit",detailTrade.exitTime||"—"],
                  ["R:R",detailTrade.rr||"—"],["Pips",detailTrade.pips||"—"],
                  ["Emotion Before",detailTrade.emotionBefore||"—"],["Confidence",`${detailTrade.confidenceLevel}/10`],
                  ["Followed Rules",detailTrade.followedRules],["Mistake",detailTrade.mistakeType],
                ].map(([l,v])=>(
                  <div key={l} className="md-item"><div className="md-label">{l}</div><div className="md-val">{v}</div></div>
                ))}
              </div>
              {detailTrade.ltfcTags?.length>0&&(
                <div style={{marginBottom:12}}>
                  <div className="md-label" style={{marginBottom:7}}>LTFC Tags</div>
                  <div className="pill-row">{detailTrade.ltfcTags.map(t=><span key={t} className="chip sel" style={{cursor:"default",fontSize:11}}>{t}</span>)}</div>
                </div>
              )}
              {detailTrade.screenshotUrl&&(
              <div style={{marginBottom:12}}>
                <div className="md-label" style={{marginBottom:8}}>Chart Screenshot</div>
                <img src={detailTrade.screenshotUrl} alt="Trade chart" style={{width:"100%",borderRadius:"var(--rad)",border:"1px solid var(--border2)",maxHeight:320,objectFit:"cover",cursor:"pointer"}} onClick={()=>window.open(detailTrade.screenshotUrl,"_blank")}/>
              </div>
            )}
            {detailTrade.notes&&<div style={{marginBottom:12}}><div className="md-label" style={{marginBottom:5}}>Notes</div><div style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>{detailTrade.notes}</div></div>}
              {detailTrade.lessonsLearned&&<div style={{marginBottom:12}}><div className="md-label" style={{marginBottom:5}}>Lessons</div><div style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>{detailTrade.lessonsLearned}</div></div>}
              {detailTrade.aiAnalysis&&<>
                <div className="divider"/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span className={`ai-badge ${detailTrade.aiAnalysis.isValid?"valid":"invalid"}`}>{detailTrade.aiAnalysis.isValid?"✓ Valid":"✗ Invalid"}</span>
                  <span style={{fontSize:11,color:"var(--text3)"}}>Exec: {detailTrade.aiAnalysis.execScore}/10 · Risk: {detailTrade.aiAnalysis.riskScore}/10</span>
                </div>
                <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.6,marginBottom:10}}>
                  <span style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Pattern: </span>{detailTrade.aiAnalysis.psychPattern}
                </div>
                <div className="ai-next"><div className="ai-next-label">Coach Advice</div>{detailTrade.aiAnalysis.advice}</div>
              </>}
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:18}}>
                <button className="btn-ghost btn-danger" onClick={()=>{deleteTrade(detailTrade.id);setDetailTrade(null)}}>Delete</button>
                <button className="btn-teal" onClick={()=>openEdit(detailTrade)}>✏ Edit Trade</button>
              </div>
            </>}

            {/* ── EDIT MODE ── */}
            {editMode && editForm && <>

              {/* Account selector */}
              {accounts.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div className="f-label" style={{marginBottom:8}}>Account</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {accounts.map(acc => (
                      <button key={acc.id}
                        onClick={() => sf2("accountId")(String(editForm.accountId)===String(acc.id)?"":String(acc.id))}
                        style={{
                          padding:"8px 16px",borderRadius:"var(--rad)",
                          border:`1px solid ${String(editForm.accountId)===String(acc.id)?ACCOUNT_TYPE_COLORS[acc.type]:"var(--border2)"}`,
                          background: String(editForm.accountId)===String(acc.id)?`${ACCOUNT_TYPE_COLORS[acc.type]}18`:"transparent",
                          color: String(editForm.accountId)===String(acc.id)?ACCOUNT_TYPE_COLORS[acc.type]:"var(--text2)",
                          fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.13s",
                          display:"flex",alignItems:"center",gap:8,
                        }}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[acc.type],flexShrink:0}}/>
                        {acc.name}
                        {acc.firm && <span style={{fontSize:10,opacity:0.6}}>· {acc.firm}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Overview */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div className="f-group">
                  <label className="f-label">Symbol</label>
                  <input className="f-input" value={editForm.symbol} onChange={e=>setEditForm(p=>({...p,symbol:e.target.value.toUpperCase()}))}/>
                </div>
                <div className="f-group">
                  <label className="f-label">Date</label>
                  <input type="date" className="f-input" value={editForm.date} onChange={sef2("date")}/>
                </div>
              </div>

              {/* Trade Type + Status */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div className="f-group">
                  <label className="f-label">Trade Type</label>
                  <div className="dir-toggle">
                    <button className={`dir-opt long${editForm.tradeType==="Long"?" sel":""}`} onClick={()=>sf2("tradeType")("Long")}>↑ Long</button>
                    <button className={`dir-opt short${editForm.tradeType==="Short"?" sel":""}`} onClick={()=>sf2("tradeType")("Short")}>↓ Short</button>
                  </div>
                </div>
                <div className="f-group">
                  <label className="f-label">Trade Status</label>
                  <div className="pill-row">
                    {TRADE_STATUS_OPTIONS.map(s=><button key={s} className={`pill${editForm.tradeStatus===s?" sel":""}`} onClick={()=>sf2("tradeStatus")(s)}>{s}</button>)}
                  </div>
                </div>
              </div>

              {/* Session */}
              <div className="f-group" style={{marginBottom:14}}>
                <label className="f-label">Session</label>
                <div className="sess-group">
                  {SESSIONS.map(s=><button key={s} className={`sess-pill${editForm.session===s?" sel":""}`} onClick={()=>sf2("session")(s)}>{s}</button>)}
                </div>
              </div>

              {/* Price Details */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                {[["Open Price","openPrice"],["Close Price","closePrice"],["Stop Loss","stopLoss"],["Take Profit","takeProfit"]].map(([l,f])=>(
                  <div key={f} className="f-group"><label className="f-label">{l}</label><input type="number" className="f-input" step="0.01" value={editForm[f]} onChange={sef2(f)}/></div>
                ))}
              </div>

              {/* Timing + Financial */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                {[["Entry Time","entryTime","time"],["Exit Time","exitTime","time"],["Result R","resultR","number"],["Net P&L","netPnL","number"],
                  ["Risk %","riskPct","number"],["RR","rr","number"],["Pips","pips","number"],["Lot Size","lotSize","number"],
                ].map(([l,f,type])=>(
                  <div key={f} className="f-group"><label className="f-label">{l}</label>{type==="number"?<NumInput value={editForm[f]} onChange={v=>setEditForm(p=>({...p,[f]:v}))} placeholder="0" step={0.01}/>:<input type={type} className="f-input" step="0.01" value={editForm[f]} onChange={sef2(f)}/>}</div>
                ))}
              </div>

              {/* Condition + Execution */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div className="f-group">
                  <label className="f-label">Condition</label>
                  <div className="pill-row">
                    {CONDITIONS.map(c=><button key={c} className={`pill${editForm.condition===c?" sel-purple":""}`} onClick={()=>sf2("condition")(editForm.condition===c?"":c)}>{c}</button>)}
                  </div>
                </div>
                <div className="f-group">
                  <label className="f-label">Execution Type</label>
                  <div className="pill-row">
                    {EXECUTION_TYPES.map(e=><button key={e} className={`pill${editForm.executionType===e?" sel-blue":""}`} onClick={()=>sf2("executionType")(editForm.executionType===e?"":e)}>{e}</button>)}
                  </div>
                </div>
              </div>

              {/* Setup + Mistake */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div className="f-group">
                  <label className="f-label">Setup Type</label>
                  <select className="f-select" value={editForm.setupType} onChange={sef2("setupType")}>
                    <option value="">Select…</option>
                    {SETUP_TYPES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="f-group">
                  <label className="f-label">Mistake</label>
                  <select className="f-select" value={editForm.mistakeType} onChange={sef2("mistakeType")}>
                    {MISTAKE_TYPES.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* LTFC */}
              <div className="f-group" style={{marginBottom:14}}>
                <label className="f-label">Lower TF Confirmation</label>
                <div className="pill-row">
                  {LTFC_OPTIONS.map(tag=><button key={tag} className={`chip${editForm.ltfcTags?.includes(tag)?" sel":""}`} onClick={()=>toggleLtfc2(tag)}>{tag}</button>)}
                </div>
              </div>

              {/* Emotions */}
              {[["Emotion Before","emotionBefore"],["Emotion During","emotionDuring"],["Emotion After","emotionAfter"]].map(([l,f])=>(
                <div key={f} className="f-group" style={{marginBottom:12}}>
                  <label className="f-label">{l}</label>
                  <div className="emo-row">
                    {EMOTIONS.map(e=><button key={e} className={`emo-pill${editForm[f]===e?" sel":""}`} onClick={()=>sf2(f)(editForm[f]===e?"":e)}>{e}</button>)}
                  </div>
                </div>
              ))}

              {/* Confidence + Rules */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div className="f-group">
                  <label className="f-label">Confidence: {editForm.confidenceLevel}/10</label>
                  <div className="conf-wrap">
                    <input type="range" className="conf-slider" min="1" max="10" value={editForm.confidenceLevel}
                      style={{"--val":`${(editForm.confidenceLevel-1)/9*100}%`}}
                      onChange={e=>setEditForm(p=>({...p,confidenceLevel:parseInt(e.target.value)}))}/>
                    <span className="conf-num">{editForm.confidenceLevel}</span>
                  </div>
                </div>
                <div className="f-group">
                  <label className="f-label">Followed Rules?</label>
                  <div className="rules-row">
                    {[["Yes","yes"],["Partially","partial"],["No","no"]].map(([l,cls])=>(
                      <button key={l} className={`rules-btn ${cls}${editForm.followedRules===l?" sel":""}`} onClick={()=>sf2("followedRules")(l)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {/* Screenshot in edit mode */}
              <div className="f-group" style={{marginBottom:12}}>
                <label className="f-label">Chart Screenshot</label>
                {editForm.screenshotUrl ? (
                  <div style={{position:"relative",borderRadius:"var(--rad-lg)",overflow:"hidden",border:"1px solid var(--border2)"}}>
                    <img src={editForm.screenshotUrl} alt="Trade chart" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>
                    <button onClick={()=>setEditForm(p=>({...p,screenshotUrl:""}))}
                      style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:14,cursor:"pointer"}}>×</button>
                  </div>
                ) : (
                  <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"1.5px dashed var(--border2)",borderRadius:"var(--rad)",cursor:"pointer",background:"var(--bg3)"}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style={{fontSize:12,color:"var(--text2)"}}>Upload chart screenshot</span>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={async(e)=>{
                      const file = e.target.files[0];
                      if (!file) return;
                      const url = await uploadScreenshot(file);
                      if (url) setEditForm(p=>({...p,screenshotUrl:url}));
                    }}/>
                  </label>
                )}
              </div>

              <div className="f-group" style={{marginBottom:12}}>
                <label className="f-label">Notes</label>
                <textarea className="f-textarea" value={editForm.notes} onChange={sef2("notes")}/>
              </div>
              <div className="f-group" style={{marginBottom:16}}>
                <label className="f-label">Lessons Learned</label>
                <textarea className="f-textarea" style={{minHeight:60}} value={editForm.lessonsLearned} onChange={sef2("lessonsLearned")}/>
              </div>

              <div style={{display:"flex",justifyContent:"flex-end",gap:10,borderTop:"1px solid var(--border)",paddingTop:16}}>
                <button className="btn-ghost btn-danger" onClick={()=>{deleteTrade(detailTrade.id);setDetailTrade(null);setEditMode(false)}}>Delete</button>
                <button className="btn-ghost" onClick={()=>setEditMode(false)}>Cancel</button>
                <button className="btn-teal" onClick={saveEdit}>Save Changes</button>
              </div>
            </>}
          </div>
        </div>
      )}
      {/* ════════════════════════════════
          FTMO IMPORT MODAL
      ════════════════════════════════ */}
      {showImport && (
        <div className="overlay" onClick={()=>{setShowImport(false);setImportResult(null);}}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-hdr">
              <div className="modal-title">Import FTMO Trades</div>
              <button className="modal-close" onClick={()=>{setShowImport(false);setImportResult(null);}}>×</button>
            </div>

            {/* Instructions */}
            <div style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:"var(--rad)",padding:"14px 16px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--teal)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>How to export from FTMO</div>
              {["1. Log into app.ftmo.com","2. Click Accounts Overview → MetriX","3. Scroll down to Trading Journal","4. Click the blue Export button → CSV","5. Upload the file below"].map((s,i)=>(
                <div key={i} style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>{s}</div>
              ))}
            </div>

            {/* Account selector */}
            {accounts.length > 0 && (
              <div style={{marginBottom:16}}>
                <div className="f-label" style={{marginBottom:8}}>Import to Account</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  <button
                    onClick={()=>setActiveAccountId("all")}
                    style={{padding:"6px 14px",borderRadius:"var(--rad)",border:`1px solid ${activeAccountId==="all"?"var(--teal)":"var(--border2)"}`,background:activeAccountId==="all"?"var(--teal-faint)":"transparent",color:activeAccountId==="all"?"var(--teal)":"var(--text2)",fontSize:12,cursor:"pointer"}}>
                    No specific account
                  </button>
                  {accounts.map(acc=>(
                    <button key={acc.id}
                      onClick={()=>setActiveAccountId(String(acc.id))}
                      style={{padding:"6px 14px",borderRadius:"var(--rad)",border:`1px solid ${String(activeAccountId)===String(acc.id)?ACCOUNT_TYPE_COLORS[acc.type]:"var(--border2)"}`,background:String(activeAccountId)===String(acc.id)?`${ACCOUNT_TYPE_COLORS[acc.type]}18`:"transparent",color:String(activeAccountId)===String(acc.id)?ACCOUNT_TYPE_COLORS[acc.type]:"var(--text2)",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[acc.type]}}/>
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: File upload — only show if no trades parsed yet */}
            {!parsedTrades.length && !importResult && (
              <div style={{marginBottom:16}}>
                <div className="f-label" style={{marginBottom:8}}>Upload CSV File</div>
                <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"2rem",border:"1.5px dashed var(--border2)",borderRadius:"var(--rad-lg)",cursor:"pointer",background:"var(--bg3)",transition:"border-color 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--teal)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=""}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <div style={{fontSize:13,color:"var(--text2)"}}>Click to select your FTMO CSV file</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>trading-journal.csv</div>
                  <input type="file" accept=".csv" style={{display:"none"}} onChange={handleImportCSV} disabled={importing}/>
                </label>
              </div>
            )}

            {/* Step 2: Trade selector */}
            {parsedTrades.length > 0 && !importResult && (
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div className="f-label">{parsedTrades.length} trades found — select which to import</div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn-sm" onClick={()=>setSelectedTrades(parsedTrades.map((_,i)=>i))}>All</button>
                    <button className="btn-sm" onClick={()=>setSelectedTrades([])}>None</button>
                  </div>
                </div>
                <div style={{maxHeight:280,overflowY:"auto",border:"1px solid var(--border)",borderRadius:"var(--rad)",background:"var(--bg3)"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid var(--border)",background:"var(--bg2)"}}>
                        <th style={{padding:"8px 10px",textAlign:"left",width:32}}></th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Date</th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Symbol</th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Dir</th>
                        <th style={{padding:"8px 10px",textAlign:"right",color:"var(--text3)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>P&L</th>
                        <th style={{padding:"8px 10px",textAlign:"right",color:"var(--text3)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Pips</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTrades.map((t,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid var(--border)",cursor:"pointer",background:selectedTrades.includes(i)?"rgba(0,212,180,0.04)":"transparent"}}
                          onClick={()=>toggleTradeSelect(i)}>
                          <td style={{padding:"8px 10px"}}>
                            <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${selectedTrades.includes(i)?"var(--teal)":"var(--border2)"}`,background:selectedTrades.includes(i)?"var(--teal)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {selectedTrades.includes(i)&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          </td>
                          <td style={{padding:"8px 10px",color:"var(--text2)",fontFamily:"var(--mono)",fontSize:11}}>{t.date}</td>
                          <td style={{padding:"8px 10px",fontWeight:600,color:"var(--text)"}}>{t.symbol}</td>
                          <td style={{padding:"8px 10px"}}>
                            <span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600,background:t.tradeType==="Long"?"var(--green-faint)":"var(--red-faint)",color:t.tradeType==="Long"?"var(--green)":"var(--red)"}}>
                              {t.tradeType}
                            </span>
                          </td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--mono)",fontWeight:600,color:t.netPnL>=0?"var(--green)":"var(--red)"}}>
                            {t.netPnL>=0?"+":""}{t.netPnL?.toFixed(2)}
                          </td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--text2)"}}>
                            {t.pips>=0?"+":""}{t.pips?.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{marginTop:8,fontSize:11,color:"var(--text3)"}}>{selectedTrades.length} of {parsedTrades.length} selected</div>
              </div>
            )}

            {/* Importing spinner */}
            {importing && (
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--teal-faint)",borderRadius:"var(--rad)",border:"1px solid rgba(0,212,180,0.2)"}}>
                <div style={{width:16,height:16,border:"2px solid var(--teal-faint)",borderTop:"2px solid var(--teal)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <span style={{fontSize:13,color:"var(--teal)"}}>Importing {selectedTrades.length} trades…</span>
              </div>
            )}

            {/* Result */}
            {importResult && !importing && (
              <div style={{padding:"12px 16px",borderRadius:"var(--rad)",background:importResult.error?"var(--red-faint)":"var(--green-faint)",border:`1px solid ${importResult.error?"rgba(232,81,74,0.25)":"rgba(15,190,136,0.25)"}`}}>
                {importResult.error
                  ? <div style={{fontSize:13,color:"var(--red)"}}>{importResult.error}</div>
                  : <div style={{fontSize:13,color:"var(--green)"}}>
                      ✓ Imported {importResult.success} of {importResult.total} trades successfully!
                      {importResult.failed > 0 && <span style={{color:"var(--amber)"}}> ({importResult.failed} failed)</span>}
                    </div>
                }
              </div>
            )}

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20}}>
              <button className="btn-ghost" onClick={()=>{setShowImport(false);setImportResult(null);setParsedTrades([]);setSelectedTrades([]);}}>
                {importResult?.success ? "Done" : "Cancel"}
              </button>
              {parsedTrades.length > 0 && !importResult && !importing && (
                <button className="btn-teal" onClick={confirmImport} disabled={!selectedTrades.length}>
                  Import {selectedTrades.length} Trade{selectedTrades.length!==1?"s":""}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TRADOVATE SYNC MODAL
      ════════════════════════════════ */}
      {showTradovate && (
        <div className="overlay" onClick={resetTradovate}>
          <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-hdr">
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div className="modal-title">Sync Tradovate</div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"rgba(99,102,241,0.15)",color:"#818cf8",fontWeight:600}}>LIVE</span>
              </div>
              <button className="modal-close" onClick={resetTradovate}>×</button>
            </div>

            {/* STEP 1: Login */}
            {tvStep === "login" && (
              <>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:"var(--rad)",padding:"12px 16px",marginBottom:16,fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
                  Enter your <strong style={{color:"var(--text)"}}>Tradovate</strong> login credentials. Your password is sent securely to our server, exchanged for an access token, and never stored.
                </div>
                <div className="f-group" style={{marginBottom:12}}>
                  <label className="f-label">Tradovate Username</label>
                  <input className="f-input" placeholder="your@email.com or username" value={tvCreds.username}
                    onChange={e=>setTvCreds(p=>({...p,username:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&tradovateLogin()}/>
                </div>
                <div className="f-group" style={{marginBottom:16}}>
                  <label className="f-label">Tradovate Password</label>
                  <input className="f-input" type="password" placeholder="••••••••" value={tvCreds.password}
                    onChange={e=>setTvCreds(p=>({...p,password:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&tradovateLogin()}/>
                </div>
                {tvError && <div style={{padding:"10px 14px",borderRadius:"var(--rad)",background:"var(--red-faint)",border:"1px solid rgba(232,81,74,0.25)",color:"var(--red)",fontSize:12,marginBottom:14}}>{tvError}</div>}
                <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
                  <button className="btn-ghost" onClick={resetTradovate}>Cancel</button>
                  <button className="btn-teal" onClick={tradovateLogin} disabled={tvLoading||!tvCreds.username||!tvCreds.password}>
                    {tvLoading ? "Connecting…" : "Connect →"}
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Select account + fetch */}
            {tvStep === "select" && (
              <>
                <div style={{padding:"10px 14px",borderRadius:"var(--rad)",background:"var(--green-faint)",border:"1px solid rgba(15,190,136,0.25)",color:"var(--green)",fontSize:12,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                  ✓ Connected to Tradovate {tvEnv === "live" ? "Live" : "Demo"}
                </div>
                {tvAccounts.length > 1 && (
                  <div className="f-group" style={{marginBottom:16}}>
                    <label className="f-label">Select Account</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {tvAccounts.map(acc=>(
                        <button key={acc.id}
                          onClick={()=>setTvSelAccount(String(acc.id))}
                          style={{padding:"7px 16px",borderRadius:"var(--rad)",border:`1px solid ${tvSelAccount===String(acc.id)?"var(--teal)":"var(--border2)"}`,background:tvSelAccount===String(acc.id)?"var(--teal-faint)":"transparent",color:tvSelAccount===String(acc.id)?"var(--teal)":"var(--text2)",fontSize:12,cursor:"pointer"}}>
                          {acc.nickname || acc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tvError && <div style={{padding:"10px 14px",borderRadius:"var(--rad)",background:"var(--red-faint)",border:"1px solid rgba(232,81,74,0.25)",color:"var(--red)",fontSize:12,marginBottom:14}}>{tvError}</div>}
                <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
                  <button className="btn-ghost" onClick={resetTradovate}>Cancel</button>
                  <button className="btn-teal" onClick={tradovateFetchTrades} disabled={tvLoading}>
                    {tvLoading ? "Fetching trades…" : "Fetch Trades →"}
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: Select trades to import */}
            {tvStep === "confirm" && (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div className="f-label">{tvTrades.length} trades found — select which to import</div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn-sm" onClick={()=>setTvSelected(tvTrades.map((_,i)=>i))}>All</button>
                    <button className="btn-sm" onClick={()=>setTvSelected([])}>None</button>
                  </div>
                </div>
                <div style={{maxHeight:280,overflowY:"auto",border:"1px solid var(--border)",borderRadius:"var(--rad)",background:"var(--bg3)",marginBottom:14}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid var(--border)",background:"var(--bg2)"}}>
                        <th style={{padding:"8px 10px",width:32}}></th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,textTransform:"uppercase"}}>Date</th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,textTransform:"uppercase"}}>Symbol</th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,textTransform:"uppercase"}}>Dir</th>
                        <th style={{padding:"8px 10px",textAlign:"left",color:"var(--text3)",fontSize:10,textTransform:"uppercase"}}>Time</th>
                        <th style={{padding:"8px 10px",textAlign:"right",color:"var(--text3)",fontSize:10,textTransform:"uppercase"}}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tvTrades.map((t,i)=>(
                        <tr key={i} style={{borderBottom:"1px solid var(--border)",cursor:"pointer",background:tvSelected.includes(i)?"rgba(0,212,180,0.04)":"transparent"}}
                          onClick={()=>setTvSelected(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])}>
                          <td style={{padding:"8px 10px"}}>
                            <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${tvSelected.includes(i)?"var(--teal)":"var(--border2)"}`,background:tvSelected.includes(i)?"var(--teal)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {tvSelected.includes(i)&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          </td>
                          <td style={{padding:"8px 10px",color:"var(--text2)",fontFamily:"var(--mono)",fontSize:11}}>{t.date}</td>
                          <td style={{padding:"8px 10px",fontWeight:600,color:"var(--text)"}}>{t.symbol}</td>
                          <td style={{padding:"8px 10px"}}>
                            <span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600,background:t.tradeType==="Long"?"var(--green-faint)":"var(--red-faint)",color:t.tradeType==="Long"?"var(--green)":"var(--red)"}}>
                              {t.tradeType}
                            </span>
                          </td>
                          <td style={{padding:"8px 10px",color:"var(--text3)",fontFamily:"var(--mono)",fontSize:11}}>{t.entryTime}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"var(--text2)",fontFamily:"var(--mono)"}}>{t.lotSize}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{fontSize:11,color:"var(--text3)",marginBottom:14}}>{tvSelected.length} of {tvTrades.length} selected</div>
                {tvError && <div style={{padding:"10px 14px",borderRadius:"var(--rad)",background:"var(--red-faint)",border:"1px solid rgba(232,81,74,0.25)",color:"var(--red)",fontSize:12,marginBottom:14}}>{tvError}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <button className="btn-ghost" onClick={resetTradovate}>Cancel</button>
                  <button className="btn-teal" onClick={tradovateImport} disabled={tvLoading||!tvSelected.length}>
                    {tvLoading ? "Importing…" : `Import ${tvSelected.length} Trade${tvSelected.length!==1?"s":""}`}
                  </button>
                </div>
              </>
            )}

            {/* STEP 4: Done */}
            {tvStep === "done" && tvResult && (
              <>
                <div style={{padding:"16px",borderRadius:"var(--rad)",background:"var(--green-faint)",border:"1px solid rgba(15,190,136,0.25)",textAlign:"center",marginBottom:16}}>
                  <div style={{fontSize:24,marginBottom:8}}>✓</div>
                  <div style={{fontSize:14,color:"var(--green)",fontWeight:600}}>Imported {tvResult.success} trades successfully!</div>
                  {tvResult.failed > 0 && <div style={{fontSize:12,color:"var(--amber)",marginTop:4}}>{tvResult.failed} failed</div>}
                </div>
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button className="btn-teal" onClick={resetTradovate}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          ADD ACCOUNT MODAL
      ════════════════════════════════ */}
      {showAddAcc && (
        <div className="overlay" onClick={()=>setShowAddAcc(false)}>
          <div className="modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
            <div className="modal-hdr">
              <div className="modal-title">Add Account</div>
              <button className="modal-close" onClick={()=>setShowAddAcc(false)}>×</button>
            </div>
            <div className="add-acc-form">
              <div className="f-group">
                <label className="f-label">Account Name</label>
                <input className="f-input" placeholder="e.g. FTMO 100K, Personal Deriv" value={accForm.name} onChange={e=>setAccForm(p=>({...p,name:e.target.value}))}/>
              </div>
              <div className="g2">
                <div className="f-group">
                  <label className="f-label">Firm / Broker</label>
                  <input className="f-input" placeholder="e.g. FTMO, Topstep" value={accForm.firm} onChange={e=>setAccForm(p=>({...p,firm:e.target.value}))}/>
                </div>
                <div className="f-group">
                  <label className="f-label">Account Type</label>
                  <select className="f-select" value={accForm.type} onChange={e=>setAccForm(p=>({...p,type:e.target.value}))}>
                    {ACCOUNT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="g2">
                <div className="f-group">
                  <label className="f-label">Starting Balance</label>
                  <NumInput value={accForm.balance} onChange={v=>setAccForm(p=>({...p,balance:v}))} placeholder="100000" step={1000}/>
                </div>
                <div className="f-group">
                  <label className="f-label">Currency</label>
                  <select className="f-select" value={accForm.currency} onChange={e=>setAccForm(p=>({...p,currency:e.target.value}))}>
                    {["USD","EUR","GBP","CAD","AUD"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {/* Color preview */}
              <div style={{padding:"10px 14px",borderRadius:"var(--rad)",background:`${ACCOUNT_TYPE_COLORS[accForm.type]}10`,border:`1px solid ${ACCOUNT_TYPE_COLORS[accForm.type]}30`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[accForm.type]}}/>
                <span style={{fontSize:12,color:ACCOUNT_TYPE_COLORS[accForm.type],fontWeight:500}}>{accForm.type}</span>
                {accForm.name&&<span style={{fontSize:12,color:"var(--text2)",marginLeft:4}}>· {accForm.name}</span>}
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
              <button className="btn-ghost" onClick={()=>setShowAddAcc(false)}>Cancel</button>
              <button className="btn-teal" onClick={addAccount}>Add Account</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
