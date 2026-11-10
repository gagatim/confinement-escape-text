"use strict";
/* ===================== 天賦樹（測試中：只有 TALENT_ACCTS 裡的帳號看得到、用得到） ===================== */
// 開放對象：登入帳號名稱（不分大小寫）在名單裡才算開放。要全面開放時，把 talentOpen 改成回傳 true 即可
const TALENT_ACCTS=["boo12345"];
function talentOpen(){try{return !!ACCT&&TALENT_ACCTS.includes(String(ACCT.name).toLowerCase());}catch(e){return false;}}

// 天賦點數＝等級每 10 級 1 點（上限 10）＋突破每 2 次 1 點（上限 5）；每個職業有 3 條分支，每條 5 個節點，要照順序點
// 第 5 個節點（頂點）要 2 點，所以 15 點點不滿三條分支（滿三條要 18 點），必須取捨
const TAL_LEN=5,TAL_CAP_COST=2;
// 分支模板：steps＝5 個節點各自給的能力（跟 bonusOf 的欄位一樣）
const TAL_BRANCH={
  guard:{name:"堅守",icon:"🛡",steps:[{hp:4},{def:1},{dr:2},{hp:6},{def:1,dr:3}]},
  fury:{name:"猛攻",icon:"⚔",steps:[{atk:1},{crit:3},{atk:1},{crit:3},{atk:2,crit:4}]},
  leech:{name:"嗜血",icon:"🩸",steps:[{atk:1},{steal:3},{hp:4},{steal:3},{atk:1,steal:5}]},
  swift:{name:"迅捷",icon:"💨",steps:[{spd:1},{dodge:2},{spd:1},{dodge:2},{spd:1,dodge:4}]},
  vigor:{name:"體魄",icon:"💪",steps:[{hp:5},{hp:5},{def:1},{hp:8},{hp:10,def:1}]}
};
// 各職業可以走的 3 條分支
const TAL_CLASS={
  tank:["guard","vigor","leech"],
  warrior:["fury","leech","vigor"],
  assassin:["swift","fury","leech"],
  ranger:["fury","swift","guard"],
  support:["vigor","guard","swift"],
  mage:["fury","vigor","swift"]
};
const TAL_LBL={hp:"生命",atk:"攻擊",def:"防禦",spd:"速度",crit:"暴擊",steal:"吸血",dodge:"閃避",dr:"減傷"};
const TAL_PCT={crit:1,steal:1,dodge:1,dr:1};
const talCost=i=>i===TAL_LEN-1?TAL_CAP_COST:1; // i＝節點順位（0～4）
const talId=(b,i)=>b+(i+1);
const talStr=st=>Object.keys(st).map(k=>`${TAL_LBL[k]}+${st[k]}${TAL_PCT[k]?"%":""}`).join(" ");
function talPoints(id){const o=SAVE.owned[id];if(!o)return 0;return Math.min(10,Math.floor((o.lv||1)/10))+Math.min(5,Math.floor((o.br||0)/2));}
function talOwned(id){const o=SAVE.owned[id];return (o&&o.tal)||{};}
function talSpent(id){
  const t=talOwned(id),br=TAL_CLASS[CARDS[id].cls]||[];let n=0;
  br.forEach(b=>{for(let i=0;i<TAL_LEN;i++)if(t[talId(b,i)])n+=talCost(i);});
  return n;
}
// 天賦帶來的能力加成（併進 bonusOf）；沒開放、或花的點數超過現有點數（資料被改過）就不算
function talentBonusOf(id){
  const out={};
  if(!talentOpen()||!SAVE.owned[id]||talSpent(id)>talPoints(id))return out;
  const t=talOwned(id);
  (TAL_CLASS[CARDS[id].cls]||[]).forEach(b=>{for(let i=0;i<TAL_LEN;i++)if(t[talId(b,i)]){const st=TAL_BRANCH[b].steps[i];for(const k in st)out[k]=(out[k]||0)+st[k];}});
  return out;
}
function talentPick(id,b,i){
  const o=SAVE.owned[id];if(!talentOpen()||!o)return;
  const br=TAL_CLASS[CARDS[id].cls]||[];if(!br.includes(b)||!(i>=0&&i<TAL_LEN))return;
  const t=o.tal=o.tal||{},k=talId(b,i);
  if(t[k]){toast("這個天賦已經點過了");return;}
  if(i>0&&!t[talId(b,i-1)]){toast("要先點前一個天賦");return;}
  const left=talPoints(id)-talSpent(id),c=talCost(i);
  if(left<c){toast(`天賦點數不足（需要 ${c} 點，剩 ${left} 點）`);return;}
  t[k]=1;save();SFX.click();showCard(id);render();
}
const talResetCost=id=>Math.max(10,talSpent(id)*10);
function talentResetAsk(id){
  if(!talentOpen()||!talSpent(id))return;
  openModal(`<h3>重置 ${CARDS[id].name} 的天賦？</h3><p class="dim">會收回已點的 ${talSpent(id)} 點，花費 🪙${talResetCost(id)}。</p>
    <div class="row"><button class="pri" onclick="talentReset('${id}')">重置</button><button onclick="showCard('${id}')">取消</button></div>`);
}
function talentReset(id){
  const o=SAVE.owned[id];if(!talentOpen()||!o||!talSpent(id))return;
  if(!pay(talResetCost(id)))return;
  o.tal={};save();SFX.click();toast("天賦已重置");showCard(id);render();
}
function talentHtml(id){
  if(!talentOpen()||!SAVE.owned[id])return "";
  const t=talOwned(id),pts=talPoints(id),sp=talSpent(id),left=pts-sp,over=sp>pts;
  const cols=(TAL_CLASS[CARDS[id].cls]||[]).map(b=>{
    const B=TAL_BRANCH[b];
    const nodes=B.steps.map((st,i)=>{
      const has=!!t[talId(b,i)],pre=i===0||!!t[talId(b,i-1)],c=talCost(i),can=!has&&pre&&left>=c&&!over;
      return `<button class="mini ${has?"pri":can?"gold":""}" style="display:block;width:100%;margin:3px 0;text-align:left" ${can?`onclick="talentPick('${id}','${b}',${i})"`:"disabled"}>${has?"✔":i===TAL_LEN-1?"★":"・"} ${talStr(st)}${c>1?`　<span class="dim">(${c} 點)</span>`:""}</button>`;
    }).join("");
    return `<div style="flex:1;min-width:130px"><b>${B.icon} ${B.name}</b>${nodes}</div>`;
  }).join("");
  return `<div class="sk"><b>🌳 天賦</b> <span class="dim small">（測試中）</span> <span class="small">剩餘 <b style="color:var(--gold)">${left}</b> ／ ${pts} 點</span>
    <div class="dim small">點數：等級每 10 級 +1、突破每 2 次 +1。每條分支要從上往下點，最後一格 ★ 要 2 點。三條點不滿，需要取捨。</div>
    <div class="row" style="margin-top:6px;gap:8px;align-items:flex-start">${cols}</div>
    <div class="row" style="margin-top:6px"><button class="mini" onclick="talentResetAsk('${id}')" ${sp?"":"disabled"}>♻ 重置（🪙${sp?talResetCost(id):0}）</button>${over?`<span class="dim small" style="color:var(--red,#e66)">點數超過上限，天賦暫不生效</span>`:""}</div>
    <div class="dim small" style="margin-top:4px">天賦只套用在單人遠征、競技場、練功房，真人對戰不套用。</div></div>`;
}
