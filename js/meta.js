"use strict";
/* ===================== 卡住了／回報問題 ===================== */
function stateDump(){
  const L=[`遊戲：禁閉逃殺 文字獄`,`時間：${new Date().toLocaleString()}`,`裝置：${navigator.userAgent}`,`畫面：${VIEW}`];
  if(RUN)L.push(`遠征：${CHAPTERS[RUN.ch].name}（${diffName(RUN.diff)}） 樓層 ${RUN.fi} 進行中=${RUN.active} 場景=${RUN.scene?RUN.scene.title:"選房間"} 選項數=${RUN.scene?RUN.scene.opts.length:(RUN.choices||[]).length}`);
  else if(SAVE.run)L.push(`有未繼續的遠征：${CHAPTERS[SAVE.run.ch].name} 樓層 ${SAVE.run.fi} 階段=${SAVE.run.stage}`);
  if(CUR_B)L.push(`戰鬥：${CUR_B.title} 第${CUR_B.round}回合 結束=${CUR_B.over||"否"} 等待輸入=${CUR_B.wait?CUR_B.wait.mode:"否"} 行動中=${CUR_B.active?CUR_B.active.name:"無"}`);
  return L.join("\n");
}
function reportText(){return stateDump()+"\n\n--- 最近紀錄 ---\n"+LOGS.slice(-150).join("\n");}
function openStuck(){
  try{$("#gacha").classList.remove("show");}catch(e){}
  const inRun=!!(RUN&&RUN.active&&SAVE.runCk),inBattle=!!(CUR_B&&!CUR_B.done&&!CUR_B.online);
  openModal(`<h3>🐞 卡住了／回報問題</h3>
    <p class="small dim">遇到畫面卡住、按鈕沒反應時，可以先用下面的按鈕自救；也可以把「錯誤紀錄」複製下來傳給開發者。</p>
    <div class="opts">
      ${inRun?`<button class="pri" onclick="resetFloor()">🔄 重置這一層（回到選房間前，這一層重新打）</button>`:""}
      ${inBattle&&!inRun?`<button class="pri" onclick="abortBattle()">⏹ 強制結束這場戰鬥（不會得到獎勵）</button>`:""}
      ${NET?`<button onclick="closeModal();leaveOnline()">📴 離開網路對戰房間</button>`:""}
      <button onclick="forceHome()">🏠 強制回到主頁（遠征進度會保留，可以之後繼續）</button>
      <button onclick="location.reload()">↻ 重新整理網頁（存檔會保留）</button>
    </div>
    <h3>錯誤紀錄</h3>
    <textarea id="logText" readonly style="width:100%;height:160px;font-size:11px">${reportText().replace(/</g,"&lt;")}</textarea>
    <div class="row"><button class="gold" onclick="copyLog()">📋 複製紀錄</button><button onclick="LOGS=[];glog('🧹LOG','紀錄已清除');openStuck()">清除紀錄</button><button style="margin-left:auto" onclick="closeModal()">關閉</button></div>`);
}
function copyLog(){
  const t=$("#logText");t.select();
  const ok=()=>toast("已複製，貼給開發者就可以了");
  try{navigator.clipboard.writeText(t.value).then(ok,()=>{document.execCommand("copy");ok();});}catch(e){document.execCommand("copy");ok();}
}
// 重置這一層：回到這一層「選房間」的畫面，這層發生的事全部取消
function resetFloor(){
  if(!SAVE.runCk){toast("沒有可以重置的樓層");return;}
  if(CUR_B){CUR_B.aborted=true;CUR_B.done=true;}
  CUR_B=null;
  const ck=JSON.parse(JSON.stringify(SAVE.runCk));delete ck.stage;
  RUN={...ck,scene:null,sel:null};VIEW="run";
  glog("🔄RESET",`重置樓層：${CHAPTERS[RUN.ch].name} 樓層 ${RUN.fi}`);
  persistRun("choose");closeModal();render();toast("已重置這一層，請重新選擇房間");
}
// 最後手段：結束戰鬥、關掉所有視窗、離開遠征畫面回主頁（遠征存檔保留，之後可以按「繼續遠征」）
function forceHome(){
  glog("🏠FORCE","強制回到主頁："+VIEW);
  stopEndVoice();stopNpcVoice();
  if(CUR_B){CUR_B.aborted=true;CUR_B.done=true;}
  CUR_B=null;
  if(NET){try{leaveOnline();}catch(e){NET=null;}}
  if(DUEL&&DUEL.phase==="battle")DUEL=null;
  if(RUN&&RUN.active&&!SAVE.run&&SAVE.runCk)SAVE.run=JSON.parse(JSON.stringify(SAVE.runCk));
  RUN=null;
  try{$("#gacha").classList.remove("show");}catch(e){}
  closeModal();VIEW="home";save();render();toast("已回到主頁。遠征可以到「遠征」頁按「繼續遠征」");
}
function abortBattle(){
  const B=CUR_B;if(!B)return closeModal();
  B.aborted=true;B.done=true;glog("⏹ABORT",`強制結束戰鬥：${B.title}`);
  const home=BATTLE_HOME;CUR_B=null;VIEW=home;closeModal();render();
}


/* ===================== 成就 ===================== */
// 每次存檔時檢查；達成就自動發獎（金條／突破石）。舊存檔第一次載入會一次補發已達成的成就
const maxOf=a=>a.length?Math.max(...a):0;
const ownedVals=(s,f)=>Object.keys(s.owned).map(id=>f(s.owned[id],id));
const ACH=[
  {g:"招募",id:"pull1",n:"第一次招募",d:"抽卡 1 次",v:s=>s.pulls,t:1,r:{gold:20}},
  {g:"招募",id:"pull100",n:"百抽",d:"累計抽卡 100 次",v:s=>s.pulls,t:100,r:{stone:3}},
  {g:"招募",id:"pull500",n:"抽卡狂人",d:"累計抽卡 500 次",v:s=>s.pulls,t:500,r:{stone:10}},
  {g:"招募",id:"ssr1",n:"金光閃閃",d:"擁有 1 名 SSR 角色",v:s=>Object.keys(s.owned).filter(id=>CARDS[id].r==="SSR").length,t:1,r:{gold:30}},
  {g:"招募",id:"col20",n:"收藏家",d:"收集 20 名角色",v:s=>Object.keys(s.owned).length,t:20,r:{gold:50}},
  {g:"招募",id:"colall",n:"全員到齊",d:"收集全部角色",v:s=>CARD_IDS.filter(id=>hasCardOrEvo(s.owned,id)).length,t:CARD_IDS.length,r:{stone:15}},
  {g:"養成",id:"star5",n:"滿星",d:"任一角色升到 5★",v:s=>maxOf(ownedVals(s,o=>o.stars)),t:5,r:{stone:2}},
  {g:"養成",id:"br1",n:"突破極限",d:"任一角色突破 1 次",v:s=>maxOf(ownedVals(s,o=>o.br||0)),t:1,r:{stone:3}},
  {g:"養成",id:"br5",n:"超越自我",d:"任一角色突破 5 次",v:s=>maxOf(ownedVals(s,o=>o.br||0)),t:5,r:{stone:10}},
  {g:"養成",id:"lv20",n:"老手",d:"任一角色升到 Lv.20",v:s=>maxOf(ownedVals(s,o=>o.lv||1)),t:20,r:{gold:60}},
  {g:"養成",id:"lv50",n:"巔峰",d:"任一角色升到 Lv.50",v:s=>maxOf(ownedVals(s,o=>o.lv||1)),t:50,r:{stone:10}},
  {g:"遠征",id:"run1",n:"踏出第一步",d:"出發遠征 1 次",v:s=>s.stats.runs,t:1,r:{gold:10}},
  {g:"遠征",id:"esc1",n:"逃出生天",d:"第一次成功逃出",v:s=>s.stats.escapes,t:1,r:{gold:30}},
  {g:"遠征",id:"ch4",n:"黑塔崩塌",d:"通關第 4 章",v:s=>s.prog.cleared,t:4,r:{stone:3}},
  {g:"遠征",id:"ch8",n:"回到原點",d:"通關第 8 章",v:s=>s.prog.cleared,t:8,r:{stone:6}},
  {g:"遠征",id:"ch12",n:"衛冕冠軍",d:"通關第 12 章",v:s=>s.prog.cleared,t:12,r:{stone:15}},
  {g:"遠征",id:"ch13",n:"守夜人",d:"通關第 13 章（遇見阿燼）",v:s=>s.prog.cleared,t:13,r:{stone:8}},
  {g:"遠征",id:"ch14",n:"我記得你",d:"通關第 14 章（遇見晴）",v:s=>s.prog.cleared,t:14,r:{stone:9}},
  {g:"遠征",id:"ch15",n:"第三十七個座位",d:"通關第 15 章（阿燼、晴進入招募池）",v:s=>s.prog.cleared,t:15,r:{stone:12}},
  {g:"遠征",id:"hard1",n:"自找麻煩",d:"以困難難度逃出任一章",v:s=>Object.values(s.prog.dclears||{}).some(d=>d[3])?1:0,t:1,r:{stone:5}},
  {g:"遠征",id:"abyss10",n:"深淵行者",d:"無盡深淵到達 D10",v:s=>s.prog.abyssBest||0,t:10,r:{gold:80}},
  {g:"遠征",id:"lore",n:"傾聽者",d:"聽完老國王在 12 章說的全部 36 段話",v:s=>Object.keys(s.lore||{}).filter(k=>/^[ibe]\d+$/.test(k)).length,t:36,r:{stone:10}},
  {g:"遠征",id:"abyss30",n:"深淵之底",d:"無盡深淵到達 D30",v:s=>s.prog.abyssBest||0,t:30,r:{stone:10}},
  {g:"戰鬥",id:"arena10",n:"競技場常客",d:"競技場到達第 10 層",v:s=>s.arenaTier,t:10,r:{gold:50}},
  {g:"戰鬥",id:"train30",n:"苦練成材",d:"練功房通過第 30 關",v:s=>(s.train&&s.train.best)||0,t:30,r:{stone:5}},
  {g:"戰鬥",id:"boss1",n:"魔王討伐",d:"打倒 1 位支線魔王",v:s=>Object.keys(s.bosses||{}).length,t:1,r:{stone:5}},
  {g:"戰鬥",id:"boss3",n:"不可能的任務",d:"打倒第 3 位支線魔王「命運裁決者」",v:s=>(s.bosses||{}).fatejudge?1:0,t:1,r:{stone:30}},
  {g:"戰鬥",id:"fk5",n:"深淵君王首殺",d:"成為前 3 名擊敗第 5 位支線魔王「深淵君王」的玩家（需登入帳號）",v:s=>(s.fk&&s.fk.rank)?1:0,t:1,r:{note:"🏅首殺稱號＋🌟金色攻擊果實"}},
  {g:"戰鬥",id:"fk6",n:"永夜帝王首殺",d:"成為前 3 名擊敗第 6 位支線魔王「永夜帝王」的玩家（需登入帳號）",v:s=>(s.fkr&&s.fkr.nightemperor)?1:0,t:1,r:{note:"🏅首殺稱號＋🌟金色防禦果實"}},
  {g:"裝備",id:"gear10",n:"強化大師",d:"任一裝備強化到 +10",v:s=>maxOf((s.gear||[]).map(g=>g.lv)),t:10,r:{stone:5}},
  {g:"裝備",id:"gearUR",n:"傳說入手",d:"獲得 1 件 UR 傳說裝備",v:s=>(s.gear||[]).some(g=>GEAR[g.base].q==="UR")?1:0,t:1,r:{gold:50}},
  {g:"裝備",id:"gearEX",n:"魔王的遺物",d:"獲得 1 件 EX 魔王專屬裝備",v:s=>(s.gear||[]).some(g=>GEAR[g.base].q==="EX")?1:0,t:1,r:{stone:5}},
  {g:"裝備",id:"set3",n:"全套",d:"任一角色穿滿 3 件同稀有度裝備（套裝）",v:s=>maxOf(Object.keys(s.owned).map(id=>maxOf(Object.values(setCounts(id))))),t:3,r:{gold:40}}
];
function rewardStr(r){return [r.gold?`🪙${r.gold}`:"",r.stone?`💎×${r.stone}`:"",r.note||""].filter(Boolean).join(" ");}
// 檢查並發獎；回傳這次新達成的成就
function checkAch(){
  SAVE.ach=SAVE.ach||{};const got=[];
  for(const a of ACH){
    if(SAVE.ach[a.id])continue;
    let v=0;try{v=a.v(SAVE);}catch(e){continue;}
    if(v>=a.t){SAVE.ach[a.id]=1;if(a.r.gold)SAVE.gold+=a.r.gold;if(a.r.stone)SAVE.charms.stone+=a.r.stone;got.push(a);}
  }
  if(got.length){
    glog("🏆ACH",got.map(a=>a.n).join("、"));
    setTimeout(()=>{toast(got.length===1?`🏆 成就達成：${got[0].n}（${rewardStr(got[0].r)}）`:`🏆 一次達成 ${got.length} 個成就！到「檔案室」的成就頁看看`);SFX.sr();renderHeader();},0);
  }
  return got;
}
/* ===== 首殺榜：第 5、6 位魔王（深淵君王、永夜帝王）各取前 3 名擊敗的帳號，拿稱號和金色果實 =====
   名額放在 Firebase 的 firstKill/{魔王代號}/{1,2,3}，用 transaction 搶，每格只能寫一次（規則見 database.rules.json）。
   果實發進存檔（SAVE.gfruits）；稱號以資料庫的名單為準，連不上時才看存檔裡的 SAVE.fkr[魔王]（深淵君王舊存檔是 SAVE.fk）。 */
const FK_SLOTS=3,FK_REWARD={1:2,2:1,3:1};
const FK_CFG={
  abyssking:{title:"深淵君王首殺者",stat:"atk",statName:"攻擊"},
  nightemperor:{title:"永夜帝王首殺者",stat:"def",statName:"防禦"}
};
const FK_BOSSES=Object.keys(FK_CFG),FK_BOSS="abyssking";
const FK={slots:{},tried:false,ok:false,err:false}; // slots[魔王代號]＝{1:{uid,name,t},…}；ok：榜單讀到過；err：最近一次讀取失敗（沒網路、測試版等），這時不能顯示成「虛位以待」
const fkEsc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function fkLoad(){
  try{
    const db=await fbDb(),res=await Promise.all(FK_BOSSES.map(b=>db.ref("firstKill/"+b).get()));
    FK.slots={};FK_BOSSES.forEach((b,i)=>{FK.slots[b]=res[i].val()||{};});FK.ok=true;FK.err=false;
  }catch(e){FK.err=true;glog("❌FK","讀取首殺榜失敗 "+(e&&e.code||e&&e.message||e));}
  if(VIEW==="boss"||VIEW==="ach")render();
}
// 自己在某隻魔王榜上的名次（0＝不在榜上）
function fkRankOf(boss){
  if(ACCT){const sl=FK.slots[boss]||{};for(let n=1;n<=FK_SLOTS;n++){const s=sl[n];if(s&&s.uid===ACCT.uid)return n;}}
  return (SAVE.fkr&&SAVE.fkr[boss])||(boss===FK_BOSS&&SAVE.fk&&SAVE.fk.rank)||0;
}
const fkRank=()=>fkRankOf(FK_BOSS);
const fkTitle=()=>FK_BOSSES.filter(b=>fkRankOf(b)).map(b=>`🏅${FK_CFG[b].title}`).join(" ");
// 打贏第 5、6 位魔王後呼叫：回傳要顯示的訊息（空字串＝不用顯示）
async function fkClaim(boss){
  const C=FK_CFG[boss],nm=MONSTERS[boss].name;
  SAVE.fkr=SAVE.fkr||{};
  if(SAVE.fkr[boss]||(boss===FK_BOSS&&SAVE.fk&&SAVE.fk.rank))return "";
  if(!ACCT)return `🏅 ${nm}首殺榜：登入帳號後打贏，才能搶前 3 名的名額。`;
  try{
    const ref=(await fbDb()).ref("firstKill/"+boss),cur=(await ref.get()).val()||{};
    let rank=0,fresh=false;
    for(let n=1;n<=FK_SLOTS;n++)if(cur[n]&&cur[n].uid===ACCT.uid){rank=n;break;} // 已經在榜上（例如存檔重來過）：只補稱號，不重發果實
    for(let n=1;n<=FK_SLOTS&&!rank;n++){
      if(cur[n])continue;
      const r=await ref.child(n).transaction(v=>v===null?{uid:ACCT.uid,name:ACCT.name,t:firebase.database.ServerValue.TIMESTAMP}:undefined);
      if(r.committed){rank=n;fresh=true;}
    }
    FK.slots[boss]=(await ref.get()).val()||{};FK.ok=true;FK.err=false;
    if(!rank)return `🏅 ${nm}首殺榜的 3 個名額已經被搶走了。`;
    SAVE.fkr[boss]=rank;
    if(boss===FK_BOSS)SAVE.fk={rank,at:Date.now()};
    if(fresh)SAVE.gfruits[C.stat]=(SAVE.gfruits[C.stat]||0)+FK_REWARD[rank];
    save();checkAch();SFX.ssr();
    return `🏅 <b class="rEX">你是第 ${rank} 位擊敗${nm}的玩家！</b>獲得稱號「${C.title}」${fresh?`與 🌟金色${C.statName}果實 ×${FK_REWARD[rank]}（到角色卡使用）`:""}`;
  }catch(e){glog("❌FK","搶首殺名額失敗 "+(e&&e.code||e&&e.message||e));return `🏅 首殺榜連線失敗，下次打贏${nm}再試。`;}
}
function fkBoardHtml(){
  const medal=["🥇","🥈","🥉"];
  return FK_BOSSES.map(boss=>{
    const C=FK_CFG[boss],me=fkRankOf(boss),name=MONSTERS[boss].name,i=BOSS_LIST.indexOf(boss);
    const rows=!FK.ok?`<div class="small dim" style="margin:6px 0">${FK.err?"⚠ 榜單讀取失敗（可能沒有網路，或是測試版不開放），請稍後按「重新整理榜單」再試。":"榜單載入中……"}</div>`
    :[1,2,3].map(n=>{const s=(FK.slots[boss]||{})[n];
      return `<div class="small" style="margin:3px 0">${medal[n-1]} 第 ${n} 名・${s?`<b>${fkEsc(s.name)}</b> <span class="dim">${new Date(s.t).toLocaleDateString()}</span>`:`<span class="dim">虛位以待</span>`}　<span class="dim">🌟金色${C.statName}果實 ×${FK_REWARD[n]}</span></div>`;}).join("");
    return `<div class="panel" style="margin-top:12px"><b>🏅 全服首殺榜・第 ${i+1} 位 ${name}</b>
    <p class="dim small" style="margin:4px 0">全服前 3 位擊敗${name}的玩家，可以得到稱號「${C.title}」、成就和金色${C.statName}果實。要<b>登入帳號</b>才能搶名額，以名額被搶走的先後排名。</p>
    ${rows}${me?`<div class="small" style="color:var(--green);margin-top:4px">✓ 你是第 ${me} 名</div>`:!ACCT?`<div class="small" style="color:var(--gold);margin-top:4px">登入帳號後打贏才能搶名額</div>`:""}</div>`;
  }).join("");
}

let ACH_TAB="";
function viewAch(){
  const done=ACH.filter(a=>SAVE.ach&&SAVE.ach[a.id]).length,groups=[...new Set(ACH.map(a=>a.g))];
  SAVE.ach=SAVE.ach||{};
  const list=ACH.filter(a=>!ACH_TAB||a.g===ACH_TAB).sort((a,b)=>(SAVE.ach[a.id]?1:0)-(SAVE.ach[b.id]?1:0)); // 未達成的排前面
  const tabs=`<div class="filters"><button class="${ACH_TAB?"":"on"}" onclick="ACH_TAB='';render()">全部</button>${groups.map(g=>`<button class="${ACH_TAB===g?"on":""}" onclick="ACH_TAB='${g}';render()">${g}</button>`).join("")}<button class="${ACH_TAB==="global"?"on":""}" onclick="ACH_TAB='global';render()">🌐 全服成就</button></div>`;
  if(ACH_TAB==="global"){
    if(!FK.tried){FK.tried=true;fkLoad();}
    return `<h2>🏆 成就</h2>${tabs}<h3>🌐 全服成就</h3>${fkBoardHtml()}
      <div class="row" style="margin-top:8px"><button class="mini" onclick="fkLoad()">🔄 重新整理榜單</button></div>`;
  }
  return `<h2>🏆 成就</h2>
  <div class="panel"><b>已達成 ${done}／${ACH.length}</b><div class="ratebar"><i style="width:${done/ACH.length*100}%"></i></div>
    <span class="dim small">達成時自動發獎勵（金條或突破石）。</span></div>
  ${tabs}
  <div class="achgrid">${list.map(a=>{const ok=SAVE.ach[a.id];let v=0;try{v=a.v(SAVE);}catch(e){}
    return `<div class="achcard ${ok?"done":""}"><div class="ai">${ok?"🏆":"🔒"}</div><div style="flex:1;min-width:0">
      <b>${a.n}</b> <span class="small dim">${a.g}</span><div class="small">${a.d}</div>
      ${ok?`<div class="small" style="color:var(--green)">✓ 已達成・已領取 ${rewardStr(a.r)}</div>`:`<div class="ratebar" style="height:6px"><i style="width:${Math.min(1,v/a.t)*100}%"></i></div><div class="small dim">${Math.min(v,a.t)}／${a.t}・獎勵 ${rewardStr(a.r)}</div>`}
    </div></div>`;}).join("")}</div>`;
}

/* ===================== 帳號／雲端存檔 ===================== */
// 用 Firebase 登入（自訂帳號＋密碼：帳號轉成「帳號@jbts.game」當作登入信箱，不會寄信）。
// 登入後存檔自動上傳到 users/{uid}；換裝置登入同一個帳號就能接著玩。不登入也能照常玩，只存在本機。
const ACCT_KEY="jbts_acct";
let AUTH=null,ACCT=null,SYNC_T=null,SYNC_MSG="",AUTH_P=null;
const acctEmail=n=>n.toLowerCase()+"@jbts.game";
const validName=n=>/^[A-Za-z0-9_]{3,16}$/.test(n);
function fbAuth(){
  if(AUTH)return Promise.resolve(AUTH);
  if(location.protocol==="file:")return Promise.reject({code:"file"});
  return AUTH_P=AUTH_P||(async()=>{await fbDb();if(!firebase.auth)await loadScript(FB_SDK+"firebase-auth-compat.js");AUTH=firebase.auth();return AUTH;})();
}
function authErr(e){
  const c=e&&e.code||"";
  if(c==="file")return "帳號功能只能在網路版使用（直接打開檔案時沒辦法登入）";
  if(/email-already-in-use/.test(c))return "這個帳號已經有人用了，換一個吧";
  if(/wrong-password|user-not-found|invalid-credential|invalid-login/.test(c))return "帳號或密碼錯誤";
  if(/weak-password/.test(c))return "密碼至少要 6 個字";
  if(/requires-recent-login/.test(c))return "登入時間太久了，請先登出再重新登入後再改密碼";
  if(/too-many-requests/.test(c))return "嘗試太多次了，請稍後再試";
  if(/operation-not-allowed/.test(c))return "伺服器還沒開放帳號功能（開發者需要在 Firebase 開啟帳號密碼登入）";
  if(/network/.test(c))return "連線失敗，請檢查網路";
  if(/permission/i.test(c+(e&&e.message)))return "雲端存檔權限錯誤（開發者需要更新資料庫規則）";
  return "發生錯誤："+(c||e&&e.message||e);
}
function setAcct(u){ACCT={uid:u.uid,name:u.displayName||u.email.split("@")[0]};try{localStorage.setItem(ACCT_KEY,ACCT.name);}catch(e){}renderHeader();}
function fmtPlay(sec){const m=Math.floor(sec/60);return m>=60?`${Math.floor(m/60)} 小時 ${m%60} 分`:`${m} 分鐘`;}
function saveSummary(s){return `🪙${s.gold}・抽 ${s.pulls} 次・角色 ${Object.keys(s.owned).length} 名・${s.prog.cleared>=ABYSS?"主線全破":`主線第 ${s.prog.cleared+1} 章`}${typeof s.playSec==="number"?`・遊戲時間 ${fmtPlay(s.playSec)}`:""}${s.updatedAt?`<br><span class="dim">最後存檔 ${new Date(s.updatedAt).toLocaleString()}</span>`:""}`;}
function openAccount(){
  if(ACCT)return openModal(`<h3>👤 ${ACCT.name}${fkTitle()?` <span class="small rEX">${fkTitle()}</span>`:""}</h3>
    <p class="small">已登入。存檔會自動上傳雲端，換手機或電腦登入同一個帳號就能接著玩。</p>
    <p class="small dim">${SYNC_MSG||"尚未同步"}</p>
    <div class="opts"><button class="pri" onclick="uploadSave(true)">☁ 立即上傳存檔</button>
      <button onclick="pullCloud(true)">⬇ 從雲端下載存檔</button>
      <button onclick="openCloudHistory()">🕘 雲端歷史存檔</button>
      <button onclick="openChangePw()">🔑 修改密碼</button>
      <button onclick="doLogout()">登出</button></div>
    <div class="row" style="margin-top:10px"><button onclick="closeModal()">關閉</button></div>`);
  openModal(`<h3>👤 帳號（雲端存檔）</h3>
    <p class="small dim">註冊帳號後，存檔會存在雲端，換裝置登入就能接著玩。不註冊也可以照常玩，存檔只會在這台裝置上。</p>
    <label class="small">帳號（3～16 個英文、數字或底線）</label>
    <input id="acName" autocomplete="username" style="width:100%;padding:8px;margin:4px 0 8px;font:inherit;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px">
    <label class="small">密碼（至少 6 個字）</label>
    <input id="acPw" type="password" autocomplete="current-password" style="width:100%;padding:8px;margin:4px 0 8px;font:inherit;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px">
    <p class="small" style="color:var(--red)">⚠ 沒有綁定信箱，<b>忘記密碼就找不回來</b>，請記好。</p>
    <div class="row"><button class="pri" onclick="doLogin()">登入</button><button class="gold" onclick="doRegister()">註冊新帳號</button><button style="margin-left:auto" onclick="closeModal()">取消</button></div>`);
}
function acctInput(){const n=($("#acName").value||"").trim(),p=$("#acPw").value||"";
  if(!validName(n)){toast("帳號要 3～16 個英文、數字或底線");return null;}
  if(p.length<6){toast("密碼至少要 6 個字");return null;}return {n,p};}
async function doRegister(){
  const v=acctInput();if(!v)return;toast("註冊中……");
  try{const a=await fbAuth();const c=await a.createUserWithEmailAndPassword(acctEmail(v.n),v.p);
    await c.user.updateProfile({displayName:v.n});setAcct(c.user);await uploadSave();
    glog("👤ACCT","註冊 "+v.n);closeModal();toast("註冊成功！存檔已上傳雲端");}
  catch(e){glog("❌ACCT",e&&e.code||e);toast(authErr(e));}
}
async function doLogin(){
  const v=acctInput();if(!v)return;toast("登入中……");
  try{const a=await fbAuth();const c=await a.signInWithEmailAndPassword(acctEmail(v.n),v.p);setAcct(c.user);glog("👤ACCT","登入 "+v.n);await pullCloud(true);}
  catch(e){glog("❌ACCT",e&&e.code||e);toast(authErr(e));}
}
// 修改密碼：先用舊密碼重新驗證身分，再改成新密碼（沒有綁信箱，所以忘記舊密碼就無法修改）
function openChangePw(){
  if(!ACCT)return openAccount();
  const css="width:100%;padding:8px;margin:4px 0 8px;font:inherit;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px";
  openModal(`<h3>🔑 修改密碼</h3><p class="small dim">帳號：<b>${ACCT.name}</b></p>
    <label class="small">舊密碼</label><input id="cpOld" type="password" autocomplete="current-password" style="${css}">
    <label class="small">新密碼（至少 6 個字）</label><input id="cpNew" type="password" autocomplete="new-password" style="${css}">
    <label class="small">再輸入一次新密碼</label><input id="cpNew2" type="password" autocomplete="new-password" style="${css}">
    <p class="small" style="color:var(--red)">⚠ 沒有綁定信箱，改完請記好新密碼，忘記就找不回來。</p>
    <div class="row"><button class="pri" onclick="doChangePw()">確認修改</button><button onclick="openAccount()">返回</button></div>`);
}
async function doChangePw(){
  const o=$("#cpOld").value||"",n=$("#cpNew").value||"",n2=$("#cpNew2").value||"";
  if(!o){toast("請輸入舊密碼");return;}
  if(n.length<6){toast("新密碼至少要 6 個字");return;}
  if(n!==n2){toast("兩次輸入的新密碼不一樣");return;}
  if(n===o){toast("新密碼不能跟舊密碼一樣");return;}
  toast("修改中……");
  try{
    const a=await fbAuth(),u=a.currentUser;if(!u){toast("登入狀態已失效，請重新登入");return;}
    await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,o));
    await u.updatePassword(n);
    glog("👤ACCT","修改密碼 "+ACCT.name);closeModal();toast("✅ 密碼已修改，下次請用新密碼登入");
  }catch(e){
    glog("❌ACCT",e&&e.code||e);
    toast(/wrong-password|invalid-credential|invalid-login/.test(e&&e.code||"")?"舊密碼不正確":authErr(e));
  }
}
async function doLogout(){try{await (await fbAuth()).signOut();}catch(e){}ACCT=null;SYNC_MSG="";try{localStorage.removeItem(ACCT_KEY);}catch(e){}closeModal();renderHeader();toast("已登出（存檔仍保留在這台裝置）");}
// 讀雲端存檔；ask=true 時兩邊不同會讓玩家選，false（開遊戲自動同步）時用比較新的那份
async function pullCloud(ask){
  if(!ACCT)return;
  try{
    const snap=await (await fbDb()).ref("users/"+ACCT.uid+"/save").get();
    if(!snap.exists()){await uploadSave();if(ask){closeModal();toast("雲端還沒有存檔，已上傳這台裝置的存檔");}return;}
    const {s,bad}=unpackSave(snap.val());
    if(!bad&&isNewerSave(s)){toast("雲端存檔來自較新的版本，請先重新整理頁面更新遊戲");glog("❌CLOUD","雲端存檔版本較新");return;}
    if(bad||!s||s.v!==1){toast("雲端存檔異常，沒有載入");glog("❌CLOUD","雲端存檔簽章不符");return;}
    const why=validSave(migrate(s));if(why){toast("雲端存檔數值異常（"+why+"），沒有載入");glog("❌CLOUD",why);return;}
    CLOUD_PENDING=s;CLOUD_PLAY=typeof s.playSec==="number"?s.playSec:null;
    const ct=s.updatedAt||0,lt=SAVE.updatedAt||0;
    if(ct===lt){SYNC_MSG="已同步";if(ask){closeModal();toast("登入成功，存檔已是最新");}return;}
    if(!ask){if(RUN&&RUN.active||CUR_B)return;ct>lt?useCloud():uploadSave();return;}
    openModal(`<h3>☁ 選擇要用哪一份存檔</h3>
      <div class="sk"><b>☁ 雲端存檔</b>${ct>lt?' <span style="color:var(--green)">（比較新）</span>':""}${isShorter(s.playSec,SAVE.playSec)?' <span style="color:var(--red)">⚠ 遊戲時間比較短</span>':""}<br>${saveSummary(s)}</div>
      <div class="sk"><b>📱 這台裝置的存檔</b>${lt>ct?' <span style="color:var(--green)">（比較新）</span>':""}${isShorter(SAVE.playSec,s.playSec)?' <span style="color:var(--red)">⚠ 遊戲時間比較短</span>':""}<br>${saveSummary(SAVE)}</div>
      <p class="small dim">選了之後，另一份會被覆蓋。</p>
      <div class="opts"><button class="pri" onclick="useCloud()">☁ 使用雲端存檔</button><button onclick="closeModal();uploadSave(true)">📱 使用這台裝置的存檔（上傳覆蓋雲端）</button></div>`);
  }catch(e){glog("❌CLOUD",e&&e.code||e);toast(authErr(e));}
}
let CLOUD_PENDING=null;
function useCloud(){
  if(!CLOUD_PENDING)return;
  if(CUR_B){CUR_B.aborted=true;CUR_B.done=true;CUR_B=null;}
  SAVE=migrate(CLOUD_PENDING);RUN=null;CLOUD_PENDING=null;VIEW="home";
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(packSave(SAVE)));}catch(e){}
  SYNC_MSG="已載入雲端存檔 "+new Date().toLocaleTimeString();closeModal();render();toast("已載入雲端存檔");glog("☁CLOUD","載入雲端存檔");
}
function scheduleUpload(){if(!ACCT)return;clearTimeout(SYNC_T);SYNC_T=setTimeout(()=>uploadSave(),3000);}
/* ----- 雲端歷史存檔：覆蓋雲端前，把舊的雲端存檔另存一份在 users/{uid}/history，最多留 5 份、至少間隔 30 分鐘 ----- */
const HIST_MAX=5,HIST_GAP=30*60*1000;
let HIST_AT=0; // 這次開遊戲有沒有檢查過歷史存檔（0＝還沒）
async function cloudHistory(){
  const db=await fbDb(),base=db.ref("users/"+ACCT.uid);
  const force=HIST_AT<0,cur=await base.child("save").get();
  if(!cur.exists()){HIST_AT=Date.now();CLOUD_PLAY=null;return;}
  CLOUD_PLAY=playOf(cur.val());
  const hs=await base.child("history").get(),h=hs.exists()?hs.val():{},ks=Object.keys(h).sort();
  if(force||!ks.length||Date.now()-h[ks[ks.length-1]].t>HIST_GAP){
    const t=Date.now();await base.child("history/"+t).set({t,pack:cur.val()});ks.push(String(t));
    for(const k of ks.slice(0,Math.max(0,ks.length-HIST_MAX)))await base.child("history/"+k).remove();
  }
  HIST_AT=Date.now();
}
async function openCloudHistory(){
  toast("讀取中……");
  try{
    const snap=await (await fbDb()).ref("users/"+ACCT.uid+"/history").get();
    const h=snap.exists()?snap.val():{},ks=Object.keys(h).sort().reverse();
    CLOUD_HIST=h;
    openModal(`<h3>🕘 雲端歷史存檔</h3><p class="dim small">每次開遊戲、或超過 30 分鐘後第一次上傳前，會把當時雲端的舊存檔留一份，最多 ${HIST_MAX} 份。還原會覆蓋目前這台裝置和雲端的存檔，而且會重新做一次數值檢查。</p>
      ${ks.length?ks.map(k=>`<div class="sk"><b>${new Date(h[k].t).toLocaleString()}</b>・遊戲時間 <b style="color:var(--gold)">${playTxt(playOf(h[k].pack))}</b>${isShorter(playOf(h[k].pack),SAVE.playSec)?' <span style="color:var(--red)">⚠ 比目前短</span>':""}<br>${bkSummary(h[k].pack)}
        <div class="row" style="margin-top:6px"><button class="mini pri" onclick="restoreCloudHist('${k}')">還原這份</button></div></div>`).join(""):'<p class="dim">雲端還沒有歷史存檔。</p>'}
      <div class="row"><button onclick="openAccount()">返回</button></div>`);
  }catch(e){toast(authErr(e));}
}
let CLOUD_HIST={};
function restoreCloudHist(k,ok){
  const e=CLOUD_HIST[k];if(!e)return;
  const hp=playOf(e.pack);
  if(!ok&&isShorter(hp,SAVE.playSec))return openModal(`<h3 style="color:var(--red)">⚠ 這份存檔的遊戲時間比較短</h3>
    <div class="sk">要還原的歷史存檔：遊戲時間 <b style="color:var(--red)">${playTxt(hp)}</b></div>
    <div class="sk">目前這台裝置的存檔：遊戲時間 <b>${playTxt(SAVE.playSec)}</b></div>
    <p class="small">還原後，目前這台和雲端的存檔都會被換成這份比較短的，確定嗎？</p>
    <div class="opts"><button onclick="openCloudHistory()">取消</button><button class="gold" onclick="restoreCloudHist('${k}',true)">仍然還原</button></div>`);
  HIST_AT=-1;const old=SAVE;restorePack(e.pack);if(SAVE!==old)FORCE_UP=true; // HIST_AT=-1：還原後上傳前，先把現在的雲端存檔也留一份；FORCE_UP：這是玩家自己選的，不擋
}
let FORCE_UP=false;
/* ----- 防止用遊戲時間比較短的存檔覆蓋雲端：CLOUD_PLAY＝已知的雲端遊戲秒數（null＝不知道／舊存檔沒記錄） ----- */
const SHORT_TOL=60; // 秒；短超過這個數字才算「比較短」
let CLOUD_PLAY=null,SHORT_WARNED=false;
const playOf=pack=>{try{const {s}=unpackSave(pack);return s&&typeof s.playSec==="number"?s.playSec:null;}catch(e){return null;}};
const playTxt=sec=>typeof sec==="number"?fmtPlay(sec):"未記錄";
const isShorter=(a,b)=>typeof b==="number"&&(typeof a==="number"?a:0)<b-SHORT_TOL; // a 比 b 短很多
function warnShort(cp){
  if(SHORT_WARNED)return;SHORT_WARNED=true;SYNC_MSG="⚠ 已暫停上傳：這台裝置的存檔遊戲時間比雲端短";
  openModal(`<h3 style="color:var(--red)">⚠ 小心：會覆蓋掉遊戲時間比較長的雲端存檔</h3>
    <div class="sk"><b>☁ 雲端存檔</b>：遊戲時間 <b>${playTxt(cp)}</b></div>
    <div class="sk"><b>📱 這台裝置的存檔</b>：遊戲時間 <b style="color:var(--red)">${playTxt(SAVE.playSec)}</b></div>
    <p class="small">這台的存檔玩得比雲端少，很可能是舊的存檔。為了安全，<b>已先暫停自動上傳</b>。覆蓋後，雲端那份只會留在「🕘 雲端歷史存檔」裡。</p>
    <div class="opts"><button class="pri" onclick="SHORT_WARNED=false;pullCloud(true)">☁ 看看雲端存檔，選要用哪一份</button>
      <button onclick="SHORT_WARNED=false;HIST_AT=-1;closeModal();uploadSave(true,true)">仍然用這台的存檔覆蓋雲端</button>
      <button onclick="closeModal()">先不上傳</button></div>`);
}
async function uploadSave(manual,force){
  if(!ACCT||STALE)return;
  if(FORCE_UP){force=true;FORCE_UP=false;}
  try{
    if(HIST_AT<=0){try{await cloudHistory();}catch(e){glog("❌CLOUD","歷史存檔失敗 "+(e&&e.code||e));}}
    if(!force&&isShorter(SAVE.playSec,CLOUD_PLAY)){glog("⚠CLOUD","擋下上傳：本機遊戲時間 "+playTxt(SAVE.playSec)+" < 雲端 "+playTxt(CLOUD_PLAY));warnShort(CLOUD_PLAY);return;}
    if(PENDING_CLOUD_BK){const b=PENDING_CLOUD_BK;PENDING_CLOUD_BK=null;await cloudBackup(b.pack,b.why);} // 清空後第一次上傳前，先把清空前的存檔備份到雲端
    await (await fbDb()).ref("users/"+ACCT.uid).update({name:ACCT.name,save:packSave(SAVE),t:Date.now()}); // update 才不會洗掉 backup
    CLOUD_PLAY=typeof SAVE.playSec==="number"?SAVE.playSec:null;SHORT_WARNED=false;
    SYNC_MSG="已同步 "+new Date().toLocaleTimeString();if(manual){toast("☁ 存檔已上傳");closeModal();}}
  catch(e){SYNC_MSG="上傳失敗："+authErr(e);glog("❌CLOUD",e&&e.code||e);if(manual)toast(authErr(e));}
}
// 開遊戲時：之前登入過就自動恢復登入並同步
function bootAcct(){
  let had=null;try{had=localStorage.getItem(ACCT_KEY);}catch(e){}
  if(!had||location.protocol==="file:")return;
  fbAuth().then(a=>a.onAuthStateChanged(u=>{if(u){setAcct(u);pullCloud(false);}else{ACCT=null;renderHeader();}})).catch(e=>glog("❌ACCT",e&&e.code||e));
}

