"use strict";
/* ===================== DATA: 魔王討伐（支線） ===================== */
// 8 位支線魔王：強度刻意過強（第 3 位起連練滿的隊伍都打不贏），這是設計，請勿調弱。可以不打。第一條命打完會「爆氣」進入第二階段（換圖、回血、變強、技能冷卻縮短）
// img:true 的怪物頭像在 images/bosses/{id}_1.webp（一般）與 {id}_2.webp（爆氣）
const BOSS_LIST=["doomhunter","voidlord","fatejudge","reaper","abyssking","nightemperor","overlord","endwalker"];
Object.assign(MONSTERS,{
  doomhunter:{name:"滅世獵手",img:true,r:"SSR",leechRed:0.1,hp:267,atk:30,def:0,spd:12,boss2:{hp:.7,atk:.35,spd:2},gx:{crit:25},
    quote:"追蹤、狩獵，直到目標消失。",
    skill:{name:"鎖定狙殺",cd:3,t:"none",kind:"dmg",desc:"狙擊生命最低的敵人（2.4倍、無視防禦）。爆氣後改為3倍，並對其他敵人掃射0.6倍。",
      use(B,u){const f=foes(B,u).sort((a,b)=>a.hp-b.hp);if(!f.length)return;blog(B,"🎯 紅色雷射點停在了獵物的眉心。","bad");
        hit(B,u,f[0],u.flags.p2?3:2.4,{pierce:true});if(u.flags.p2)foes(B,u).filter(x=>x!==f[0]).forEach(t=>hit(B,u,t,.6,{noSpread:true}));}},
    passive:{name:"獵殺本能",desc:"暴擊率+25%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 10%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  voidlord:{name:"虛空主宰",img:true,r:"SSR",leechRed:0.1,hp:667,atk:63,def:8,spd:21,boss2:{hp:.7,atk:.35,spd:2},gx:{dodge:15},
    quote:"我掌控的不只是數據，而是整個禁閉區的規則。",
    skill:{name:"系統覆寫",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.8倍攻擊傷害，每人40%機率暈眩1回合。爆氣後再清除敵人所有增益，並使其攻擊降低25%（2回合）。",
      use(B,u){blog(B,"💠 所有螢幕同時跳出同一行字：「權限已轉移」。","bad");foes(B,u).forEach(t=>{hit(B,u,t,.8,{noSpread:true});if(t.alive&&rnd()<.4)stun(B,t,1);
        if(u.flags.p2&&t.alive){t.buffs=t.buffs.filter(b=>b.v<0);buff(B,t,"atk",-Math.max(1,Math.round(stat(t,"atk")*.25)),2);}});}},
    passive:{name:"虛體",desc:"閃避率+15%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 10%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  fatejudge:{name:"命運裁決者",img:true,r:"SSR",leechRed:0.3,hp:1666,atk:138,def:32,spd:36,drp:.15,boss2:{hp:.7,atk:.35,spd:2},
    quote:"你的命運，由我來決定。",
    skill:{name:"命運之輪",cd:3,t:"none",kind:"dmg",desc:"轉動命運之輪，隨機：全體1倍傷害／自己恢復8%生命／單體2.5倍傷害。爆氣後一次轉兩格。",
      use(B,u){for(let n=0;n<(u.flags.p2?2:1);n++){const k=ri(1,3),f=foes(B,u);if(!f.length)break;
        if(k===1){blog(B,"☸ 命運之輪停在「審判」。","bad");f.forEach(t=>hit(B,u,t,1,{noSpread:true}));}
        else if(k===2){blog(B,"☸ 命運之輪停在「延命」。","bad");heal(B,u,Math.round(u.maxHp*.08));}
        else{blog(B,"☸ 命運之輪停在「處刑」。","bad");hit(B,u,pick(f),2.5);}}}},
    passive:{name:"定數",desc:"受到的傷害降低15%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 30%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  reaper:{name:"死神代行者",img:true,r:"SSR",leechRed:0.3,hp:2000,atk:156,def:32,spd:42,boss2:{hp:.7,atk:.35,spd:2},gx:{steal:20},
    quote:"死亡不是終點，而是我的任務。",
    skill:{name:"收割",cd:3,t:"none",kind:"dmg",desc:"對生命最低的敵人揮下鐮刀（1.8倍）。爆氣後全體敵人再中毒（每回合受到自己攻擊20%的傷害，3回合）。",
      use(B,u){const f=foes(B,u).sort((a,b)=>a.hp-b.hp);if(!f.length)return;blog(B,"⚰ 鎖鏈嘩啦作響，鐮刀落下。","bad");hit(B,u,f[0],1.8);
        if(u.flags.p2)foes(B,u).forEach(t=>poison(B,t,Math.max(1,Math.round(stat(u,"atk")*.2)),3));}},
    passive:{name:"魂之收割",desc:"造成傷害時恢復傷害20%的生命。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 30%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  abyssking:{name:"深淵君王",img:true,r:"SSR",leechRed:0.4,hp:2400,atk:168,def:44,spd:30,drp:.2,regenp:.03,boss2:{hp:.7,atk:.35,spd:2},
    quote:"這片禁閉區，現在由我來支配。",
    skill:{name:"王權壓制",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.9倍攻擊傷害，並使其攻擊降低25%（2回合）。爆氣後傷害提高到1.2倍。",
      use(B,u){blog(B,"👑 「跪下。」整個房間的空氣沉了下來。","bad");foes(B,u).forEach(t=>{hit(B,u,t,u.flags.p2?1.2:.9,{noSpread:true});if(t.alive)buff(B,t,"atk",-Math.max(1,Math.round(stat(t,"atk")*.25)),2);});}},
    passive:{name:"王之軀",desc:"受到的傷害降低20%；每回合恢復3%最大生命。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 40%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  nightemperor:{name:"永夜帝王",img:true,r:"SSR",leechRed:0.4,hp:4299,atk:270,def:71,spd:54,drp:.25,regenp:.03,boss2:{hp:.7,atk:.35,spd:2},gx:{dodge:10},
    quote:"黑夜，是我的王座。",
    skill:{name:"永夜降臨",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.7倍攻擊傷害並中毒（每回合受到自己攻擊20%的傷害，3回合），自己恢復5%生命。爆氣後中毒加重為30%。",
      use(B,u){blog(B,"🌑 燈全滅了。黑暗裡只剩下那雙紫色的眼睛。","bad");foes(B,u).forEach(t=>{hit(B,u,t,.7,{noSpread:true});if(t.alive)poison(B,t,Math.max(1,Math.round(stat(u,"atk")*(u.flags.p2?.3:.2))),3);});heal(B,u,Math.round(u.maxHp*.05));}},
    passive:{name:"夜之主",desc:"受到的傷害降低25%；每回合恢復3%最大生命；閃避率+10%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 40%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  overlord:{name:"天命霸主",img:true,r:"SSR",leechRed:0.5,hp:17000,atk:990,def:290,spd:180,drp:.25,boss2:{hp:.7,atk:.35,spd:2},gx:{crit:15},
    quote:"命運？由我來定義！",
    skill:{name:"天命審判",cd:3,t:"none",kind:"dmg",desc:"對單一敵人造成2倍攻擊傷害、其他敵人0.8倍，自己攻擊提高20%（3回合）。",
      use(B,u){const f=foes(B,u);if(!f.length)return;const t=pick(f);blog(B,"🌟 金色的光球從天而降。","bad");hit(B,u,t,2);foes(B,u).filter(x=>x!==t).forEach(x=>hit(B,u,x,.8,{noSpread:true}));buff(B,u,"atk",Math.max(1,Math.round(stat(u,"atk")*.2)),3);}},
    passive:{name:"霸者之威",desc:"受到的傷害降低25%；暴擊率+15%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 50%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}},
  endwalker:{name:"終焉行者",img:true,r:"SSR",leechRed:0.7,hp:20000,atk:1080,def:320,spd:240,drp:.25,boss2:{hp:.7,atk:.35,spd:2},gx:{crit:15,steal:15},
    quote:"最後一個活著的，才是真正的勝者",
    skill:{name:"終焉",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成1.2倍攻擊傷害。爆氣後改為1.6倍，每人30%機率暈眩。",
      use(B,u){blog(B,"⛓ 「遊戲結束。」","bad");foes(B,u).forEach(t=>{hit(B,u,t,u.flags.p2?1.6:1.2,{noSpread:true});if(u.flags.p2&&t.alive&&rnd()<.3)stun(B,t,1);});}},
    passive:{name:"最後的勝者",desc:"受到的傷害降低25%；暴擊率+15%、吸血15%。｜吸血減免：玩家對自己造成傷害時，吸血效果減少 70%。｜激動模式（面對 5 人以上的隊伍時啟動）：單體攻擊擴散 20%，技能傷害 +10%，普通攻擊 +10%。"}}
});
// 偽永夜帝王：雙帳號合作討伐專用（不在 BOSS_LIST 裡，只能從「網路對戰」開合作房間打）。素質目前與永夜帝王相同，圖片是永夜帝王調暗的版本（images/bosses/fakenight_1／2.webp）
MONSTERS.fakenight={...MONSTERS.nightemperor,name:"偽永夜帝王", // 目前素質與永夜帝王相同（生命、攻擊、防禦、速度都沿用）
  quote:"你以為我是影子？是你們，一直活在我的影子裡。",
  skill:{...MONSTERS.nightemperor.skill,name:"偽．永夜降臨"}};
// 支線魔王的小弟：命運裁決者、死神代行者、深淵君王、永夜帝王、天命霸主、終焉行者各帶兩名；生命、攻擊、防禦、速度都是魔王的 1/3
const BOSS_MINION={
  fatejudge:{name:"命運書記",emoji:"📜",drp:.1,
    skill:{name:"判決書",cd:3,t:"enemy",kind:"dmg",desc:"造成1.3倍攻擊傷害，目標防禦降低20%（2回合）。",use(B,u,t){hit(B,u,t,1.3);if(t.alive)buff(B,t,"def",-Math.max(1,Math.round(stat(t,"def")*.2)),2);}},
    passive:{name:"旁聽席",desc:"受到的傷害降低10%。"}},
  reaper:{name:"死神使徒",emoji:"💀",gx:{steal:10},
    skill:{name:"勾魂",cd:3,t:"enemy",kind:"dmg",desc:"造成1.2倍攻擊傷害，並使目標中毒（每回合受到自己攻擊15%的傷害，2回合）。",use(B,u,t){hit(B,u,t,1.2);if(t.alive)poison(B,t,Math.max(1,Math.round(stat(u,"atk")*.15)),2);}},
    passive:{name:"靈魂汲取",desc:"造成傷害時恢復傷害10%的生命。"}},
  abyssking:{name:"深淵侍衛",emoji:"🗿",drp:.15,
    skill:{name:"王前壓制",cd:3,t:"enemy",kind:"dmg",desc:"造成1.4倍攻擊傷害，目標攻擊降低15%（2回合）。",use(B,u,t){hit(B,u,t,1.4);if(t.alive)buff(B,t,"atk",-Math.max(1,Math.round(stat(t,"atk")*.15)),2);}},
    passive:{name:"王之盾",desc:"受到的傷害降低15%。"}},
  nightemperor:{name:"夜行者",emoji:"🦇",evade:.15,
    skill:{name:"暗襲",cd:3,t:"enemy",kind:"dmg",desc:"造成1.5倍攻擊傷害，無視對方的防禦與格擋；施放後自己獲得1次閃避。",use(B,u,t){hit(B,u,t,1.5,{pierce:true});u.st.evade=(u.st.evade||0)+1;}},
    passive:{name:"夜行",desc:"被攻擊時15%機率閃避。"}},
  overlord:{name:"天命近衛",emoji:"⚔️",gx:{crit:15},
    skill:{name:"天命一擊",cd:3,t:"enemy",kind:"dmg",desc:"造成2.0倍攻擊傷害。",use(B,u,t){blog(B,"⚔️ 近衛高舉長劍：「奉天命！」","bad");hit(B,u,t,2.0);}},
    passive:{name:"近衛之威",desc:"暴擊率+15%。"}},
  endwalker:{name:"終焉信徒",emoji:"🕯️",regenp:.03,
    skill:{name:"終焉低語",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.6倍攻擊傷害，每人20%機率暈眩1回合。",use(B,u){blog(B,"🕯️ 信徒們低聲吟誦：「終焉將至。」","bad");foes(B,u).forEach(t=>{hit(B,u,t,.6);if(t.alive&&rnd()<.2)stun(B,t,1);});}},
    passive:{name:"殉道者",desc:"每回合開始恢復3%最大生命。"}}
};
BOSS_MINION.fakenight={...BOSS_MINION.nightemperor,name:"偽夜行者"}; // 偽永夜帝王帶 4 隻（見 startCoopBattle），素質同樣是偽王的 1/3
Object.keys(BOSS_MINION).forEach(k=>{const M=MONSTERS[k];
  MONSTERS[k+"_m"]={...BOSS_MINION[k],r:"R",pic:true, // 圖放在 images/monsters/{魔王代號}_m.webp，沒有圖會自動退回表情符號
    hp:Math.max(1,Math.round(M.hp/3)),atk:Math.max(1,Math.round(M.atk/3)),def:Math.round(M.def/3),spd:Math.max(1,Math.round(M.spd/3)),minionOf:k};});
const bossMinions=id=>BOSS_MINION[id]?[0,1].map(()=>({id:id+"_m",stars:1,gx:BOSS_MINION[id].gx||{}})):[];
// 魔王的個人故事
const BOSS_STORY={
  doomhunter:["他原本是禁閉逃殺第一屆的冠軍——唯一一個靠自己爬上直升機的人。","主辦方沒有放他走，而是給了他一把狙擊槍和一份新合約：「每抓回一個逃跑者，你就離自由近一步。」",
    "他已經抓了九百九十九個。編號一千的那個人，聽說會讓他「真正下班」。他在望遠鏡裡看到了你。"],
  voidlord:["他是禁閉區系統的原始設計者，因為想偷偷改掉「只有三個座位」這條規則，被主辦方關進了自己寫的伺服器裡。",
    "在數據的牢房裡待了三年，他發現自己不需要逃出去——只要把整個禁閉區也拖進來就好。","現在每一扇門、每一盞燈、每一條廣播，都是他的手指。"],
  fatejudge:["她是禁閉逃殺的「莊家」，每一場遊戲的賠率都由她親手計算。","她從來沒有算錯過，直到有一次她押注的隊伍全滅，而她押輸的那個人活著走了出去。",
    "從那天起，她不再相信機率。她要親自轉動命運之輪——連你下一步會踏出哪隻腳，都要由她決定。"],
  reaper:["他在停屍間工作了二十年，負責把每一個失敗者裝進鐵櫃。","某一天，他打開一個鐵櫃，裡面躺著的是他自己。",
    "他不記得自己是什麼時候死的，只記得主辦人遞給他一把鐮刀：「既然你已經死了，就幫我把剩下的人也帶過來吧。」"],
  abyssking:["無盡深淵的最底層，有一張用逃殺者骨頭堆成的王座。","他是第一個下到底的人。他沒有找到出口，於是乾脆坐了下來，宣布自己是這裡的王。",
    "每個掉下來的人都會變成他的臣民——或者王座上的另一塊骨頭。他說，這片禁閉區總要有人來支配。"],
  nightemperor:["他曾是黑塔的主人，主辦人背後的金主。他出錢買下了整座城市的黑夜。",
    "當黑塔燒起來的那一晚，他沒有逃。他坐在燃燒的王座上，看著火光把夜空照亮——然後發誓再也不讓光出現。","從此，只要他在的地方，太陽就不會升起。"],
  overlord:["他自稱「天命所歸」。他不是被抓進禁閉區的，而是自己走進來的。","他買下了前三屆的所有冠軍，把他們的號碼牌串成項鍊。他說，命運只是有錢人還沒買下的東西。",
    "現在他盯上了你。「你的命，開個價吧。」"],
  endwalker:["沒有人知道他是誰。他的號碼牌上只刻著一個字：「終」。","傳說他是每一屆禁閉逃殺的最後一名倖存者——但他從來沒有坐上直升機。他總是留下來，等待下一屆。",
    "他說他在找一個能打倒他的人，好讓這場遊戲真正結束。最後一個站著的，才是真正的勝者。"]
};
// 魔王專屬裝備（EX 稀有度，只會從對應的魔王掉落）
const BOSS_DROP={doomhunter:"doomrifle",voidlord:"voidterm",fatejudge:"fatecompass",reaper:"reaperscythe",abyssking:"abysscrown",nightemperor:"nightrobe",overlord:"overlordmantle",endwalker:"endchain"};
const BOSS_REQ=1; // 主線通關幾章後開放（第一位）
function bossUnlocked(i){return SAVE.prog.cleared>=BOSS_REQ&&(i===0||(SAVE.bosses[BOSS_LIST[i-1]]||0)>0);}
function bossReward(i){return {gold:100+i*50,exp:150+i*60,first:300+i*120,stone:5+i*2};}
function bossCard(id,i){
  const M=MONSTERS[id],ok=bossUnlocked(i),n=SAVE.bosses[id]||0;
  return `<div class="bosscard ${ok?"":"lockc"}" onclick="${ok?`openBoss('${id}')`:"toast('先打倒上一位魔王')"}">
    <div class="bav">${ok?`<img src="images/bosses/${id}_1.webp" alt="">`:`<span class="emo">🔒</span>`}</div>
    <div class="bn">${i+1}. ${M.name}</div><div class="small dim">${ok?M.quote:"打倒上一位魔王後解鎖"}</div>
    <div class="small" style="color:${n?"var(--green)":"var(--gold)"}">${n?`已討伐 ${n} 次`:ok?"未討伐":""}</div></div>`;
}
function viewBossPage(){return `<h2>魔王討伐</h2>${viewBosses()}`;}
function viewBosses(){
  if(SAVE.prog.cleared<BOSS_REQ)return `<h3>⚔ 魔王討伐（支線）</h3><div class="panel dim">逃出第 1 章「禁閉室」後開放。</div>`;
  return `<h3>⚔ 魔王討伐（支線・可以不打）</h3>
    <p class="dim small">8 位強度偏高的魔王，打倒一位才會出現下一位。打倒第一條命後魔王會<b style="color:var(--red)">爆氣</b>進入第二階段：換上氣場、回復生命、攻擊和速度上升、技能冷卻縮短。打贏有機會掉落魔王專屬的 <b class="rEX">EX 裝備</b>。</p>
    <div class="bossgrid">${BOSS_LIST.map(bossCard).join("")}</div>
    ${(()=>{if(!FK.tried){FK.tried=true;fkLoad();}return fkBoardHtml();})()}`;
}
function openBoss(id){
  const i=BOSS_LIST.indexOf(id),M=MONSTERS[id],r=bossReward(i),n=SAVE.bosses[id]||0,G=GEAR[BOSS_DROP[id]];
  openModal(`<div class="detail"><div class="av"><img src="images/bosses/${id}_1.webp" alt=""></div><div style="flex:1">
    <div class="rEX">支線魔王 ${i+1}／8</div><h2 style="margin:2px 0">${M.name}</h2><div class="small" style="font-style:italic">「${M.quote}」</div>
    <div class="small">❤${M.hp}（爆氣後再 ${Math.round(M.hp*M.boss2.hp)}）　⚔${M.atk}　🛡${M.def}　💨${M.spd}</div></div></div>
    <div class="sk"><b>📜 ${M.name}的故事</b>${BOSS_STORY[id].map(p=>`<p style="margin:6px 0">${p}</p>`).join("")}</div>
    ${skillHtml(M)}
    ${BOSS_MINION[id]?`<div class="sk"><b>🧑‍🤝‍🧑 隨從：${BOSS_MINION[id].name} ×2</b> <span class="dim small">（生命、攻擊、防禦、速度都是魔王的 1/3，開戰時一起出場）</span></div>${skillHtml(MONSTERS[id+"_m"])}`:""}
    <div class="sk"><b>💢 爆氣（第二階段）</b><br>第一條命打完後立刻爆氣：生命回復到 ${Math.round(M.boss2.hp*100)}%、攻擊+${Math.round(M.boss2.atk*100)}%、速度+${M.boss2.spd}、解除身上的減益與中毒、技能冷卻 -1。</div>
    <div class="sk"><b>🎁 獎勵</b><br>每次討伐：🪙${r.gold}、經驗 +${r.exp}${n?"":`<br>首次討伐：額外 🪙${r.first}、💎突破石 ×${r.stone}`}<br>
      專屬裝備 <b class="rEX">${GEAR_IMG.has(BOSS_DROP[id])?gearImg(BOSS_DROP[id],"inl"):G.icon}${G.name}</b>（${statStr(G.st)}）：${n?"2% 機率掉落":"首次討伐必定掉落"}</div>
    <div class="row" style="margin-top:12px"><button class="pri" onclick="startBoss('${id}')" ${SAVE.team.length?"":"disabled"}>⚔ 挑戰</button><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
// 魔王短片（videos/{魔王代號}.mp4）：圖鑑點開播放；戰鬥開場每天第一次挑戰該魔王時播放，沒有短片的魔王維持立繪
const BOSS_VIDEO={doomhunter:1};
function bossVideoHtml(id,auto){
  return `<video src="videos/${id}.mp4" ${auto?"autoplay":""} controls playsinline ${SAVE.muted?"muted":""} poster="images/bosses/${id}_1.webp" style="width:100%;border-radius:10px;background:#000;margin-bottom:8px"></video>`;
}
// 開打前先讓魔王說台詞：立繪＋名字＋台詞，按「開戰」才進入戰鬥
function startBoss(id){
  if(!SAVE.team.length)return;
  const M=MONSTERS[id],today=dateStr();
  SAVE.bossVid=SAVE.bossVid||{};
  const vid=BOSS_VIDEO[id]&&SAVE.bossVid[id]!==today;
  if(vid){SAVE.bossVid[id]=today;save();}
  openModal(`<div style="text-align:center">${vid?bossVideoHtml(id,true):`<img src="images/bosses/${id}_1.webp" alt="" style="max-width:220px;width:60%;filter:drop-shadow(0 0 18px rgba(255,60,60,.55))">`}
    <div class="rEX" style="margin-top:6px">支線魔王</div><h2 style="margin:2px 0">${M.name}</h2>
    <p style="font-size:18px;font-style:italic;margin:14px 8px;line-height:1.6;text-shadow:0 0 12px rgba(229,72,77,.6)">「${M.quote}」</p>
    <div class="row" style="justify-content:center"><button class="pri" onclick="beginBoss('${id}')">⚔ 開戰</button><button onclick="bossVoice('${id}')" title="再聽一次">🔊</button><button onclick="stopBossVoice();closeModal()">撤退</button></div></div>`);
  if(!vid)bossVoice(id);
}
// 魔王台詞配音（voice/{魔王代號}.mp3，edge-tts 生成）；音效關閉時不播，檔案載入失敗就靜音略過
let BOSS_VOICE=null;
function stopBossVoice(){if(BOSS_VOICE){try{BOSS_VOICE.pause();}catch(e){}BOSS_VOICE=null;}}
function bossVoice(id){
  stopBossVoice();
  if(SAVE.muted)return;
  try{BOSS_VOICE=new Audio(`voice/${id}.mp3`);BOSS_VOICE.volume=.9;BOSS_VOICE.play().catch(()=>{});}catch(e){}
}
function beginBoss(id){
  if(!SAVE.team.length)return;
  stopBossVoice();closeModal();
  const i=BOSS_LIST.indexOf(id),M=MONSTERS[id],r=bossReward(i),ids=SAVE.team.slice();
  startBattle({title:`魔王討伐・${M.name}`,home:"boss",maxRound:200,A:ids.map(teamUnit),B:[{id,stars:1,gx:M.gx}].concat(bossMinions(id)),bgm:BOSS_BGM[id],
    intro:`「${M.quote}」${BOSS_MINION[id]?`（${BOSS_MINION[id].name} ×2 站到了他的身後）`:""}`,
    resultNote:B=>B.over==="A"?`${M.name} 倒下了。`:"魔王太強了……升級、升星、換裝備後再來。",
    onEnd(win,B){
      const notes=[];
      if(win){
        const first=!SAVE.bosses[id],dead=B.units.filter(u=>u.side==="A"&&!u.alive).map(u=>u.id);
        SAVE.bosses[id]=(SAVE.bosses[id]||0)+1;
        SAVE.gold+=r.gold;notes.push(`🪙+${r.gold}`);
        if(first){SAVE.gold+=r.first;SAVE.charms.stone+=r.stone;notes.push(`🏅 首次討伐：🪙+${r.first}、💎突破石 ×${r.stone}`);}
        notes.push(expLine(r.exp,gainExp(ids,r.exp,dead)));
        if(first||rnd()<.02){const g=addGear(BOSS_DROP[id]);notes.push(`🎁 <b class="rEX">魔王專屬裝備：${gearName(g)}</b>（${statStr(gearStats(g))}${g.fx.length?" "+fxStr(g):""}）`);SFX.ssr();}
        if(i+1<BOSS_LIST.length&&first)notes.push(`🔓 下一位魔王出現了：<b>${MONSTERS[BOSS_LIST[i+1]].name}</b>`);
        if(i+1===BOSS_LIST.length&&first)notes.push("🎬 <b>8 位魔王全部討伐完成！</b>");
        if(id===FK_BOSS)notes.push('<span id="fkNote"></span>');
      }
      save();CUR_B=null;VIEW="boss";render();
      if(win)openModal(`<h3>⚔ 討伐成功：${M.name}</h3><div class="detail"><div class="av"><img src="images/bosses/${id}_2.webp" alt=""></div><div><p>${notes.join("<br>")}</p></div></div>
        <div class="row"><button class="pri" onclick="openBoss('${id}')">再挑戰一次</button><button onclick="closeModal()">關閉</button></div>`);
      if(win&&id===FK_BOSS)fkClaim().then(m=>{const el=document.getElementById("fkNote");if(el&&m)el.innerHTML=m;else if(m)toast(m.replace(/<[^>]+>/g,""));});
    }});
}


