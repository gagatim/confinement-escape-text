"use strict";
/* ===================== TEAM ===================== */
let SHOW_LOCKED=false;
function sortedIds(){return Object.keys(CARDS).filter(id=>(!CARDS[id].story&&!CARDS[id].off)||SAVE.owned[id]).sort((a,b)=>R_ORDER[CARDS[a].r]-R_ORDER[CARDS[b].r]||a.localeCompare(b));}
function cardTile(id,onclick,extraCls=""){
  const c=CARDS[id],o=SAVE.owned[id];
  return `<div class="ccard ${c.r} ${o?"":"locked"} ${o&&o.br?brTier(o.br):""} ${SAVE.team.includes(id)?"inteam":""} ${extraCls}" onclick="${onclick}">
    <div class="av">${avatar(id)}</div><div class="nm">${c.name}</div>
    <div class="stars ${o&&o.stars>=5?"max":""}">${o?starStr(o.stars,o.br):"未獲得"}</div>${o&&canBreak(id)?`<div class="small" style="color:var(--gold)">✨可突破</div>`:""}<div class="small"><span class="r${c.r}">${c.r}</span>${o?` <b>Lv.${lvOf(id)}</b>`:""} ${clsTag(id)}</div></div>`;
}
// 還沒解鎖 5 人出戰時，在「出戰隊伍」標題後面提示三個條件和目前進度；解鎖後就不再顯示
function fiveTip(){
  if(fiveOk(SAVE.prog))return "";
  const P=SAVE.prog,it=(ok,t,v)=>`<span style="white-space:nowrap">${ok?"✅":"⬜"} ${t}<span class="dim">（${v}）</span></span>`;
  return `<span class="small" style="display:inline-flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline"><b>🔒 解鎖 5 人出戰：</b>
    ${it((P.cleared||0)>=ABYSS,"主線 15 章全破",`${Math.min(P.cleared||0,ABYSS)}/${ABYSS}・簡單即可`)}
    ${it((P.fatty||0)>=5,"通關肥宅物語",`${P.fatty||0}/5`)}
    ${it((P.abyssBest||0)>=FIVE_ABYSS,`深淵到達 D${FIVE_ABYSS}`,`目前 D${P.abyssBest||0}`)}</span>`;
}
// N 白卡：只能遣散。沒有任何白卡時不顯示這一區
function junkPanel(){
  if(!junkCount())return "";
  return `<div class="panel"><div class="row"><b style="margin-right:auto"><span class="rN">N</span> 白卡雜物（${junkCount()} 張）</b>
    <button class="mini gold" onclick="openSynth('N')">🔮 ${JUNK_COST} 張合成 R</button>
    <button class="mini gold" onclick="quickSynth('N')">⚡ 一鍵合成 N 卡</button>
    <button class="mini" onclick="sellJunk()">💰 一鍵遣散全部（🪙${junkCount()*JUNK_PRICE}）</button></div>
    <div class="small dim" style="margin:4px 0 8px">白卡可以遣散（每張 🪙${JUNK_PRICE}），或任意 ${JUNK_COST} 張（可混搭）合成 1 名隨機 R 角色；不能組隊、升星或熔煉。</div>
    <div class="cardgrid">${JUNK_IDS.filter(k=>SAVE.junk[k]).map(k=>`<div class="ccard N" style="cursor:default"><div class="av">${avatar(k)}</div><div class="nm">${JUNK[k].name}</div>
      <div class="small">×${SAVE.junk[k]}</div><button class="mini" onclick="sellJunk('${k}')">遣散 🪙${SAVE.junk[k]*JUNK_PRICE}</button></div>`).join("")}</div></div>`;
}
const JUNK_COST=5; // N 白卡合成：5 張（可混搭）→ 1 名隨機 R，每名 R 機率相同
function sellJunk(id){
  const ids=id?[id]:JUNK_IDS;let n=0;
  ids.forEach(k=>{n+=SAVE.junk[k]||0;SAVE.junk[k]=0;});
  if(!n)return;
  SAVE.gold+=n*JUNK_PRICE;save();SFX.click();toast(`遣散白卡 ${n} 張，🪙+${n*JUNK_PRICE}`);render();
}
let TEAM_CLS="";
function clsFilter(cur,fn){
  return `<div class="filters"><button class="${cur?"":"on"}" onclick="${fn}('')">全部</button>${Object.keys(CLASSES).map(k=>`<button class="${cur===k?"on":""}" onclick="${fn}('${k}')">${CLASSES[k].icon}${CLASSES[k].name}</button>`).join("")}</div>`;
}
function setTeamCls(k){TEAM_CLS=k;render();}
function viewTeam(){
  const ids=sortedIds().filter(id=>(SHOW_LOCKED||SAVE.owned[id])&&(!TEAM_CLS||CARDS[id].cls===TEAM_CLS));
  return `<div class="row" style="align-items:baseline;gap:6px 14px"><h2 style="margin-right:0">出戰隊伍</h2>${fiveTip()}</div>
  <div class="teamslots ${teamMax()>3?"five":""}">${Array.from({length:teamMax()},(_,i)=>i).map(i=>{const id=SAVE.team[i];return id?cardTile(id,`showCard('${id}')`):`<div class="slot">空位</div>`;}).join("")}</div>
  <p class="dim small">點卡片查看技能、加入或移出隊伍。遠征與競技場都使用這支隊伍。不要的角色可以在卡片裡「遣散」換金條（R 🪙3／SR 🪙10／SSR 🪙30，每星計算），或用「合成」把 <b>5 張 N 白卡</b>換成 1 名 R、6★ 份的 R 換成 1 名 SR、6★ 份的 SR 換成 1 名 SSR，或用「熔煉」把 2 名同稀有度角色熔成 1 名同稀有度的其他角色（等級、星數、突破取較低的）。</p>
  ${storePanel()}
  ${shardPanel()}
  ${junkPanel()}
  <div class="row"><h3 style="margin-right:auto">收藏（${ownedCount()}/${CARD_IDS.length}）</h3>
  <button class="mini gold" onclick="openSynth()">🔮 合成</button>
  <button class="mini gold" onclick="openSmelt()">🔥 熔煉</button>
  <button class="mini gold" onclick="openShards()">🧩 碎片兌換</button>
  <button class="mini gold" onclick="quickSynth('N')">⚡ 一鍵合成 N 卡</button>
  <button class="mini gold" onclick="quickSynth('R')">⚡ 一鍵合成 R 卡</button>
  <button class="mini gold" onclick="quickSynth('SR')">⚡ 一鍵合成 SR 卡</button>
  <button class="mini" onclick="sellAllR()">💰 一鍵遣散 R 卡</button>
  <label class="small"><input type="checkbox" ${SHOW_LOCKED?"checked":""} onchange="SHOW_LOCKED=this.checked;render()"> 顯示未獲得</label></div>
  ${clsFilter(TEAM_CLS,"setTeamCls")}
  ${TEAM_CLS?`<p class="small dim" style="margin:0 0 8px">${CLASSES[TEAM_CLS].icon}${CLASSES[TEAM_CLS].name}：${CLASSES[TEAM_CLS].desc}</p>`:""}
  <div class="cardgrid">${ids.map(id=>cardTile(id,`showCard('${id}')`)).join("")}</div>`;
}
// 圖鑑：全部遊戲角色（含未獲得）＋ 8 位魔王
let DEX_CLS="";
function setDexCls(k){DEX_CLS=k;render();}
function viewCodex(){
  const ids=sortedIds().concat(Object.keys(CARDS).filter(id=>CARDS[id].off&&!SAVE.owned[id])).filter(id=>!DEX_CLS||CARDS[id].cls===DEX_CLS); // 尚未開放取得的角色也在圖鑑展示
  return `<h2>圖鑑</h2>
  <h3>遊戲角色（${ownedCount()}/${CARD_IDS.length}）</h3>
  ${clsFilter(DEX_CLS,"setDexCls")}
  ${DEX_CLS?`<p class="small dim" style="margin:0 0 8px">${CLASSES[DEX_CLS].icon}${CLASSES[DEX_CLS].name}：${CLASSES[DEX_CLS].desc}</p>`:""}
  <div class="cardgrid">${ids.map(id=>cardTile(id,`showCard('${id}')`)).join("")}</div>
  <h3 style="margin-top:22px">👑 魔王角色 <span class="dim small">（無法獲取・僅供展示）</span></h3>
  <p class="dim small" style="margin-top:0">支線「魔王討伐」的 8 位魔王。點開可以看一般型態、爆氣型態、技能和個人故事。</p>
  <div class="bossgrid">${BOSS_LIST.map(id=>`<div class="bosscard" onclick="openBossShow('${id}')"><div class="bav"><img src="images/bosses/${id}_1.webp" alt=""></div>
    <div class="bn">${MONSTERS[id].name}</div><div class="small dim">${MONSTERS[id].quote}</div></div>`).join("")}</div>`;
}
// 魔王展示：一般／爆氣兩種型態都看得到（魔王只在遠征的魔王討伐出現，不能獲得）
let BOSS_PH=1;
function openBossShow(id,ph){
  if(ph)BOSS_PH=ph;
  const M=MONSTERS[id],i=BOSS_LIST.indexOf(id);
  openModal(`${BOSS_VIDEO[id]?bossVideoHtml(id,!ph):""}<div class="detail"><div class="av" style="width:150px;min-width:150px;box-shadow:0 0 18px ${BOSS_PH===2?"rgba(229,72,77,.8)":"rgba(176,124,255,.5)"}"><img class="avimg" src="images/bosses/${id}_${BOSS_PH}.webp" alt=""></div>
    <div style="flex:1"><div class="rEX">魔王 ${i+1}／8・無法獲取</div><h2 style="margin:2px 0">${M.name}</h2>
    <div class="small" style="font-style:italic">「${M.quote}」</div>
    <div class="row" style="margin-top:8px"><button class="mini ${BOSS_PH===1?"pri":""}" onclick="openBossShow('${id}',1)">一般型態</button><button class="mini ${BOSS_PH===2?"pri":""}" onclick="openBossShow('${id}',2)">💢 爆氣型態</button></div></div></div>
    <div class="sk"><b>📜 ${M.name}的故事</b>${BOSS_STORY[id].map(t=>`<p style="margin:6px 0">${t}</p>`).join("")}</div>
    ${skillHtml(M)}
    <div class="sk"><b>💢 爆氣</b><br>第一條命打完後爆氣：生命回復到 ${Math.round(M.boss2.hp*100)}%、攻擊+${Math.round(M.boss2.atk*100)}%、速度+${M.boss2.spd}、解除減益與中毒、技能冷卻 -1。</div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="closeModal();go('boss')">前往魔王討伐</button><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
function skillHtml(d){
  return `<div class="sk"><b>✦ ${d.skill.name}</b> <span class="dim small">冷卻 ${d.skill.cd}</span><br>${d.skill.desc}</div>
  <div class="sk"><b>◈ ${d.passive.name}</b> <span class="dim small">被動</span><br>${d.passive.desc}</div>`;
}
function showCard(id){
  const c=CARDS[id],o=SAVE.owned[id],s=cardStats(id,o?o.stars:1,o?lvScale(id):1,brOf(id)),inT=SAVE.team.includes(id),e=equipBonus(id);
  const sv=(k,v)=>`${v}${e[k]?`<span style="color:var(--green)">+${e[k]}</span>`:""}`;
  openModal(`<div class="detail"><div class="av fx-${c.r} ${o&&o.br?brTier(o.br):""}">${avatar(id)}</div><div style="flex:1">
    <div class="r${c.r}">${c.r} ${o?starStr(o.stars,brOf(id)):""}</div><h2 style="margin:2px 0">${c.name}</h2>
    <div>${clsTag(id)} <span class="dim small">${CLASSES[c.cls].desc}</span></div>${o?lvBar(id):""}
    <div class="small">❤ ${sv("hp",s.maxHp)}　⚔ ${sv("atk",s.atk)}　🛡 ${sv("def",s.def)}　💨 ${sv("spd",s.spd)}</div>
    ${o?`<div class="gslots">${Object.keys(SLOTS).map(sl=>{const g=gearById(o.eq&&o.eq[sl]);
      return `<div class="gslot ${g?"has "+GEAR[g.base].q:""}" onclick="openSlot('${id}','${sl}')"><div class="gi">${g?gearImg(g.base):"＋"}</div>${g?`<b class="r${GEAR[g.base].q}">${qTag(GEAR[g.base].q)}${GEAR[g.base].name}${g.lv?" +"+g.lv:""}</b>${lvOk(id,g.base)?"":`<div class="req bad">⚠ 需 Lv.${GEAR_REQ[GEAR[g.base].q]}，未生效</div>`}`:`<span class="dim">${SLOTS[sl]}</span>`}</div>`;}).join("")}${lockedSlotsHtml()}</div>
    ${setHtml(id)}${e.crit||e.steal||e.dodge||e.dr?`<div class="gfx">裝備特效：${statStr({crit:e.crit,steal:e.steal,dodge:e.dodge,dr:e.dr})}</div>`:""}`:""}
    </div></div>
    ${skillHtml(c)}
    ${o?skinHtml(id):""}
    ${c.evolveFrom?`<div class="sk small"><b>🆙 進化角色</b><br>《肥宅物語》通關後由 SR 肥宅進化，或用 10 張 SR 肥宅兌換取得，不進招募池。<b>無法合成、熔煉、遣散</b>，不能當「轉換」的來源（可以當轉換的目標）。</div>`:""}
    ${id==="fatty"?`<div class="sk small"><b>🔁 SSR 肥宅</b><br>抽到 SR 肥宅 ${fattyCopies()}／${FATTY_EXCHANGE} 張，${fattyExchangeOpen()?`滿 ${FATTY_EXCHANGE} 張可以換 1 張 SSR 肥宅。`:`🔒 通關肥宅物語第 5 章後，滿 ${FATTY_EXCHANGE} 張可以換 1 張 SSR 肥宅。`}SR 肥宅不提供合成。<div class="row" style="margin-top:6px"><button class="mini ${fattyCanExchange()?"pri":""}" onclick="closeModal();confirmFattyExchange()" ${fattyCanExchange()?"":"disabled"}>${fattyExchangeOpen()?"🔁 兌換 SSR 肥宅":"🔒 兌換（尚未開放）"}</button></div></div>`:""}
    ${id==="fatty"&&o&&(SAVE.prog.fatty||0)>=5&&!SAVE.owned.fatty2?`<div class="sk small"><b>🆙 可以進化！</b><br>《肥宅物語》已通關，這位肥宅可以進化成 SSR。<div class="row" style="margin-top:6px"><button class="pri" onclick="closeModal();confirmEvolve()">🆙 進化成 SSR</button></div></div>`:""}
    ${c.off?`<div class="sk small"><b>🔒 尚未開放</b><br>這位角色還在準備中，目前無法取得，只先在圖鑑展示。</div>`:""}
    ${c.story&&!c.evolveFrom?`<div class="sk small"><b>📖 劇情角色</b><br>《名冊》故事線的同伴。通關第 ${c.gachaCh} 章後可以在招募所抽到。<b>無法合成、熔煉、遣散</b>，不能當「轉換」的來源（可以當轉換的目標）。</div>`:""}
    ${o&&fruitVisible(id)?fruitHtml(id):""}
    <div class="row" style="margin-top:12px">
      ${o?(inT?`<button onclick="toggleTeam('${id}')">移出隊伍</button>`:`<button class="pri" onclick="toggleTeam('${id}')" ${SAVE.team.length>=teamMax()?"disabled":""}>加入隊伍${SAVE.team.length>=teamMax()?"（已滿）":""}</button>`):`<span class="dim">尚未獲得</span>`}
      ${o&&o.dup&&o.stars<5?`<button class="pri" onclick="starUp('${id}')">⭐ 升星（重複卡 ×${o.dup}）</button>`:""}
      ${o&&o.dup>1&&o.stars<4?`<button class="gold" onclick="starUp('${id}',true)">⭐ 全部升星</button>`:""}
      ${o&&o.stars<5?`<button class="gold" onclick="openShards('${CARDS[id].r}')">🧩 碎片補星（${SHARD_STAR[CARDS[id].r]}）</button>`:""}
      ${canBreak(id)?`<button class="gold" onclick="BR_RES=null;confirmBreak('${id}')">✨ 突破（${brOf(id)}→${brOf(id)+1}）</button>`:""}
      <button onclick="closeModal()" style="margin-left:auto">關閉</button></div>
    ${o&&o.stars>=5&&!canBreak(id)?`<div class="dim small" style="margin-top:6px">已突破到上限（${BR_MAX}）。</div>`:o&&!brOf(id)&&o.stars<5?`<div class="dim small" style="margin-top:6px">升到 5★ 後可以「突破」，讓角色變得更強。</div>`:""}
    ${o&&o.dup&&o.stars>=5?`<div class="dim small" style="margin-top:6px">重複卡 ×${o.dup}：已經 5★，突破後星數回到 1★ 就能用來升星，也可以在下面遣散換金條。</div>`:""}
    ${o?sellHtml(id):""}`);
}
// 遣散：每顆星算一張卡的價值。期望值低於抽卡價（約5／抽），不會變成刷錢手段
const SELL_PRICE={R:3,SR:10,SSR:30};
// 碎片：只有遣散 SSR 角色（含重複卡）才會有；R、SR 不再產生碎片
const SHARD_SELL={R:0,SR:0,SSR:5};
const SHARD_NEW={R:25,SR:80,SSR:200},SHARD_STAR={R:8,SR:25,SSR:70};
const SHARD_NAME={R:"R 碎片",SR:"SR 碎片",SSR:"SSR 碎片"};
function sellBlock(id){
  if(storyOn(id))return "劇情角色，無法遣散";
  if(SAVE.team.includes(id))return "在出戰隊伍中，先移出隊伍才能遣散";
  if(isStored(id))return "存入中，先取出才能遣散";
  if(SAVE.run&&SAVE.run.party.some(m=>!m.ally&&m.id===id))return "正在遠征中，結束後才能遣散";
  if(Object.keys(SAVE.owned).length<=3)return "至少要保留 3 名角色";
  return "";
}
function cardWorth(id){const o=SAVE.owned[id];return o.stars+brOf(id)*5+(o.dup||0);}
// 手動升星：每張重複卡可以換 1★（升到 5★ 為止）。突破後星數回到 1★，沒用完的重複卡可以繼續用
function starUp(id,all){
  const o=SAVE.owned[id];if(!o||!o.dup||o.stars>=5)return;
  let n=0;
  do{o.dup--;o.stars++;n++;}while(all&&o.dup>0&&o.stars<5);
  save();SFX.ssr();toast(`${CARDS[id].name} 升至 ${o.stars}★${o.dup?`（剩 ${o.dup} 張重複卡）`:""}`);showCard(id);render();
}
// 拆解 SSR：集中處理 SSR 的重複卡與多餘星數，換金條和碎片（不會拆掉整張角色）
function dismantleBlock(id){
  if(SAVE.team.includes(id))return "出戰隊伍中";
  if(isStored(id))return "存入中";
  if(SAVE.run&&SAVE.run.party.some(m=>!m.ally&&m.id===id))return "遠征中";
  return "";
}
function dismantleIds(){return Object.keys(SAVE.owned).filter(id=>CARDS[id].r==="SSR"&&!CARDS[id].story&&((SAVE.owned[id].dup||0)>0||SAVE.owned[id].stars>1));}
function dmReward(n){return `🪙+${SELL_PRICE.SSR*n} 🧩+${SHARD_SELL.SSR*n}`;}
function openDismantle(){
  const ids=dismantleIds(),dupAll=ids.reduce((a,id)=>a+(SAVE.owned[id].dup||0),0);
  openModal(`<h3>🔨 拆解 SSR</h3>
    <p class="dim small">拆解 SSR 的<b>重複卡</b>或<b>多餘的星數</b>，每張／每 1 星可得 🪙${SELL_PRICE.SSR}＋🧩${SHARD_SELL.SSR} 碎片。角色本身不會被拆掉（要整張遣散請到角色頁）。目前碎片：<b class="rSSR">🧩 ${SAVE.shards.SSR}</b></p>
    ${ids.length?ids.map(id=>{const o=SAVE.owned[id],d=o.dup||0,why=dismantleBlock(id),extra=o.stars-1+d;
      return `<div class="row" style="margin:6px 0;align-items:center;gap:8px"><div class="av" style="width:44px;height:44px;border-radius:6px;overflow:hidden">${avatar(id)}</div>
        <div style="flex:1;min-width:120px"><b class="rSSR">${CARDS[id].name}</b> <span class="small dim">${o.stars}★${d?`・重複卡 ×${d}`:""}</span></div>
        ${d?`<button class="mini gold" onclick="doDismantle('${id}','dup')">拆重複卡 ×${d}（${dmReward(d)}）</button>`:""}
        ${o.stars>1?(why?`<span class="small dim">降星：${why}</span>`:`<button class="mini" onclick="doDismantle('${id}','one')">拆到 1★（${dmReward(extra)}）</button>`):""}
      </div>`;}).join(""):`<p class="dim">目前沒有可以拆解的 SSR（沒有重複卡，也沒有 2★ 以上的 SSR）。</p>`}
    <div class="row" style="margin-top:12px">${dupAll?`<button class="pri" onclick="doDismantle(null,'all')">🔨 拆全部 SSR 重複卡（${dupAll} 張・${dmReward(dupAll)}）</button>`:""}<button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
// mode：dup＝這張的重複卡；one＝拆到只剩 1★（星數和重複卡都換成碎片）；all＝全部 SSR 的重複卡
function doDismantle(id,mode){
  let n=0;
  if(mode==="all")dismantleIds().forEach(k=>{const o=SAVE.owned[k];n+=o.dup||0;o.dup=0;});
  else{
    const o=SAVE.owned[id];if(!o||CARDS[id].r!=="SSR"||CARDS[id].story)return;
    if(mode==="dup"){n=o.dup||0;o.dup=0;}
    else if(mode==="one"){if(dismantleBlock(id))return;n=o.stars-1+(o.dup||0);o.stars=1;o.dup=0;}
  }
  if(!n)return;
  SAVE.gold+=SELL_PRICE.SSR*n;SAVE.shards.SSR+=SHARD_SELL.SSR*n;save();SFX.click();toast(`拆解完成，${dmReward(n)}`);
  openDismantle();render();
}
// 遣散多餘的重複卡（不影響星數）
function sellDup(id){
  const o=SAVE.owned[id];if(!o||!o.dup)return;
  const p=SELL_PRICE[CARDS[id].r],sh=SHARD_SELL[CARDS[id].r];
  o.dup--;SAVE.gold+=p;SAVE.shards[CARDS[id].r]+=sh;save();SFX.click();toast(`遣散重複卡，🪙+${p}${sh?` 🧩+${sh}`:""}`);showCard(id);render();
}
function sellHtml(id){
  const o=SAVE.owned[id],p=SELL_PRICE[CARDS[id].r],why=sellBlock(id);
  const rs=resetBlock(id);
  return `<div class="sk"><b>🔄 重置養成</b> <span class="dim small">等級回 Lv.1、突破歸零（不退還）</span>
    <div class="row" style="margin-top:6px">${rs?`<span class="small dim">${rs}</span>`:(lvOf(id)>1||brOf(id)?`<button class="mini" onclick="confirmReset('${id}')">重置等級／突破</button>`:`<span class="small dim">已是 Lv.1、未突破</span>`)}</div></div>
    <div class="sk"><b>💰 遣散</b> <span class="dim small">每 1 星可換 🪙${p}</span>
    ${why?`<div class="dim small">${why}</div>`:`<div class="row" style="margin-top:6px">
      ${o.dup?`<button class="mini" onclick="sellDup('${id}')">遣散 1 張重複卡（🪙+${p}${SHARD_SELL[CARDS[id].r]?` 🧩+${SHARD_SELL[CARDS[id].r]}`:""}）</button>`:""}
      ${o.stars>1?`<button class="mini" onclick="sellCard('${id}',1)">降 1 星（🪙+${p}${SHARD_SELL[CARDS[id].r]?` 🧩+${SHARD_SELL[CARDS[id].r]}`:""}）</button>`:""}
      ${trained(id)?`<span class="small dim">已練過，不能整張遣散</span>`:`<button class="mini" onclick="confirmSell('${id}')">全部遣散（🪙+${p*cardWorth(id)}${SHARD_SELL[CARDS[id].r]?` 🧩+${SHARD_SELL[CARDS[id].r]*cardWorth(id)}`:""}）</button>`}</div>`}</div>`;
}
// 重置養成：等級回到 Lv.1、經驗清空、突破歸零（不退任何東西）；星數請用「降星」，這樣練過的卡就能拿去合成
function resetBlock(id){
  if(storyOn(id))return "劇情角色，無法重置";
  if(SAVE.team.includes(id))return "在出戰隊伍中，先移出隊伍才能重置";
  if(isStored(id))return "存入中，先取出才能重置";
  if(SAVE.run&&SAVE.run.party.some(m=>!m.ally&&m.id===id))return "正在遠征中，結束後才能重置";
  return "";
}
function confirmReset(id){
  const o=SAVE.owned[id];
  openModal(`<h3>重置 ${CARDS[id].name}？</h3><p class="dim">等級 Lv.${lvOf(id)} 會回到 Lv.1、經驗清空${brOf(id)?`、突破 ${brOf(id)} 歸零`:""}。<b>不會退還任何東西</b>（經驗、突破石都不退），星數（${o.stars}★）不變；要降星請用「降 1 星」。重置後星數 2★ 以下就不算練過，可以拿去合成。裝備不受影響，但等級不夠的裝備會暫時失效。</p>
    <div class="row"><button class="pri" onclick="resetCard('${id}')">重置</button><button onclick="showCard('${id}')">取消</button></div>`);
}
function resetCard(id){
  const o=SAVE.owned[id];if(!o||resetBlock(id))return;
  o.lv=1;o.exp=0;delete o.br;
  save();SFX.click();toast(`${CARDS[id].name} 已重置為 Lv.1`);showCard(id);render();
}
function sellCard(id,n){
  const o=SAVE.owned[id];if(!o||sellBlock(id))return;
  if(trained(id)&&n>=o.stars)return; // 練過的角色不能整張遣散（降星還是可以）
  // 降星不會降到 0；全部遣散時連突破一起算錢
  if(n>=o.stars)n=cardWorth(id);
  const g=SELL_PRICE[CARDS[id].r]*n;
  if(n>=cardWorth(id))delete SAVE.owned[id];else o.stars-=n;
  const sh=SHARD_SELL[CARDS[id].r]*n;SAVE.shards[CARDS[id].r]+=sh;
  SAVE.gold+=g;save();SFX.click();toast(`遣散 ${CARDS[id].name}，🪙+${g}${sh?` 🧩+${sh}`:""}`);
  if(SAVE.owned[id])showCard(id);else closeModal();
  render();
}
function confirmSell(id){
  const o=SAVE.owned[id],g=SELL_PRICE[CARDS[id].r]*cardWorth(id);
  openModal(`<h3>遣散 ${CARDS[id].name}？</h3><p class="dim">這張卡（${brOf(id)?`突破${brOf(id)} `:""}${o.stars}★）會從收藏中移除，換得 🪙${g}${SHARD_SELL[CARDS[id].r]?` 和 🧩${SHARD_NAME[CARDS[id].r]} ×${SHARD_SELL[CARDS[id].r]*cardWorth(id)}`:""}。之後抽到會從 1★ 重新開始。</p>
    <div class="row"><button class="pri" onclick="sellCard('${id}',99)">遣散</button><button onclick="showCard('${id}')">取消</button></div>`);
}
function trained(id){const o=SAVE.owned[id];return !!o&&(o.stars>2||lvOf(id)>50||!!brOf(id));} // 練過的角色（3★ 以上／Lv.50 以上／突破過；有重複卡不算）：一鍵操作一律跳過
// 一鍵：把不在隊伍裡、沒練過（2★ 以下、Lv.50 以下、未突破）的 R 卡遣散（保留至少 3 名角色）
function sellAllR(go){
  const ids=Object.keys(SAVE.owned).filter(id=>CARDS[id].r==="R"&&!sellBlock(id)&&!brOf(id)&&!trained(id));
  const keep=Math.max(0,3-(Object.keys(SAVE.owned).length-ids.length)),list=ids.slice(keep);
  const g=list.reduce((a,id)=>a+SELL_PRICE.R*(SAVE.owned[id].stars+(SAVE.owned[id].dup||0)),0);
  if(!list.length){toast("沒有可以遣散的 R 卡");return;}
  if(!go)return openModal(`<h3>一鍵遣散 R 卡？</h3><p class="dim">會遣散 ${list.length} 張不在隊伍中、2★ 以下、Lv.50 以下、沒突破過的 R 卡：${list.map(id=>CARDS[id].name).join("、")}。共換得 🪙${g}。</p>
    <div class="row"><button class="pri" onclick="sellAllR(true)">遣散</button><button onclick="closeModal()">取消</button></div>`);
  list.forEach(id=>delete SAVE.owned[id]);SAVE.gold+=g;save();closeModal();toast(`遣散 ${list.length} 張，🪙+${g}`);render();
}
// 合成：N 白卡投入 5 張（可混搭）換 1 名 R；R、SR 投入 6 份的同稀有度角色（每名角色的份數＝星數＋重複卡，先扣重複卡；可混搭、可只拆部分），換 1 名高一階的隨機角色，60% 優先給還沒擁有的
const SYN_COST=6,SYN_UP={N:"R",R:"SR",SR:"SSR"};
const synCost=t=>t==="N"?JUNK_COST:SYN_COST;
let SYN={tier:"R",pick:{}};
function synBlock(id){
  if(storyOn(id))return "劇情角色";
  if(id==="fatty")return "不提供合成";
  if(SAVE.team.includes(id))return "隊伍中";
  if(isStored(id))return "存入中";
  if(SAVE.run&&SAVE.run.party.some(m=>!m.ally&&m.id===id))return "遠征中";
  if(trained(id))return "已練過";
  return "";
}
function synTotal(){return Object.values(SYN.pick).reduce((a,b)=>a+b,0);}
function openSynth(tier){
  if(tier&&tier!==SYN.tier)SYN={tier,pick:{}};
  const t=SYN.tier,n=synTotal(),cost=synCost(t),unit=t==="N"?"張":"★",isN=t==="N";
  const ids=isN?JUNK_IDS.filter(k=>SAVE.junk[k]>0):sortedIds().filter(id=>SAVE.owned[id]&&CARDS[id].r===t);
  openModal(`<h3>🔮 合成</h3>
    <div class="row" style="margin-bottom:8px">${Object.keys(SYN_UP).map(k=>`<button class="mini ${k===t?"pri":""}" onclick="openSynth('${k}')">${k==="N"?`${JUNK_COST} 張`:`${SYN_COST}★`} ${k} → 1 名 ${SYN_UP[k]}</button>`).join("")}</div>
    <p class="dim small">${isN?`點白卡投入 1 張（再點會繼續加，最多到持有的張數），任意 ${JUNK_COST} 張（可混搭）換 1 名隨機 R 角色，每名 R 的機率相同。`:`點角色投入 1 份（再點會繼續加）。每名角色的份數＝星數＋重複卡張數，先用掉重複卡再扣星數；星數用光的角色會從收藏移除。隊伍中、遠征中的角色不能投入。`}</p>
    <div class="cardgrid">${ids.map(id=>{const u=SYN.pick[id]||0;
      if(isN)return `<div class="ccard N" onclick="synAdd('${id}')"><div class="av">${avatar(id)}</div><div class="nm">${JUNK[id].name}</div>
        <div class="small">持有 ×${SAVE.junk[id]}</div><div class="small" style="color:var(--gold)">${u?`投入 ${u}張`:"&nbsp;"}</div></div>`;
      const o=SAVE.owned[id],b=synBlock(id);
      return `<div class="ccard ${t} ${b?"locked":""}" ${b?"":`onclick="synAdd('${id}')"`}><div class="av">${avatar(id)}</div><div class="nm">${CARDS[id].name}</div>
        <div class="stars">${starStr(o.stars)}</div><div class="small" style="color:var(--gold)">${b||(u?`投入 ${u}★`:(o.dup?`重複卡 ×${o.dup}`:"&nbsp;"))}</div></div>`;}).join("")||`<span class="dim">沒有 ${isN?"白卡":t+" 角色"}</span>`}</div>
    <div class="row" style="margin-top:10px"><b style="margin-right:auto;color:${n>=cost?"var(--gold)":"inherit"}">已投入 ${n}/${cost}${unit}</b>
      <button onclick="SYN.pick={};openSynth()">清除</button>
      <button class="gold" onclick="confirmAutoSynth()">⚡ 一鍵合成</button>
      <button class="pri" onclick="doSynth()" ${n===cost?"":"disabled"}>合成</button><button onclick="closeModal()">關閉</button></div>`);
}
function synAdd(id){
  const u=SYN.pick[id]||0,t=SYN.tier,cost=synCost(t);
  if(synTotal()>=cost){toast(`已經滿 ${cost}${t==="N"?"張":"★"} 了`);return;}
  if(t==="N"){if(u>=(SAVE.junk[id]||0)){toast("這種白卡已經全部投入");return;}}
  else if(u>=SAVE.owned[id].stars+(SAVE.owned[id].dup||0)){toast("這名角色的星數與重複卡已經全部投入");return;}
  SYN.pick[id]=u+1;SFX.click();openSynth();
}
function doSynth(){
  if(synTotal()!==synCost(SYN.tier))return;
  if(SYN.tier!=="N"){
    const gone=Object.keys(SYN.pick).filter(id=>SYN.pick[id]>=SAVE.owned[id].stars+(SAVE.owned[id].dup||0));
    if(Object.keys(SAVE.owned).length-gone.length<2){toast("合成後至少要保留 2 名其他角色");return;}
  }
  const {id,gr}=synthCore(SYN.pick,SYN.tier),up=SYN_UP[SYN.tier];
  SYN.pick={};save();up==="SSR"?SFX.ssr():SFX.sr();render();
  openModal(`<h3>🔮 合成成功</h3><div class="detail"><div class="av">${avatar(id)}</div><div>
    <div class="r${up}">${up}</div><h2 style="margin:2px 0">${CARDS[id].name}</h2>
    <div>${gr.isNew?"NEW!":`重複卡 ×${gr.dupe}（可手動升星）`}</div></div></div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="openSynth()">繼續合成</button><button onclick="showCard('${id}')">查看角色</button><button onclick="closeModal()">關閉</button></div>`);
}
// 合成一次：扣掉投入的星數，給 1 名高一階的隨機角色（60% 優先沒有的）
function synthCore(pk,tier){
  if(tier==="N"){
    Object.entries(pk).forEach(([id,n])=>{SAVE.junk[id]-=n;});
    const id=pick(POOL.R);
    return {id,gr:grant(id)};
  }
  Object.entries(pk).forEach(([id,n])=>{const o=SAVE.owned[id],d=Math.min(o.dup||0,n);o.dup=(o.dup||0)-d;o.stars-=n-d;if(o.stars<=0)delete SAVE.owned[id];});
  const up=SYN_UP[tier],pool=POOL[up].filter(id=>id!=="fatty"),fresh=pool.filter(id=>!SAVE.owned[id]);
  const id=fresh.length&&rnd()<.6?pick(fresh):pick(pool);
  return {id,gr:grant(id)};
}
// 一鍵合成：自動挑材料、能合幾次就合幾次。優先用等級低、星數少的角色；隊伍中、遠征中、練過的（3★ 以上／Lv.50 以上／突破）不會被用到
function synthPlan(t){
  if(t==="N"){ // 白卡：每次取 5 張，優先用張數多的種類
    const left={};JUNK_IDS.forEach(k=>left[k]=SAVE.junk[k]||0);const plan=[];
    for(;;){
      const pk={};let need=JUNK_COST;
      JUNK_IDS.slice().sort((a,b)=>left[b]-left[a]).forEach(k=>{const n=Math.min(left[k],need);if(n>0){pk[k]=n;need-=n;}});
      if(need>0)break;
      Object.entries(pk).forEach(([k,n])=>left[k]-=n);plan.push(pk);
    }
    return plan;
  }
  const left={};let total=Object.keys(SAVE.owned).length;
  Object.keys(SAVE.owned).forEach(id=>left[id]=SAVE.owned[id].stars+(SAVE.owned[id].dup||0));
  const elig=Object.keys(SAVE.owned).filter(id=>CARDS[id].r===t&&!synBlock(id)&&!trained(id))
    .sort((a,b)=>lvOf(a)-lvOf(b)||SAVE.owned[a].stars-SAVE.owned[b].stars||a.localeCompare(b));
  const plan=[];
  for(;;){
    const pk={};let need=SYN_COST;
    for(const id of elig){if(!left[id])continue;const n=Math.min(left[id],need);pk[id]=n;need-=n;if(!need)break;}
    if(need>0)break;
    const gone=Object.keys(pk).filter(id=>pk[id]>=left[id]).length;
    if(total-gone<2)break;
    Object.entries(pk).forEach(([id,n])=>{left[id]-=n;if(!left[id])total--;});
    plan.push(pk);
  }
  return plan;
}
// 隊伍頁的捷徑：不用先開合成視窗，直接跳到該稀有度的一鍵合成確認
function quickSynth(t){
  SYN={tier:t,pick:{}};confirmAutoSynth();
}
function confirmAutoSynth(){
  const t=SYN.tier,plan=synthPlan(t);
  if(!plan.length){toast(t==="N"?`白卡不夠 ${JUNK_COST} 張`:`可用的 ${t} 角色不夠 ${SYN_COST} 張（隊伍中、遠征中、練過的不算）`);return;}
  const use={};plan.forEach(pk=>Object.entries(pk).forEach(([id,n])=>use[id]=(use[id]||0)+n));
  const list=Object.entries(use).map(([id,n])=>t==="N"?`${JUNK[id].name} ${n}張`:`${CARDS[id].name} ${n}★${n>=SAVE.owned[id].stars+(SAVE.owned[id].dup||0)?"（整張）":""}`).join("、");
  openModal(`<h3>⚡ 一鍵合成 ${t} → ${SYN_UP[t]}</h3>
    <p>可以合成 <b style="color:var(--gold)">${plan.length} 次</b>，得到 ${plan.length} 名隨機 ${SYN_UP[t]} 角色。</p>
    <p class="small">會用掉：${list}</p>
    <p class="dim small">${t==="N"?"優先用張數多的白卡，每 5 張換 1 名隨機 R 角色，每名 R 的機率相同。":"優先用等級低、星數少的角色，每名角色的重複卡也算 1 份材料（先扣重複卡）。隊伍中、遠征中、練過的角色不會被用到，標「整張」的角色會從收藏移除（裝備自動卸下）。"}</p>
    <div class="row"><button class="pri" onclick="doAutoSynth()">⚡ 開始合成</button><button onclick="openSynth()">返回</button></div>`);
}
function doAutoSynth(){
  const t=SYN.tier,plan=synthPlan(t),res=[];
  plan.forEach(pk=>res.push(synthCore(pk,t)));
  SYN.pick={};save();SYN_UP[t]==="SSR"?SFX.ssr():SFX.sr();render();
  glog("🔮SYNTH",`一鍵合成 ${t}×${res.length}：${res.map(r=>CARDS[r.id].name).join("、")}`);
  openModal(`<h3>⚡ 一鍵合成完成（${res.length} 次）</h3>
    <div class="cardgrid">${res.map(({id,gr})=>`<div class="ccard ${CARDS[id].r}" onclick="showCard('${id}')"><div class="av">${avatar(id)}</div><div class="nm">${CARDS[id].name}</div>
      <div class="small" style="color:var(--gold)">${gr.isNew?"NEW!":`重複卡 ×${gr.dupe}`}</div></div>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="openSynth()">回到合成</button><button onclick="closeModal()">關閉</button></div>`);
}
// 熔煉：兩名同稀有度角色（整張卡）→ 1 名同稀有度的其他角色，優先給還沒擁有的。
// 新角色的等級、星數、突破都取兩者中較低的；如果抽到已經擁有的角色，各項保留較高的那邊
let SMELT={tier:"R",pick:[]};
const SMELT_HELP=`<div class="sk small"><b>📖 熔煉說明</b><ul style="padding-left:18px;margin:4px 0">
  <li>選 <b>2 名同稀有度</b> 的角色丟進熔爐，會熔成 <b>1 名同稀有度的其他角色</b>（不會是放進去的那兩名）。</li>
  <li>優先熔出 <b>還沒擁有</b> 的角色；同稀有度全部都有了，才會熔出已經擁有的。</li>
  <li>新角色的 <b>等級（Lv）、星數、突破</b> 都取兩名材料中 <b>較低</b> 的那個。</li>
  <li>熔出已擁有的角色時，原本那張卡的等級／星數／突破，各項保留較高的那邊。</li>
  <li>放進去的兩名角色會 <b>整張消失</b>（包含所有星數），身上的裝備自動卸下回到倉庫。</li>
  <li>隊伍中、遠征中、練過的（3★ 以上、Lv.50 以上、突破過）角色不能熔煉；熔煉後至少要保留 3 名角色。</li></ul></div>`;
function smeltBlock(id){
  if(storyOn(id))return "劇情角色";
  if(trained(id))return "已練過";
  if(SAVE.team.includes(id))return "隊伍中";
  if(isStored(id))return "存入中";
  if(SAVE.run&&SAVE.run.party.some(m=>!m.ally&&m.id===id))return "遠征中";
  return "";
}
function smeltResult(){
  const [a,b]=SMELT.pick.map(id=>SAVE.owned[id]);
  const low=lvOf(SMELT.pick[0])<=lvOf(SMELT.pick[1])?a:b;
  return {lv:low.lv||1,exp:low.exp||0,stars:Math.min(a.stars,b.stars),br:Math.min(a.br||0,b.br||0)};
}
function openSmelt(tier){
  if(tier&&tier!==SMELT.tier)SMELT={tier,pick:[]};
  SMELT.pick=SMELT.pick.filter(id=>SAVE.owned[id]&&!smeltBlock(id));
  const t=SMELT.tier,ids=sortedIds().filter(id=>SAVE.owned[id]&&CARDS[id].r===t),ok=SMELT.pick.length===2;
  const pool=POOL[t].filter(id=>!SMELT.pick.includes(id)),fresh=pool.filter(id=>!SAVE.owned[id]);
  const r=ok?smeltResult():null;
  openModal(`<h3>🔥 熔煉</h3>
    <div class="row" style="margin-bottom:8px">${["R","SR","SSR"].map(k=>`<button class="mini ${k===t?"pri":""}" onclick="openSmelt('${k}')">${k}</button>`).join("")}</div>
    ${SMELT_HELP}
    <p class="dim small" style="margin:8px 0 4px">點 2 名 ${t} 角色放進熔爐（再點一次取消）。</p>
    <div class="cardgrid">${ids.map(id=>{const o=SAVE.owned[id],b=smeltBlock(id),on=SMELT.pick.includes(id);
      return `<div class="ccard ${t} ${b?"locked":""}" style="${on?"outline:3px solid var(--red);outline-offset:2px":""}" ${b?"":`onclick="smeltToggle('${id}')"`}><div class="av">${avatar(id)}</div><div class="nm">${CARDS[id].name}</div>
        <div class="stars">${starStr(o.stars,o.br)}</div><div class="small">Lv.${lvOf(id)} ${clsTag(id)}</div><div class="small" style="color:var(--red)">${b||(on?"🔥 放入熔爐":"&nbsp;")}</div></div>`;}).join("")||`<span class="dim">沒有 ${t} 角色</span>`}</div>
    <div class="panel small" style="margin-top:10px">${ok
      ?`熔爐：<b>${SMELT.pick.map(id=>CARDS[id].name).join(" ＋ ")}</b> → 隨機 ${t} 角色${fresh.length?`（還沒擁有的 ${fresh.length} 名中隨機）`:"（全部都有了，會熔出已擁有的）"}<br>
        新角色：<b>Lv.${r.lv}</b>・<b>${r.stars}★</b>${r.br?`・<b>突破${r.br}</b>`:""}`
      :`已放入 ${SMELT.pick.length}/2`}</div>
    <div class="row" style="margin-top:10px">
      <button class="pri" onclick="doSmelt()" ${ok&&pool.length?"":"disabled"}>🔥 熔煉</button>
      <button onclick="SMELT.pick=[];openSmelt()">清除</button><button style="margin-left:auto" onclick="closeModal()">關閉</button></div>`);
}
function smeltToggle(id){
  if(SMELT.pick.includes(id))SMELT.pick=SMELT.pick.filter(x=>x!==id);
  else if(SMELT.pick.length>=2){toast("熔爐只能放 2 名角色");return;}
  else SMELT.pick.push(id);
  SFX.click();openSmelt();
}
function doSmelt(){
  if(SMELT.pick.length!==2)return;
  const t=SMELT.tier,pool=POOL[t].filter(id=>!SMELT.pick.includes(id));if(!pool.length)return;
  const fresh=pool.filter(id=>!SAVE.owned[id]),nid=fresh.length?pick(fresh):pick(pool);
  if(Object.keys(SAVE.owned).length-2+(SAVE.owned[nid]?0:1)<3){toast("熔煉後至少要保留 3 名角色");return;}
  const r=smeltResult(),gone=SMELT.pick.map(id=>CARDS[id].name);
  SMELT.pick.forEach(id=>{SAVE.gold+=SELL_PRICE[CARDS[id].r]*(SAVE.owned[id].dup||0);delete SAVE.owned[id];});
  const old=SAVE.owned[nid];let note;
  if(!old){SAVE.owned[nid]={stars:r.stars,lv:r.lv,exp:r.exp,br:r.br};note="NEW!";}
  else{
    const lvUp=r.lv>lvOf(nid);
    if(lvUp){old.lv=r.lv;old.exp=r.exp;}
    old.stars=Math.max(old.stars,r.stars);old.br=Math.max(old.br||0,r.br);
    note="已經擁有：等級、星數、突破各保留較高的";
  }
  SMELT.pick=[];save();t==="SSR"?SFX.ssr():t==="SR"?SFX.sr():SFX.flip();render();
  const o=SAVE.owned[nid];
  openModal(`<h3>🔥 熔煉完成</h3><p class="dim small">${gone.join("、")} 熔進了熔爐……</p>
    <div class="detail"><div class="av">${avatar(nid)}</div><div>
    <div class="r${t}">${t} ${starStr(o.stars,o.br)}</div><h2 style="margin:2px 0">${CARDS[nid].name}</h2>
    <div>${clsTag(nid)} <b>Lv.${lvOf(nid)}</b></div><div class="small" style="color:var(--gold)">${note}</div></div></div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="openSmelt()">繼續熔煉</button><button onclick="showCard('${nid}')">查看角色</button><button onclick="closeModal()">關閉</button></div>`);
}

/* ===== 轉換：把同稀有度角色 A 的等級＋星數，整個轉給 B ===== */
// 目標的等級、星數取兩者較高的（不會降低）；來源回到 Lv.1、1★。花 🪙5000。突破、裝備、果實、重複卡都不會動
let CONV={src:"",dst:""};
const CONV_COST=5000;
function convBlock(id){
  if(SAVE.run&&SAVE.run.party.some(m=>!m.ally&&m.id===id))return "遠征中";
  if(RUN&&RUN.active&&RUN.party.some(m=>!m.ally&&m.id===id))return "遠征中";
  return "";
}
function convStat(id,stars,lv){const s=cardStats(id,stars,lvMul(lv),brOf(id));return `❤${s.maxHp} ⚔${s.atk}`;}
// 轉換後目標的等級、經驗、星數
function convResult(src,dst){
  const s=SAVE.owned[src],d=SAVE.owned[dst],sl=lvOf(src),dl=lvOf(dst);
  return {lv:Math.max(sl,dl),exp:sl>dl?(s.exp||0):sl<dl?(d.exp||0):Math.max(s.exp||0,d.exp||0),stars:Math.max(s.stars,d.stars)};
}
const convGain=(src,dst)=>{const r=convResult(src,dst);return r.lv>lvOf(dst)||r.stars>SAVE.owned[dst].stars;};
function convPick(mode,id){
  if(mode==="src"){CONV.src=id;CONV.dst="";}else CONV.dst=id;
  SFX.click();render();
}
function convReset(){CONV={src:"",dst:""};render();}
function viewConvert(){
  const owned=sortedIds().filter(id=>SAVE.owned[id]);
  const src=CONV.src&&SAVE.owned[CONV.src]?CONV.src:"",dst=CONV.dst&&SAVE.owned[CONV.dst]&&src?CONV.dst:"";
  const tile=(id,mode)=>{
    const o=SAVE.owned[id];let why=convBlock(id);
    if(mode==="src"&&!why&&storyOn(id))why="劇情角色不能轉出";
    if(mode==="src"&&!why&&lvOf(id)<=1&&o.stars<=1)why="已經是 Lv.1・1★";
    if(mode==="dst"&&!why){if(id===src)why="就是來源角色";else if(!convGain(src,id))why="轉換後沒有提升";}
    const on=(mode==="src"&&id===src)||(mode==="dst"&&id===dst);
    return `<div class="ccard ${CARDS[id].r} ${why?"locked":""}" style="${on?"outline:3px solid var(--gold);outline-offset:2px":""}" ${why?"":`onclick="convPick('${mode}','${id}')"`}>
      <div class="av">${avatar(id)}</div><div class="nm">${CARDS[id].name}</div><div class="stars">${starStr(o.stars,o.br)}</div>
      <div class="small"><b>Lv.${lvOf(id)}</b> ${clsTag(id)}</div><div class="small" style="color:var(--red)">${why||"&nbsp;"}</div></div>`;};
  const ok=!!(src&&dst&&!convBlock(src)&&!convBlock(dst)&&SAVE.gold>=CONV_COST);
  let body;
  if(!src){
    body=`<h3>① 選擇「來源」：要把等級和星數轉出去的角色</h3><div class="cardgrid">${owned.map(id=>tile(id,"src")).join("")}</div>`;
  }else{
    const so=SAVE.owned[src],r=dst?convResult(src,dst):null,sl=lvOf(src);
    const warn=Object.values(so.eq||{}).map(gearById).filter(g=>g&&GEAR_REQ[GEAR[g.base].q]>1).map(g=>GEAR[g.base].name);
    body=`<div class="panel small" style="margin-bottom:8px">來源：<b>${CARDS[src].name}</b>（<span class="r${CARDS[src].r}">${CARDS[src].r}</span>）　Lv.${sl}・${so.stars}★　→　<b>Lv.1・1★</b></div>
      <h3>② 選擇「目標」：接收的角色（只能選同樣是 ${CARDS[src].r} 的角色）</h3>
      <div class="cardgrid">${owned.filter(id=>id!==src&&CARDS[id].r===CARDS[src].r).map(id=>tile(id,"dst")).join("")||`<span class="dim">你沒有其他 ${CARDS[src].r} 角色。</span>`}</div>
      ${dst?`<div class="panel" style="margin-top:10px">
        <b>轉換預覽</b>
        <div class="small" style="margin-top:4px">📤 ${CARDS[src].name}：Lv.${sl}・${so.stars}★ → <b>Lv.1・1★</b>（${convStat(src,so.stars,sl)} → ${convStat(src,1,1)}）</div>
        <div class="small">📥 ${CARDS[dst].name}：Lv.${lvOf(dst)}・${SAVE.owned[dst].stars}★ → <b style="color:var(--green)">Lv.${r.lv}・${r.stars}★</b>（${convStat(dst,SAVE.owned[dst].stars,lvOf(dst))} → <b style="color:var(--green)">${convStat(dst,r.stars,r.lv)}</b>）</div>
        <div class="small" style="margin-top:4px">費用：<b style="color:${SAVE.gold>=CONV_COST?"var(--gold)":"var(--red)"}">🪙${CONV_COST}</b>${SAVE.gold>=CONV_COST?"":"　金條不足"}</div>
        ${warn.length?`<div class="small" style="color:var(--gold);margin-top:4px">⚠ ${CARDS[src].name} 降到 Lv.1 後，身上的 ${warn.join("、")} 會因為等級不足而失效（裝備不會被拿掉，等級回來就恢復）。</div>`:""}
      </div>`:`<p class="dim small">選好目標後會顯示預覽。</p>`}`;
  }
  return `<h2>🔁 轉換</h2>
    <div class="sk small"><b>📖 轉換說明</b><ul style="padding-left:18px;margin:4px 0">
      <li>把 <b>來源</b> 角色的 <b>等級和星數</b>（連同經驗值）整個轉給 <b>同樣稀有度</b> 的目標，來源回到 <b>Lv.1・1★</b>。</li>
      <li><b>不會降低</b>：目標的等級、星數取兩者較高的，不會比原本差。</li>
      <li>每次費用 <b>🪙${CONV_COST}</b>。</li>
      <li>突破、裝備、果實、重複卡都 <b>不會</b> 轉移，也不會消失。遠征中的角色、劇情角色（當來源時）不能轉換。</li></ul></div>
    ${body}
    <div class="row" style="margin-top:12px">
      <button class="pri" onclick="doConvert()" ${ok?"":"disabled"}>🔁 轉換${ok?`（🪙${CONV_COST}）`:""}</button>
      ${src?`<button onclick="convReset()">重選</button>`:""}</div>`;
}
function doConvert(){
  const s=SAVE.owned[CONV.src],d=SAVE.owned[CONV.dst];if(!s||!d)return;
  if(CARDS[CONV.src].r!==CARDS[CONV.dst].r){toast("只能轉給同樣稀有度的角色");return;}
  if(convBlock(CONV.src)||convBlock(CONV.dst)){toast("遠征中的角色不能轉換");return;}
  if(storyOn(CONV.src)){toast("劇情角色不能轉出");return;}
  if(CONV.src===CONV.dst||!convGain(CONV.src,CONV.dst)){toast("轉換後目標沒有提升");return;}
  if(SAVE.gold<CONV_COST){toast("金條不足");return;}
  const r=convResult(CONV.src,CONV.dst),sl=lvOf(CONV.src),ss=s.stars;
  SAVE.gold-=CONV_COST;
  d.lv=r.lv;d.exp=r.exp;d.stars=r.stars;
  s.lv=1;s.exp=0;s.stars=1;
  glog("🔁CONV",`${CONV.src} Lv.${sl}・${ss}★ → ${CONV.dst}（🪙${CONV_COST}）`);
  const a=CARDS[CONV.src].name,b=CARDS[CONV.dst].name;
  CONV={src:"",dst:""};save();SFX.sr();render();
  openModal(`<h3>🔁 轉換完成</h3><div class="enhres ok">${b} 現在是 <b>Lv.${r.lv}・${r.stars}★</b>！</div>
    <p class="small dim">${a} 回到 Lv.1・1★；花費 🪙${CONV_COST}。</p>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="closeModal()">好</button></div>`);
}

function toggleTeam(id){
  if(SAVE.team.includes(id))SAVE.team=SAVE.team.filter(x=>x!==id);
  else if(isStored(id)){toast("存入中，先取出才能出戰");return;}
  else if(SAVE.team.length<teamMax())SAVE.team.push(id);
  save();closeModal();render();
}
// 存入角色：第 slot 格（0 起算）存入／取出；存入的角色不能同時在出戰隊伍裡
function storePick(slot){
  if(!STORE_OPEN||slot>=storeMax())return;
  const ids=sortedIds().filter(id=>SAVE.owned[id]&&!SAVE.team.includes(id)&&!isStored(id));
  openModal(`<h3>存入第 ${slot+1} 格</h3><p class="dim small">存入的角色會把能力加給出戰第 ${slot+1} 位的角色；存入期間不能出戰、遣散或合成。</p>
    <div class="cardgrid">${ids.map(id=>cardTile(id,`storeSet(${slot},'${id}')`)).join("")||"<span class='dim'>沒有可以存入的角色</span>"}</div>
    <div class="row" style="margin-top:12px"><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
function storeSet(slot,id){
  if(!STORE_OPEN||slot>=storeMax()||!SAVE.owned[id]||SAVE.team.includes(id)||isStored(id))return;
  SAVE.stored[slot]=id;save();closeModal();render();
}
function storeTake(slot){SAVE.stored[slot]=null;save();render();}
function storePanel(){
  if(!STORE_OPEN)return "";
  return `<h3>存入角色</h3><p class="dim small">第 N 格存入的角色，會把能力加給出戰第 N 位的角色。</p>
  <div class="teamslots ${teamMax()>3?"five":""}">${Array.from({length:storeMax()},(_,i)=>i).map(i=>{const id=SAVE.stored[i],b=id&&STORE_BONUS[id];
    return id?`<div>${cardTile(id,`storeTake(${i})`)}<div class="small dim" style="text-align:center">${b?statStr(b):"沒有加成"}・點擊取出</div></div>`:`<div class="slot" onclick="storePick(${i})">存入 ${i+1}</div>`;}).join("")}</div>`;
}

