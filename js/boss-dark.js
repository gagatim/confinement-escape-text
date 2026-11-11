"use strict";
/* ===================== DATA: 黑暗四天王（後期支線魔王，封存中） =====================
   解鎖：第三季通關第 30 章（s3AllClear）；目前只有 S3_ACCTS 裡的測試帳號看得到。
   強度刻意過強（全部高於第 8 位支線魔王「終焉行者」），這是設計，請勿調弱。可以不打。
   順序：木偶獸 → 機械龍獸 → 海龍獸 → 小丑皇（最後）。獎勵：金條、經驗、突破石（第一版沒有專屬裝備）。
   頭像與爆氣圖還沒有：用 emoji（爆氣後換 emoji2）。之後把圖放進 images/bosses/{代號}_1.webp／_2.webp，並把 img:true 補上即可。 */
const DARK_LIST=["puppetbeast","mechdragon","seadragon","clownking"];
const DARK_OFFSET=BOSS_LIST.length; // 獎勵公式接在 8 位支線魔王後面
const darkOpen=()=>s3Open()&&s3AllClear();
const darkUnlocked=i=>darkOpen()&&(i===0||(SAVE.bosses[DARK_LIST[i-1]]||0)>0);
const darkReward=i=>bossReward(DARK_OFFSET+i);
const aliveOf=(B,u)=>foes(B,u).filter(x=>x.alive);
Object.assign(MONSTERS,{
  puppetbeast:{name:"木偶獸",emoji:"🪆",emoji2:"🎭",r:"SSR",leechRed:0.7,drp:.2,hp:34000,atk:1550,def:420,spd:290,boss2:{hp:.7,atk:.35,spd:2},gx:{crit:15},
    quote:"別動。動的話，線會斷。",
    skills:[
      {name:"牽絲",cd:3,t:"enemy",kind:"dmg",desc:"造成2.0倍攻擊傷害，目標有50%機率被線纏住，暈眩1回合。",
        use(B,u,t){blog(B,`🪆 銀線一抖，${nm(t)} 的手腳不聽使喚了。`,"bad");hit(B,u,t,2.0);if(t.alive&&rnd()<.5)stun(B,t,1);}},
      {name:"傀儡劇",cd:5,t:"none",kind:"dmg",desc:"操縱2名敵人（爆氣後3名）攻擊自己的隊友（各造成自己1.3倍攻擊傷害），再對全體敵人各造成0.5倍攻擊傷害。",
        use(B,u){blog(B,"🪆 「各位觀眾，請欣賞——自相殘殺。」","bad");
          const n=u.flags.p2?3:2,ps=aliveOf(B,u).sort(()=>rnd()-.5).slice(0,n);
          ps.forEach(a=>{const o=aliveOf(B,u).filter(x=>x!==a);if(o.length&&a.alive)hit(B,a,pick(o),1.3,{noSpread:true});});
          aliveOf(B,u).forEach(t=>hit(B,u,t,.5,{noSpread:true}));}}],
    passive:{name:"線在我手上",desc:"受到的傷害降低20%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 70%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  mechdragon:{name:"機械龍獸",emoji:"🐉",emoji2:"🔥",r:"SSR",leechRed:0.7,drp:.2,hp:36000,atk:1600,def:450,spd:310,boss2:{hp:.7,atk:.35,spd:2},gx:{crit:20},
    quote:"不合格的零件，全部拆掉。",
    skills:[
      {name:"拆甲",cd:3,t:"enemy",kind:"dmg",desc:"造成2.2倍攻擊傷害，清除目標身上所有增益，並使其防禦降低25%（2回合）。",
        use(B,u,t){blog(B,`🐉 利爪撕開了 ${nm(t)} 的防具。`,"bad");hit(B,u,t,2.2);if(t.alive){t.buffs=t.buffs.filter(b=>b.v<=0);buff(B,t,"def",-Math.max(1,Math.round(stat(t,"def")*.25)),2);}}},
      {name:"過載噴射",cd:5,t:"none",kind:"dmg",desc:"對全體敵人各造成1.0倍攻擊傷害（爆氣後1.2倍），之後自己攻擊永久+5%。",
        use(B,u){blog(B,"🐉 齒輪高速咬合，爐心噴出赤紅的火焰。","bad");aliveOf(B,u).forEach(t=>hit(B,u,t,u.flags.p2?1.2:1.0,{noSpread:true}));u.perm.atk=(u.perm.atk||0)+Math.max(1,Math.round(u.atk*.05));}}],
    passive:{name:"持續過載",desc:"受到的傷害降低20%；每次施放「過載噴射」，攻擊永久+5%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 70%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  seadragon:{name:"海龍獸",emoji:"🐋",emoji2:"🌊",r:"SSR",leechRed:0.7,drp:.2,regenp:.02,hp:40000,atk:1600,def:480,spd:330,boss2:{hp:.7,atk:.35,spd:2},gx:{dodge:10},
    quote:"底下很安靜。留下來吧。",
    skills:[
      {name:"潮湧",cd:3,t:"enemy",kind:"dmg",desc:"造成2.2倍攻擊傷害，並使目標速度降低25%（2回合）。",
        use(B,u,t){blog(B,`🐋 巨浪拍下，${nm(t)} 被捲進了水底。`,"bad");hit(B,u,t,2.2);if(t.alive)buff(B,t,"spd",-Math.max(1,Math.round(stat(t,"spd")*.25)),2);}},
      {name:"深海壓力",cd:5,t:"none",kind:"dmg",desc:"對全體敵人各造成0.9倍攻擊傷害，並使其溺水（每回合約為自己攻擊的10%，3回合；爆氣後15%）。",
        use(B,u){blog(B,"🐋 水壓從四面八方擠壓過來，連呼吸都變得沉重。","bad");const d=Math.max(2,Math.round(stat(u,"atk")*(u.flags.p2?.15:.10)));aliveOf(B,u).forEach(t=>{hit(B,u,t,.9,{noSpread:true});if(t.alive)poison(B,t,d,3);});}}],
    passive:{name:"深海之軀",desc:"受到的傷害降低20%；每回合開始恢復2%最大生命。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 70%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  clownking:{name:"小丑皇",emoji:"🤡",emoji2:"🃏",r:"SSR",leechRed:0.8,drp:.25,hp:55000,atk:1900,def:560,spd:380,boss2:{hp:.7,atk:.35,spd:2},gx:{crit:20,steal:10},
    quote:"落幕最精彩。……而你們，是我的壓軸。",
    skills:[
      {name:"落幕",cd:3,t:"none",kind:"dmg",desc:"挑生命最低的敵人，造成2.4倍攻擊傷害、無視防禦（爆氣後3.0倍）。",
        use(B,u){const f=aliveOf(B,u).sort((a,b)=>a.hp-b.hp)[0];if(!f)return;blog(B,`🤡 「${nm(f)}，你的結尾，我來寫。」`,"bad");hit(B,u,f,u.flags.p2?3.0:2.4,{pierce:true});}},
      {name:"鼓掌",cd:4,t:"none",kind:"dmg",desc:"對全體敵人各造成1.0倍攻擊傷害（爆氣後1.2倍）。",
        use(B,u){blog(B,"🤡 啪、啪、啪。每一聲掌聲，都是一次重擊。","bad");aliveOf(B,u).forEach(t=>hit(B,u,t,u.flags.p2?1.2:1.0,{noSpread:true}));}},
      {name:"謝幕演出",cd:5,t:"none",kind:"dmg",desc:"對全體敵人各造成0.6倍攻擊傷害。爆氣後，再借三位天王的招式：操縱2名敵人攻擊隊友（1.3倍）、使全體溺水（每回合約攻擊的10%，3回合）、並使生命最低的敵人防禦降低25%（2回合）。",
        use(B,u){blog(B,"🤡 「接下來——壓軸好戲！」","bad");aliveOf(B,u).forEach(t=>hit(B,u,t,.6,{noSpread:true}));
          if(!u.flags.p2)return;
          blog(B,"🤡 他笑著拍了拍手：「來，借你們三位的招——」","bad");
          const ps=aliveOf(B,u).sort(()=>rnd()-.5).slice(0,2);
          ps.forEach(a=>{const o=aliveOf(B,u).filter(x=>x!==a);if(o.length&&a.alive)hit(B,a,pick(o),1.3,{noSpread:true});});
          const d=Math.max(2,Math.round(stat(u,"atk")*.10));aliveOf(B,u).forEach(t=>poison(B,t,d,3));
          const f=aliveOf(B,u).sort((a,b)=>a.hp-b.hp)[0];if(f)buff(B,f,"def",-Math.max(1,Math.round(stat(f,"def")*.25)),2);}}],
    passive:{name:"最後一幕",desc:"受到的傷害降低25%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 80%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}}
});
// 四天王各帶兩名隨從（生命、攻擊、防禦、速度都是本尊的 1/3）
const DARK_MINION={
  puppetbeast:{name:"提線木偶",emoji:"🪆",
    skill:{name:"纏線",cd:3,t:"enemy",kind:"dmg",desc:"造成1.3倍攻擊傷害，目標速度降低15%（2回合）。",use(B,u,t){hit(B,u,t,1.3);if(t.alive)buff(B,t,"spd",-Math.max(1,Math.round(stat(t,"spd")*.15)),2);}},
    passive:{name:"空洞",desc:"受到的傷害降低10%。"}},
  mechdragon:{name:"齒輪小龍",emoji:"⚙️",
    skill:{name:"咬合",cd:3,t:"enemy",kind:"dmg",desc:"造成1.5倍攻擊傷害，目標防禦降低15%（2回合）。",use(B,u,t){hit(B,u,t,1.5);if(t.alive)buff(B,t,"def",-Math.max(1,Math.round(stat(t,"def")*.15)),2);}},
    passive:{name:"鐵甲",desc:"受到的傷害降低15%。"}},
  seadragon:{name:"深海幼龍",emoji:"🐟",regenp:.03,
    skill:{name:"水箭",cd:3,t:"enemy",kind:"dmg",desc:"造成1.3倍攻擊傷害，並使目標溺水（每回合約攻擊的12%，2回合）。",use(B,u,t){hit(B,u,t,1.3);if(t.alive)poison(B,t,Math.max(1,Math.round(stat(u,"atk")*.12)),2);}},
    passive:{name:"潮汐",desc:"每回合開始恢復3%最大生命。"}},
  clownking:{name:"氣球小丑",emoji:"🎈",evade:.15,
    skill:{name:"拍手",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.6倍攻擊傷害。",use(B,u){blog(B,"🎈 氣球小丑們跟著拍起手來。","bad");foes(B,u).forEach(t=>hit(B,u,t,.6,{noSpread:true}));}},
    passive:{name:"歡樂",desc:"被攻擊時15%機率閃避。"}}
};
Object.keys(DARK_MINION).forEach(k=>{const M=MONSTERS[k];
  MONSTERS[k+"_m"]={...DARK_MINION[k],r:"R",pic:true,
    hp:Math.max(1,Math.round(M.hp/3)),atk:Math.max(1,Math.round(M.atk/3)),def:Math.round(M.def/3),spd:Math.max(1,Math.round(M.spd/3)),minionOf:k};});
const darkMinions=id=>DARK_MINION[id]?[0,1].map(()=>({id:id+"_m",stars:1,gx:DARK_MINION[id].gx||{}})):[];
const DARK_STORY={
  puppetbeast:["牠原本是提線師手下最完美的一具木偶，沒有一根線是斷過的。","提線師倒下的那天，牠沒有倒。因為牠發現，所有的線，原來都握在自己手裡。","牠不再需要誰來牽，而是反過來，牽住每一個走進舞台的人。「別動。動的話，線會斷。」"],
  mechdragon:["牠是拆解工坊最後一件成品，由拆解技師用一百二十具失敗品的零件拼成。","技師倒下以後，牠繼續工作。牠不懂什麼叫壞掉，只知道每個不合格的零件，都要拆掉，再換新的。","現在，牠把你們也算作零件。"],
  seadragon:["牠不是從海裡來的，是從沉水劇院的底下醒來的。那些永遠停不下來的掌聲，是牠最初的搖籃曲。","牠記得每一個沒能等到「散場」的觀眾。牠不想讓任何人離開，因為離開以後，就沒有人記得他們了。","「底下很安靜。留下來吧。」"],
  clownking:["他不記得自己是從什麼時候開始笑的。他只記得，第一個為他鼓掌的人，笑得很大聲。","他相信，每一個人都值得一個漂亮的結尾。所以他替所有人寫了結尾：意外落幕、悲壯離場、英勇犧牲。","米是他唯一一次，改了劇本的人。他沒有生氣，他只是覺得：這一幕，意外地好看。","現在，輪到你們了。他站在舞台中央，笑著，等你們走上來。"]
};
function darkCard(id,i){
  const M=MONSTERS[id],ok=darkUnlocked(i),n=SAVE.bosses[id]||0;
  return `<div class="bosscard ${ok?"":"lockc"}" onclick="${ok?`openDark('${id}')`:"toast('先打倒上一位天王')"}">
    <div class="bav"><span class="emo" style="font-size:44px">${ok?M.emoji:"🔒"}</span></div>
    <div class="bn">${i+1}. ${M.name}</div><div class="small dim">${ok?M.quote:"打倒上一位天王後解鎖"}</div>
    <div class="small" style="color:${n?"var(--green)":"var(--gold)"}">${n?`已討伐 ${n} 次`:ok?"未討伐":""}</div></div>`;
}
function viewDarkBosses(){
  if(!s3Open())return "";
  if(!darkOpen())return `<h3 style="margin-top:18px">🤡 黑暗四天王</h3><div class="panel dim">通關第三季第 30 章「天亮之前」後開放。（測試中，只有測試帳號看得到）</div>`;
  return `<h3 style="margin-top:18px">🤡 黑暗四天王（後期支線・可以不打）</h3>
    <p class="dim small">第三季的結尾，小丑皇留下的邀請。四位魔王的強度都高於前面 8 位，依序討伐，最後一位是小丑皇。打倒第一條命後同樣會<b style="color:var(--red)">爆氣</b>。（測試中，頭像先用表情符號。）</p>
    <div class="bossgrid">${DARK_LIST.map(darkCard).join("")}</div>`;
}
function openDark(id){
  const i=DARK_LIST.indexOf(id),M=MONSTERS[id],r=darkReward(i),n=SAVE.bosses[id]||0;
  openModal(`<div class="detail"><div class="av"><span class="emo" style="font-size:64px">${M.emoji}</span></div><div style="flex:1">
    <div class="rEX">黑暗四天王 ${i+1}／4</div><h2 style="margin:2px 0">${M.name}</h2><div class="small" style="font-style:italic">「${M.quote}」</div>
    <div class="small">❤${M.hp}（爆氣後再 ${Math.round(M.hp*M.boss2.hp)}）　⚔${M.atk}　🛡${M.def}　💨${M.spd}</div></div></div>
    <div class="sk"><b>📜 ${M.name}的故事</b>${DARK_STORY[id].map(p=>`<p style="margin:6px 0">${p}</p>`).join("")}</div>
    ${skillHtml(M)}
    <div class="sk"><b>🧑‍🤝‍🧑 隨從：${DARK_MINION[id].name} ×2</b> <span class="dim small">（生命、攻擊、防禦、速度都是本尊的 1/3，開戰時一起出場）</span></div>${skillHtml(MONSTERS[id+"_m"])}
    <div class="sk"><b>💢 爆氣（第二階段）</b><br>第一條命打完後立刻爆氣：生命回復到 ${Math.round(M.boss2.hp*100)}%、攻擊+${Math.round(M.boss2.atk*100)}%、速度+${M.boss2.spd}、解除身上的減益與中毒、技能冷卻 -1。</div>
    <div class="sk"><b>🎁 獎勵</b><br>每次討伐：🪙${r.gold}、經驗 +${r.exp}${n?"":`<br>首次討伐：額外 🪙${r.first}、💎突破石 ×${r.stone}`}<br><span class="dim small">（第一版沒有專屬裝備）</span></div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="startDark('${id}')" ${SAVE.team.length?"":"disabled"}>⚔ 挑戰</button><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
function startDark(id){
  if(!SAVE.team.length)return;
  const M=MONSTERS[id];
  openModal(`<div style="text-align:center"><span class="emo" style="font-size:96px;display:block;filter:drop-shadow(0 0 18px rgba(255,60,60,.55))">${M.emoji}</span>
    <div class="rEX" style="margin-top:6px">黑暗四天王</div><h2 style="margin:2px 0">${M.name}</h2>
    <p style="font-size:18px;font-style:italic;margin:14px 8px;line-height:1.6;text-shadow:0 0 12px rgba(229,72,77,.6)">「${M.quote}」</p>
    <div class="row" style="justify-content:center"><button class="pri" onclick="beginDark('${id}')">⚔ 開戰</button><button onclick="closeModal()">撤退</button></div></div>`);
}
function beginDark(id){
  if(!SAVE.team.length)return;
  closeModal();
  const i=DARK_LIST.indexOf(id),M=MONSTERS[id],r=darkReward(i),ids=SAVE.team.slice();
  startBattle({title:`黑暗四天王・${M.name}`,home:"boss",maxRound:200,A:ids.map(teamUnit),B:[{id,stars:1,gx:M.gx}].concat(darkMinions(id)),bgm:BOSS_BGM[id],
    intro:`「${M.quote}」（${DARK_MINION[id].name} ×2 站到了他的身後）`,
    resultNote:B=>B.over==="A"?`${M.name} 倒下了。`:"天王太強了……升級、升星、換裝備後再來。",
    onEnd(win,B){
      const notes=[];
      if(win){
        const first=!SAVE.bosses[id],dead=B.units.filter(u=>u.side==="A"&&!u.alive).map(u=>u.id);
        SAVE.bosses[id]=(SAVE.bosses[id]||0)+1;
        SAVE.gold+=r.gold;notes.push(`🪙+${r.gold}`);
        if(first){SAVE.gold+=r.first;SAVE.charms.stone+=r.stone;notes.push(`🏅 首次討伐：🪙+${r.first}、💎突破石 ×${r.stone}`);}
        notes.push(expLine(r.exp,gainExp(ids,r.exp,dead)));
        if(i+1<DARK_LIST.length&&first)notes.push(`🔓 下一位天王出現了：<b>${MONSTERS[DARK_LIST[i+1]].name}</b>`);
        if(i+1===DARK_LIST.length&&first)notes.push("🎬 <b>黑暗四天王全部討伐完成！</b>米的那一幕，你們替她討回來了。");
      }
      save();CUR_B=null;VIEW="boss";render();
      if(win)openModal(`<h3>⚔ 討伐成功：${M.name}</h3><div class="detail"><div class="av"><span class="emo" style="font-size:56px">${M.emoji2||M.emoji}</span></div><div><p>${notes.join("<br>")}</p></div></div>
        <div class="row"><button class="pri" onclick="openDark('${id}')">再挑戰一次</button><button onclick="closeModal()">關閉</button></div>`);
    }});
}
// 戰鬥背景音樂沿用現有魔王的曲子
Object.assign(BOSS_BGM,{puppetbeast:"boss_hard2",mechdragon:"boss_heavy2",seadragon:"boss_heavy1",clownking:"boss_heavy1"});
