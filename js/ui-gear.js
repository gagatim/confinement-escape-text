"use strict";
/* ===================== GEAR ===================== */
// 裝備放在 SAVE.gear，角色身上只記 uid（SAVE.owned[id].eq[slot]）；角色被遣散／合成掉時裝備自動回到倉庫
function gearById(uid){return uid?SAVE.gear.find(g=>g.uid===uid):null;}
function gearOwner(uid){return Object.keys(SAVE.owned).find(id=>{const e=SAVE.owned[id].eq;return e&&Object.values(e).includes(uid);})||null;}
function canWear(id,base){const c=GEAR[base].cls;return !c||c.includes(CARDS[id].cls);}
function lvOk(id,base){return lvOf(id)>=GEAR_REQ[GEAR[base].q];}
function reqTag(id,base){const r=GEAR_REQ[GEAR[base].q];if(r<=1)return "";return `<span class="req ${id&&!lvOk(id,base)?"bad":""}">需 Lv.${r}</span>`;}
// 新裝備：數值在範圍內浮動，並依稀有度抽隨機詞條（同一種詞條不重複）
function addGear(base,lv=0){
  const q=GEAR[base].q,[lo,hi]=GEAR_ROLL[q],fx=[];
  const keys=pickAffixKeys(affixCount(q));
  keys.forEach(k=>fx.push({k,v:affixRoll(k,q,GEAR[base].slot)}));
  const g={uid:++SAVE.gearUid,base,lv,roll:ri(lo,hi),fx};SAVE.gear.push(g);return g;
}
function rollGear(q){return pick(Object.keys(GEAR).filter(k=>GEAR[k].q===q&&!GEAR[k].off));}
function dropGear(q){return gearName(addGear(rollGear(q)))+`（${q}）`;}
// 身上生效的裝備（等級不足的不算）
// eq 是「欄位→裝備 uid」的對照；預覽時可以傳入假設的組合
function wornOf(id,eq){return Object.values(eq||{}).map(gearById).filter(g=>g&&lvOk(id,g.base));}
function setCountsOf(id,eq){const c={};wornOf(id,eq).forEach(g=>{const q=setKeyOf(g.base);c[q]=(c[q]||0)+1;});return c;}
function bonusOf(id,eq,noStore){
  const s={hp:0,atk:0,def:0,spd:0,crit:0,steal:0,dodge:0,dr:0};
  if(!noStore){const t=storeBonusOf(id);for(const k in t)s[k]=(s[k]||0)+t[k];} // 存入角色加成（團隊賽不套用）
  wornOf(id,eq).forEach(g=>{const t=gearStats(g);for(const k in t)s[k]+=t[k];});
  Object.entries(setCountsOf(id,eq)).forEach(([q,n])=>[2,3].forEach(k=>{if(n>=k)for(const st in SETS[q][k])s[st]+=SETS[q][k][st];}));
  if(SAVE.owned[id]){const f=fruitOf(id),g=gfruitOf(id);s.atk+=f.atk+g.atk*GFRUIT_GAIN;s.def+=f.def+g.def*GFRUIT_GAIN;s.spd+=f.spd+g.spd*GFRUIT_GAIN;} // 能力果實（含金色）
  return s;
}
function wornGear(id){const o=SAVE.owned[id];return o?wornOf(id,o.eq):[];}
function setCounts(id){const o=SAVE.owned[id];return o?setCountsOf(id,o.eq):{};}
function equipBonus(id,noStore){const o=SAVE.owned[id];return bonusOf(id,o&&o.eq,noStore);}
function setHtml(id){
  const c=setCounts(id),qs=Object.keys(c).filter(q=>c[q]>=1);
  if(!qs.length)return "";
  return `<div class="setb">${qs.map(q=>`<div><b class="r${SETS[q].cls||q}">${SETS[q].name}</b> ${c[q]}/3　<span class="${c[q]>=2?"on":"off"}">2件：${statStr(SETS[q][2])}</span>　<span class="${c[q]>=3?"on":"off"}">3件：${statStr(SETS[q][3])}</span></div>`).join("")}</div>`;
}
function unequip(uid){const w=gearOwner(uid);if(w)Object.keys(SAVE.owned[w].eq).forEach(sl=>{if(SAVE.owned[w].eq[sl]===uid)delete SAVE.owned[w].eq[sl];});}
function equipTo(id,uid){
  const g=gearById(uid);if(!g||!canWear(id,g.base))return;
  if(!lvOk(id,g.base)){toast(`${CARDS[id].name} 等級不足（需 Lv.${GEAR_REQ[GEAR[g.base].q]}）`);return;}
  unequip(uid);const o=SAVE.owned[id];o.eq=o.eq||{};o.eq[GEAR[g.base].slot]=uid;
  save();SFX.click();toast(`${CARDS[id].name} 裝備了 ${GEAR[g.base].name}`);
}
function takeOff(id,sl){delete SAVE.owned[id].eq[sl];save();showCard(id);render();}
// 角色卡片上點裝備欄：列出可以穿的裝備（穿在別人身上的也能直接搶過來）
function openSlot(id,sl){
  const cur=SAVE.owned[id].eq&&SAVE.owned[id].eq[sl];
  const list=SAVE.gear.filter(g=>GEAR[g.base].slot===sl&&g.uid!==cur).sort(gearSort);
  const ok=list.filter(g=>canWear(id,g.base)&&lvOk(id,g.base)),no=list.filter(g=>!canWear(id,g.base)),low=list.filter(g=>canWear(id,g.base)&&!lvOk(id,g.base));
  openModal(`<h3>${CARDS[id].name} 的${SLOTS[sl]} ${clsTag(id)}</h3>
    ${cur?`<div class="row" style="margin-bottom:8px"><span>目前：<b>${qTag(GEAR[gearById(cur).base].q)}${gearName(gearById(cur))}</b> ${statStr(gearStats(gearById(cur)))}</span><button class="mini" style="margin-left:auto" onclick="takeOff('${id}','${sl}')">卸下</button></div>`:""}
    <div class="ggrid">${ok.map(g=>gearCard(g,`equipTo('${id}',${g.uid});showCard('${id}');render()`)).join("")||`<span class="dim">沒有可以穿的${SLOTS[sl]}。去「商店」買，或在遠征、競技場打倒敵人掉落。</span>`}</div>
    ${low.length?`<p class="small" style="color:var(--red)">等級不足（目前 Lv.${lvOf(id)}）：${low.map(g=>`${GEAR[g.base].name}（需 Lv.${GEAR_REQ[GEAR[g.base].q]}）`).join("、")}</p>`:""}
    ${no.length?`<p class="dim small">職業不符（${no.map(g=>GEAR[g.base].name).join("、")}）</p>`:""}
    <p class="dim small">穿戴等級：普通／稀有 不限、精良 Lv.5、史詩 Lv.10、傳說 Lv.15。同稀有度穿 2、3 件有套裝效果。</p>
    <div class="row" style="margin-top:12px"><button onclick="showCard('${id}')">← 返回角色</button></div>`);
}
// 裝備強度（戰力）：把數值（含品質浮動、強化、隨機詞條）加權成一個分數，方便排序比較。
// 權重：攻擊 3、防禦 3、速度 2.5、生命 0.5、暴擊 1.5、閃避 1.5、吸血 1（每 1% 算 1 點）
const POWER_W={atk:3,def:3,spd:2.5,hp:.5,crit:1.5,dodge:1.5,steal:1,dr:2};
function gearPower(g){const t=gearStats(g);let p=0;for(const k in t)p+=(POWER_W[k]||0)*t[k];return Math.round(p);}
// 排序：強度／稀有度／強化等級／最新獲得；GEAR_ASC 為 true 時由低到高。選擇會記在這台裝置上
const GEAR_SORTS={power:"強度",rarity:"稀有度",roll:"品質%",lv:"強化等級",new:"最新獲得"};
let GEAR_SORT="power",GEAR_ASC=false;
try{const v=localStorage.getItem("jbts_gsort");if(v){const o=JSON.parse(v);if(GEAR_SORTS[o.k])GEAR_SORT=o.k;GEAR_ASC=!!o.asc;}}catch(e){}
function setGearSort(k){if(k===GEAR_SORT)GEAR_ASC=!GEAR_ASC;else{GEAR_SORT=k;GEAR_ASC=false;}
  try{localStorage.setItem("jbts_gsort",JSON.stringify({k:GEAR_SORT,asc:GEAR_ASC}));}catch(e){}SFX.click();render();}
function gearSort(a,b){
  const qa=GQ.indexOf(GEAR[a.base].q),qb=GQ.indexOf(GEAR[b.base].q);
  let d;
  if(GEAR_SORT==="power")d=gearPower(b)-gearPower(a)||qb-qa||b.lv-a.lv;
  else if(GEAR_SORT==="roll")d=(b.roll||100)-(a.roll||100)||qb-qa||gearPower(b)-gearPower(a);
  else if(GEAR_SORT==="lv")d=b.lv-a.lv||qb-qa||gearPower(b)-gearPower(a);
  else if(GEAR_SORT==="new")d=b.uid-a.uid;
  else d=qb-qa||b.lv-a.lv||gearPower(b)-gearPower(a);
  d=d||a.uid-b.uid;
  return GEAR_ASC?-d:d;
}
function sortBar(){
  return `<div class="filters sortbar"><span class="small dim" style="align-self:center">排序：</span>${Object.entries(GEAR_SORTS).map(([k,l])=>`<button class="${GEAR_SORT===k?"on":""}" onclick="setGearSort('${k}')">${l}${GEAR_SORT===k?(GEAR_ASC?" ↑":" ↓"):""}</button>`).join("")}<span class="small dim" style="align-self:center;margin-left:8px">部位：</span>${Object.keys(SLOTS).map(k=>{const fit=GEAR_MODE==="fit",on=fit?FIT_SLOT===k:GEAR_TAB===k;return `<button class="${on?"on":""}" onclick="${fit?`fitSlot('${k}')`:`GEAR_TAB=GEAR_TAB==='${k}'?'':'${k}';render()`}">${SLOTS[k]}</button>`;}).join("")}</div>`;
}
function gearCard(g,onclick){
  const G=GEAR[g.base],w=gearOwner(g.uid);
  return `<div class="gcard ${G.q} ${g.lv>=ENH_OC?"oc20":""}" onclick="${onclick}">${g.lv>=ENH_OC?`<span class="ocb">⚡超頻</span>`:""}${g.lv?`<span class="lv ${g.lv>=ENH_MAX?"max":g.lv>=7?"hi":""}">+${g.lv}</span>`:""}<div class="gi">${gearImg(g.base)}</div>
    <div class="gn r${G.q}">${qTag(G.q)}${G.name}</div><div class="small">${statStr(gearStats(g))}</div>${g.fx&&g.fx.length?`<div class="gfx">${fxStr(g)}</div>`:""}
    <div class="small dim">${GQ_NAME[G.q]}・${SLOTS[G.slot]}・${gearCls(g.base)} ${reqTag(null,g.base)}</div><div class="small gpow">⚡ 強度 ${gearPower(g)}・品質 ${g.roll||100}%</div>${w?`<div class="who">👤 ${CARDS[w].name}</div>`:""}</div>`;
}

/* ===== 角色裝備調整區：看倉庫與角色，預覽穿上之後的素質 ===== */
let GEAR_MODE="bag",FIT_CHAR="",FIT_SLOT="weapon",FIT_PICK=0;
function modeToggle(){
  return `<div class="filters" style="margin-top:0"><button class="${GEAR_MODE==="bag"?"on":""}" onclick="GEAR_MODE='bag';render()">📦 倉庫(強化區)</button>
    <button class="${GEAR_MODE==="fit"?"on":""}" onclick="GEAR_MODE='fit';render()">🧍 角色裝備調整</button>
    <button class="${GEAR_MODE==="dex"?"on":""}" onclick="GEAR_MODE='dex';render()">📖 裝備圖鑑</button></div>`;
}
// 角色的最終素質（基礎＋等級＋星數＋突破＋裝備＋套裝）；eq 可以傳入假設的裝備組合來預覽
function fitStats(id,eq){
  const o=SAVE.owned[id],s=cardStats(id,o.stars,lvScale(id),brOf(id)),b=bonusOf(id,eq);
  return {hp:s.maxHp+b.hp,atk:s.atk+b.atk,def:s.def+b.def,spd:s.spd+b.spd,crit:b.crit,steal:b.steal,dodge:b.dodge,dr:b.dr};
}
const FIT_ROWS=[["hp","❤ 生命"],["atk","⚔ 攻擊"],["def","🛡 防禦"],["spd","💨 速度"],["crit","🎯 暴擊"],["steal","🩸 吸血"],["dodge","🌀 閃避"],["dr","🧱 減傷"]];
function fitStatHtml(cur,nw){
  return `<div class="statgrid">${FIT_ROWS.map(([k,l])=>{
    const pct=ST_PCT[k]?"%":"",c=cur[k],n=nw?nw[k]:c,d=n-c;
    if(ST_PCT[k]&&!c&&!n)return "";
    return `<div class="stcell"><span class="dim small">${l}</span><b>${n}${pct}</b>${nw&&d?`<span class="${d>0?"dpos":"dneg"} small">${d>0?"▲+":"▼"}${d}${pct}</span>`:""}</div>`;}).join("")}</div>`;
}

/* ===== 裝備圖鑑：35 件裝備全部展示（沒拿過的也看得到），點開看詳細資料與取得方式 ===== */
let DEX_Q="";
const GET_HOW={
  N:"商店直購（🪙10）、📦裝備補給箱、練功房第 1～4 關掉落",
  R:"商店直購（🪙25）、📦裝備補給箱、競技場、練功房掉落",
  SR:"商店直購（🪙70）、📦／🎁裝備箱、章節魔王、深淵守門者",
  SSR:"📦裝備補給箱（1%）、🎁黃金裝備箱（8%）、主線章節魔王、深淵守門者",
  UR:"🎁黃金裝備箱（2%）、第 5 章以後的章節魔王（6%）、深淵 D20 以下的守門者（5%）",
  EX:"只有對應的支線魔王會掉：首次討伐必掉，之後每次 2%"
};
function dexOwned(k){const l=SAVE.gear.filter(g=>g.base===k);return {n:l.length,best:l.reduce((a,g)=>Math.max(a,g.lv),-1)};}
// 隨機詞條數值表：直接讀 affixSpan，數值調整後會自動同步
function affixTable(){
  const qs=GQ.filter(q=>q!=="N"),cell="padding:3px 8px;text-align:center;border:1px solid var(--line,#444)";
  const cnt={R:"0～1",SR:"1",SSR:"1～2",UR:"2～3",EX:"3"};
  return `<details class="panel"><summary><b>📋 隨機詞條數值表</b></summary>
    <div style="overflow-x:auto;margin-top:8px"><table class="small" style="border-collapse:collapse;width:100%">
    <tr><th style="${cell}">詞條</th>${qs.map(q=>`<th style="${cell}" class="r${q}">${q}</th>`).join("")}</tr>
    ${Object.keys(AFFIX).map(k=>`<tr><td style="${cell}">${AFFIX[k].n}</td>${qs.map(q=>{const [a,b]=affixSpan(k,q),p=AFFIX[k].pct?"%":"";return `<td style="${cell}">${a===b?a:a+"～"+b}${p}</td>`;}).join("")}</tr>`).join("")}
    <tr><td style="${cell}">詞條數量</td>${qs.map(q=>`<td style="${cell}">${cnt[q]} 條</td>`).join("")}</tr></table></div>
    <p class="dim small" style="margin:6px 0 0">數值是固定加值，不吃強化；鞋子的詞條數值範圍減半（上下限各除以 2、四捨五入、最小 1）。普通（N）裝備沒有詞條。骰到該欄最大值會顯示 🌟 發光；另有 ${Math.round(AFFIX_RARE*100)}% 機率出現 💎 稀有詞條，數值為該欄最大值 +1（百分比 +1%、數字 +1）。</p></details>`;
}
function viewDex(){
  const keys=Object.keys(GEAR).sort((a,b)=>GQ.indexOf(GEAR[a].q)-GQ.indexOf(GEAR[b].q)||Object.keys(SLOTS).indexOf(GEAR[a].slot)-Object.keys(SLOTS).indexOf(GEAR[b].slot));
  const have=keys.filter(k=>dexOwned(k).n).length,show=keys.filter(k=>!DEX_Q||GEAR[k].q===DEX_Q);
  return `<h2>裝備</h2>${modeToggle()}
  <div class="panel"><b>圖鑑收集 ${have}／${keys.length} 種</b><div class="ratebar"><i style="width:${have/keys.length*100}%"></i></div>
    <span class="dim small">倉庫裡有的會亮起來，沒有的顯示成暗色，點開可以看詳細資料和取得方式。</span></div>
  ${affixTable()}
  <div class="filters"><button class="${DEX_Q?"":"on"}" onclick="DEX_Q='';render()">全部（${keys.length}）</button>${GQ.map(q=>`<button class="${DEX_Q===q?"on":""}" onclick="DEX_Q='${q}';render()">${q}（${keys.filter(k=>GEAR[k].q===q).length}）</button>`).join("")}</div>
  <div class="ggrid">${show.map(k=>{const G=GEAR[k],o=dexOwned(k);
    return `<div class="gcard ${G.q} ${o.n?"":"dexlock"}" onclick="openDex('${k}')">${o.n?`<span class="lv" style="color:var(--green)">×${o.n}</span>`:""}
      <div class="gi">${gearImg(k)}</div><div class="gn r${G.q}">${qTag(G.q)}${G.name}</div><div class="small">${statStr(G.st)}</div>
      <div class="small dim">${GQ_NAME[G.q]}・${SLOTS[G.slot]}・${gearCls(k)} ${reqTag(null,k)}</div>${o.n?"":`<div class="small dim">未擁有</div>`}</div>`;}).join("")}</div>
  <h3 style="margin-top:18px">🧩 套裝效果</h3>
  <p class="dim small" style="margin-top:0">同稀有度的武器、防具、飾品穿 2 件、3 件有額外效果（3 件會同時拿到 2 件的效果）。</p>
  <div class="panel small">${GQ.map(q=>`<div style="margin-bottom:6px"><b class="r${q}">${GQ_NAME[q]}・${SETS[q].name}</b>　2 件：${statStr(SETS[q][2])}　3 件：${statStr(SETS[q][3])}${q==="EX"?`<div class="small dim">不含深淵王冠、霸主金袍、終焉鎖鏈（這三件算「${SETS.throne.name}」）</div>`:""}</div>`).join("")}
    <div style="margin-bottom:6px"><b class="rEX">魔王專屬・${SETS.throne.name}</b>　2 件：${statStr(SETS.throne[2])}　3 件：${statStr(SETS.throne[3])}<div class="small dim">深淵王冠（飾品）＋霸主金袍（防具）＋終焉鎖鏈（武器），來自深淵君王、天命霸主、終焉行者</div></div></div>
  <h3 style="margin-top:18px">📖 裝備素質說明</h3>
  <div class="panel small">${STAT_HELP.map(([l,t])=>`<div style="margin-bottom:6px"><b>${l}</b>　${t}</div>`).join("")}</div>
  <h3 style="margin-top:18px">🎲 裝備浮動屬性說明</h3>
  <div class="panel small">
    <div style="margin-bottom:8px"><b>① 品質浮動</b>　每件裝備獲得時會骰一個「品質」，基礎數值（生命、攻擊、防禦、速度）乘上這個百分比，在範圍內每個整數機率相同。同一種裝備可能強弱不同，裝備詳情會顯示品質。</div>
    <div style="margin-bottom:8px">${GQ.map(q=>`<span class="r${q}" style="margin-right:12px"><b>${q}</b> ${GEAR_ROLL[q][0]}%～${GEAR_ROLL[q][1]}%</span>`).join("")}</div>
    <div style="margin-bottom:8px"><b>② 強化加成</b>　最終數值 = 基礎 × 品質 × 強化。+1～+${ENH_MAX} 每級 +8%；SSR 以上可以進入超頻區（+${ENH_MAX+1}～+${ENH_OC}），每級 +3.5%。</div>
    <div style="margin-bottom:8px"><b>③ 隨機詞條</b>　N 沒有詞條；R 有 0～1 條（30% 有）、SR 1 條、SSR 1～2 條（50% 兩條）、UR 2～3 條（30% 三條）、EX 固定 3 條，種類不重複。詞條是固定加值，<b>不吃品質也不吃強化</b>；稀有度越高，每條的數值範圍越大（數值表見上方「隨機詞條數值表」）。</div>
    <div style="margin-bottom:8px"><b>④ 詞條數值分布</b>　數值多半落在範圍中間：最低 2%、偏低 13%、中間 70%、偏高 13%、最高 2%。骰到該欄最大值會顯示 <span class="fxmax">🌟</span> 發光。</div>
    <div style="margin-bottom:8px"><b>⑤ 稀有詞條</b>　每條詞條有 ${Math.round(AFFIX_RARE*100)}% 機率變成 <span class="fxrare">💎</span> 稀有詞條，數值為該欄最大值 +1（百分比 +1%、數字 +1）。</div>
    <div><b>⑥ 出現機率</b>　8 種詞條機會相同，只有「吸血」被抽到的機率是其他的一半。EX 魔王專屬裝備的詞條也是隨機的。</div>
  </div>`;
}
const STAT_HELP=[
  ["❤ 生命","角色的血量。歸零就倒下，裝備的生命是直接加上去的固定數值。"],
  ["⚔ 攻擊","決定造成的傷害。每次攻擊的傷害會在 90%～110% 之間浮動。"],
  ["🛡 防禦","每 1 點防禦會抵銷 0.7 點受到的傷害（無視防禦的攻擊不受影響）。傷害最低仍有 1 點。"],
  ["💨 速度","決定每回合的行動順序，速度高的先出手。部分技能（例如刺客的背刺）也會比較雙方速度。"],
  ["🎯 暴擊","每次攻擊多出的暴擊機率（%），基礎是 8%，會與職業加成累加。暴擊傷害為 1.5 倍。"],
  ["🩸 吸血","攻擊命中後，把造成傷害的一部分（%）轉成自己的生命。有「吸血減免」的魔王會讓吸血效果打折。"],
  ["🌀 閃避","被攻擊時完全閃過的機率（%），閃過就不受任何傷害。無視防禦的攻擊和固定傷害閃不掉。"],
  ["🧱 減傷","受到的傷害再減少一定比例（%），上限 30%。無視防禦的攻擊不受影響。"]
];

function openDex(k){
  const G=GEAR[k],o=dexOwned(k),[lo,hi]=GEAR_ROLL[G.q],m=AFFIX_MULT[G.q];
  const rng=Object.keys(G.st).map(s=>{const a=Math.max(1,Math.round(G.st[s]*lo/100)),b=Math.max(1,Math.round(G.st[s]*hi/100));return `${ST_LBL[s]}${a===b?a:a+"～"+b}`;}).join(" ");
  const max=Object.keys(G.st).map(s=>`${ST_LBL[s]}${Math.max(1,Math.round(G.st[s]*(1+.08*ENH_MAX)))}`).join(" ");
  const cnt={N:"0 條",R:"0～1 條",SR:"1 條",SSR:"1～2 條",UR:"2～3 條",EX:"3 條"}[G.q];
  const aff=Object.entries(AFFIX).map(([a,A])=>{const [x,y]=affixSpan(a,G.q,G.slot);return `${A.n} +${x===y?x:x+"～"+y}${A.pct?"%":""}`;}).join("、");
  const boss=Object.keys(BOSS_DROP).find(b=>BOSS_DROP[b]===k);
  openModal(`<div class="detail"><div class="bigicon fx-${G.q}">${gearImg(k)}</div><div style="flex:1">
    <div class="r${G.q}">${G.q}（${GQ_NAME[G.q]}）・${SLOTS[G.slot]}</div><h2 style="margin:2px 0">${qTag(G.q)}${G.name}</h2>
    <div class="small">${o.n?`倉庫裡有 <b>${o.n}</b> 件，最高 +${o.best}`:`<span class="dim">倉庫裡還沒有</span>`}</div>
    <div class="small dim">可裝備：${gearCls(k)}・穿戴等級 Lv.${GEAR_REQ[G.q]}</div></div></div>
    <div class="sk"><b>📊 數值</b><br>基礎：${statStr(G.st)}<br>品質浮動（${lo}%～${hi}%）：${rng}<br>強化到 +${ENH_MAX}：${max}（以 100% 品質計）</div>
    <div class="sk"><b>✦ 隨機詞條</b>（${cnt}）<br><span class="small">${aff}</span></div>
    <div class="sk"><b>🧩 套裝</b>：${SETS[setKeyOf(k)].name}<br>2 件：${statStr(SETS[setKeyOf(k)][2])}　3 件：${statStr(SETS[setKeyOf(k)][3])}</div>
    <div class="sk"><b>🎁 怎麼取得</b><br>${(ds=>ds.length?ds.map(([Z,d])=>`🥚 恐龍蛋專區${Z.n} ${DINO_WAVES} 關全部通過時有 ${Math.round(d[1]*100)}% 機率掉落（包含在每天 ${Z.daily} 次獎勵內）`).join("<br>"):G.off?"尚未開放取得":GET_HOW[G.q])(DINO_ZONES.filter(Z=>Z.open&&Z.drop).map(Z=>[Z,Z.drop.find(x=>x[0]===k)]).filter(x=>x[1]))}${boss?`<br><b class="rEX">掉落自：${MONSTERS[boss].name}</b>`:""}</div>
    <div class="row" style="margin-top:12px">${GEAR_PRICE[G.q]&&!G.off?`<button class="gold" onclick="closeModal();SHOP_TAB='gear';go('shop')">🛒 去商店</button>`:""}<button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
function fitSel(id){FIT_CHAR=id;FIT_PICK=0;SFX.click();render();}
function fitSlot(sl){FIT_SLOT=sl;FIT_PICK=0;SFX.click();render();}
function fitPick(uid){
  const g=gearById(uid);if(!g)return;
  if(!canWear(FIT_CHAR,g.base)){toast("職業不符，這個角色不能穿");return;}
  if(!lvOk(FIT_CHAR,g.base)){toast(`等級不足（需 Lv.${GEAR_REQ[GEAR[g.base].q]}）`);return;}
  FIT_PICK=FIT_PICK===uid?0:uid;SFX.click();render();
}
function fitEquip(){if(!FIT_PICK)return;equipTo(FIT_CHAR,FIT_PICK);FIT_PICK=0;render();}
function fitTakeOff(sl){const o=SAVE.owned[FIT_CHAR];if(o&&o.eq){delete o.eq[sl];save();}FIT_PICK=0;SFX.click();render();}
function viewFit(){
  const ids=Object.keys(SAVE.owned);
  if(!ids.length)return `<h2>裝備</h2>${modeToggle()}<p class="dim">還沒有角色。</p>`;
  if(!SAVE.owned[FIT_CHAR])FIT_CHAR=SAVE.team[0]||ids[0];
  const id=FIT_CHAR,o=SAVE.owned[id],eq=o.eq||{},cur=fitStats(id,eq);
  const chars=ids.slice().sort((a,b)=>(SAVE.team.includes(b)?1:0)-(SAVE.team.includes(a)?1:0)||R_ORDER[CARDS[a].r]-R_ORDER[CARDS[b].r]||a.localeCompare(b));
  const pick=FIT_PICK?gearById(FIT_PICK):null;
  let nw=null;
  if(pick&&GEAR[pick.base].slot===FIT_SLOT)nw=fitStats(id,{...eq,[FIT_SLOT]:pick.uid});else FIT_PICK=0;
  const list=SAVE.gear.filter(g=>GEAR[g.base].slot===FIT_SLOT).sort(gearSort);
  const pickWho=pick?gearOwner(pick.uid):null;
  return `<h2>裝備</h2>${modeToggle()}
  <p class="dim small">① 選角色　② 選裝備欄　③ 點倉庫裡的裝備，就能看到<b>穿上之後的素質</b>（綠色▲變強、紅色▼變弱，含套裝加成），確認再穿上。</p>
  <div class="fitchars">${chars.map(c=>`<div class="fchar ${c===id?"on":""}" onclick="fitSel('${c}')"><div class="av">${avatar(c)}</div>
    <div class="fn">${CARDS[c].name}</div><div class="small dim">Lv.${lvOf(c)}${SAVE.team.includes(c)?" <span style='color:var(--red)'>出戰</span>":""}</div></div>`).join("")}</div>
  <div class="panel" style="margin-top:10px">
    <div class="row" style="gap:12px;align-items:center">
      <div class="av fx-${CARDS[id].r}" style="width:72px;height:72px;border-radius:10px;overflow:hidden;flex-shrink:0">${avatar(id)}</div>
      <div style="flex:1;min-width:0"><div class="r${CARDS[id].r}">${CARDS[id].r} ${starStr(o.stars,brOf(id))}</div><b style="font-size:17px">${CARDS[id].name}</b>
        <div>${clsTag(id)} <span class="small dim">Lv.${lvOf(id)}</span></div></div></div>
    <div style="margin-top:10px"><b class="small">${nw?"裝上之後的素質":"目前素質"}</b>${nw?` <span class="small dim">（含套裝加成）</span>`:""}</div>
    ${fitStatHtml(cur,nw)}
    ${nw?`<div class="fitpv"><b>預覽：${qTag(GEAR[pick.base].q)}${gearName(pick)}</b> <span class="small">${statStr(gearStats(pick))}${pick.fx&&pick.fx.length?" "+fxStr(pick):""}</span>
      ${pickWho&&pickWho!==id?`<div class="small" style="color:var(--gold)">👤 目前 ${CARDS[pickWho].name} 穿著，穿上會從他身上拿走</div>`:""}
      <div class="row" style="margin-top:8px"><button class="pri" onclick="fitEquip()">✅ 穿上</button><button onclick="FIT_PICK=0;render()">取消</button></div></div>`:""}
  </div>
  <div class="gslots" style="margin-top:10px">${Object.keys(SLOTS).map(sl=>{const g=gearById(eq[sl]);
    return `<div class="gslot ${g?"has "+GEAR[g.base].q:""} ${FIT_SLOT===sl?"fitsel":""}" onclick="fitSlot('${sl}')"><div class="small dim">${SLOTS[sl]}</div>
      <div class="gi">${g?gearImg(g.base):"＋"}</div>${g?`<b class="r${GEAR[g.base].q}">${qTag(GEAR[g.base].q)}${GEAR[g.base].name}${g.lv?" +"+g.lv:""}</b>${lvOk(id,g.base)?"":`<div class="req bad">需 Lv.${GEAR_REQ[GEAR[g.base].q]}</div>`}`:`<span class="dim small">空</span>`}</div>`;}).join("")}${lockedSlotsHtml()}</div>
  ${setHtml(id)}
  ${eq[FIT_SLOT]?`<div class="row" style="margin-top:6px"><button class="mini" onclick="fitTakeOff('${FIT_SLOT}')">卸下目前的${SLOTS[FIT_SLOT]}</button></div>`:""}
  <h3 style="margin-top:14px">📦 倉庫・${SLOTS[FIT_SLOT]}（${list.length} 件）</h3>${sortBar()}
  <div class="ggrid">${list.map(g=>{
    const G=GEAR[g.base],can=canWear(id,g.base),lok=lvOk(id,g.base),worn=gearOwner(g.uid),isCur=eq[FIT_SLOT]===g.uid;
    const note=isCur?`<div class="small" style="color:var(--green)">✔ ${CARDS[id].name} 穿著中</div>`:worn?`<div class="small" style="color:var(--gold)">👤 ${CARDS[worn].name} 穿著</div>`:"";
    const why=!can?"職業不符":!lok?`需 Lv.${GEAR_REQ[G.q]}`:"";
    return `<div class="fitgear ${FIT_PICK===g.uid?"sel":""} ${why?"cant":""}">${gearCard(g,`fitPick(${g.uid})`)}${note}${why?`<div class="small" style="color:var(--red)">✕ ${why}</div>`:""}</div>`;}).join("")||`<span class="dim">倉庫裡沒有${SLOTS[FIT_SLOT]}。去「商店」買，或打倒敵人掉落。</span>`}</div>`;
}
let GEAR_TAB="";
function viewGear(){return GEAR_MODE==="fit"?viewFit():GEAR_MODE==="dex"?viewDex():viewBag();}
function viewBag(){
  const list=SAVE.gear.filter(g=>!GEAR_TAB||GEAR[g.base].slot===GEAR_TAB).sort(gearSort);
  return `<h2>裝備</h2>${modeToggle()}
  <p class="dim small">點裝備可以「強化」或「分解」；要穿到角色身上，到「隊伍」點角色→點裝備欄。武器有職業限制，防具、飾品全職業可用。<br>
  強化：+1～+4 失敗沒有損失；+5～+10 失敗會掉 1 級（裝備不會碎）。🧿保護符可以防止掉級。</p>
  <div class="row small"><span>💎 突破石 ×${SAVE.charms.stone}</span><span>🧿 保護符 ×${SAVE.charms.protect}</span><span>🍀 幸運符 ×${SAVE.charms.luck}</span><button class="mini gold" style="margin-left:auto" onclick="go('shop')">🛒 去商店</button><button class="mini gold" onclick="openGearSwap()">🔄 換裝</button>
    <button class="mini" onclick="sellAllGear('R')">💰 一鍵售出 R 裝</button><button class="mini" onclick="sellAllGear('SR')">💰 一鍵售出 SR 裝</button></div>
  <div class="filters"><button class="${GEAR_TAB?"":"on"}" onclick="GEAR_TAB='';render()">全部（${SAVE.gear.length}）</button>${Object.keys(SLOTS).map(k=>`<button class="${GEAR_TAB===k?"on":""}" onclick="GEAR_TAB='${k}';render()">${SLOTS[k]}</button>`).join("")}</div>
  ${sortBar()}
  <div class="ggrid">${list.map(g=>gearCard(g,`openGear(${g.uid})`)).join("")||`<span class="dim">還沒有裝備。去「商店」買一件，或在遠征、競技場打倒敵人掉落。</span>`}</div>`;
}
function openGear(uid){
  const g=gearById(uid);if(!g)return closeModal();
  const G=GEAR[g.base],w=gearOwner(uid),cands=Object.keys(SAVE.owned).filter(id=>canWear(id,g.base)&&lvOk(id,g.base)&&id!==w).sort((a,b)=>R_ORDER[CARDS[a].r]-R_ORDER[CARDS[b].r]);
  const sell=GEAR_SELL[G.q]+Math.min(g.lv,ENH_MAX)*4;
  openModal(`<div class="detail"><div class="bigicon fx-${G.q}">${gearImg(g.base)}</div><div style="flex:1">
    <div class="r${G.q}">${G.q}（${GQ_NAME[G.q]}）・${SLOTS[G.slot]}</div><h2 style="margin:2px 0">${qTag(G.q)}${G.name}${g.lv?` <span style="color:var(--gold)">+${g.lv}</span>`:""}</h2>
    <div>${statStr(gearStats(g))}</div>
    <div class="small dim">品質 ${g.roll||100}%（同種裝備數值會浮動）</div>
    ${g.fx&&g.fx.length?`<div class="gfx">隨機詞條：${fxStr(g)}</div>`:`<div class="small dim">沒有隨機詞條</div>`}
    <div class="small dim">可裝備：${gearCls(g.base)}・穿戴等級 Lv.${GEAR_REQ[G.q]}</div>
    <div class="small dim">套裝：${SETS[setKeyOf(g.base)].name}（2件 ${statStr(SETS[setKeyOf(g.base)][2])}／3件 ${statStr(SETS[setKeyOf(g.base)][3])}）</div>
    ${w?`<div class="small" style="color:var(--green)">👤 ${CARDS[w].name} 正在使用</div>`:""}</div></div>
    <div class="row" style="margin-top:12px">
      <button class="pri" onclick="openEnhance(${uid})" ${g.lv>=enhCap(g)?"disabled":""}>🔨 強化${g.lv>=enhCap(g)?"（已滿）":""}</button>
      ${w?`<button onclick="unequip(${uid});save();openGear(${uid});render()">卸下</button>`:""}
      <button onclick="confirmGearSell(${uid})">💰 分解（🪙+${sell}）</button>
      <button style="margin-left:auto" onclick="closeModal()">關閉</button></div>
    ${cands.length?`<div class="sk"><b>👤 裝備給</b><div class="row" style="margin-top:6px">${cands.map(id=>`<button class="mini" onclick="equipTo('${id}',${uid});openGear(${uid});render()">${CARDS[id].name}</button>`).join("")}</div></div>`:""}`);
}
function confirmGearSell(uid){
  const g=gearById(uid),p=GEAR_SELL[GEAR[g.base].q]+Math.min(g.lv,ENH_MAX)*4;
  openModal(`<h3>分解 ${qTag(GEAR[g.base].q)}${gearName(g)}？</h3><p class="dim">裝備會消失，換得 🪙${p}。</p>
    <div class="row"><button class="pri" onclick="sellGear(${uid})">分解</button><button onclick="openGear(${uid})">取消</button></div>`);
}
function sellGear(uid){
  const g=gearById(uid);if(!g)return;const p=GEAR_SELL[GEAR[g.base].q]+Math.min(g.lv,ENH_MAX)*4;
  unequip(uid);SAVE.gear=SAVE.gear.filter(x=>x!==g);SAVE.gold+=p;save();closeModal();toast(`分解完成，🪙+${p}`);render();
}
// 一鍵售出：同品質、沒穿在角色身上、沒強化過（+0）的裝備全部分解
function sellAllGear(q,go){
  const list=SAVE.gear.filter(g=>GEAR[g.base].q===q&&!g.lv&&!gearOwner(g.uid)),p=list.length*GEAR_SELL[q];
  if(!list.length){toast(`沒有可以售出的 ${q} 裝備`);return;}
  if(!go)return openModal(`<h3>一鍵售出 ${q} 裝備？</h3><p class="dim">會分解 ${list.length} 件沒穿在角色身上、沒強化過的 ${q} 裝備，共換得 🪙${p}。</p>
    <div class="row"><button class="pri" onclick="sellAllGear('${q}',true)">售出</button><button onclick="closeModal()">取消</button></div>`);
  const ids=new Set(list.map(g=>g.uid));
  SAVE.gear=SAVE.gear.filter(g=>!ids.has(g.uid));SAVE.gold+=p;save();closeModal();toast(`售出 ${list.length} 件，🪙+${p}`);render();
}
// 換裝：投入同品質的裝備，換 1 件同品質的隨機裝備（不能指定、不含 EX）。強化等級不會保留
const GSWAP_COST={N:2,R:2,SR:2,SSR:3,UR:5};
let GSW={q:"N",pick:[]};
function openGearSwap(q){
  if(q&&q!==GSW.q)GSW={q,pick:[]};
  const t=GSW.q,need=GSWAP_COST[t];
  GSW.pick=GSW.pick.filter(u=>gearById(u));
  const list=SAVE.gear.filter(g=>GEAR[g.base].q===t).sort(gearSort);
  openModal(`<h3>🔄 換裝</h3>
    <div class="row" style="margin-bottom:8px">${Object.keys(GSWAP_COST).map(k=>`<button class="mini ${k===t?"pri":""}" onclick="openGearSwap('${k}')">${k} ×${GSWAP_COST[k]}</button>`).join("")}</div>
    <p class="dim small">投入 ${need} 件 ${t} 裝備，換 1 件隨機 ${t} 裝備（完全隨機、不能指定，也可能換到同款）。投入的裝備會消失，強化等級不保留，新裝備從 +0 開始。穿在角色身上的要先卸下。</p>
    <div class="ggrid">${list.map(g=>{const w=gearOwner(g.uid),on=GSW.pick.includes(g.uid);
      return `<div class="${on?"fitgear sel":""}">${gearCard(g,w?`toast('穿在角色身上，先卸下才能換')`:`gswapPick(${g.uid})`)}</div>`;}).join("")||`<span class="dim">沒有 ${t} 裝備</span>`}</div>
    <div class="row" style="margin-top:10px"><b style="margin-right:auto;color:${GSW.pick.length===need?"var(--gold)":"inherit"}">已選 ${GSW.pick.length}/${need}</b>
      <button onclick="GSW.pick=[];openGearSwap()">清除</button>
      <button class="pri" onclick="doGearSwap()" ${GSW.pick.length===need?"":"disabled"}>換裝</button><button onclick="closeModal()">關閉</button></div>`);
}
function gswapPick(uid){
  const i=GSW.pick.indexOf(uid);
  if(i>=0)GSW.pick.splice(i,1);
  else if(GSW.pick.length>=GSWAP_COST[GSW.q]){toast(`已經選滿 ${GSWAP_COST[GSW.q]} 件了`);return;}
  else GSW.pick.push(uid);
  SFX.click();openGearSwap();
}
function doGearSwap(){
  const t=GSW.q,gs=GSW.pick.map(gearById).filter(Boolean);
  if(gs.length!==GSWAP_COST[t]||gs.some(g=>GEAR[g.base].q!==t||gearOwner(g.uid)))return;
  const g=addGear(rollGear(t));
  SAVE.gear=SAVE.gear.filter(x=>!GSW.pick.includes(x.uid)||x===g);GSW.pick=[];
  save();SFX.click();render();
  openModal(`<h3>🔄 換裝完成</h3><div class="ggrid">${gearCard(g,`openGear(${g.uid})`)}</div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="openGearSwap()">繼續換裝</button><button onclick="closeModal()">關閉</button></div>`);
}
// 強化：成功率依目前等級遞減；幸運符 +10%；保護符防止失敗時掉級。裝備不會因強化失敗而損毀
let ENH={uid:0,protect:false,luck:false,res:null};
function openEnhance(uid){
  if(ENH.uid!==uid)ENH={uid,protect:false,luck:false,res:null};
  const g=gearById(uid);
  if(!g){openModal(`${ENH.res?`<div class="enhres bad">${ENH.res.msg}</div>`:""}<div class="row"><button onclick="closeModal();render()">關閉</button></div>`);return;}
  if(!SAVE.charms.protect)ENH.protect=false;
  if(!SAVE.charms.luck||g.lv>LUCK_MAX_LV)ENH.luck=false;
  const cap=enhCap(g),max=g.lv>=cap,rate=max?0:Math.min(100,ENH_RATE[g.lv]+(ENH.luck?10:0)),cost=enhCost(g.lv);
  const risk=g.lv<4?"失敗：沒有損失":g.lv>=ENH_MAX?"⚡超頻區：失敗掉 1 級":"失敗：掉 1 級";
  const nx={...g,lv:g.lv+1};
  openModal(`<h3>🔨 強化 ${qTag(GEAR[g.base].q)}${gearName(g)}</h3>
    ${ENH.res?`<div class="enhres ${ENH.res.ok?"ok":"bad"}">${ENH.res.msg}</div>`:""}
    ${max?`<p>已經強化到 +${cap}，無法再強化。</p>`:`
    <div>${statStr(gearStats(g))} <b>→</b> <span style="color:var(--green)">${statStr(gearStats(nx))}</span></div>
    <div style="margin-top:8px">成功率 <b style="color:var(--gold)">${rate}%</b>　<span class="dim small">${ENH.protect?"🧿 已使用保護符：失敗不掉級":risk}</span></div>
    <div class="ratebar"><i style="width:${rate}%"></i></div>
    <div class="row small" style="margin-top:6px">
      <label><input type="checkbox" ${ENH.protect?"checked":""} ${SAVE.charms.protect?"":"disabled"} onchange="ENH.protect=this.checked;openEnhance(${uid})"> 🧿 保護符（剩 ${SAVE.charms.protect}）</label>
      <label><input type="checkbox" ${ENH.luck?"checked":""} ${SAVE.charms.luck&&g.lv<=LUCK_MAX_LV?"":"disabled"} onchange="ENH.luck=this.checked;openEnhance(${uid})"> 🍀 幸運符 +10%（剩 ${SAVE.charms.luck}${g.lv>LUCK_MAX_LV?`，+${LUCK_MAX_LV} 以上不能用`:""}）</label></div>`}
    <div class="row" style="margin-top:12px">
      ${max?"":`<button class="pri" onclick="doEnhance(${uid})" ${SAVE.gold<cost?"disabled":""}>🔨 強化（🪙${cost}）</button>`}
      <button onclick="openGear(${uid})">返回</button><button style="margin-left:auto" onclick="closeModal();render()">關閉</button></div>`);
}
function doEnhance(uid){
  const g=gearById(uid);if(!g||g.lv>=enhCap(g))return;
  const cost=enhCost(g.lv);if(SAVE.gold<cost){toast("金條不足");return;}
  SAVE.gold-=cost;
  const prot=ENH.protect&&SAVE.charms.protect>0,luck=ENH.luck&&SAVE.charms.luck>0&&g.lv<=LUCK_MAX_LV;
  if(luck)SAVE.charms.luck--;
  const rate=Math.min(100,ENH_RATE[g.lv]+(luck?10:0)),from=g.lv;
  if(rnd()*100<rate){g.lv++;ENH.res={ok:true,msg:`✨ 強化成功！+${from} → +${g.lv}`};g.lv>=7?SFX.ssr():SFX.sr();
    if(g.lv===ENH_OC){ // +20：額外增加 1 條隨機詞條（不與現有的重複）
      g.fx=g.fx||[];const [k]=pickAffixKeys(1,g.fx.map(f=>f.k));
      if(k){g.fx.push({k,v:affixRoll(k,GEAR[g.base].q,GEAR[g.base].slot)});ENH.res.msg+=`<br>⚡ 超頻完成！獲得額外詞條：${fxStr({base:g.base,fx:[g.fx[g.fx.length-1]]})}`;}
      SFX.ssr();}}
  else if(from<4){ENH.res={ok:false,msg:`💥 強化失敗……（+${from}，沒有損失）`};SFX.lose();}
  else if(prot){SAVE.charms.protect--;ENH.res={ok:false,msg:`💥 強化失敗！🧿 保護符碎了，等級保住在 +${from}`};SFX.miss();}
  else{g.lv--;ENH.res={ok:false,msg:`💥 強化失敗！+${from} → +${g.lv}`};SFX.lose();}
  save();renderHeader();openEnhance(uid);
}

