"use strict";
/* ===================== 王卡（測試中：只有 CARD_ACCTS 裡的帳號看得到、拿得到、有效果） ===================== */
// 魔王掉落的卡片，插在裝備的「洞」裡。洞要用打洞器自己打（打洞系統）：洞有品階，卡片也有品階，白洞只能插白卡、綠洞可插白綠卡，以此類推。
// 注意：遊戲裡的 CARDS 是「角色卡」，這裡的卡片叫 BCARD，存檔欄位是 SAVE.bcards，不要搞混。
// 規則：可拆下重用（拆卡收 🪙BCARD_UNSLOT）；同一個角色身上同名卡只有 1 張生效／能插；真人對戰不套用。
const CARD_ACCTS=["boo12345"];
function cardOpen(){try{return !!ACCT&&CARD_ACCTS.includes(String(ACCT.name).toLowerCase());}catch(e){return false;}}

const BCARD_RATE=1/100000; // 王卡掉率：十萬分之一，沒有保底、首殺也不保證（使用者定案，不要調整）
const BCARD_UNSLOT=50;     // 拆卡費用（金條）
// ===== 打洞系統（取代舊的固定卡槽）=====
// 品階由低到高（索引 0～6）：白、綠、藍、黃、紅、暗金、暗黑。洞、卡片、打洞器都有品階。
const HT=["白","綠","藍","黃","紅","暗金","暗黑"];
const HT_COLOR=["#e8e8e8","#4cd964","#4aa3ff","#ffd23f","#ff5252","#c79a2b","#a06cd5"];
const htTag=t=>`<span style="color:${HT_COLOR[t]};font-weight:bold">${HT[t]}</span>`;
// 一件裝備最多能打幾個洞（依稀有度）
const HOLE_MAX={N:1,R:1,SR:2,SSR:3,UR:3,EX:3};
const holeMax=g=>HOLE_MAX[GEAR[g.base].q]||0;
// 取得這件裝備的洞（g.holes[i]＝品階）；舊存檔只有 g.cards 沒有 g.holes 時，依卡片品階補出洞。g.cards[i] 是插在第 i 個洞的卡（空洞為 ""）
function holesOf(g){
  if(!g.holes){g.holes=(g.cards||[]).map(k=>Math.max(0,cardT(k)));}
  if(!g.cards)g.cards=g.holes.map(()=>"");
  while(g.cards.length<g.holes.length)g.cards.push("");
  return g.holes;
}
// 打洞器庫存 SAVE.punch[品階]＝數量（來源尚未開放，目前只有測試領取）
function punchInv(){return SAVE.punch=SAVE.punch||{};}
const punchHave=t=>punchInv()[t]||0;
// 這張卡能不能插進這個品階的洞：洞的品階 ≥ 卡的品階
const cardT=k=>BCARD[k]&&BCARD[k].t!=null?BCARD[k].t:-1; // -1＝品階未設定
const cardTag=k=>cardT(k)>=0?htTag(cardT(k)):`<span class="dim">未定</span>`;
const holeFits=(holeT,k)=>cardT(k)>=0&&holeT>=cardT(k);
// 卡片效果（欄位同 bonusOf）；以魔王被動的縮小版為主題。第一期只有數值型
// 卡片品階：欄位 t（0 白～6 暗黑）由使用者指定後再加；沒有 t 的卡「品階未設定」，暫時不能插進任何洞
const BCARD={
  doomhunter:{name:"滅世獵手卡",icon:"🎯",st:{crit:5}},
  voidlord:{name:"虛空主宰卡",icon:"💠",st:{dodge:5}},
  fatejudge:{name:"命運裁決者卡",icon:"☸",st:{dr:4}},
  reaper:{name:"死神代行者卡",icon:"⚰",st:{steal:5}},
  abyssking:{name:"深淵君王卡",icon:"👑",st:{hp:8,dr:3}},
  nightemperor:{name:"永夜帝王卡",icon:"🌑",st:{dodge:4,dr:3}},
  overlord:{name:"天命霸主卡",icon:"🌟",st:{atk:2,crit:4}},
  endwalker:{name:"終焉行者卡",icon:"⛓",st:{crit:4,steal:4}}
};
const bcStr=k=>`${BCARD[k].icon}${BCARD[k].name}`;
const bcEff=k=>statStr(BCARD[k].st);

function bcInv(){return SAVE.bcards=SAVE.bcards||{};}
function bcPlaced(k){return SAVE.gear.reduce((n,g)=>n+(g.cards||[]).filter(x=>x===k).length,0);}
function bcAvail(k){return (bcInv()[k]||0)-bcPlaced(k);}
// 角色身上（所有穿著的裝備）有沒有這張卡；except 是要排除的裝備 uid
function bcOwnerHas(owner,k,except){
  if(!owner||!SAVE.owned[owner])return false;
  return Object.values(SAVE.owned[owner].eq||{}).map(gearById).some(g=>g&&g.uid!==except&&(g.cards||[]).includes(k));
}
// 卡片帶來的能力加成（併進 bonusOf）：只算有效穿著的裝備；同一角色同名卡只算 1 張
function cardBonusOf(id,eq){
  const out={};if(!cardOpen())return out;
  const seen=new Set();
  wornOf(id,eq).forEach(g=>(g.cards||[]).forEach(k=>{
    if(!BCARD[k]||seen.has(k))return;seen.add(k);
    for(const s in BCARD[k].st)out[s]=(out[s]||0)+BCARD[k].st[s];
  }));
  return out;
}
// 掉落：只有開放的帳號才會掉，避免沒開放的人拿到看不到的東西
function bcRollDrop(bossId){
  if(!cardOpen()||!BCARD[bossId]||!(rnd()<BCARD_RATE))return "";
  bcInv()[bossId]=(bcInv()[bossId]||0)+1;
  return `🎴 <b class="rEX">王卡：${bcStr(bossId)}</b>（${bcEff(bossId)}）`;
}
function bcInsertAsk(uid,i){
  const g=gearById(uid);if(!cardOpen()||!g)return;
  const hs=holesOf(g);if(hs[i]==null||g.cards[i])return;
  const owner=gearOwner(uid),have=g.cards,ks=Object.keys(BCARD).filter(k=>holeFits(hs[i],k)&&bcAvail(k)>0&&!have.includes(k)&&!bcOwnerHas(owner,k,uid)).sort((a,b)=>cardT(a)-cardT(b));
  openModal(`<h3>插入王卡　${htTag(hs[i])}色洞</h3><p class="dim small">${htTag(hs[i])}色洞可以插同品階或更低品階的卡。同一個角色身上，同名卡只能插 1 張。</p>
    <div class="row" style="flex-wrap:wrap;gap:6px">${ks.map(k=>`<button class="mini gold" onclick="bcInsert(${uid},${i},'${k}')">${cardTag(k)}　${bcStr(k)} <span class="dim">${bcEff(k)}</span>　×${bcAvail(k)}</button>`).join("")||`<span class="dim">沒有可以插進這個洞的卡</span>`}</div>
    <div class="row" style="margin-top:10px"><button onclick="openGear(${uid})">返回</button></div>`);
}
function bcInsert(uid,i,k){
  const g=gearById(uid);if(!cardOpen()||!g||!BCARD[k])return;
  const hs=holesOf(g);
  if(hs[i]==null||g.cards[i]){toast("這個洞不能插");return;}
  if(!holeFits(hs[i],k)){toast("洞的品階不夠");return;}
  if(g.cards.includes(k)||bcOwnerHas(gearOwner(uid),k,uid)){toast("同一個角色身上，同名卡只能插 1 張");return;}
  if(bcAvail(k)<=0){toast("沒有這張卡了");return;}
  g.cards[i]=k;save();SFX.click();toast(`已插入 ${BCARD[k].name}`);openGear(uid);render();
}
function bcRemoveAsk(uid,i){
  const g=gearById(uid);if(!cardOpen()||!g||!(g.cards||[])[i])return;
  openModal(`<h3>拆下 ${bcStr(g.cards[i])}？</h3><p class="dim">卡片會回到庫存，可以再插到別的洞；洞會保留。花費 🪙${BCARD_UNSLOT}。</p>
    <div class="row"><button class="pri" onclick="bcRemove(${uid},${i})">拆下</button><button onclick="openGear(${uid})">取消</button></div>`);
}
function bcRemove(uid,i){
  const g=gearById(uid);if(!cardOpen()||!g||!(g.cards||[])[i])return;
  if(!pay(BCARD_UNSLOT))return;
  g.cards[i]="";save();SFX.click();toast("已拆下，卡片回到庫存");openGear(uid);render();
}
// 打洞：用哪一種打洞器，就打出同品階的洞。可以「新增一個洞」（洞數沒滿時），也可以「覆蓋」一個品階比打洞器低的洞，把它升級成打洞器的品階（洞裡的卡會留著）
function bcPunchAsk(uid){
  const g=gearById(uid);if(!cardOpen()||!g)return;
  const hs=holesOf(g),mx=holeMax(g),full=hs.length>=mx;
  const addBtns=HT.map((_,t)=>`<button class="mini ${punchHave(t)?"gold":""}" ${punchHave(t)&&!full?"":"disabled"} onclick="bcPunch(${uid},${t})">${htTag(t)}色打洞器　×${punchHave(t)}</button>`).join("");
  const upRows=hs.map((ht,i)=>{
    const ups=HT.map((_,p)=>p>ht&&punchHave(p)?`<button class="mini gold" onclick="bcPunch(${uid},${p},${i})">${htTag(p)}色打洞器　×${punchHave(p)}</button>`:"").join("");
    return `<div style="margin-top:6px"><span class="small">第 ${i+1} 個洞（${htTag(ht)}色${g.cards[i]?`，已插 ${bcStr(g.cards[i])}`:"，空"}）：</span>${ups||`<span class="dim small">${ht>=HT.length-1?"已是最高品階":"沒有更高品階的打洞器"}</span>`}</div>`;
  }).join("");
  openModal(`<h3>🔩 打洞</h3><p class="dim small">用哪一種打洞器，就打出同品階的洞。洞數 ${hs.length}／${mx}。洞打出來就不能移除。高品階的打洞器也可以覆蓋既有的低品階洞，升級成更高品階（洞裡的卡會留著）。</p>
    <b class="small">新增一個洞${full?`<span class="dim">（洞已打滿）</span>`:""}</b>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:4px">${addBtns}</div>
    ${hs.length?`<b class="small" style="display:block;margin-top:10px">覆蓋既有的洞（升級品階）</b>${upRows}`:""}
    <div class="row" style="margin-top:10px"><button onclick="openGear(${uid})">返回</button></div>`);
}
// i 沒給＝新增一個洞；給了＝覆蓋第 i 個洞（打洞器品階必須比原本的洞高）
function bcPunch(uid,t,i){
  const g=gearById(uid);if(!cardOpen()||!g||!(t>=0&&t<HT.length))return;
  const hs=holesOf(g);
  if(punchHave(t)<=0){toast("沒有這種打洞器");return;}
  if(i==null){
    if(hs.length>=holeMax(g)){toast("這件裝備的洞已經打滿了");return;}
    punchInv()[t]--;hs.push(t);g.cards.push("");save();SFX.click();toast(`打出了一個${HT[t]}色的洞`);
  }else{
    if(hs[i]==null){toast("沒有這個洞");return;}
    if(t<=hs[i]){toast("要用更高品階的打洞器才能覆蓋");return;}
    punchInv()[t]--;const old=hs[i];hs[i]=t;save();SFX.click();toast(`第 ${i+1} 個洞從${HT[old]}色升級成${HT[t]}色`);
  }
  openGear(uid);render();
}
// 裝備詳細頁的洞區塊
function cardSlotsHtml(g){
  if(!cardOpen())return "";
  const mx=holeMax(g);if(!mx)return "";
  const hs=holesOf(g),cs=g.cards;
  const cells=hs.map((t,i)=>cs[i]
    ?`<button class="mini pri" style="flex:1;min-width:120px;border-color:${HT_COLOR[t]}" onclick="bcRemoveAsk(${g.uid},${i})">${htTag(t)}色洞<br>${bcStr(cs[i])}<br><span class="small">${bcEff(cs[i])}</span><br><span class="small dim">點擊拆下</span></button>`
    :`<button class="mini" style="flex:1;min-width:120px;border-color:${HT_COLOR[t]}" onclick="bcInsertAsk(${g.uid},${i})">${htTag(t)}色洞<br>＋ 插卡</button>`).join("");
  return `<div class="sk"><b>🕳 洞</b> <span class="dim small">（測試中）${hs.length}／${mx}</span>
    ${hs.length<mx||hs.some(x=>x<HT.length-1)?`<button class="mini" style="margin-left:8px" onclick="bcPunchAsk(${g.uid})">🔩 打洞</button>`:""}
    <div class="row" style="margin-top:6px;gap:6px">${cells||`<span class="dim small">還沒有洞，需要打洞器才能打</span>`}</div>
    <div class="dim small" style="margin-top:4px">${htTag(0)}洞只能插${htTag(0)}卡；${htTag(1)}洞可以插${htTag(0)}、${htTag(1)}卡，依此類推。卡片可以拆下重用（🪙${BCARD_UNSLOT}），洞會保留。高品階的打洞器可以覆蓋低品階的洞，升級品階。同一個角色身上同名卡只能插 1 張。</div></div>`;
}
// 裝備頁的王卡與打洞器庫存
function cardInvHtml(){
  if(!cardOpen())return "";
  const rows=Object.keys(BCARD).sort((a,b)=>cardT(a)-cardT(b)).map(k=>{const t=bcInv()[k]||0;return `<span class="small ${t?"":"dim"}" style="margin-right:10px">${cardTag(k)} ${bcStr(k)} ×${t}${t?`（可用 ${bcAvail(k)}）`:""}</span>`;}).join("");
  const pr=HT.map((_,t)=>`<span class="small ${punchHave(t)?"":"dim"}" style="margin-right:10px">${htTag(t)}色打洞器 ×${punchHave(t)}</span>`).join("");
  return `<div class="panel small"><b>🎴 王卡庫存</b> <span class="dim">（測試中）</span><br>${rows}
    <div class="dim" style="margin-top:4px">魔王討伐勝利時有 ${Math.round(1/BCARD_RATE).toLocaleString()} 分之 1 機率掉落該魔王的卡。裝備要先用打洞器打洞才能插卡（洞數依裝備稀有度：N／R 最多 1 個、SR 最多 2 個、SSR 以上最多 3 個）。</div>
    <div style="margin-top:6px"><b>🔩 打洞器</b> <span class="dim">（取得方式尚未開放）</span><br>${pr}</div>
    <div class="row" style="margin-top:6px"><button class="mini" onclick="bcTestGrant()">🧪 測試：每種王卡領 1 張、每種打洞器領 2 個</button></div></div>`;
}
// 測試用：測試帳號領卡與打洞器，方便驗證介面（不影響正式掉率）
function bcTestGrant(){
  if(!cardOpen())return;
  Object.keys(BCARD).forEach(k=>{bcInv()[k]=(bcInv()[k]||0)+1;});
  HT.forEach((_,t)=>{punchInv()[t]=(punchInv()[t]||0)+2;});
  save();SFX.click();toast("已領取每種王卡、每種打洞器各 2 個（測試用）");render();
}
