"use strict";
/* ===================== 王卡（測試中：只有 CARD_ACCTS 裡的帳號看得到、拿得到、有效果） ===================== */
// 魔王掉落的卡片，插在裝備的卡槽裡（SSR／UR／EX 裝備各 3 槽，其他稀有度沒有）。
// 注意：遊戲裡的 CARDS 是「角色卡」，這裡的卡片叫 BCARD，存檔欄位是 SAVE.bcards，不要搞混。
// 規則：可拆下重用（拆卡收 🪙BCARD_UNSLOT）；同一個角色身上同名卡只有 1 張生效／能插；真人對戰不套用。
const CARD_ACCTS=["boo12345"];
function cardOpen(){try{return !!ACCT&&CARD_ACCTS.includes(String(ACCT.name).toLowerCase());}catch(e){return false;}}

const BCARD_RATE=1/100000; // 王卡掉率：十萬分之一，沒有保底、首殺也不保證（使用者定案，不要調整）
const BCARD_UNSLOT=50;     // 拆卡費用（金條）
const BCARD_SLOTS={SSR:3,UR:3,EX:3};
const cardSlots=g=>BCARD_SLOTS[GEAR[g.base].q]||0;
// 卡片效果（欄位同 bonusOf）；以魔王被動的縮小版為主題。第一期只有數值型
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
function bcInsertAsk(uid){
  const g=gearById(uid);if(!cardOpen()||!g)return;
  const owner=gearOwner(uid),have=(g.cards||[]),ks=Object.keys(BCARD).filter(k=>bcAvail(k)>0&&!have.includes(k)&&!bcOwnerHas(owner,k,uid));
  openModal(`<h3>插入王卡</h3><p class="dim small">同一個角色身上，同名卡只能插 1 張。</p>
    <div class="row" style="flex-wrap:wrap;gap:6px">${ks.map(k=>`<button class="mini gold" onclick="bcInsert(${uid},'${k}')">${bcStr(k)} <span class="dim">${bcEff(k)}</span>　×${bcAvail(k)}</button>`).join("")||`<span class="dim">沒有可以插的卡（沒有庫存，或這個角色身上已經有同名卡）。</span>`}</div>
    <div class="row" style="margin-top:10px"><button onclick="openGear(${uid})">返回</button></div>`);
}
function bcInsert(uid,k){
  const g=gearById(uid);if(!cardOpen()||!g||!BCARD[k])return;
  g.cards=g.cards||[];
  if(g.cards.length>=cardSlots(g)){toast("卡槽已滿");return;}
  if(g.cards.includes(k)||bcOwnerHas(gearOwner(uid),k,uid)){toast("同一個角色身上，同名卡只能插 1 張");return;}
  if(bcAvail(k)<=0){toast("沒有這張卡了");return;}
  g.cards.push(k);save();SFX.click();toast(`已插入 ${BCARD[k].name}`);openGear(uid);render();
}
function bcRemoveAsk(uid,i){
  const g=gearById(uid);if(!cardOpen()||!g||!(g.cards||[])[i])return;
  openModal(`<h3>拆下 ${bcStr(g.cards[i])}？</h3><p class="dim">卡片會回到庫存，可以再插到別的裝備。花費 🪙${BCARD_UNSLOT}。</p>
    <div class="row"><button class="pri" onclick="bcRemove(${uid},${i})">拆下</button><button onclick="openGear(${uid})">取消</button></div>`);
}
function bcRemove(uid,i){
  const g=gearById(uid);if(!cardOpen()||!g||!(g.cards||[])[i])return;
  if(!pay(BCARD_UNSLOT))return;
  g.cards.splice(i,1);save();SFX.click();toast("已拆下，卡片回到庫存");openGear(uid);render();
}
// 裝備詳細頁的卡槽區塊
function cardSlotsHtml(g){
  if(!cardOpen())return "";
  const n=cardSlots(g);if(!n)return "";
  const cs=g.cards||[];
  const cells=Array.from({length:n},(_,i)=>cs[i]
    ?`<button class="mini pri" style="flex:1;min-width:120px" onclick="bcRemoveAsk(${g.uid},${i})">${bcStr(cs[i])}<br><span class="small">${bcEff(cs[i])}</span><br><span class="small dim">點擊拆下</span></button>`
    :`<button class="mini" style="flex:1;min-width:120px" onclick="bcInsertAsk(${g.uid})">＋ 插卡</button>`).join("");
  return `<div class="sk"><b>🎴 卡槽</b> <span class="dim small">（測試中）${cs.length}／${n}</span><div class="row" style="margin-top:6px;gap:6px">${cells}</div>
    <div class="dim small" style="margin-top:4px">卡片可以拆下重用（🪙${BCARD_UNSLOT}）。同一個角色身上同名卡只能插 1 張。</div></div>`;
}
// 裝備頁的王卡庫存
function cardInvHtml(){
  if(!cardOpen())return "";
  const rows=Object.keys(BCARD).map(k=>{const t=bcInv()[k]||0;return `<span class="small ${t?"":"dim"}" style="margin-right:10px">${bcStr(k)} ×${t}${t?`（可用 ${bcAvail(k)}）`:""}</span>`;}).join("");
  return `<div class="panel small"><b>🎴 王卡庫存</b> <span class="dim">（測試中）</span><br>${rows}
    <div class="dim" style="margin-top:4px">魔王討伐勝利時有 ${Math.round(1/BCARD_RATE).toLocaleString()} 分之 1 機率掉落該魔王的卡。SSR／UR／EX 裝備各有 3 個卡槽，點裝備可以插卡。</div>
    <div class="row" style="margin-top:6px"><button class="mini" onclick="bcTestGrant()">🧪 測試：每種王卡各領 1 張</button></div></div>`;
}
// 測試用：測試帳號領卡，方便驗證介面（不影響正式掉率）
function bcTestGrant(){
  if(!cardOpen())return;
  Object.keys(BCARD).forEach(k=>{bcInv()[k]=(bcInv()[k]||0)+1;});
  save();SFX.click();toast("已領取每種王卡各 1 張（測試用）");render();
}
