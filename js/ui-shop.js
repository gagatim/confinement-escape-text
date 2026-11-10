"use strict";
/* ===================== SHOP ===================== */
// 用金條買裝備、強化符和遠征物資；遠征物資放進「行囊」，下一次出發時自動帶上
const GEAR_PRICE={N:10,R:25,SR:70};
const BOXES={
  box:{name:"裝備補給箱",icon:"📦",price:30,desc:"隨機裝備：N 20%／R 53%／SR 26%／SSR 1%",roll:()=>{const r=rnd();return r<.01?"SSR":r<.27?"SR":r<.8?"R":"N";}},
  goldbox:{name:"黃金裝備箱",icon:"🎁",price:100,desc:"隨機裝備：SR 90%／SSR 8%／UR 2%",roll:()=>{const r=rnd();return r<.02?"UR":r<.10?"SSR":"SR";}}
};
const GEAR_HELP=`<div class="sk small"><b>📖 裝備說明</b><ul style="padding-left:18px;margin:4px 0">
  <li><b>稀有度</b>：N 普通 ＜ R 稀有 ＜ SR 精良 ＜ SSR 史詩 ＜ UR 傳說。</li>
  <li><b>穿戴等級</b>：普通、稀有不限；精良要角色 Lv.5、史詩 Lv.10、傳說 Lv.15。等級不足穿不上（之前穿著的會失效）。</li>
  <li><b>數值浮動</b>：每件裝備有自己的「品質 %」，同一種裝備數值會有高低。</li>
  <li><b>⚡超頻區</b>：SSR 以上的裝備強化到 +10 後可以繼續衝到 +20。每級只加 3.5%、成功率從 10% 降到 1%、每次 🪙1000 起跳，失敗一定掉 1 級（🧿保護符可擋）。🍀幸運符只能用在 +12 以下。強化到 +20 時會額外增加 1 條隨機詞條，裝備卡也會出現「⚡超頻」特效。</li>
  <li><b>隨機詞條</b>：稀有度越高詞條越多（稀有 0～1、精良 1、史詩 1～2、傳說 2～3），可能是攻擊、生命、防禦、速度、暴擊、吸血、閃避、減傷（總減傷上限 30%）。詞條不吃強化。骰到該欄最大值會顯示 🌟 發光；另有 1% 機率出現 💎 <b>稀有詞條</b>，數值為最大值再 +1（百分比 +1%、數字 +1）。完整範圍見「裝備圖鑑」的詞條數值表。</li>
  <li><b>套裝</b>：同一稀有度的武器／防具／飾品穿 2 件、3 件會有額外效果（例如史詩 3 件：暴擊+5%、吸血+10%）。深淵王冠、霸主金袍、終焉鎖鏈三件是獨立的「終焉王座套裝」。</li>
  <li><b>EX 魔王專屬</b>：只會從「魔王討伐（支線）」的 8 位魔王掉落，每位一件，需 Lv.12，固定 3 條詞條，有自己的「魔王套裝」。</li></ul></div>`;
const CHARMS={stone:{name:"突破石",icon:"💎",price:15,desc:"角色 5★ 突破用的材料（成功率 30% 起遞減，失敗會消失）"},protect:{name:"保護符",icon:"🧿",price:20,desc:"強化失敗時不掉級（失敗才消耗）"},luck:{name:"幸運符",icon:"🍀",price:12,desc:"強化成功率 +10%（每次強化消耗）"}};
const SUPPLY={pill:6,adrenaline:8,wine:4,rope:9,gasmask:7,rocket:12,knife:8,pistol:12};
const STASH_MAX=6,FOOD_PRICE=5,FOOD_MAX=5;
let SHOP_TAB="gear";
function viewShop(){
  const st=SAVE.stash,tabs={gear:"⚔ 裝備",charm:"🔨 強化道具",...(FRUIT_OPEN?{fruit:"🍎 能力果實"}:{}),supply:"🎒 遠征物資"};
  let body="";
  if(SHOP_TAB==="gear"){
    body=`<h3>裝備箱</h3><div class="shopsec">${Object.entries(BOXES).map(([k,b])=>`<div class="sitem"><div class="gi">${boxImg(k,"box")}</div><b>${b.name}</b><div class="small dim">${b.desc}</div>
        <button class="gold" onclick="buyBox('${k}')" ${SAVE.gold<b.price?"disabled":""}>🪙${b.price}</button></div>`).join("")}</div>
      <h3>直接購買</h3><div class="shopsec">${Object.keys(GEAR).filter(k=>GEAR_PRICE[GEAR[k].q]&&!GEAR[k].off).map(k=>{const G=GEAR[k];
        return `<div class="sitem" style="border-color:${G.q==="SR"?"var(--purple)":G.q==="R"?"#2c5a86":"#4a525c"}"><div class="gi">${gearImg(k)}</div><b class="r${G.q}">${qTag(G.q)}${G.name}</b>
        <div class="small">${statStr(G.st)} <span class="dim">（±浮動）</span></div><div class="small dim">${GQ_NAME[G.q]}・${SLOTS[G.slot]}・${gearCls(k)} ${reqTag(null,k)}</div>
        <button onclick="buyGear('${k}')" ${SAVE.gold<GEAR_PRICE[G.q]?"disabled":""}>🪙${GEAR_PRICE[G.q]}</button></div>`;}).join("")}</div>
      <p class="dim small">SSR（史詩）只能從裝備箱、主線魔王或深淵守門者取得；UR（傳說）只能從黃金裝備箱、第 5～6 章魔王或深淵 D20 以下的守門者取得。</p>
      ${GEAR_HELP}`;
  }else if(SHOP_TAB==="charm"){
    body=`<div class="shopsec">${Object.entries(CHARMS).map(([k,c])=>`<div class="sitem"><div class="gi">${c.icon}</div><b>${c.name}</b><div class="small dim">${c.desc}</div>
      <div class="small">持有 ×${SAVE.charms[k]}</div>
      <div class="row"><button style="flex:1" onclick="buyCharm('${k}',1)" ${SAVE.gold<c.price?"disabled":""}>×1 🪙${c.price}</button>
      <button style="flex:1" onclick="buyCharm('${k}',5)" ${SAVE.gold<c.price*5?"disabled":""}>×5 🪙${c.price*5}</button></div></div>`).join("")}</div>`;
  }else if(SHOP_TAB==="fruit"&&FRUIT_OPEN){
    body=`<div class="panel small" style="margin-bottom:10px">吃下去永久 +1，<b>每名角色每種最多吃 ${FRUIT_MAX} 顆</b>。到「隊伍」點角色就能吃。主線首次通關、深淵守門者也會掉。</div>
      <div class="shopsec">${Object.entries(FRUITS).map(([k,F])=>`<div class="sitem"><div class="gi">${F.icon}</div><b>${F.name}</b><div class="small dim">吃了${F.stat}永久 +1</div>
        <div class="small">持有 ×${SAVE.fruits[k]}</div><button class="gold" onclick="buyFruit('${k}')" ${SAVE.gold<F.price?"disabled":""}>🪙${F.price}</button></div>`).join("")}</div>`;
  }else{
    body=`<div class="panel small" style="margin-bottom:10px">🎒 行囊（下一次遠征自動帶上）：${groupItems(st.items).map(g=>ITEMS[g.id].icon+ITEMS[g.id].name+(g.n>1?`×${g.n}`:"")).join("、")||"<span class='dim'>空</span>"}　🥫 補給 +${st.food}
      <span class="dim">（道具最多 ${STASH_MAX} 件、補給最多 ${FOOD_MAX} 份）</span></div>
      <div class="shopsec">${Object.entries(SUPPLY).map(([id,p])=>`<div class="sitem"><div class="gi">${ITEMS[id].icon}</div><b>${ITEMS[id].name}</b><div class="small dim">${ITEMS[id].desc}</div>
        <button onclick="buySupply('${id}')" ${SAVE.gold<p||st.items.length>=STASH_MAX?"disabled":""}>🪙${p}</button></div>`).join("")}
        <div class="sitem"><div class="gi">🥫</div><b>補給包</b><div class="small dim">遠征開始時補給 +1</div>
        <button onclick="buyFood()" ${SAVE.gold<FOOD_PRICE||st.food>=FOOD_MAX?"disabled":""}>🪙${FOOD_PRICE}</button></div></div>
      <p class="dim small">刀、手槍是遠征中用的臨時武器（遠征結束就沒了），和永久「裝備」不一樣。</p>`;
  }
  return `<h2>商店</h2><p class="dim">角落的自動販賣機只收金條。你有 <b style="color:var(--gold)">🪙${SAVE.gold}</b>。</p>
    <div class="filters">${Object.entries(tabs).map(([k,l])=>`<button class="${SHOP_TAB===k?"on":""}" onclick="SHOP_TAB='${k}';render()">${l}</button>`).join("")}</div>${body}`;
}
function pay(n){if(SAVE.gold<n){toast("金條不足");return false;}SAVE.gold-=n;return true;}
function buyGear(k){
  if(!pay(GEAR_PRICE[GEAR[k].q]))return;
  const g=addGear(k);save();SFX.click();render();
  openModal(`<h3>🛒 購買成功</h3><p>獲得 <b class="r${GEAR[k].q}">${qTag(GEAR[k].q)}${gearName(g)}</b>（品質 ${g.roll}%：${statStr(gearStats(g))}${g.fx.length?" "+fxStr(g):""}）。</p>
    <div class="row"><button class="pri" onclick="openGear(${g.uid})">查看／裝備</button><button onclick="closeModal()">關閉</button></div>`);
}
function buyBox(k){
  const b=BOXES[k];if(!pay(b.price))return;
  const q=b.roll(),g=addGear(rollGear(q));save();q==="SSR"||q==="UR"?SFX.ssr():q==="SR"?SFX.sr():SFX.flip();render();
  openModal(`<h3>${boxImg(k,"sm")} 打開${b.name}</h3><div class="bigicon fx-${q}" style="margin:6px 0">${gearImg(g.base)}</div>
    <h2 style="text-align:center;margin:4px 0" class="r${q}">${q}　${GEAR[g.base].name}</h2>
    <p style="text-align:center">${statStr(gearStats(g))}${g.fx.length?`<br><span class="gfx">${fxStr(g)}</span>`:""}<br><span class="dim small">${GQ_NAME[q]}・品質 ${g.roll}%・${SLOTS[GEAR[g.base].slot]}・${gearCls(g.base)}・需 Lv.${GEAR_REQ[q]}</span></p>
    <div class="row"><button class="gold" onclick="buyBox('${k}')" ${SAVE.gold<b.price?"disabled":""}>再開一個（🪙${b.price}）</button>
    <button class="pri" onclick="openGear(${g.uid})">查看／裝備</button><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
/* ===== 能力果實：吃下去永久 +1，每名角色每種最多吃 3 顆 ===== */
const FRUITS={atk:{name:"攻擊果實",icon:"🍎",stat:"攻擊",price:120},def:{name:"防禦果實",icon:"🍇",stat:"防禦",price:120},spd:{name:"速度果實",icon:"🍋",stat:"速度",price:150}};
const FRUIT_MAX=3;
const GFRUITS={atk:{name:"金色攻擊果實",icon:"🌟",stat:"攻擊"},def:{name:"金色防禦果實",icon:"🌟",stat:"防禦"},spd:{name:"金色速度果實",icon:"🌟",stat:"速度"}};
const GFRUIT_GAIN=2,GFRUIT_MAX=2;
const FRUIT_OPEN=false; // 取得方式還沒決定：先不開放（商店、掉落、角色頁的果實區都會隱藏；要開放時改成 true）
const fruitVisible=id=>FRUIT_OPEN||[fruitOf(id),gfruitOf(id),SAVE.fruits||{},SAVE.gfruits||{}].some(o=>Object.values(o).some(v=>v>0));
function fruitOf(id){const o=SAVE.owned[id],f=(o&&o.fruit)||{};return {atk:f.atk||0,def:f.def||0,spd:f.spd||0};}
function gfruitOf(id){const o=SAVE.owned[id],f=(o&&o.gfruit)||{};return {atk:f.atk||0,def:f.def||0,spd:f.spd||0};}
function eatGFruit(id,k){
  const o=SAVE.owned[id],F=GFRUITS[k];if(!o||!F)return;
  if(!SAVE.gfruits[k]){toast(`沒有${F.name}了`);return;}
  const f=gfruitOf(id);if(f[k]>=GFRUIT_MAX){toast(`${CARDS[id].name} 的金色${F.stat}果實已經吃滿了`);return;}
  SAVE.gfruits[k]--;o.gfruit={...f,[k]:f[k]+1};save();SFX.ssr();
  toast(`${CARDS[id].name} 吃下${F.icon}${F.name}：${F.stat}永久 +${GFRUIT_GAIN}（${o.gfruit[k]}/${GFRUIT_MAX}）`);showCard(id);render();
}
function eatFruit(id,k){
  const o=SAVE.owned[id],F=FRUITS[k];if(!o||!F)return;
  if(!SAVE.fruits[k]){toast(`沒有${F.name}了`);return;}
  const f=fruitOf(id);if(f[k]>=FRUIT_MAX){toast(`${CARDS[id].name} 的${F.stat}果實已經吃滿了`);return;}
  SAVE.fruits[k]--;o.fruit={...f,[k]:f[k]+1};save();SFX.heal();
  toast(`${CARDS[id].name} 吃下${F.icon}${F.name}：${F.stat}永久 +1（${o.fruit[k]}/${FRUIT_MAX}）`);showCard(id);render();
}
function fruitHtml(id){
  const f=fruitOf(id);
  return `<div class="sk"><b>🍎 能力果實</b> <span class="dim small">吃下去永久 +1，每種最多 ${FRUIT_MAX} 顆</span>
    <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${Object.entries(FRUITS).map(([k,F])=>{
      const full=f[k]>=FRUIT_MAX,none=!SAVE.fruits[k];
      return `<button class="mini ${full?"":"gold"}" onclick="eatFruit('${id}','${k}')" ${full||none?"disabled":""}>${F.icon} ${F.stat} ${f[k]}/${FRUIT_MAX}${full?"（已滿）":`　持有 ×${SAVE.fruits[k]}`}</button>`;}).join("")}</div>
    <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${Object.entries(GFRUITS).map(([k,F])=>{
      const g=gfruitOf(id),full=g[k]>=GFRUIT_MAX,none=!SAVE.gfruits[k];
      return `<button class="mini ${full?"":"pri"}" onclick="eatGFruit('${id}','${k}')" ${full||none?"disabled":""}>${F.icon} 金色${F.stat} ${g[k]}/${GFRUIT_MAX}${full?"（已滿）":`　持有 ×${SAVE.gfruits[k]}`}</button>`;}).join("")}</div>
    <div class="dim small" style="margin-top:4px">金色果實吃一顆永久 +${GFRUIT_GAIN}，每種最多 ${GFRUIT_MAX} 顆，跟一般果實各算各的。</div>
    <div class="dim small" style="margin-top:4px">果實跟著角色走：遣散、合成、熔煉這名角色時，已吃的果實不會退還。</div></div>`;
}
function buyFruit(k){const F=FRUITS[k];if(!FRUIT_OPEN||!pay(F.price))return;SAVE.fruits[k]++;save();SFX.click();toast(`${F.icon}${F.name} +1`);render();}
function buyCharm(k,n){if(!pay(CHARMS[k].price*n))return;SAVE.charms[k]+=n;save();SFX.click();toast(`${CHARMS[k].icon}${CHARMS[k].name} +${n}`);render();}
function buySupply(id){
  if(SAVE.stash.items.length>=STASH_MAX){toast("行囊滿了");return;}
  if(!pay(SUPPLY[id]))return;SAVE.stash.items.push(id);save();SFX.click();toast(`${ITEMS[id].name} 放進行囊`);render();
}
function buyFood(){if(SAVE.stash.food>=FOOD_MAX){toast("補給包已達上限");return;}if(!pay(FOOD_PRICE))return;SAVE.stash.food++;save();SFX.click();render();}
// 我方隊伍成員（含等級與永久裝備加成），競技場、練功房用
function teamUnit(id,noStore,noTal){
  const o=SAVE.owned[id],e=equipBonus(id,noStore,noTal),sc=lvScale(id),br=brOf(id),s=cardStats(id,o.stars,sc,br);
  return {id,stars:o.stars,scale:sc,br,maxHp:s.maxHp+e.hp,atk:e.atk,def:e.def,spd:e.spd,gx:{crit:e.crit,steal:e.steal,dodge:e.dodge,dr:e.dr,acc:e.acc}};
}

