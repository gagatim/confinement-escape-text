"use strict";
/* ===================== 新版本偵測 ===================== */
// 比較「目前載入的頁面」和伺服器上 index.html 的最後修改時間；伺服器比較新就在畫面下方提醒玩家重新整理（不會自動重新整理，避免打斷戰鬥）
let UPD_SHOWN=false;
async function checkUpdate(){
  if(UPD_SHOWN||!/^https?:$/.test(location.protocol)||typeof fetch!=="function")return;
  try{
    const r=await fetch(location.pathname,{method:"HEAD",cache:"no-store"}),lm=Date.parse(r.headers.get("last-modified")||""),mine=Date.parse(document.lastModified);
    if(!lm||!mine||lm<=mine+2000)return;
    UPD_SHOWN=true;
    const b=document.createElement("div");
    b.style.cssText="position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:60;background:#1b2330;border:1px solid var(--gold);border-radius:10px;padding:10px 14px;box-shadow:0 4px 18px rgba(0,0,0,.6);display:flex;gap:10px;align-items:center;max-width:92vw";
    b.innerHTML='<span class="small">🔄 遊戲有新版本</span><button class="mini pri" onclick="location.reload()">重新整理</button><button class="mini" onclick="this.parentNode.remove()">稍後</button>';
    document.body.appendChild(b);
  }catch(e){}
}
setTimeout(checkUpdate,15000);
setInterval(checkUpdate,300000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkUpdate();});

/* ===================== BOOT ===================== */
// 邀請連結 ?room=XXXXX：直接進網路對戰並加入房間
(()=>{const q=new URLSearchParams(location.search).get("room");
  if(q&&/^[A-Za-z0-9]{5}$/.test(q)){JOIN_CODE=q.toUpperCase();DUEL_MODE="online";VIEW="duel";history.replaceState(null,"",location.pathname);}})();
// 開機時檢查存檔：簽章不符或數值異常就清空；之後每 5 秒檢查一次記憶體裡的數值
const BOOT_BAD=STALE?"":TAMPER||validSave(SAVE);
if(BOOT_BAD){try{backupSave(JSON.parse(localStorage.getItem(SAVE_KEY)),BOOT_BAD);}catch(e){}SAVE=newSave();RUN=null;}
SAVE_READY=true;save(!BOOT_BAD);
if(STALE)setTimeout(staleNotice,0);
if(BOOT_BAD)setTimeout(()=>tamperNotice(BOOT_BAD),0);
setInterval(checkIntegrity,5000);
// 遊戲總時間：頁面在前景時每秒累計（舊存檔沒有這個欄位，從更新後第一次開啟才開始記錄）
let PLAY_T=Date.now();
setInterval(()=>{
  const n=Date.now(),d=n-PLAY_T;PLAY_T=n;
  if(document.hidden||!SAVE||STALE||!SAVE_READY)return;
  if(typeof SAVE.playSec!=="number")SAVE.playSec=0;
  SAVE.playSec+=Math.min(d,3000)/1000;
},1000);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&SAVE_READY&&!STALE&&typeof SAVE.playSec==="number")save();});
// 戰鬥看門狗：電腦方行動超過 20 秒沒有進展（不是在等玩家操作），提醒玩家用「🐞 卡住了」
setInterval(()=>{
  const B=CUR_B;if(!B||B.done||B.over||B.wait||B.guest||B.rwait)return;
  const sig=B.round+"|"+B.log.length;
  if(B.wd!==sig){B.wd=sig;B.wdT=Date.now();return;}
  if(Date.now()-B.wdT>20000&&!B.wdWarned){B.wdWarned=true;glog("⏰STUCK",`戰鬥 20 秒沒有進展：${B.title} 第${B.round}回合`);toast("戰鬥好像卡住了，可以按右上角的「🐞」自救");}
},5000);
render();
bootAcct();
loadBgm();
document.addEventListener("pointerdown",startBgm,{once:true});
document.addEventListener("keydown",kbKeydown);
if(JOIN_CODE)joinRoom(JOIN_CODE);
else if(SAVE.run){try{resumeRun();}catch(e){glog("❌RESUME",e&&e.stack||e);RUN=null;VIEW="run";render();toast("接續遠征時發生錯誤，已記錄。可以在遠征頁重新繼續或放棄");}}
else if(!SAVE.guided)openGuide(0);
if(IS_TEST){document.title="【測試版】"+document.title;const d=document.createElement("div");d.textContent="🧪 測試版：存檔只在這個網址有效，不連雲端；數值確認後才會更新正式版";d.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#a33;color:#fff;font-size:12px;text-align:center;padding:2px;pointer-events:none";document.body.appendChild(d);}
