"use strict";
/* ===================== VIEW ROUTER ===================== */
let VIEW="home";
const NAV=[["home","主頁"],["gacha","招募"],["team","整備室"],["story","檔案室"],["shop","商店"],["boss","魔王討伐"],["run","遠征"],["train","練功房"],["arena","競技場"],["log","更新說明"]];
// 合併頁：一個導覽按鈕對應多個分頁（各頁的代號、內容、背景音樂維持原樣，只是共用上方的分頁列）
//   檔案室＝圖鑑／故事／成就；整備室＝隊伍／裝備／轉換；競技場＝競技場／雙人對決
// 攻略專區（更新說明旁邊的分頁）：純文字、沒有互動；內容寫在 TIPS。目前尚未開放，TIPS_OPEN 改成 true 才會出現分頁
const TIPS_OPEN=true;
const PAGE_GROUPS=[
  {nav:"story",title:"🗄 檔案室",tabs:[["story","👑 故事"],["ach","🏆 成就"],["dex","📖 圖鑑"]]},
  {nav:"team",title:"🛠 整備室",tabs:[["team","👥 隊伍"],["gear","🛡 裝備"],["convert","🔁 轉換"]]},
  {nav:"log",title:"📝 更新說明",tabs:[["log","📝 更新紀錄"],["plan","🗓 預計改版"],["qa","❓ Q&A 問答"],...(TIPS_OPEN?[["tips","📖 攻略"]]:[])]},
  {nav:"arena",title:"🏟 競技場",tabs:[["arena","⚔ 競技場"],["duel","🆚 雙人對決"]]}
];
const groupOf=v=>PAGE_GROUPS.find(g=>g.tabs.some(([k])=>k===v));
// 目前導覽列該亮哪一顆：分頁歸屬的導覽鈕；戰鬥中看是從哪個頁面打的
const navOf=()=>{const v=VIEW==="battle"?BATTLE_HOME:VIEW,g=groupOf(v);return g?g.nav:v;};
function groupTabs(g){
  return `<div class="row" style="align-items:center;gap:10px;margin-top:6px"><b style="font-size:18px">${g.title}</b>
    <div class="filters" style="margin:0">${g.tabs.map(([k,l])=>`<button class="${VIEW===k?"on":""}" onclick="go('${k}')">${l}</button>`).join("")}</div></div>`;
}
function locked(){return (RUN&&RUN.active)||(CUR_B&&!CUR_B.done)||(DUEL&&DUEL.phase==="battle")||!!NET;}
function go(v){
  if(npcVoiceLocked()&&v!==VIEW){toast("對話還沒說完，請先聽完");return;}
  stopEndVoice();
  if(locked()&&v!==VIEW){toast("進行中無法離開（遠征中可按「放棄遠征」）");return;}
  SFX.click();VIEW=v;NAV_OPEN=false;render();window.scrollTo(0,0);
}
let NAV_OPEN=false;
function toggleNav(){NAV_OPEN=!NAV_OPEN;SFX.click();renderHeader();}
function renderHeader(){
  $("#app").classList.toggle("inbattle",VIEW==="battle"); // 戰鬥中收起導覽列（本來就不能離開），多留空間給戰場
  $("#nav").innerHTML=NAV.map(([k,l])=>`<button class="${navOf()===k?"on":""}" onclick="go('${k}')">${l}</button>`).join("");
  $("#nav").className=NAV_OPEN?"open":"";
  const cur=NAV.find(([k])=>k===navOf());
  $("#menuBtn").textContent=(NAV_OPEN?"✕ ":"☰ ")+(cur?cur[1]:"選單");
  $("#wallet").textContent="🪙 "+SAVE.gold;
  $("#acctBtn").textContent=ACCT?"👤 "+ACCT.name:"👤";
}
let BATTLE_HOME="arena";
// 畫面出錯時不要整個卡死：記錄錯誤，顯示自救按鈕
function render(){
  try{const g=skinSweep();if(g.length){save();toast(`試用造型「${g.join("、")}」已到期，已換回預設外觀`);}}catch(e){}
  try{renderInner();}
  catch(e){
    glog("❌RENDER",`畫面=${VIEW}：${e&&e.stack||e}`);
    $("#view").innerHTML=`<div class="panel" style="margin-top:16px;text-align:center"><h2>⚠ 畫面發生錯誤</h2>
      <p class="dim">錯誤已經記錄下來。可以試試下面的按鈕，或按「🐞 查看錯誤紀錄」複製紀錄回報。</p>
      <div class="opts">${RUN&&RUN.active&&SAVE.runCk?`<button class="pri" onclick="resetFloor()">🔄 重置這一層</button>`:""}
      <button onclick="forceHome()">🏠 強制回到主頁（遠征進度會保留）</button><button onclick="openStuck()">🐞 查看錯誤紀錄</button></div></div>`;
  }
}
function renderInner(){
  renderHeader();
  const f={home:viewHome,gacha:viewGacha,team:viewTeam,convert:viewConvert,dex:viewCodex,gear:viewGear,shop:viewShop,run:viewRun,boss:viewBossPage,train:viewTrain,arena:viewArena,ach:viewAch,story:viewStory,log:viewChangelog,qa:viewQA,plan:viewPlan,tips:TIPS_OPEN?viewTips:viewHome,duel:viewDuel,battle:viewBattle}[VIEW]||viewHome;
  $("#view").innerHTML=(groupOf(VIEW)?groupTabs(groupOf(VIEW)):"")+f();
  if(VIEW==="battle"){const l=$("#blog");if(l)l.scrollTop=l.scrollHeight;kbApply();}
  if(CUR_B&&CUR_B.online&&!CUR_B.guest)pushSnap(CUR_B);
  syncBgm();
  startNpcVoice();
}
function toast(msg){
  const d=document.createElement("div");
  d.textContent=msg;
  d.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#2a1013;border:1px solid var(--red);padding:8px 14px;border-radius:10px;z-index:99;max-width:90vw";
  document.body.appendChild(d);setTimeout(()=>d.remove(),2200);
}
function openModal(html){$("#mbox").innerHTML=html;$("#modal").classList.add("show");}
function closeModal(){$("#modal").classList.remove("show");}

/* ===================== GUIDE ===================== */
// 超簡單導引：第一次進來自動打開，之後按右上角 ⚙ 設定裡的「玩法導引」重看
const GUIDE=[
  {ic:"⛓",t:"這是什麼遊戲？",b:["你和同伴被關在禁閉室，要一路往上爬、搶上只有 <b>三個座位</b> 的直升機。","玩法只有三件事：<b>抽角色 → 組隊 → 出發遠征</b>。"]},
  {ic:"🎴",t:"① 抽角色",b:["到「招募」花金條抽卡。<b>第一次十連必出 SSR</b>，開局的金條剛好夠。","抽到重複的角色會記成「重複卡」，到角色頁手動升星（最多 5★），每 1 星能力 +10%。","5★ 後可以用 💎突破石「突破」（隊伍頁點角色 →「✨突破」，最多 10 次）：星星回到 1★ 再升，能力保留並再 +1.5%，突破後每升 1 星 +2.5%。","第 n 次突破要 💎×2n，成功率 30% 起每次 ×0.85（30→26→22→…→7%）。失敗突破石消失，但不會降星。","突破石來源：商店、主線魔王、深淵守門者、練功房、成就。練過的角色（3★ 以上、Lv.50 以上、突破過；有重複卡不算）不會被一鍵合成、一鍵遣散動到，也不能整張遣散、合成或熔煉掉。"]},
  {ic:"👥",t:"② 組隊",b:["到「整備室」的「隊伍」點角色 →「加入隊伍」，平常最多 3 人（通關後期內容可解鎖 5 人）。","每個角色有 <b>職業</b>（🛡坦克／⚔戰士／🗡刺客／🎯射手／✚輔助／🔮術士），各有不同加成。","不要的角色可以「遣散」換金條、「合成」成更高稀有度（<b>5 張 N 白卡 → 1 名 R</b>、6★ 份的 R → 1 名 SR、6★ 份的 SR → 1 名 SSR），或「🔥熔煉」：2 名同稀有度 → 1 名同稀有度的其他角色（等級取較低的）。"]},
  {ic:"🛒",t:"③ 裝備與商店",b:["「商店」可以買裝備、強化符和遠征物資（下一次遠征自動帶上）。","在角色卡片點 <b>武器／防具／飾品</b> 欄位就能穿上。武器有職業限制。","「整備室」的「裝備」分頁可以強化到 +10。<b>強化可能失敗</b>：+5 以上失敗會掉 1 級（裝備不會碎），用 🧿保護符 可以保住等級。"]},
  {ic:"🪜",t:"④ 出發遠征",b:["每一層選一扇門進去：可能是物資、敵人、或其他逃殺者。","注意 <b>🥫補給</b>（每層吃 1 份）和 <b>☣毒氣</b>（從底層往上淹）。","遇到人可以結盟、交易或開打。打倒最上層的魔王就逃出了！"]},
  {ic:"⚔️",t:"⑤ 戰鬥",b:["輪到你的角色時，按「普通攻擊」或「技能」，再點目標。","懶得操作就按「自動」，讓 AI 幫你打。"]},
  {ic:"🏆",t:"⑥ 然後呢？",b:["主線共 12 章，逃出一章解鎖下一章；逃出第 1 章後解鎖 <b>🕳 無盡深淵</b>。","「練功房」重複打怪練等級（每級全能力 +2%）；「競技場」打 AI 賺金條；「雙人對決」可以和朋友網路對戰。","進度會自動存檔，換裝置用主頁的「匯出／匯入存檔」。"]}
];
function openGuide(i){
  const g=GUIDE[i],last=i===GUIDE.length-1;
  openModal(`<div class="gpage"><div class="gic">${g.ic}</div><h3 style="text-align:center;margin:4px 0">${g.t}</h3>
    <ul>${g.b.map(x=>`<li>${x}</li>`).join("")}</ul></div>
    <div class="gdots">${GUIDE.map((_,k)=>`<i class="${k===i?"on":""}"></i>`).join("")}</div>
    <div class="row">${i?`<button onclick="openGuide(${i-1})">← 上一步</button>`:`<button onclick="endGuide()">跳過</button>`}
      <button class="pri" style="margin-left:auto" onclick="${last?"endGuide()":`openGuide(${i+1})`}">${last?"開始玩！":"下一步 →"}</button></div>`);
}
function endGuide(){SAVE.guided=true;save();closeModal();render();}
// 主頁的「下一步」提示
function nextHint(){
  const st=SAVE.stats,P=SAVE.prog;
  if(!SAVE.pulls)return ["第一步：去招募所抽一次十連，<b>首次必出 SSR</b>！","gacha","🎴 去招募"];
  if(SAVE.team.length<3)return ["把喜歡的角色編進隊伍（最多 3 人）。","team","👥 去編隊"];
  if(!st.runs)return ["隊伍準備好了，出發第一次遠征吧！","run","🪜 去遠征"];
  if(P.cleared<1)return ["目標：打倒停機坪的看守魔王，逃出禁閉室。打不贏就多抽卡、升星再來。","run","🪜 去遠征"];
  if(P.cleared<ABYSS)return [`下一個目標：第 ${P.cleared+1} 章「${CHAPTERS[P.cleared].name}」。也可以去無盡深淵刷紀錄。`,"run","🪜 去遠征"];
  return [`主線全破！挑戰無盡深淵，目前最深 D${P.abyssBest||0}。`,"run","🕳 去深淵"];
}

/* ===================== HOME ===================== */
/* ===== 每日登入獎勵：7 天一輪，連續登入才會往下一天走，斷掉就從第 1 天重來 ===== */
const LOGIN_REWARDS=[
  {gold:300},{gold:400},{stone:10},{gold:500},{protect:10},{gold:600},{gold:1000,stone:10,luck:10}];
function loginTxt(r){return [r.gold&&`🪙${r.gold}`,r.stone&&`💎突破石×${r.stone}`,r.protect&&`🧿保護符×${r.protect}`,r.luck&&`🍀幸運符×${r.luck}`].filter(Boolean).join(" ");}
function dateStr(off=0){const d=new Date();d.setDate(d.getDate()+off);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
// 今天可不可以領：日期比上次領的晚才行（系統時間往回調不算）；回傳 {ok, day}（day 是這次會領到第幾天）
function loginState(){
  const L=SAVE.login||{last:"",streak:0},today=dateStr();
  if(L.last&&today<=L.last)return {ok:false,day:((L.streak-1)%7)+1,done:today===L.last};
  const streak=L.last===dateStr(-1)?L.streak+1:1;
  return {ok:true,day:((streak-1)%7)+1,streak};
}
function claimLogin(){
  const st=loginState();if(!st.ok)return;
  const r=LOGIN_REWARDS[st.day-1];
  SAVE.login={last:dateStr(),streak:st.streak};
  SAVE.gold+=r.gold||0;SAVE.charms.stone+=r.stone||0;SAVE.charms.protect+=r.protect||0;SAVE.charms.luck+=r.luck||0;
  save();SFX.sr();toast(`登入第 ${st.day} 天：${loginTxt(r)}`);render();
}
function loginPanel(){
  const st=loginState();
  return `<div class="panel"><div class="row"><b style="margin-right:auto">📅 每日登入獎勵</b>
    ${st.ok?`<button class="gold" onclick="claimLogin()">領取第 ${st.day} 天</button>`:`<span class="dim small">今天已領取，明天再來</span>`}</div>
    <div class="row small" style="margin-top:8px;gap:6px;flex-wrap:wrap">${LOGIN_REWARDS.map((r,i)=>{
      const n=i+1,got=st.ok?n<st.day:n<=st.day,cur=st.ok&&n===st.day;
      return `<div style="flex:1;min-width:84px;padding:6px;border:1px solid ${cur?"var(--gold)":"#444"};border-radius:6px;text-align:center;${got?"opacity:.45":""}">第 ${n} 天<br>${loginTxt(r)}${got?"<br>✅":""}</div>`;}).join("")}</div>
    <div class="dim small" style="margin-top:6px">連續登入才會往下一天，中斷就從第 1 天重新開始；第 7 天領完會回到第 1 天。</div></div>`;
}
function viewHome(){
  const own=Object.keys(SAVE.owned).length,st=SAVE.stats;
  return `<div class="hero"><h1>禁閉逃殺</h1><div class="sub">文 字 獄 ・ 抽 卡 ・ 結 盟 ・ 背 叛</div></div>
  <div class="panel" style="text-align:center">
    <p style="margin:0">你在停屍間冰冷的鐵櫃裡醒來。廣播說：<b>「直升機只有三個座位。」</b><br>
    <span class="dim">招募囚犯、組成三人小隊，從 B7 一路殺上停機坪。路上遇到的人——可以結盟，也可以先下手為強。</span></p>
  </div>
  ${loginPanel()}
  ${skinPanel()}
  ${(h=>`<div class="nexthint"><span>👉 ${h[0]}</span><button class="pri mini" style="margin-left:auto" onclick="go('${h[1]}')">${h[2]}</button></div>`)(nextHint())}
  <div class="modes">
    <div class="mode" onclick="go('gacha')"><div class="ic">🎴</div><b>招募所</b><p>花金條抽取職業卡。SSR 3.1%・十連保底 SR・60 抽保底 SSR</p></div>
    <div class="mode" onclick="go('team')"><div class="ic">👥</div><b>隊伍</b><p>已收集 ${ownedCount()}/${CARD_IDS.length} 名職業，挑 ${teamMax()} 人出戰</p></div>
    <div class="mode" onclick="go('shop')"><div class="ic">🛒</div><b>商店・裝備</b><p>買裝備、強化到 +10（可能失敗！），還能買遠征物資帶上路</p></div>
    <div class="mode" onclick="go('run')"><div class="ic">🪜</div><b>逃殺遠征</b><p>文字冒險主線 ${ABYSS} 章＋無盡深淵：選房間、搜物資、躲毒氣、結盟或背叛。目前進度：${progText()}</p></div>
    <div class="mode" onclick="go('train')"><div class="ic">🏋</div><b>練功房</b><p>重複打怪物練等級（每級全能力+2%），已解鎖到第 ${Math.min(TRAIN_MAX,trainBest()+1)} 關</p></div>
    <div class="mode" onclick="go('story')"><div class="ic">👑</div><b>故事</b><p>老國王說過的話與魔王的背景，12 章是一條連續的故事</p></div>
    <div class="mode" onclick="go('ach')"><div class="ic">🏆</div><b>成就</b><p>已達成 ${ACH.filter(a=>SAVE.ach&&SAVE.ach[a.id]).length}／${ACH.length}，達成自動領金條和突破石</p></div>
    <div class="mode" onclick="go('arena')"><div class="ic">⚔️</div><b>競技場</b><p>對戰 AI 小隊爬塔，第 ${SAVE.arenaTier} 層。贏了拿金條</p></div>
    <div class="mode" onclick="go('duel')"><div class="ic">🆚</div><b>雙人對決</b><p>同機輪流操作，或建立房間和朋友網路連線互毆</p></div>
  </div>
  <h3>戰績</h3>
  <div class="panel row small">
    <span>遠征 ${st.runs} 次</span><span>成功逃出 ${st.escapes} 次</span><span>主線 ${progText()}</span>
    <span>深淵最深 ${SAVE.prog.abyssBest?"D"+SAVE.prog.abyssBest:"—"}</span>
    <span>競技場勝場 ${st.arenaWins}</span><span>總抽數 ${SAVE.pulls}</span>
  </div>
  <div class="row small" style="margin-top:8px">
    <span class="dim">存檔會自動保存在這個瀏覽器（遠征中途關掉也能接著玩）。${typeof SAVE.playSec==="number"?`遊戲時間 ${fmtPlay(SAVE.playSec)}`:""}</span>
    <button class="mini" style="margin-left:auto" onclick="exportSave()">📤 匯出存檔</button>
    <button class="mini" onclick="importSave()">📥 匯入存檔</button>
    ${readBackups().length?'<button class="mini gold" onclick="openRestore()">♻ 還原備份</button>':""}
    <button class="mini" onclick="resetSave()">重置存檔</button>
  </div>`;
}
function resetSave(){
  openModal(`<h3>確定重置？</h3><p class="dim">所有卡片與金條都會消失。</p><div class="row"><button class="pri" onclick="SAVE=newSave();RUN=null;save();closeModal();go('home')">重置</button><button onclick="closeModal()">取消</button></div>`);
}

