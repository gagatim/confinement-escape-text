"use strict";
/* ===================== ARENA ===================== */
let ARENA_FOES=null;
function genArenaFoes(){
  const t=SAVE.arenaTier,stars=clamp(1+Math.floor(t/3),1,5);
  const pool=t<4?POOL.R:t<8?POOL.R.concat(POOL.SR):CARD_IDS;
  ARENA_FOES=shuffle(pool).slice(0,Math.max(3,SAVE.team.length)).map(id=>({id,stars,scale:.82+.06*t}));
}
function arenaReward(){return 8+SAVE.arenaTier*2;}
function viewArena(){
  if(!ARENA_FOES||ARENA_FOES.length!==Math.max(3,SAVE.team.length))genArenaFoes();
  return `<h2>競技場・第 ${SAVE.arenaTier} 層</h2>
  <p class="dim">地下格鬥場。觀眾席上的看守們正在下注。贏了晉級，獎勵 🪙${arenaReward()}。</p>
  <h3>對手</h3><div class="cardgrid">${ARENA_FOES.map(f=>{const c=CARDS[f.id],s=cardStats(f.id,f.stars,f.scale);
    return `<div class="ccard ${c.r}" onclick="showFoe('${f.id}')"><div class="av">${avatar(f.id)}</div><div class="nm">${c.name}</div><div class="stars">${starStr(f.stars)}</div><div class="small dim">❤${s.maxHp} ⚔${s.atk}</div></div>`;}).join("")}</div>
  <h3>你的隊伍</h3><div class="cardgrid">${SAVE.team.map(id=>cardTile(id,`showCard('${id}')`)).join("")||"<span class='dim'>尚未編隊</span>"}</div>
  <div class="row" style="margin-top:14px"><button class="pri" onclick="startArena()" ${SAVE.team.length?"":"disabled"}>⚔ 開戰</button>
  <button onclick="genArenaFoes();render()">換一批對手</button></div>`;
}
function showFoe(id){openModal(`<div class="detail"><div class="av">${avatar(id)}</div><div><h2>${DEF(id).name}</h2></div></div>${skillHtml(DEF(id))}<div class="row" style="margin-top:12px"><button onclick="closeModal()">關閉</button></div>`);}
function startArena(){
  if(!SAVE.team.length)return;
  const reward=arenaReward();
  startBattle({title:`競技場 第${SAVE.arenaTier}層`,home:"arena",
    A:SAVE.team.map(teamUnit),B:ARENA_FOES,
    intro:"鐵籠落下，觀眾開始鼓譟——",
    resultNote:B=>B.over==="A"?`獲得 🪙${reward}，晉級第 ${SAVE.arenaTier+1} 層`:"再接再厲。抽更多卡或升星後再來。",
    onEnd(win,B){
      let ups=[];
      if(win){const xp=8+SAVE.arenaTier*3;SAVE.gold+=reward;SAVE.arenaTier++;SAVE.stats.arenaWins++;
        ups=gainExp(SAVE.team.slice(),xp,B.units.filter(u=>u.side==="A"&&!u.alive).map(u=>u.id));toast(`📈 參戰角色經驗 +${xp}`);
        if(rnd()<.3)toast("🎁 觀眾丟下了 "+dropGear(SAVE.arenaTier>=8&&rnd()<.35?"SR":"R")+"（已放進裝備）");}
      save();genArenaFoes();CUR_B=null;VIEW="arena";render();
      if(ups.length)openModal(`<h3>升級！</h3><p>${ups.join("<br>")}</p><div class="row"><button onclick="closeModal()">關閉</button></div>`);
    }});
}

/* ===================== DUEL (hotseat) ===================== */
let DUEL=null;
const DRAFT_ORDER=["A","B","B","A","A","B"];
function viewDuel(){
  return `<h2>雙人對決</h2><div class="row" style="margin-bottom:12px">
    <button class="${DUEL_MODE==="local"?"pri":""}" onclick="setDuelMode('local')">🖥 同機對戰</button>
    <button class="${DUEL_MODE==="online"?"pri":""}" onclick="setDuelMode('online')">🌐 網路對戰</button></div>`
    +(DUEL_MODE==="online"?viewOnline():viewDuelLocal());
}
function viewDuelLocal(){
  if(!DUEL||DUEL.phase==="done"||DUEL.online)DUEL={phase:"draft",step:0,picks:{A:[],B:[]}};
  const d=DUEL,cur=DRAFT_ORDER[d.step],taken=d.picks.A.concat(d.picks.B);
  const side=s=>`<div class="panel" style="flex:1;min-width:220px;border-color:${s===cur&&d.step<6?"var(--gold)":"var(--line)"}">
    <b style="color:var(--side${s})">${s==="A"?"玩家一":"玩家二"}</b>
    <div class="draftside">${d.picks[s].map(id=>`<div class="av">${avatar(id)}</div>`).join("")}</div></div>`;
  return `<p class="dim">兩人輪流選角（蛇形順序 1-2-2-1-1-2），所有職業都以 3★ 參戰。選好後輪流操作互毆。</p>
  <div class="row">${side("A")}${side("B")}</div>
  ${d.step<6?`<h3>輪到 <span style="color:var(--side${cur})">${cur==="A"?"玩家一":"玩家二"}</span> 選角</h3>
  <div class="cardgrid">${sortedIds().map(id=>{const c=CARDS[id],tk=taken.includes(id);
    return `<div class="ccard ${c.r} ${tk?"locked":""}" onclick="${tk?"":`duelPick('${id}')`}" oncontextmenu="showFoe('${id}');return false"><div class="av">${avatar(id)}</div><div class="nm">${c.name}</div><div class="small r${c.r}">${c.r}</div></div>`;}).join("")}</div>
  <p class="dim small">右鍵（或長按）查看技能。</p>`
  :`<div class="row" style="margin-top:12px"><button class="pri" onclick="startDuel()">⚔ 開打！</button><button onclick="DUEL=null;render()">重新選角</button></div>`}`;
}
function duelPick(id){
  if(DUEL.online)return onlinePick(id);
  const d=DUEL;if(d.step>=6)return;
  d.picks[DRAFT_ORDER[d.step]].push(id);d.step++;SFX.flip();render();
}
function startDuel(){
  DUEL.phase="battle";
  startBattle({title:"雙人對決",home:"duel",ctrl:{A:"human",B:"human"},labels:{A:"玩家一",B:"玩家二"},
    A:DUEL.picks.A.map(id=>({id,stars:3})),B:DUEL.picks.B.map(id=>({id,stars:3})),
    intro:"兩支隊伍在禁閉室中央對峙。只有一方能走出去。",
    onEnd(){DUEL.phase="done";CUR_B=null;VIEW="duel";render();}});
}

/* ===================== ONLINE DUEL (Firebase) ===================== */
// 網路對戰：房主（A）跑完整戰鬥引擎；挑戰者（B）只送出自己的操作、接收戰況快照。
// 資料庫結構 rooms/{房號}：t 建立時間、guest 挑戰者加入、gl 挑戰者離開、draft.p 選角順序、snap 戰況快照、act 挑戰者的操作
const FB_CFG={apiKey:"AIzaSyBFcsgw6urVdIyJbvH1aZLaK0MQNJ1yfSg",authDomain:"confinement-escape-text.firebaseapp.com",
  databaseURL:"https://confinement-escape-text-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"confinement-escape-text",appId:"1:523494416946:web:9e95a3d65ec4f17e87d22b"};
const FB_SDK="https://www.gstatic.com/firebasejs/10.12.2/";
const REMOTE_TIMEOUT=60000,T2_TIMEOUT=60000; // 團隊賽逾時（與一般網路對戰相同，60 秒）
let FB_DB=null,NET=null,DUEL_MODE="local",JOIN_CODE="",SNAP_T=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("無法載入連線元件"));document.head.appendChild(s);});}
// SDK 只在進入網路對戰時才載入，其他模式仍可離線遊玩
// 測試版（網址含 -test）不連線上資料庫，避免測試資料寫進玩家的雲端存檔與對戰房間
const IS_TEST=/-test(\/|$)/.test(location.pathname);
async function fbDb(){
  if(IS_TEST)throw new Error("測試版不開放雲端存檔與網路對戰");
  if(FB_DB)return FB_DB;
  await loadScript(FB_SDK+"firebase-app-compat.js");
  await loadScript(FB_SDK+"firebase-database-compat.js");
  firebase.initializeApp(FB_CFG);FB_DB=firebase.database();return FB_DB;
}
function genCode(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<5;i++)s+=c[Math.floor(rnd()*c.length)];return s;}
function setDuelMode(m){if(NET){toast("請先離開房間");return;}DUEL_MODE=m;DUEL=null;render();}
function netFail(e){console.error(e);toast("連線失敗："+(e&&e.message||e));if(NET&&NET.ref)leaveOnline();else{NET=null;render();}}

async function hostRoom(mode){
  if(NET)return;
  if(mode==="own"&&!SAVE.team.length){toast("先到「隊伍」編好至少 1 名角色");return;}
  if(mode==="coop"&&!Object.keys(SAVE.owned).length){toast("還沒有角色");return;}
  if(mode==="t2"&&!SAVE.team.length){toast("先到「隊伍」編好至少 1 名角色");return;}
  const md=mode==="own"||mode==="coop"||mode==="t2"?mode:"std";
  NET={status:"connecting"};render();
  try{
    const db=await fbDb();let code=null,ref=null;
    for(let i=0;i<5&&!code;i++){
      const c=genCode(),r=db.ref("rooms/"+c);
      const tx=await r.transaction(cur=>cur?undefined:{t:Date.now(),m:md});
      if(tx.committed){code=c;ref=r;}
    }
    if(!code)throw new Error("無法建立房間");
    ref.onDisconnect().remove();
    NET={ref,code,side:"A",status:"room",gone:false,mode:md,seat:0};
    if(md==="t2"){ // 團隊賽：房主是座位 0，訪客座位 1～3；隊伍（tm/座位 = A 或 B）由玩家自己選，每隊最多 2 人，房主預設在 A 隊
      DUEL={phase:"own",step:0,picks:{A:[],B:[]},online:true,own:{},seats:{},tm:{0:"A"}};
      t2Init();
      ref.child("tm/0").set("A");
      ref.child("tm").on("value",onTmT2);
      ref.child("g").on("value",onSeatsT2);
      ref.child("own").on("value",onOwnT2);
      ref.child("gl").on("value",onGoneT2);
      ref.child("act").on("value",s=>{const v=s.val();if(v&&CUR_B&&CUR_B.remoteResolve)CUR_B.remoteResolve(v);});
      render();return;
    }
    DUEL={phase:"lobby",step:0,picks:{A:[],B:[]},online:true,own:{}};
    if(md==="coop")coopInit();
    ref.child("guest").on("value",s=>{if(s.val()&&DUEL&&DUEL.phase==="lobby"){DUEL.phase=isOwnMode(NET.mode)?"own":"draft";SFX.sr();toast(NET.mode==="coop"?"隊友加入了！":"對手加入了！");render();}});
    if(isOwnMode(NET.mode))ref.child("own").on("value",onOwn);
    ref.child("gl").on("value",s=>{if(s.val())opponentLeft();});
    ref.child("draft").on("value",onDraft);
    ref.child("act").on("value",s=>{const v=s.val();if(v&&CUR_B&&CUR_B.remoteResolve)CUR_B.remoteResolve(v);});
    render();
  }catch(e){NET=null;netFail(e);}
}
async function joinRoom(code){
  code=(code||"").toUpperCase().trim();
  if(!/^[A-Z0-9]{5}$/.test(code)){toast("房號是5碼英數字");return;}
  if(NET)return;
  JOIN_CODE=code;NET={status:"connecting"};render();
  try{
    const db=await fbDb(),ref=db.ref("rooms/"+code);
    if(!(await ref.child("t").once("value")).exists())throw new Error("找不到房間 "+code);
    if((await ref.child("m").once("value")).val()==="t2"){await joinT2(ref,code);return;}
    const tx=await ref.child("guest").transaction(cur=>cur?undefined:Date.now());
    if(!tx.committed)throw new Error("房間已經有人了");
    const mv=(await ref.child("m").once("value")).val(),mode=mv==="own"||mv==="coop"?mv:"std";
    if(mode==="own"&&!SAVE.team.length){ref.child("guest").remove();throw new Error("這是養成賽，請先到「隊伍」編好角色");}
    if(mode==="coop"&&!Object.keys(SAVE.owned).length){ref.child("guest").remove();throw new Error("還沒有角色");}
    ref.child("gl").onDisconnect().set(true);
    NET={ref,code,side:"B",status:"room",gone:false,mode};
    DUEL={phase:isOwnMode(mode)?"own":"draft",step:0,picks:{A:[],B:[]},online:true,own:{}};
    if(mode==="coop")coopInit();
    if(isOwnMode(mode))ref.child("own").on("value",onOwn);
    ref.child("t").on("value",s=>{if(!s.exists())hostLeft();});
    ref.child("draft").on("value",onDraft);
    ref.child("snap").on("value",s=>applySnap(s.val()));
    render();
  }catch(e){NET=null;netFail(e);}
}
// ---- 養成賽：雙方帶自己的隊伍（等級、星數、突破、裝備都算進去），不給任何獎勵 ----
const isOwnMode=m=>m==="own"||m==="coop";
function myOwnSpec(){return (NET&&NET.mode==="coop"?DUEL.coopPick:NET&&NET.mode==="t2"?(DUEL.t2Pick||[]):SAVE.team.slice(0,3)).map(id=>{const u=teamUnit(id,!!(NET&&NET.mode==="t2"));u.gx=u.gx||{};return u;});}
// 房主不信任挑戰者送來的數字：只收合理範圍內的值
function sanOwn(arr,max=3){
  const cl=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(+v)?+v:a)),seen=new Set(),out=[];
  Object.values(arr||{}).slice(0,max).forEach(x=>{
    if(!x||!CARDS[x.id]||seen.has(x.id))return;seen.add(x.id);
    const stars=Math.round(cl(x.stars,1,5)),br=Math.round(cl(x.br,0,BR_MAX)),scale=cl(x.scale,1,lvMul(LV_MAX)),g=x.gx||{};
    const base=cardStats(x.id,stars,scale,br);
    out.push({id:x.id,stars,scale,br,maxHp:Math.round(cl(x.maxHp,base.maxHp,base.maxHp+2000)),
      atk:Math.round(cl(x.atk,0,300)),def:Math.round(cl(x.def,0,200)),spd:Math.round(cl(x.spd,0,60)),
      gx:{crit:cl(g.crit,0,100),steal:cl(g.steal,0,100),dodge:cl(g.dodge,0,100),dr:cl(g.dr,0,DR_CAP)}});
  });
  return out;
}
function onOwn(s){
  if(!DUEL||!DUEL.online||!NET)return;
  const v=s.val()||{};DUEL.own={A:v.A?Object.values(v.A):null,B:v.B?Object.values(v.B):null};
  DUEL.ownOrder=DUEL.ownOrder||[];["A","B"].forEach(k=>{if(DUEL.own[k]&&!DUEL.ownOrder.includes(k))DUEL.ownOrder.push(k);}); // 誰先按準備，同一角色就算誰的
  if(VIEW==="duel")render();
  if(NET.side==="A"&&DUEL.own.A&&DUEL.own.B&&!DUEL.started)setTimeout(NET.mode==="coop"?startCoopBattle:startOwnBattle,900);
}
function readyOwn(){
  if(!NET||!NET.ref||DUEL.ownReady)return;
  if(NET.mode==="coop"){
    const mate=DUEL.own&&DUEL.own[NET.side==="A"?"B":"A"],taken=mate?mate.map(x=>x.id):[];
    DUEL.coopPick=DUEL.coopPick.filter(id=>!taken.includes(id));
    if(!DUEL.coopPick.length){toast("至少要選 1 名角色");return;}
  }else if(!SAVE.team.length){toast("先到「隊伍」編好角色");return;}
  if(NET.mode==="t2"){ // 隊友已經先帶了同樣的角色：全部重複的話沒有角色能上場，不讓準備
    if(!t2Team(NET.seat)){toast("還在分配隊伍，請稍等");return;}
    if(!(DUEL.t2Pick||[]).length){toast("至少要選 1 名角色");return;}
    const taken=t2Taken();
    if(!myOwnSpec().some(u=>!taken.includes(u.id))){toast("你選的角色全都被隊友先帶走了，請換別的角色");return;}
  }
  DUEL.ownReady=true;NET.ref.child("own/"+(NET.mode==="t2"?NET.seat:NET.side)).set(myOwnSpec()).catch(netFail);SFX.click();render();
}
// ---- 合作討伐：兩個帳號各帶 4 名角色，一起打偽永夜帝王；同一角色先按準備的人先用，目前不掉落裝備 ----
const COOP_N=4;
function coopInit(){
  const ids=Object.keys(SAVE.owned).sort((a,b)=>R_ORDER[CARDS[a].r]-R_ORDER[CARDS[b].r]||lvOf(b)-lvOf(a));
  DUEL.coopPick=SAVE.team.filter(id=>SAVE.owned[id]).slice(0,COOP_N);
  ids.forEach(id=>{if(DUEL.coopPick.length<COOP_N&&!DUEL.coopPick.includes(id))DUEL.coopPick.push(id);});
}
function coopToggle(id){
  if(DUEL.ownReady)return;
  const p=DUEL.coopPick,i=p.indexOf(id);
  if(i>=0)p.splice(i,1);else if(p.length<COOP_N)p.push(id);else{toast(`最多帶 ${COOP_N} 名`);return;}
  SFX.click();render();
}
function startCoopBattle(){
  if(!NET||!DUEL||DUEL.started)return;
  const order=DUEL.ownOrder&&DUEL.ownOrder.length===2?DUEL.ownOrder:["A","B"],seen=new Set(),dup=[],units=[];
  order.forEach(side=>sanOwn(DUEL.own[side],COOP_N).forEach(u=>{
    if(seen.has(u.id)){dup.push(CARDS[u.id].name);return;}
    seen.add(u.id);units.push({...u,pl:side});
  }));
  if(!units.some(u=>u.pl==="A")||!units.some(u=>u.pl==="B")){toast("隊友的隊伍資料異常");leaveOnline();return;}
  DUEL.started=true;DUEL.phase="battle";
  const M=MONSTERS.fakenight;
  startBattle({title:"合作討伐・偽永夜帝王 · 房間 "+NET.code,home:"duel",maxRound:200,coop:true,ctrl:{A:"human",B:"ai"},labels:{A:"我方",B:"偽王"},online:NET,
    A:units,B:[{id:"fakenight",stars:1,gx:M.gx}].concat([0,1,2,3].map(()=>({id:"fakenight_m",stars:1,gx:BOSS_MINION.fakenight.gx||{}}))),
    intro:`「${M.quote}」（偽夜行者 ×4 站到了他的身後）${dup.length?`（${dup.join("、")} 已被先準備的玩家帶上場，後面的玩家不能重複上場）`:""}　⚠ 目前是測試階段，打贏不會掉落裝備，只有 🪙${COOP_GOLD}（每天最多 ${COOP_DAILY} 次）。`,
    resultNote:B=>B.over==="A"?`偽永夜帝王倒下了。獲得 🪙${COOP_GOLD}（每天最多 ${COOP_DAILY} 次；測試階段：沒有掉落裝備）`:"偽王太強了……",
    onEnd(win){coopReward(win);leaveOnline();}});
}
// 合作討伐獎勵：打贏每人 🪙300，目前不掉落裝備。房主與隊友各自在自己的裝置領取（結算按鈕只會觸發一次）
const COOP_GOLD=500,COOP_DAILY=15; // 每人每天最多領 15 次，依這台裝置的日期計算
const coopToday=()=>new Date().toLocaleDateString("sv");
function coopLeft(){const c=SAVE.coop;return c&&c.d===coopToday()?Math.max(0,COOP_DAILY-c.n):COOP_DAILY;}
function coopReward(win){
  if(!win)return;
  if(!SAVE.coop||SAVE.coop.d!==coopToday())SAVE.coop={d:coopToday(),n:0};
  if(SAVE.coop.n>=COOP_DAILY){toast(`今天的合作討伐獎勵已領滿（${COOP_DAILY} 次），明天再來`);return;}
  SAVE.coop.n++;SAVE.gold+=COOP_GOLD;save();toast(`🪙+${COOP_GOLD}（合作討伐獎勵，今天 ${SAVE.coop.n}／${COOP_DAILY} 次）`);
}
// 團隊賽獎勵：我方隊伍獲勝、戰鬥超過 T2_MIN_ROUND 回合，每人 🪙T2_GOLD；每人每天最多 T2_DAILY 次（用這台裝置的日期計算）。平手、輸、速戰速決都沒有
const T2_GOLD=666,T2_MIN_ROUND=10,T2_DAILY=10;
function t2Left(){const c=SAVE.t2;return c&&c.d===coopToday()?Math.max(0,T2_DAILY-c.n):T2_DAILY;}
function t2Reward(B){
  if(!B||B.over!==B.mySide||!(B.round>T2_MIN_ROUND))return;
  if(!SAVE.t2||SAVE.t2.d!==coopToday())SAVE.t2={d:coopToday(),n:0};
  if(SAVE.t2.n>=T2_DAILY){toast(`今天的團隊賽獎勵已領滿（${T2_DAILY} 次），明天再來`);return;}
  SAVE.t2.n++;SAVE.gold+=T2_GOLD;save();toast(`🪙+${T2_GOLD}（團隊賽獎勵，今天 ${SAVE.t2.n}／${T2_DAILY} 次）`);
}
function t2Note(B){
  if(B.over==="D")return "回合數用盡，雙方平手，沒有獎勵。";
  if(B.over!==B.mySide)return "這次沒有獎勵。";
  if(!(B.round>T2_MIN_ROUND))return `這場只打了 ${B.round} 回合，要超過 ${T2_MIN_ROUND} 回合才有獎勵。`;
  if(t2Left()<=0)return `獲勝！但今天的團隊賽獎勵已領滿（${T2_DAILY} 次），明天再來。`;
  return `獲勝！按「繼續」領取 🪙${T2_GOLD}（每人每天最多 ${T2_DAILY} 次，今天還剩 ${t2Left()} 次）。`;
}
function startOwnBattle(){
  if(!NET||!DUEL||DUEL.started)return;
  const a=sanOwn(DUEL.own.A),b=sanOwn(DUEL.own.B);
  if(!a.length||!b.length){toast("對手的隊伍資料異常");leaveOnline();return;}
  DUEL.started=true;DUEL.phase="battle";
  startBattle({title:"養成賽 · 房間 "+NET.code,home:"duel",ctrl:{A:"human",B:"remote"},labels:{A:"你",B:"對手"},online:NET,
    A:a,B:b,intro:"連線建立。兩支養成過的隊伍在禁閉室中央對峙。",
    onEnd(){leaveOnline();}});
}
// 團隊賽的隊伍：tm/{座位} = "A" 或 "B"，由玩家自己選，每隊最多 2 人
const T2_COUNTDOWN=3000; // 4 人都準備好後的倒數（毫秒），倒數中任何人取消準備就中止
const t2Team=k=>(DUEL&&DUEL.tm&&DUEL.tm[k])||null;
function t2Init(){DUEL.t2Pick=SAVE.team.filter(id=>SAVE.owned[id]).slice(0,3);}
// 同隊隊友已準備好、帶走的角色
function t2Taken(){
  const my=t2Team(NET.seat),out=[];
  [0,1,2,3].forEach(k=>{if(k!==NET.seat&&my&&t2Team(k)===my&&DUEL.own&&DUEL.own[k])DUEL.own[k].forEach(x=>out.push(x.id));});
  return out;
}
function t2Toggle(id){
  if(!DUEL||DUEL.ownReady)return;
  if(t2Taken().includes(id)){toast("這個角色已被隊友帶走");return;}
  const p=DUEL.t2Pick,i=p.indexOf(id);
  if(i>=0)p.splice(i,1);else if(p.length<3)p.push(id);else{toast("最多帶 3 名");return;}
  SFX.click();render();
}
// 房間內換裝：準備前才能改（準備時才會把裝備數值送出去）
function t2Gear(id){
  if(!DUEL||DUEL.ownReady||DUEL.started||!SAVE.owned[id])return;
  const o=SAVE.owned[id],e=equipBonus(id,true);
  openModal(`<h3>${CARDS[id].name} 的裝備 ${clsTag(id)}</h3>
    <div class="small">加成：${statStr(e)||"無"}</div>
    <div class="gslots">${Object.keys(SLOTS).map(sl=>{const g=gearById(o.eq&&o.eq[sl]);
      return `<div class="gslot ${g?"has "+GEAR[g.base].q:""}" onclick="t2Slot('${id}','${sl}')"><div class="gi">${g?gearImg(g.base):"＋"}</div>${g?`<b class="r${GEAR[g.base].q}">${qTag(GEAR[g.base].q)}${GEAR[g.base].name}${g.lv?" +"+g.lv:""}</b>${lvOk(id,g.base)?"":`<div class="req bad">⚠ 需 Lv.${GEAR_REQ[GEAR[g.base].q]}，未生效</div>`}`:`<span class="dim">${SLOTS[sl]}</span>`}</div>`;}).join("")}</div>
    ${setHtml(id)}
    <div class="row" style="margin-top:12px"><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
function t2Slot(id,sl){
  if(!DUEL||DUEL.ownReady||DUEL.started)return;
  const cur=SAVE.owned[id].eq&&SAVE.owned[id].eq[sl];
  const list=SAVE.gear.filter(g=>GEAR[g.base].slot===sl&&g.uid!==cur).sort(gearSort);
  const ok=list.filter(g=>canWear(id,g.base)&&lvOk(id,g.base));
  openModal(`<h3>${CARDS[id].name} 的${SLOTS[sl]} ${clsTag(id)}</h3>
    ${cur?`<div class="row" style="margin-bottom:8px"><span>目前：<b>${qTag(GEAR[gearById(cur).base].q)}${gearName(gearById(cur))}</b> ${statStr(gearStats(gearById(cur)))}</span><button class="mini" style="margin-left:auto" onclick="t2TakeOff('${id}','${sl}')">卸下</button></div>`:""}
    <div class="ggrid">${ok.map(g=>gearCard(g,`t2Wear('${id}',${g.uid})`)).join("")||`<span class="dim">沒有可以穿的${SLOTS[sl]}。</span>`}</div>
    <p class="dim small">穿在別的角色身上的裝備也能直接換過來。穿戴等級：普通／稀有 不限、精良 Lv.5、史詩 Lv.10、傳說 Lv.15。</p>
    <div class="row" style="margin-top:12px"><button onclick="t2Gear('${id}')">← 返回角色</button></div>`);
}
function t2Wear(id,uid){if(!DUEL||DUEL.ownReady||DUEL.started)return;equipTo(id,uid);t2Gear(id);render();}
function t2TakeOff(id,sl){if(!DUEL||DUEL.ownReady||DUEL.started)return;delete SAVE.owned[id].eq[sl];save();t2Gear(id);render();}
function t2Unready(){
  if(!NET||NET.mode!=="t2"||!DUEL||DUEL.started||!DUEL.ownReady)return;
  DUEL.ownReady=false;NET.ref.child("own/"+NET.seat).remove().catch(netFail);SFX.click();render();
}
// 換隊：只能在還沒準備時換，目標隊伍要有空位（用交易避免兩人同時搶位）
function t2Switch(t){
  if(!NET||NET.mode!=="t2"||!DUEL||DUEL.ownReady||DUEL.started)return;
  if(t2Team(NET.seat)===t)return;
  NET.ref.child("tm").transaction(cur=>{
    cur=cur||{};const cnt=[0,1,2,3].filter(k=>k!==NET.seat&&cur[k]===t).length;
    if(cnt>=2)return;
    const o={};[0,1,2,3].forEach(k=>{if(cur[k])o[k]=cur[k];});o[NET.seat]=t;return o;
  }).then(r=>{if(!r.committed)toast("那一隊已經滿了");}).catch(netFail);
}
function onTmT2(s){
  if(!DUEL||!NET||NET.mode!=="t2")return;
  const v=s.val()||{},tm={};[0,1,2,3].forEach(k=>{if(v[k])tm[k]=v[k];});
  DUEL.tm=tm;
  if(VIEW==="duel")render();
  onOwnT2(null);
}
// ---- 團隊賽 2v2（養成賽規則）：4 個座位，房主 = 座位 0；隊伍由玩家自己選（每隊 2 人）。每人在房間內挑最多 3 名角色，獎勵見 T2_GOLD ----
// 資料庫：g/{1~3} 訪客佔位、tm/{0~3} 所屬隊伍、gl/{1~3} 訪客離開、own/{0~3} 各人的出戰隊伍（開打時由房主清空）、act（訪客操作，帶座位 s）、snap（房主推送的戰況）
async function joinT2(ref,code){
  if(!Object.keys(SAVE.owned).length)throw new Error("這是團隊賽，你還沒有角色");
  let seat=0;
  for(let n=1;n<=3&&!seat;n++){
    const tx=await ref.child("g/"+n).transaction(cur=>cur?undefined:Date.now());
    if(tx.committed)seat=n;
  }
  if(!seat)throw new Error("房間已經滿了（最多 4 人）");
  // 自動分到人比較少的隊伍（一樣多就 A 隊），進房後可以自己換隊
  const tt=await ref.child("tm").transaction(cur=>{
    cur=cur||{};const cnt={A:0,B:0};[0,1,2,3].forEach(k=>{if(cur[k]&&k!==seat)cnt[cur[k]]++;});
    const t=cnt.A<=cnt.B?"A":"B";if(cnt[t]>=2)return;
    const o={};[0,1,2,3].forEach(k=>{if(cur[k]&&k!==seat)o[k]=cur[k];});o[seat]=t;return o;
  });
  if(!tt.committed){ref.child("g/"+seat).remove();throw new Error("房間已經滿了（最多 4 人）");}
  ref.child("gl/"+seat).onDisconnect().set(true);
  NET={ref,code,side:"B",status:"room",gone:false,mode:"t2",seat};
  DUEL={phase:"own",step:0,picks:{A:[],B:[]},online:true,own:{},seats:{},tm:{}};
  t2Init();
  ref.child("tm").on("value",onTmT2);
  ref.child("g").on("value",onSeatsT2);
  ref.child("own").on("value",onOwnT2);
  ref.child("t").on("value",s=>{if(!s.exists())hostLeft();});
  ref.child("snap").on("value",s=>applySnap(s.val()));
  render();
}
function onSeatsT2(s){
  if(!DUEL||!NET||NET.mode!=="t2")return;
  const v=s.val()||{},old=DUEL.seats||{},seats={1:!!v[1],2:!!v[2],3:!!v[3]};
  DUEL.seats=seats;
  if([1,2,3].some(k=>seats[k]&&!old[k]))SFX.sr();
  if(VIEW==="duel")render();
  onOwnT2(null);
}
function onOwnT2(s){
  if(!DUEL||!DUEL.online||!NET||NET.mode!=="t2")return;
  if(s){
    const v=s.val()||{};DUEL.ownRaw=v;
  }
  const v=DUEL.ownRaw||{};DUEL.own={};DUEL.ownOrder=(DUEL.ownOrder||[]).filter(k=>v[k]); // 誰先按準備，同隊同一角色就算誰的
  [0,1,2,3].forEach(k=>{const x=v[k];DUEL.own[k]=x?Object.values(x):null;if(x&&!DUEL.ownOrder.includes(k))DUEL.ownOrder.push(k);});
  if(!DUEL.started)DUEL.ownReady=!!v[NET.seat];
  if(VIEW==="duel")render();
  t2CheckStart();
}
const t2AllReady=()=>{const seats=DUEL.seats||{};return [0,1,2,3].every(k=>DUEL.own[k]&&(k===0||seats[k])&&t2Team(k));};
// 房主：4 人都準備好就倒數開打；倒數中有人取消準備或離開就中止
function t2CheckStart(){
  if(!NET||NET.side!=="A"||!DUEL||DUEL.started||NET.mode!=="t2")return;
  const d=DUEL;
  if(t2AllReady()){if(!d.cdT)d.cdT=setTimeout(()=>{d.cdT=null;if(DUEL===d)startT2Battle();},T2_COUNTDOWN);}
  else if(d.cdT){clearTimeout(d.cdT);d.cdT=null;}
}
// 房主：訪客離開。開打前把座位讓出來；開打後只讓 AI 接手那個人的角色，其他人繼續打
function onGoneT2(s){
  if(!NET||NET.mode!=="t2"||NET.side!=="A"||!DUEL)return;
  const v=s.val()||{};
  [1,2,3].forEach(n=>{
    if(!v[n])return;
    const B=CUR_B;
    if(B&&B.t2&&!B.over){
      NET.gs=NET.gs||{};
      if(NET.gs[n])return;
      NET.gs[n]=true;blog(B,`📴 玩家${n+1} 斷線了，由 AI 接手他的角色。`,"bad");
      if(B.rwait&&B.rwait.pl===String(n)&&B.remoteResolve)B.remoteResolve({ai:true});
      render();
    }else if(!DUEL.started){
      ["g/","own/","gl/","tm/"].forEach(p=>NET.ref.child(p+n).remove().catch(()=>{}));
    }
  });
}
function startT2Battle(){
  if(!NET||!DUEL||DUEL.started||NET.mode!=="t2")return;
  if(!t2AllReady())return; // 倒數期間有人離開：不開打，等人補上
  const seen={A:new Set(),B:new Set()},dup=[],team={A:[],B:[]},tm=DUEL.tm;
  (DUEL.ownOrder||[]).forEach(k=>{
    const sd=tm[k];if(!sd)return;
    sanOwn(DUEL.own[k],3).forEach(u=>{
      if(seen[sd].has(u.id)){dup.push(CARDS[u.id].name);return;}
      seen[sd].add(u.id);team[sd].push({...u,pl:String(k)});
    });
  });
  if(!team.A.length||!team.B.length){toast("有玩家的隊伍資料異常");leaveOnline();return;}
  ["A","B"].forEach(sd=>team[sd].sort((a,b)=>a.pl-b.pl));
  DUEL.started=true;DUEL.phase="battle";
  NET.ref.child("own").remove().catch(()=>{}); // 清掉準備狀態，打完回到房間時大家重新準備
  const ps=sd=>[0,1,2,3].filter(k=>tm[k]===sd).map(k=>"玩家"+(k+1)).join("、");
  startBattle({title:"團隊賽 2v2 · 房間 "+NET.code,home:"duel",t2:true,maxRound:100,mySide:tm[0],ctrl:{A:"remote",B:"remote"},labels:{A:"A隊",B:"B隊"},online:NET,
    A:team.A,B:team.B,
    intro:`連線建立。A 隊（${ps("A")}）對上 B 隊（${ps("B")}）。${dup.length?`（${dup.join("、")} 在同隊已被先準備的玩家帶上場，後面的玩家不能重複上場）`:""}`,
    resultNote:t2Note,
    onEnd(win,B){t2Reward(B);t2Back();}});
}
// 打完一場：留在同一個房間，座位和隊伍不變，回到準備畫面（斷線的玩家座位由房主釋出）
function t2Back(){
  if(!NET||NET.mode!=="t2"||!DUEL){leaveOnline();return;}
  const ref=NET.ref,host=NET.side==="A";
  clearTimeout(SNAP_T);SNAP_T=null;
  if(DUEL.cdT){clearTimeout(DUEL.cdT);DUEL.cdT=null;}
  CUR_B=null;NET.gs={};
  Object.assign(DUEL,{phase:"own",started:false,ownReady:false});
  VIEW="duel";onOwnT2(null);render();
  if(host){
    ref.child("snap").remove().catch(()=>{});ref.child("act").remove().catch(()=>{});
    ref.child("gl").once("value").then(s=>{const v=s.val()||{};[1,2,3].forEach(n=>{if(v[n])["g/","tm/","gl/","own/"].forEach(p=>ref.child(p+n).remove().catch(()=>{}));});onOwnT2(null);}).catch(()=>{});
  }else ref.child("t").once("value").then(s=>{if(!s.exists()&&NET){toast("房主離開了，連線結束");leaveOnline();}}).catch(()=>{});
}
function viewT2(){
  const leave=`<button onclick="leaveOnline()">離開房間</button>`,me=NET.seat,own=DUEL.own||{},seats=DUEL.seats||{},tm=DUEL.tm||{};
  const here=k=>k===0||!!seats[k],myT=tm[me];
  const av=u=>`<div class="ccard ${CARDS[u.id].r}"><div class="av">${avatar(u.id)}</div><div class="nm">${CARDS[u.id].name}</div><div class="small">${u.stars}★${u.br?" 突破"+u.br:""}</div></div>`;
  // 只有自己隊伍的角色看得到；對面隊伍開打前保密，只顯示「已加入／已準備」
  const box=k=>{const x=own[k],mine=tm[k]===myT;
    const st=x?`<span style="color:#7bd88f">✅ 已準備</span>`:`<span class="dim">⏳ 已加入・未準備</span>`;
    return `<div class="panel" style="flex:1;min-width:200px;${k===me?"border-color:var(--gold)":""}"><b>玩家${k+1}${k===0?"（房主）":""}${k===me?"（你）":""}</b>
      <span class="small" style="margin-left:6px">${st}</span>${x&&mine?`<div class="cardgrid">${sanOwn(x).map(av).join("")}</div>`:x?`<div class="dim small">🔒 角色開打前保密</div>`:""}</div>`;};
  const slot=(t,full)=>`<div class="panel" style="flex:1;min-width:200px;border-style:dashed;text-align:center"><span class="dim">空位</span>
    ${myT!==t&&!DUEL.ownReady&&!full?`<div style="margin-top:6px"><button class="gold" onclick="t2Switch('${t}')">換到 ${t} 隊</button></div>`:""}</div>`;
  const team=t=>{
    const ks=[0,1,2,3].filter(k=>here(k)&&tm[k]===t),empty=Math.max(0,2-ks.length);
    return `<h3>${t} 隊${t===myT?"（你的隊伍）":""}</h3><div class="row">${ks.map(box).join("")}${Array.from({length:empty},()=>slot(t,false)).join("")}</div>`;
  };
  const link=location.origin+location.pathname+"?room="+NET.code;
  const taken=t2Taken(),pick=DUEL.t2Pick||[];
  const ids=Object.keys(SAVE.owned).sort((a,b)=>R_ORDER[CARDS[a].r]-R_ORDER[CARDS[b].r]||lvOf(b)-lvOf(a));
  const ready=DUEL.ownReady;
  return `<div class="row"><span class="dim">房間 ${NET.code}・團隊賽 2v2</span><span style="margin-left:auto">${leave}</span></div>
    ${me===0?`<div class="panel" style="text-align:center"><div class="dim">房號</div>
      <div style="font-size:44px;font-weight:900;letter-spacing:10px;color:var(--gold)">${NET.code}</div>
      <div class="small dim" style="word-break:break-all">${link}</div>
      <div class="row" style="justify-content:center;margin-top:10px"><button class="gold" onclick="copyLink('${link}')">📋 複製邀請連結</button></div></div>`:""}
    ${team("A")}${team("B")}
    <h3>你的出戰角色（${pick.length}／3）</h3>
    <div class="cardgrid">${ids.map(id=>{const c=CARDS[id],on=pick.includes(id),tk=taken.includes(id);
      return `<div class="ccard ${c.r} ${tk?"locked":""}" style="${on?"outline:3px solid var(--gold)":tk||ready?"opacity:.5":""}" onclick="${tk?"":`t2Toggle('${id}')`}"><div class="av">${avatar(id)}</div><div class="nm">${c.name}</div><div class="small">Lv.${lvOf(id)}${tk?"・隊友已選":""}</div></div>`;}).join("")}</div>
    ${pick.length&&!ready?`<div class="row" style="margin-top:8px"><span class="dim small">換裝：</span>${pick.map(id=>`<button class="mini" onclick="t2Gear('${id}')">🎽 ${CARDS[id].name}</button>`).join("")}</div>`:""}
    <div class="row" style="margin-top:12px">${ready?`<button onclick="t2Unready()">↩ 取消準備（可換角色、換隊）</button><span class="dim">${t2AllReady()?`4 人都準備好了，${T2_COUNTDOWN/1000} 秒後自動開始（現在取消準備可中止）`:"已準備，等其他玩家……（4 人都準備好會自動倒數開始）"}</span>`:`<button class="pri" onclick="readyOwn()">✅ 準備好了</button>`}</div>
    <p class="dim small">每隊 2 人，進房後可以按空位的「換到 X 隊」自己選隊伍。在房間內從你擁有的角色挑最多 3 名出戰（等級、星數、突破、裝備都算）；準備前都能改，準備後想改就按「取消準備」。對面隊伍開打前看不到角色，隊友的看得到。獲勝且戰鬥超過 ${T2_MIN_ROUND} 回合，每人可得 🪙${T2_GOLD}（每天最多 ${T2_DAILY} 次，你今天還剩 ${t2Left()} 次）。同隊不能重複帶同一個角色，先按準備的先用。你只操作自己的角色；${T2_TIMEOUT/1000} 秒沒動作或斷線，改由 AI 代打。打完會回到這個房間，不用重新開房；房主關掉網頁，房間就解散。</p>`;
}
function onDraft(s){
  if(!DUEL||!DUEL.online||!NET)return;
  const v=s.val(),p=(v&&v.p)||[];
  DUEL.picks={A:[],B:[]};p.forEach((id,i)=>DUEL.picks[DRAFT_ORDER[i]].push(id));DUEL.step=p.length;
  if(p.length)SFX.flip();
  if(VIEW==="duel")render();
  if(NET.side==="A"&&p.length>=6&&!DUEL.started)setTimeout(startOnlineBattle,900);
}
function onlinePick(id){
  const d=DUEL;if(!NET||!NET.ref||d.step>=6||DRAFT_ORDER[d.step]!==NET.side)return;
  NET.ref.child("draft").transaction(cur=>{
    const p=(cur&&cur.p)||[];
    if(p.length>=6||DRAFT_ORDER[p.length]!==NET.side||p.includes(id))return;
    return {p:p.concat(id)};
  }).catch(netFail);
}
function startOnlineBattle(){
  if(!NET||!DUEL||DUEL.started)return;
  DUEL.started=true;DUEL.phase="battle";
  startBattle({title:"網路對決 · 房間 "+NET.code,home:"duel",ctrl:{A:"human",B:"remote"},labels:{A:"你",B:"對手"},online:NET,
    A:DUEL.picks.A.map(id=>({id,stars:3})),B:DUEL.picks.B.map(id=>({id,stars:3})),
    intro:"連線建立。兩支隊伍在禁閉室中央對峙。",
    onEnd(){leaveOnline();}});
}

/* ---- 房主：等待挑戰者操作、推送快照 ---- */
function waitRemote(B,u){
  return new Promise(res=>{
    const seq=++B.rseq;let done=false,tm=null;
    const finish=a=>{if(done)return;done=true;clearTimeout(tm);B.rwait=null;B.remoteResolve=null;res(a);};
    B.rwait={uid:u.uid,seq,pl:u.pl||""};
    B.remoteResolve=m=>{if(m.ai)return finish(aiChoose(B,u));if(m.seq===seq&&(!B.t2||String(m.s)===String(u.pl)))finish(decodeAction(B,u,m));};
    if(B.online.gone||(B.t2&&B.online.gs&&B.online.gs[u.pl]))return finish(aiChoose(B,u));
    tm=setTimeout(()=>{blog(B,`⏰ ${nm(u)} 逾時未行動，自動出手。`);finish(aiChoose(B,u));},B.t2?T2_TIMEOUT:REMOTE_TIMEOUT);
    render();
  });
}
// 對方送來的操作一律重新驗證，不合法就改由 AI 決定
function decodeAction(B,u,m){
  const t=m.t?B.units.find(x=>x.uid===m.t):null;
  if(m.type==="guard")return {type:"guard"};
  if(m.type==="attack"&&validTargets(B,u,"enemy").includes(t))return {type:"attack",target:t};
  if(m.type==="skill"&&canUseSkill(B,u)){
    const sk=DEF(u.id).skill;
    if(!["enemy","ally","mate"].includes(sk.t)||validTargets(B,u,sk.t).includes(t))return {type:"skill",target:t};
  }
  return aiChoose(B,u);
}
function pushSnap(B){
  if(SNAP_T||!NET||!NET.ref)return;
  SNAP_T=setTimeout(()=>{
    SNAP_T=null;if(!NET||!NET.ref)return;
    NET.ref.child("snap").set({title:B.title,coop:B.coop?1:0,t2:B.t2?1:0,waitPl:B.rwait?B.rwait.pl||"":"",round:B.round,over:B.over||"",active:B.active?B.active.uid:0,wall:B.wall,
      waitUid:B.rwait?B.rwait.uid:0,waitSeq:B.rwait?B.rwait.seq:0,log:B.log.slice(-40),
      units:B.units.map(u=>({uid:u.uid,id:u.id,name:u.name,side:u.side,stars:u.stars,maxHp:u.maxHp,hp:u.hp,atk:u.atk,def:u.def,spd:u.spd,
        cd:u.cd,buffs:u.buffs,st:u.st,perm:u.perm,alive:u.alive,ally:u.ally,pl:u.pl||"",p2:u.flags.p2?1:0,fr:u.flags.frenzy?1:0}))
    }).catch(()=>{});
  },80);
}
function opponentLeft(){
  if(!NET||NET.gone)return;
  NET.gone=true;
  if(CUR_B&&CUR_B.online&&!CUR_B.over){blog(CUR_B,"📴 對手斷線了，由 AI 接手他的隊伍。","bad");if(CUR_B.remoteResolve)CUR_B.remoteResolve({ai:true});render();}
  else if(!CUR_B){toast("對手離開了房間");leaveOnline();}
}

/* ---- 挑戰者：用快照重建戰鬥畫面 ---- */
function applySnap(s){
  if(!s||!NET||NET.side!=="B")return;
  const prev=CUR_B&&CUR_B.guest?CUR_B:null;
  if(!prev&&s.over)return; // 回到房間後遇到上一場殘留的結束快照：忽略
  // Firebase 不存空陣列／空物件，要補回預設值
  const units=(s.units||[]).map(u=>Object.assign(u,{buffs:u.buffs||[],st:u.st||{},perm:u.perm||{},flags:{p2:u.p2||0,frenzy:u.fr||0}}));
  const B=prev||(s.t2?{guest:true,t2:true,ctrl:{A:"remote",B:"remote"},labels:{A:"A隊",B:"B隊"},mySide:t2Team(NET.seat)||"B",mySeat:String(NET.seat),items:null,flags:{},done:false,online:NET,
    cfg:{resultNote:t2Note,onEnd:(win,B)=>{t2Reward(B);t2Back();}}}:s.coop?{guest:true,coop:true,ctrl:{A:"remote",B:"ai"},labels:{A:"我方",B:"偽王"},mySide:"A",items:null,flags:{},done:false,online:NET,
    cfg:{onEnd:win=>{coopReward(win);leaveOnline();}}}:{guest:true,ctrl:{A:"remote",B:"human"},labels:{A:"對手",B:"你"},mySide:"B",items:null,flags:{},done:false,online:NET,
    cfg:{onEnd:()=>leaveOnline()}});
  const diffs=[];
  if(prev)units.forEach(u=>{const o=prev.units.find(x=>x.uid===u.uid);if(o&&o.hp!==u.hp)diffs.push([u,u.hp-o.hp]);});
  Object.assign(B,{title:s.title,round:s.round,units,log:s.log||[],wall:s.wall||{},over:s.over||null});
  B.active=units.find(u=>u.uid===s.active)||null;
  if(s.waitUid&&s.waitSeq>(B.sentSeq||0)&&(!B.t2||String(s.waitPl)===B.mySeat)){
    const u=units.find(x=>x.uid===s.waitUid);
    if(B.wait&&B.wait.seq===s.waitSeq)B.wait.u=u;
    else{B.wait={u,mode:"menu",seq:s.waitSeq,res:a=>sendAct(B,s.waitSeq,a)};SFX.click();}
  }else B.wait=null;
  if(DUEL)DUEL.phase="battle";
  CUR_B=B;
  if(B.done)return;
  VIEW="battle";render();
  diffs.forEach(([u,d])=>{fx(B,u,(d>0?"+":"")+d,d>0?"heal":"dmg");d>0?SFX.heal():SFX.hit();});
  if(B.over&&!B.overSfx){B.overSfx=1;B.over==="D"?SFX.click():B.over===B.mySide?SFX.win():SFX.lose();}
}
function sendAct(B,seq,a){
  B.sentSeq=seq;
  if(NET&&NET.ref){const o={seq,type:a.type,t:a.target?a.target.uid:0};if(B.t2)o.s=NET.seat;NET.ref.child("act").set(o).catch(netFail);}
  render();
}
function hostLeft(){
  if(!NET)return;
  if(CUR_B&&CUR_B.guest&&CUR_B.over)return;
  toast("房主離開了，連線結束");leaveOnline();
}
function leaveOnline(){
  const n=NET;NET=null;
  if(n&&n.ref){
    ["guest","gl","draft","own","act","t","snap","g","tm"].forEach(k=>n.ref.child(k).off());
    const gk=n.mode==="t2"?"gl/"+n.seat:"gl";
    if(n.side==="A"){n.ref.onDisconnect().cancel();n.ref.remove().catch(()=>{});}
    else{n.ref.child(gk).onDisconnect().cancel();n.ref.child(gk).set(true).catch(()=>{});}
  }
  clearTimeout(SNAP_T);SNAP_T=null;
  if(DUEL&&DUEL.cdT){clearTimeout(DUEL.cdT);DUEL.cdT=null;}
  if(CUR_B&&CUR_B.online)CUR_B.done=true;
  CUR_B=null;DUEL=null;VIEW="duel";render();
}
function copyLink(l){
  try{navigator.clipboard.writeText(l).then(()=>toast("已複製邀請連結"),()=>toast(l));}catch(e){toast(l);}
}
function viewOnline(){
  if(!NET)return `<div class="panel"><p style="margin-top:0">和朋友在不同裝置上連線對打：一人建立房間，把房號或邀請連結傳給對方。</p>
    <div class="row"><button class="pri" onclick="hostRoom()">🏠 建立房間（標準・3★ 選角）</button>
      <button class="gold" onclick="hostRoom('own')">🏠 建立房間（養成賽・帶自己的隊伍）</button>
      <button class="gold" onclick="hostRoom('coop')">🏠 建立房間（合作討伐・偽永夜帝王）</button>
      <button class="gold" onclick="hostRoom('t2')">🏠 建立房間（團隊賽 2v2・4 人）</button></div>
    <h3>加入房間</h3>
    <div class="row"><input id="joinCode" maxlength="5" placeholder="5碼房號" value="${JOIN_CODE}" autocomplete="off"
      style="font:inherit;font-size:18px;letter-spacing:4px;text-transform:uppercase;width:150px;padding:6px 10px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px">
    <button class="gold" onclick="joinRoom($('#joinCode').value)">加入</button></div>
    <p class="dim small">標準：雙方都以 3★ 參戰，蛇形選角。養成賽：雙方帶自己的隊伍（等級、星數、突破、裝備都算），沒有公平限制，也沒有獎勵；加入房間時會自動判斷是哪種。合作討伐：兩人各帶 4 名角色，一起打偽永夜帝王（測試階段，不掉落裝備）。團隊賽 2v2：4 位玩家（2 對 2）在房間內自選隊伍和最多 3 名角色，規則同養成賽，打完可在同一房間再打；獲勝且戰鬥超過 ${T2_MIN_ROUND} 回合，每人可得 🪙${T2_GOLD}（每天最多 ${T2_DAILY} 次）。房主的裝置負責計算戰鬥：房主關掉網頁，對戰就結束；挑戰者斷線或 60 秒沒動作，改由 AI 代打。</p></div>`;
  if(NET.status==="connecting")return `<div class="panel">🌐 連線中……</div>`;
  if(NET.mode==="t2")return viewT2();
  const leave=`<button onclick="leaveOnline()">離開房間</button>`;
  if(DUEL.phase==="lobby"){
    const link=location.origin+location.pathname+"?room="+NET.code;
    return `<div class="panel" style="text-align:center"><div class="dim">房號</div>
      <div style="font-size:44px;font-weight:900;letter-spacing:10px;color:var(--gold)">${NET.code}</div>
      <div class="small dim" style="word-break:break-all">${link}</div>
      <div class="row" style="justify-content:center;margin-top:10px"><button class="gold" onclick="copyLink('${link}')">📋 複製邀請連結</button>${leave}</div>
      <p class="dim">${NET.mode==="coop"?"等待隊友加入……":"等待對手加入……"}</p></div>`;
  }
  if(NET.mode==="coop"){
    const op=NET.side==="A"?"B":"A",mate=DUEL.own&&DUEL.own[op],taken=mate?mate.map(x=>x.id):[],pick=DUEL.coopPick||[];
    const ids=Object.keys(SAVE.owned).sort((a,b)=>R_ORDER[CARDS[a].r]-R_ORDER[CARDS[b].r]||lvOf(b)-lvOf(a));
    return `<div class="row"><span class="dim">房間 ${NET.code}・合作討伐：偽永夜帝王</span><span style="margin-left:auto">${leave}</span></div>
      <div class="panel" style="border-color:var(--gold)">⚠ <b>目前是測試階段，打贏偽永夜帝王不會掉落裝備，只有 🪙${COOP_GOLD} 金幣（每天最多領 ${COOP_DAILY} 次，你今天還剩 ${coopLeft()} 次）。</b></div>
      <h3>你要帶的角色（${pick.length}／${COOP_N}）</h3>
      <div class="cardgrid">${ids.map(id=>{const c=CARDS[id],on=pick.includes(id),tk=taken.includes(id);
        return `<div class="ccard ${c.r} ${tk?"locked":""}" style="${on?"outline:3px solid var(--gold)":tk||DUEL.ownReady?"opacity:.5":""}" onclick="${tk?"":`coopToggle('${id}')`}"><div class="av">${avatar(id)}</div><div class="nm">${c.name}</div><div class="small">Lv.${lvOf(id)}${tk?"・隊友已選":""}</div></div>`;}).join("")}</div>
      <h3>隊友</h3>${mate?`<p class="dim">隊友已準備（${mate.length} 名）。</p>`:`<p class="dim">隊友還在準備……</p>`}
      <div class="row" style="margin-top:12px">${DUEL.ownReady?`<span class="dim">已準備，等隊友……</span>`:`<button class="pri" onclick="readyOwn()">✅ 準備好了</button>`}</div>
      <p class="dim small">各帶最多 ${COOP_N} 名（等級、星數、突破、裝備都算）。同一角色只能一人帶，先按準備的先用。你只操作自己的角色，隊友操作他的；準備後就不能換人。房主關掉網頁，戰鬥就結束；隊友斷線或 60 秒沒動作，改由 AI 代打。</p>`;
  }
  if(DUEL.phase==="own"||(NET.mode==="own"&&DUEL.phase==="battle")){
    const me=NET.side,op=me==="A"?"B":"A",mine=myOwnSpec(),theirs=DUEL.own&&DUEL.own[op];
    const av=(u,hide)=>`<div class="ccard ${CARDS[u.id].r}"><div class="av">${avatar(u.id)}</div><div class="nm">${CARDS[u.id].name}</div><div class="small">${u.stars}★${u.br?" 突破"+u.br:""}</div></div>`;
    return `<div class="row"><span class="dim">房間 ${NET.code}・養成賽</span><span style="margin-left:auto">${leave}</span></div>
      <h3>你的隊伍</h3><div class="cardgrid">${mine.map(u=>av(u)).join("")}</div>
      <h3>對手</h3>${theirs?`<div class="cardgrid">${sanOwn(theirs).map(u=>av(u)).join("")}</div>`:`<p class="dim">對手還在準備……</p>`}
      <div class="row" style="margin-top:12px">${DUEL.ownReady?`<span class="dim">已準備，等對手……</span>`:`<button class="pri" onclick="readyOwn()">✅ 準備好了</button>`}</div>
      <p class="dim small">用的是「隊伍」頁編好的角色（最多 3 名）。要換人請先離開房間。</p>`;
  }
  const d=DUEL,cur=DRAFT_ORDER[d.step],me=NET.side,op=me==="A"?"B":"A",taken=d.picks.A.concat(d.picks.B),mine=d.step<6&&cur===me;
  const side=(s,label)=>`<div class="panel" style="flex:1;min-width:200px;border-color:${s===cur&&d.step<6?"var(--gold)":"var(--line)"}">
    <b>${label}</b><div class="draftside">${d.picks[s].map(id=>`<div class="av" title="${CARDS[id].name}">${avatar(id)}</div>`).join("")}</div></div>`;
  return `<div class="row"><span class="dim">房間 ${NET.code}</span><span style="margin-left:auto">${leave}</span></div>
  <div class="row" style="margin-top:8px">${side(me,"你")}${side(op,"對手")}</div>
  ${d.step<6?`<h3>${mine?"輪到 <span style='color:var(--gold)'>你</span> 選角":"等待對手選角……"}</h3>
  <div class="cardgrid">${sortedIds().map(id=>{const c=CARDS[id],tk=taken.includes(id);
    return `<div class="ccard ${c.r} ${tk?"locked":""}" style="${mine||tk?"":"opacity:.6"}" onclick="${tk||!mine?"":`duelPick('${id}')`}" oncontextmenu="showFoe('${id}');return false"><div class="av">${avatar(id)}</div><div class="nm">${c.name}</div><div class="small r${c.r}">${c.r}</div></div>`;}).join("")}</div>
  <p class="dim small">右鍵（或長按）查看技能。</p>`:`<h3>選角完成，即將開打……</h3>`}`;
}


