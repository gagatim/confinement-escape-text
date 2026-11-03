"use strict";
/* ===================== UTIL ===================== */
const $=s=>document.querySelector(s);
/* ---- 除錯紀錄：自動記下錯誤與重要事件（最近 300 筆），玩家可以從 🐞 回報問題 複製給開發者 ---- */
const LOG_KEY="jbts_log";
let LOGS=[];try{LOGS=JSON.parse(localStorage.getItem(LOG_KEY))||[];}catch(e){}
function glog(type,msg){
  const t=new Date(),ts=`${t.getMonth()+1}/${t.getDate()} ${t.toTimeString().slice(0,8)}`;
  LOGS.push(`[${ts}] ${type} ${msg}`);if(LOGS.length>300)LOGS.splice(0,LOGS.length-300);
  try{localStorage.setItem(LOG_KEY,JSON.stringify(LOGS));}catch(e){}
}
window.addEventListener("error",e=>glog("❌ERROR",`${e.message} (第 ${e.lineno} 行:${e.colno})`));
window.addEventListener("unhandledrejection",e=>glog("❌ERROR",String(e.reason&&e.reason.stack||e.reason)));
const rnd=Math.random;
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

