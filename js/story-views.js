"use strict";
let STORY_TAB="lore",ANA_SORT="r";
function viewStory(){
  const tabs=[["lore","👑 故事"],["ana","📊 分析"]];
  return `<div class="filters">${tabs.map(([k,l])=>`<button class="${STORY_TAB===k?"on":""}" onclick="STORY_TAB='${k}';render()">${l}</button>`).join("")}</div>`
    +(STORY_TAB==="ana"?viewAnalysis():viewStoryLore());
}
/* ---- 分析：所有角色的初始素質（1★、Lv.1，不含裝備與突破），點表頭排序 ---- */
function viewAnalysis(){
  const cols=[["name","角色"],["r","稀有度"],["hp","生命"],["atk","攻擊"],["def","防禦"],["spd","速度"],["sum","總和"]];
  const rows=Object.keys(CARDS).map(id=>{const c=CARDS[id];return {id,name:c.name,r:c.r,hp:c.hp,atk:c.atk,def:c.def,spd:c.spd,sum:c.hp+c.atk+c.def+c.spd,story:!!c.story};});
  const key=ANA_SORT;
  rows.sort((a,b)=>key==="name"?a.name.localeCompare(b.name):key==="r"?R_ORDER[a.r]-R_ORDER[b.r]||b.sum-a.sum:b[key]-a[key]||R_ORDER[a.r]-R_ORDER[b.r]);
  const top={};["hp","atk","def","spd","sum"].forEach(k=>top[k]=Math.max(...rows.map(x=>x[k])));
  const avg=["SSR","SR","R"].map(r=>{const g=rows.filter(x=>x.r===r);if(!g.length)return "";const m=k=>(g.reduce((s,x)=>s+x[k],0)/g.length).toFixed(1);
    return `<span class="r${r}">${r}</span> ${g.length} 名：生命 ${m("hp")}・攻擊 ${m("atk")}・防禦 ${m("def")}・速度 ${m("spd")}`;}).join("<br>");
  return `<h2>📊 分析</h2>
  <p class="dim small">所有角色的初始素質（1★、Lv.1，不含裝備、果實、突破）。點表頭可以排序；<b style="color:var(--gold)">金色</b>是該欄最高。📖 是劇情角色。</p>
  <div class="panel small">${avg}</div>
  <div style="overflow-x:auto"><table class="anatbl"><thead><tr>${cols.map(([k,l])=>`<th class="${key===k?"on":""}" onclick="ANA_SORT='${k}';render()">${l}${key===k?" ▾":""}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(x=>`<tr><td>${x.story?"📖 ":""}<b class="r${x.r}">${x.name}</b></td><td class="r${x.r}">${x.r}</td>${["hp","atk","def","spd","sum"].map(k=>`<td class="${x[k]===top[k]?"mx":""}">${x[k]}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div>`;
}
function viewStoryLore(){
  const cl=SAVE.prog.cleared,seen=SAVE.lore||{};
  const has=(k,i)=>!!seen[LORE_KEY[k]+i]||cl>i;
  const kinds=[["intro","🚪 進入這一章"],["boss","⚔️ 魔王之前"],["end","🏁 通關之後"]];
  let heard=0;for(let i=0;i<12;i++)kinds.forEach(([k])=>{if(has(k,i))heard++;});
  const chs=Array.from({length:12},(_,i)=>{
    const C=CHAPTERS[i],open=i===Math.min(cl,11),n=kinds.filter(([k])=>has(k,i)).length;
    return `<details class="lorech" ${open?"open":""}><summary><b>第 ${i+1} 章　${C.icon} ${C.name}</b> <span class="small dim">${n}/3${cl>i?"・📜":""}</span></summary>
      ${kinds.map(([k,l])=>has(k,i)?`<div class="kingrow"><div class="small dim">${l}</div>${KING_TALK[k][i].map(p=>`<p>${p}</p>`).join("")}</div>`:`<div class="kingrow dim small">🔒 ${l}：還沒有聽見</div>`).join("")}
      ${cl>i&&C.story?`<div class="kingrow bossst"><div class="small dim">📜 ${MONSTERS[C.boss].name}的故事</div>${C.story.map(p=>`<p>${p}</p>`).join("")}</div>`:`<div class="kingrow dim small">🔒 📜 ${MONSTERS[C.boss].name}的故事：通關這一章後解鎖</div>`}
    </details>`;}).join("");
  return `<h2>👑 故事</h2>
  <div class="panel row" style="gap:14px;align-items:center">
    <div class="npcav big"><img class="avimg" src="images/npc/king.webp" alt="" onerror="this.outerHTML='<span class=emo>👑</span>'"></div>
    <div style="flex:1;min-width:0"><b style="font-size:18px">老國王</b><div class="small dim">替這座牢籠守夜的老人</div>
      <div class="small" style="margin-top:6px">在每一章，他會悄悄告訴你真相，也提醒魔王的特性。已聽見 <b style="color:var(--gold)">${heard}／36</b> 段。</div>
      <div class="ratebar"><i style="width:${heard/36*100}%"></i></div></div></div>
  <p class="dim small">12 章是一條連續的故事。每一章的內容，通關後或聽過就會記在這裡；也可以回頭重看魔王的背景。</p>
  ${chs}
  ${ABYSS>12?`<h3 style="margin-top:18px">📖 《名冊》</h3>
  ${seen.s_ashen?`<img src="images/story/ashen_qing.webp" alt="" style="width:100%;max-width:520px;border-radius:12px;display:block;margin:6px 0 10px" onerror="this.remove()">`:""}
  <p class="dim small">通關第 12 章後，往深淵去「接被丟下的人」的故事線。每一章通關後，劇情會記在這裡。</p>
  ${CHAPTERS.slice(12,ABYSS).map((C,k)=>{const i=12+k,done=cl>i;
    return `<details class="lorech"><summary><b>第 ${i+1} 章　${C.icon} ${C.name}</b> <span class="small dim">${done?"・📜":"🔒"}</span></summary>
      ${done?`${(C.recap||[]).length?`<div class="kingrow"><div class="small dim">📖 這一章發生的事</div>${C.recap.map(p=>`<p>${p}</p>`).join("")}</div>`:""}
      ${C.story?`<div class="kingrow bossst"><div class="small dim">📜 ${MONSTERS[C.boss].name}的故事</div>${C.story.map(p=>`<p>${p}</p>`).join("")}</div>`:""}`:`<div class="kingrow dim small">🔒 通關這一章後解鎖</div>`}
    </details>`;}).join("")}`:""}
  <details class="lorech"><summary><b>🕳 無盡深淵</b> <span class="small dim">${seen.a0?"1/1":"0/1"}</span></summary>
    ${seen.a0?`<div class="kingrow">${KING_TALK.abyss[0].map(p=>`<p>${p}</p>`).join("")}</div>`:`<div class="kingrow dim small">🔒 進入無盡深淵後解鎖</div>`}</details>`;
}

const CH=()=>CHAPTERS[RUN.ch];
const FL=()=>RUN.floors;
const LAST=()=>RUN.ch===ABYSS?Infinity:RUN.floors.length-1;
function ensureFloor(i){if(RUN.ch!==ABYSS)return;while(RUN.floors.length<=i)RUN.floors.push({label:"D"+RUN.floors.length});}
function isBossFloor(i){return RUN.ch===ABYSS?i>0&&i%5===0:i===LAST();}
function unlocked(c){
  if(CHAPTERS[c]&&CHAPTERS[c].s3)return s3Open()&&SAVE.prog.cleared>=S3_REQ&&(SAVE.prog.s3||0)>=CHAPTERS[c].s3k; // 第三季（封存中）
  if(CHAPTERS[c]&&CHAPTERS[c].fatty){const k=c-FATTY_FIRST_CH;return SAVE.prog.cleared>=FATTY_REQ&&(SAVE.prog.fatty||0)>=k;}
  return c===ABYSS?SAVE.prog.cleared>=1:SAVE.prog.cleared>=c;}
function progText(){const c=SAVE.prog.cleared;return c>=ABYSS?"全破":`第 ${c+1} 章「${CHAPTERS[c].name}」`;}
const EV_ICON={rival:"👤",shade:"👻",loot:"📦",empty:"🕸️",gasleak:"☣️",stash:"💰",
  wine:"🍷",ration:"🥫",junk:"🗑️",granary:"🌾",warehouse:"🏭",teleport:"🌀",lotto:"🎰",pharmacy:"💊",respec:"🧬",surgery:"🏥",
  canteen:"🍽️",vault:"🏦",control:"🖥️",recycle:"♻️",armory:"🔫",water:"💧",laser:"🔴",gene:"🧪",helipad:"🚁",morgue:"⚰️",
  cryo:"🧊",prisoncell:"🔒",blackmarket:"🕶️",casino:"🃏",chapel:"🕯️",abyssboss:"💀",ashen:"🔥",qing:"📖",qing2:"📖",whisper:"👥",seat37:"🪑",fsnack:"🍜",scrap:"♻️",forge:"🔥"};
const SHOP={pill:4,adrenaline:5,wine:3,rope:6,gasmask:5,knife:5,pistol:8,shotgun:12,rocket:9};
const EV_HINT={rival:"有人的氣息",shade:"陰冷的低語",loot:"散落的物資",empty:"空蕩蕩",gasleak:"管線嘶嘶作響",stash:"金屬反光"};
const ITEMS={
  pill:{name:"藥片",icon:"💊",desc:"恢復8生命（隊上有草藥師再+4）",battle:"ally",out:"member"},
  adrenaline:{name:"腎上腺素",icon:"💉",desc:"戰鬥中：攻擊+3、速度+2（3回合）",battle:"ally"},
  wine:{name:"酒",icon:"🍷",desc:"隨機：恢復6／攻擊+2／中毒",battle:"ally",out:"member"},
  rocket:{name:"火箭筒",icon:"🚀",desc:"戰鬥中：全體敵人5點固定傷害",battle:"self"},
  knife:{name:"刀",icon:"🔪",desc:"裝備：攻擊+2",weapon:2},
  pistol:{name:"手槍",icon:"🔫",desc:"裝備：攻擊+3",weapon:3},
  shotgun:{name:"霰彈槍",icon:"💥",desc:"裝備：攻擊+5",weapon:5},
  rope:{name:"繩索",icon:"🪢",desc:"選房間時使用：直接攀上下一層，不觸發事件也不耗時",out:"rope"},
  gasmask:{name:"防毒面具",icon:"😷",desc:"自動抵擋一次毒氣傷害"}
};
const LOOT_TABLE=["pill","pill","pill","adrenaline","adrenaline","wine","wine","knife","knife","pistol","rope","gasmask","rocket","shotgun"];
function pillHeal(){return 8+(hasRun("herb")?4:0);}

