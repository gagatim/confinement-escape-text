"use strict";
/* ===================== DATA: GEAR ===================== */
// 角色裝備（永久）：武器有職業限制，防具、飾品全職業可用。強化每 +1 基礎數值 +8%
const GEAR={
  stick:{name:"木棍",icon:"🪵",slot:"weapon",q:"N",st:{atk:1}},
  rags:{name:"破布衣",icon:"👕",slot:"armor",q:"N",st:{hp:3}},
  band:{name:"橡皮筋",icon:"➰",slot:"acc",q:"N",st:{hp:2}},
  // off:1＝不進通用的隨機掉落／換裝／商店；鞋子目前只從恐龍蛋專區通關掉落（DINO_DROP）
  slippers:{name:"髒拖鞋",icon:"🩴",slot:"boots",q:"N",off:1,st:{spd:1}},
  beachslip:{name:"沙灘拖鞋",icon:"🩴",slot:"boots",q:"N",off:1,st:{hp:3}},
  sadslip:{name:"人化破拖鞋",icon:"🩴",slot:"boots",q:"R",off:1,st:{spd:1,hp:2}},
  oldslip:{name:"破拖鞋",icon:"🩴",slot:"boots",q:"R",off:1,st:{spd:2,hp:3}}, // 只從恐龍蛋專區第二區通關掉落（20%）
  emperorslip:{name:"皇帝拖鞋",icon:"🩴",slot:"boots",q:"SR",off:1,st:{spd:2,atk:1,def:1,hp:5}}, // 只從恐龍蛋專區第四區通關掉落（22%）
  energyslip:{name:"高能量拖鞋",icon:"🩴",slot:"boots",q:"SR",off:1,st:{spd:2,def:2,hp:3}}, // 只從恐龍蛋專區第三區通關掉落（23%）
  pipe:{name:"鐵管",icon:"🔧",slot:"weapon",q:"R",st:{atk:2}},
  axe:{name:"消防斧",icon:"🪓",slot:"weapon",q:"R",cls:["warrior","tank"],st:{atk:3,hp:3}},
  dagger:{name:"匕首",icon:"🔪",slot:"weapon",q:"R",cls:["assassin"],st:{atk:2,spd:1}},
  rifle:{name:"獵槍",icon:"🔫",slot:"weapon",q:"R",cls:["ranger"],st:{atk:3}},
  doll:{name:"詛咒人偶",icon:"🪆",slot:"weapon",q:"R",cls:["mage"],st:{atk:2,hp:4}},
  baton:{name:"電擊棒",icon:"⚡",slot:"weapon",q:"R",cls:["support","tank"],st:{atk:2,def:1}},
  jacket:{name:"皮夾克",icon:"🧥",slot:"armor",q:"R",st:{hp:5,def:1}},
  coin:{name:"幸運硬幣",icon:"🪙",slot:"acc",q:"R",st:{spd:1}},
  dogtag:{name:"狗牌",icon:"🏷️",slot:"acc",q:"R",st:{hp:6}},
  chainsaw:{name:"鏈鋸",icon:"🪚",slot:"weapon",q:"SR",cls:["warrior"],st:{atk:5,hp:4}},
  katana:{name:"武士刀",icon:"⚔️",slot:"weapon",q:"SR",cls:["assassin","warrior"],st:{atk:4,spd:1}},
  crossbow:{name:"十字弓",icon:"🏹",slot:"weapon",q:"SR",cls:["ranger"],st:{atk:5,spd:1}},
  grimoire:{name:"禁書",icon:"📕",slot:"weapon",q:"SR",cls:["mage","support"],st:{atk:4,hp:8}},
  riot:{name:"防暴盾",icon:"🛡️",slot:"weapon",q:"SR",cls:["tank"],st:{atk:3,def:3,hp:6}},
  vest:{name:"防彈背心",icon:"🦺",slot:"armor",q:"SR",st:{hp:10,def:2}},
  bracer:{name:"能量手環",icon:"📿",slot:"acc",q:"SR",st:{atk:2,spd:1}},
  railgun:{name:"電磁砲",icon:"☄️",slot:"weapon",q:"SSR",cls:["ranger","mage"],st:{atk:7,spd:1}},
  scythe:{name:"死神鐮刀",icon:"🌙",slot:"weapon",q:"SSR",cls:["warrior","assassin"],st:{atk:6,hp:8}},
  aegis:{name:"神盾",icon:"🔰",slot:"weapon",q:"SSR",cls:["tank","support"],st:{atk:4,def:4,hp:14}},
  exo:{name:"外骨骼裝甲",icon:"🤖",slot:"armor",q:"SSR",st:{hp:18,def:3,atk:2}},
  watch:{name:"主辦人的懷錶",icon:"⏱️",slot:"acc",q:"SSR",st:{spd:2,atk:3,hp:6}},
  holyboots:{name:"聖煌之靴",icon:"👢",slot:"boots",q:"SSR",off:1,st:{spd:3,hp:8,def:1,atk:2}}, // 只從恐龍蛋專區第五區打倒寶貝龍通關掉落（23%）；不進一般掉落／商店
  gavel:{name:"審判之槌",icon:"🔨",slot:"weapon",q:"UR",st:{atk:9,hp:10,spd:1}},
  abyssmail:{name:"深淵之甲",icon:"🧿",slot:"armor",q:"UR",st:{hp:24,def:4,atk:2}},
  scales:{name:"天秤徽章",icon:"⚖️",slot:"acc",q:"UR",st:{atk:4,spd:2,hp:8}},
  // 魔王專屬（EX）：只從支線魔王掉落，全職業可用
  doomrifle:{name:"滅世狙擊槍",icon:"🎯",slot:"weapon",q:"EX",st:{atk:13,spd:1}},
  reaperscythe:{name:"死神之鐮",icon:"⚰️",slot:"weapon",q:"EX",st:{atk:12,def:1,hp:12}},
  fatecompass:{name:"命運羅盤",icon:"🧭",slot:"weapon",q:"EX",st:{atk:10,def:3,hp:10}},
  endchain:{name:"終焉鎖鏈",icon:"⛓️",slot:"weapon",q:"EX",set:"throne",st:{atk:20,def:10,spd:10}},
  nightrobe:{name:"永夜王袍",icon:"🦇",slot:"armor",q:"EX",st:{hp:30,def:5,atk:3}},
  overlordmantle:{name:"霸主金袍",icon:"🌟",slot:"armor",q:"EX",set:"throne",st:{hp:35,def:7,atk:4}},
  voidterm:{name:"虛空終端",icon:"💠",slot:"acc",q:"EX",st:{atk:5,spd:3,hp:8}},
  abysscrown:{name:"深淵王冠",icon:"👑",slot:"acc",q:"EX",set:"throne",st:{atk:6,hp:14,def:2}}
};
// 稀有度（由低到高）、穿戴等級、隨機詞條、套裝
const GQ=["N","R","SR","SSR","UR","EX"];
const GQ_NAME={N:"普通",R:"稀有",SR:"精良",SSR:"史詩",UR:"傳說",EX:"魔王專屬"};
const GEAR_REQ={N:1,R:1,SR:5,SSR:10,UR:15,EX:12};
const GEAR_ROLL={N:[85,115],R:[85,115],SR:[90,115],SSR:[95,120],UR:[100,125],EX:[100,130]};
const AFFIX={atk:{n:"攻擊",r:[1,2]},hp:{n:"生命",r:[3,8]},def:{n:"防禦",r:[1,1]},spd:{n:"速度",r:[1,1]},
  crit:{n:"暴擊",r:[3,6],pct:1},steal:{n:"吸血",r:[5,10],pct:1},dodge:{n:"閃避",r:[3,6],pct:1},dr:{n:"減傷",r:[1,2],pct:1}};
const AFFIX_MULT={N:1,R:1,SR:1.3,SSR:1.6,UR:2,EX:2.2};
// 指定最終數值範圍的詞條（不吃倍率）；沒列的照「基礎範圍 × 倍率」
const AFFIX_FIX={R:{dr:[1,2]},SR:{dr:[1,3]},SSR:{def:[1,3],spd:[1,3],dr:[2,4]},UR:{def:[1,4],spd:[1,4],dr:[2,6]},EX:{def:[1,5],spd:[1,5],atk:[2,6],dr:[3,7]}};
// 稀有詞條：每條詞條有 AFFIX_RARE 的機率，數值直接超過該欄上限 +1（百分比詞條 +1%，數字詞條 +1）
const AFFIX_RARE=.01;
// 出現權重（沒列的算 1）：吸血只有一般詞條一半的機會被抽到
const AFFIX_W={steal:.5};
// 詞條數值呈鐘形分布：最低 2%／偏低 13%／中間 70%／偏高 13%／最高 2%
// 偏低＝範圍下 30%、中間＝30%～70%、偏高＝上 30%；範圍只有 2 個值時分不出中間，兩端各約 50%
function bellRoll(lo,hi){
  if(hi<=lo)return lo;
  const r=rnd();if(r<.02)return lo;if(r>=.98)return hi;
  const band=r<.15?0:r>=.85?2:1,n=hi-lo,c=[];
  for(let i=0;i<=n;i++){const t=i/n,e=1e-9; // 偏低／偏高不含 30%、70% 邊界，中間含邊界，三段不重疊
    if(band===0?t<.3-e:band===2?t>.7+e:t>=.3-e&&t<=.7+e)c.push(lo+i);}
  return c.length?pick(c):(rnd()<.5?lo:hi);
}
function affixRoll(k,q,slot){
  if(rnd()<AFFIX_RARE)return affixSpan(k,q,slot)[1]+1;
  const [lo,hi]=affixSpan(k,q,slot);return bellRoll(lo,hi);
}
// 依權重不重複地抽 n 種詞條
function pickAffixKeys(n,skip=[]){
  const pool=Object.keys(AFFIX).filter(k=>!skip.includes(k)).map(k=>[k,AFFIX_W[k]==null?1:AFFIX_W[k]]),out=[];
  while(out.length<n&&pool.length){
    let r=rnd()*pool.reduce((t,x)=>t+x[1],0),i=0;
    while(i<pool.length-1&&r>=pool[i][1]){r-=pool[i][1];i++;}
    out.push(pool.splice(i,1)[0][0]);
  }
  return out;
}
// 該詞條在這個稀有度的 [最小值, 最大值]
// slot 是 "boots"（鞋子）時，範圍上下限各除以 2、四捨五入、最小 1（鞋子的詞條數值範圍減半）
function affixSpan(k,q,slot){
  const f=AFFIX_FIX[q]&&AFFIX_FIX[q][k],m=AFFIX_MULT[q];
  let [x,y]=f||[Math.max(1,Math.round(AFFIX[k].r[0]*m)),Math.max(1,Math.round(AFFIX[k].r[1]*m))];
  if(slot==="boots"){x=Math.max(1,Math.round(x/2));y=Math.max(1,Math.round(y/2));}
  return [x,y];
}
// 該詞條在這個稀有度的最大值；範圍沒有浮動（只有一種值）時回傳 0
function affixTop(k,q,slot){
  const [lo,hi]=affixSpan(k,q,slot);
  const f=AFFIX_FIX[q]&&AFFIX_FIX[q][k];if(f)return hi;
  const [a,b]=AFFIX[k].r;return b>a?hi:0;
}
function affixCount(q){return q==="N"?0:q==="R"?(rnd()<.3?1:0):q==="SR"?1:q==="SSR"?1+(rnd()<.5?1:0):q==="EX"?3:2+(rnd()<.3?1:0);}
// 套裝：同稀有度的裝備穿 2 件、3 件有額外效果（3 件會同時拿到 2 件的效果）
const SETS={
  N:{name:"破爛套裝",2:{hp:3},3:{atk:1,spd:1}},
  R:{name:"囚犯套裝",2:{hp:6},3:{atk:2,crit:3}},
  SR:{name:"特勤套裝",2:{def:2,hp:6},3:{atk:2,crit:6}},
  SSR:{name:"主辦人套裝",2:{atk:3,hp:10},3:{crit:5,steal:10}},
  UR:{name:"審判套裝",2:{atk:5,def:2,hp:15},3:{crit:10,steal:12,dodge:6}},
  EX:{name:"魔王套裝",2:{atk:6,hp:20,def:2},3:{crit:12,steal:15,dodge:8}},
  // 有 set 標記的裝備不算進稀有度套裝，改算進自己的套裝：深淵王冠＋霸主金袍＋終焉鎖鏈（來自最後三位強王，各部位一件）
  throne:{name:"終焉王座套裝",cls:"EX",2:{atk:11,hp:20,def:2},3:{crit:12,steal:15,dodge:8,dr:10}} // ＝魔王套裝 ＋攻擊+5（2件）＋減傷+10%（3件）
};
const setKeyOf=base=>GEAR[base].set||GEAR[base].q;
const SLOTS={weapon:"武器",armor:"防具",acc:"飾品",boots:"鞋子"};
// 尚未開放的部位：只顯示鎖住的欄位，沒有對應裝備、也不能點；開放時搬進 SLOTS 即可
const LOCKED_SLOTS={helmet:"頭盔",ring:"戒指"};
const lockedSlotsHtml=()=>Object.keys(LOCKED_SLOTS).map(sl=>`<div class="gslot locked"><div class="small dim">${LOCKED_SLOTS[sl]}</div><div class="gi">🔒</div><span class="dim small">尚未開放</span></div>`).join("");
// 有插圖的裝備（images/equipment/{代號}.webp，256×256 透明底）。沒有插圖的（目前只有狗牌）、或圖片載入失敗時，退回用表情符號
// 裝備箱插圖（images/boxes/{箱子代號}.webp），載入失敗時退回表情符號
function boxImg(k,cls=""){
  const b=BOXES[k];
  return `<img class="gimg ${cls}" src="images/boxes/${k}.webp" alt="${b.name}" draggable="false" onerror="this.outerHTML='${b.icon}'">`;
}
const GEAR_IMG=new Set(["holyboots","stick","rags","band","slippers","beachslip","sadslip","oldslip","emperorslip","energyslip","pipe","axe","dagger","rifle","doll","baton","jacket","coin","dogtag","chainsaw","katana","crossbow","grimoire","riot","vest","bracer","railgun","scythe","aegis","exo","watch","gavel","abyssmail","scales","endchain","reaperscythe","fatecompass","doomrifle","voidterm","nightrobe","overlordmantle","abysscrown"]);
function gearImg(base,cls=""){
  const G=GEAR[base];if(!GEAR_IMG.has(base))return G.icon;
  return `<img class="gimg ${cls}" src="images/equipment/${base}.webp" alt="${G.name}" draggable="false" loading="lazy" onerror="this.outerHTML='${G.icon}'">`;
}
const ST_LBL={hp:"❤",atk:"⚔",def:"🛡",spd:"💨",crit:"暴擊",steal:"吸血",dodge:"閃避",dr:"減傷"};
const ST_PCT={crit:1,steal:1,dodge:1,dr:1};
const DR_CAP=30; // 裝備減傷%上限
const DODGE_CAP=50; // 閃避率上限（%）：裝備詞條、套裝、職業與角色加成加總後最多 50%
const ENH_MAX=10;
const ENH_RATE=[100,95,90,80,70,60,50,40,32,25, 10,5,5,4,4,3,3,2,1,1]; // 依目前等級：+0→+1 為 100%；+10 以後是「超頻區」
// 超頻區：+11～+20，只有 SSR 以上的裝備能進入；每級只加 3.5%（+10 以前每級 8%），失敗一定掉 1 級，花費 🪙1000 起跳
const ENH_OC=20,ENH_OC_Q=["SSR","UR","EX"];
// 存檔檢查只擋「明顯離譜」的裝備數值（寬鬆一點，之後調整遊戲數值時舊頁面不容易誤判）
const GEAR_LV_SANE=30,GEAR_FX_SANE=6;
const LUCK_MAX_LV=12; // 幸運符只能用在 +12 以下的裝備
function enhCap(g){return ENH_OC_Q.includes(GEAR[g.base].q)?ENH_OC:ENH_MAX;}
function enhMul(lv){return 1+.08*Math.min(lv,ENH_MAX)+.035*Math.max(0,lv-ENH_MAX);}
const GEAR_SELL={N:2,R:5,SR:15,SSR:40,UR:100,EX:150};
function enhCost(lv){return lv<ENH_MAX?5+lv*5:1000+(lv-ENH_MAX)*800;}
// 數值 = 基礎 × 浮動品質(roll%) × 強化；詞條是固定加值，不吃強化
function gearStats(g){
  const b=GEAR[g.base].st,o={},roll=(g.roll||100)/100;
  for(const k in b)o[k]=Math.max(1,Math.round(b[k]*roll*enhMul(g.lv)));
  (g.fx||[]).forEach(f=>o[f.k]=(o[f.k]||0)+f.v);
  return o;
}
function statStr(o){return Object.keys(ST_LBL).filter(k=>o[k]).map(k=>ST_PCT[k]?`${ST_LBL[k]}+${o[k]}%`:`${ST_LBL[k]}+${o[k]}`).join(" ");}
// 詞條滿值（該稀有度能骰到的最大值）會用金色閃光標示
function fxStr(g){const q=GEAR[g.base].q,sl=GEAR[g.base].slot;return (g.fx||[]).map(f=>{
  const s=`${AFFIX[f.k].n}+${f.v}${AFFIX[f.k].pct?"%":""}`;
  const top=affixTop(f.k,q,sl);
  if(f.oc)return `<span class="fxoc" style="color:var(--gold)" title="超頻額外詞條（強化轉移會一起轉走）">⚡${s}</span>`;
  if(f.v>affixSpan(f.k,q,sl)[1])return `<span class="fxrare" title="稀有詞條：超過上限 +1">💎${s}</span>`;
  return top&&f.v>=top?`<span class="fxmax" title="滿值詞條">🌟${s}</span>`:`✦${s}`;}).join(" ");}
// 稀有度標籤：N／R／SR／SSR／UR／EX，放在裝備名稱旁邊
function qTag(q){return `<span class="qtag r${q}">${q}</span>`;}
function gearName(g){return `${GEAR[g.base].icon}${GEAR[g.base].name}${g.lv?" +"+g.lv:""}`;}
function gearCls(base){const c=GEAR[base].cls;return c?c.map(k=>CLASSES[k].icon+CLASSES[k].name).join("／"):"全職業";}

function avatar(id,p2){
  if(JUNK[id])return `<img class="avimg" src="images/avatars/${id}.webp" alt="" draggable="false" onerror="this.outerHTML='<span class=emo>${JUNK[id].emoji}</span>'">`;
  const d=DEF(id);
  if(d.img) return `<img class="avimg" src="images/bosses/${id}_${p2?2:1}.webp" alt="" draggable="false">`;
  if(d.pic) return `<img class="avimg" src="images/monsters/${id}${p2&&d.pic2?"_2":""}.webp" alt="" draggable="false" onerror="this.outerHTML='<span class=emo>${d.emoji}</span>'">`;
  if(d.emoji) return `<span class="emo">${p2&&d.emoji2?d.emoji2:d.emoji}</span>`;
  return `<img class="avimg" src="images/avatars/${id}.webp" alt="" draggable="false" onerror="this.outerHTML='<span class=emo>${d.name.charAt(0)}</span>'">`+skinFx(id);
}
/* ---- 造型（純外觀，不加任何數值）：試用造型限時開放，到期自動回收 ----
   回收有兩道：①領取時記下到期時間，過了就收；②活動從 SKIN_PROMOS 拿掉（版本更新）後，存檔裡該活動的造型也一起收。
   時間以「看過的最晚時間」為準（SAVE.skin.seen），把裝置時間往回調也不會延長試用。 */
const SKINS={halo:{name:"金色光輪",icon:"🌟",desc:"金色光環＋光芒掃過頭像"},sakura:{name:"櫻花特效",icon:"🌸",desc:"粉色微光＋花瓣飄落"}};
const SKIN_PROMOS=[{id:"trial1",name:"造型試穿活動",skins:["halo","sakura"],days:3,until:"2026-11-12"}];
const SKIN_DAY=864e5;
function skinNow(){const t=Date.now();if(typeof SAVE!=="undefined"&&SAVE&&SAVE.skin){if(t>(SAVE.skin.seen||0))SAVE.skin.seen=t;return SAVE.skin.seen;}return t;}
function skinOf(id){const k=typeof SAVE!=="undefined"&&SAVE&&SAVE.skin&&SAVE.skin.worn[id];return k&&SAVE.skin.own[k]&&SKINS[k]?k:"";}
function skinFx(id){const k=CARDS[id]?skinOf(id):"";return k?`<i class="skfx sk-${k}">${k==="sakura"?"<b></b>".repeat(6):""}</i>`:"";}
// 回收到期或活動已移除的造型，穿著中的換回預設；回傳被回收的造型名稱
function skinSweep(){
  if(SAVE&&!SAVE.skin)SAVE.skin={own:{},worn:{},claimed:{},seen:0}; // 從較新版本存檔載入時可能沒有這個欄位
  const K=SAVE&&SAVE.skin;if(!K)return [];
  const now=skinNow(),gone=[];
  Object.keys(K.own).forEach(k=>{const e=K.own[k];
    if(!SKINS[k]||!SKIN_PROMOS.some(p=>p.id===e.src)||now>=e.until){delete K.own[k];if(SKINS[k])gone.push(SKINS[k].name);}});
  Object.keys(K.worn).forEach(c=>{if(!K.own[K.worn[c]])delete K.worn[c];});
  return gone;
}
function skinPromoOpen(){return SKIN_PROMOS.find(p=>!SAVE.skin.claimed[p.id]&&skinNow()<=new Date(p.until+"T23:59:59").getTime());}
function claimSkins(pid){
  const p=SKIN_PROMOS.find(x=>x.id===pid);if(!p||SAVE.skin.claimed[pid]||skinPromoOpen()!==p)return;
  const now=skinNow();
  p.skins.forEach(k=>{SAVE.skin.own[k]={until:now+p.days*SKIN_DAY,src:p.id};});
  SAVE.skin.claimed[pid]=1;save();SFX.ssr();toast(`已領取 ${p.days} 天試用：${p.skins.map(k=>SKINS[k].name).join("、")}`);render();
}
function wearSkin(cid,k){
  if(!SAVE.owned[cid])return;
  if(k&&!SAVE.skin.own[k])return;
  if(k)SAVE.skin.worn[cid]=k;else delete SAVE.skin.worn[cid];
  save();SFX.click();render();showCard(cid);
}
function skinLeft(){const es=Object.values(SAVE.skin.own);if(!es.length)return "";const r=Math.min(...es.map(e=>e.until))-skinNow();
  return r<=0?"即將到期":`${Math.floor(r/SKIN_DAY)} 天 ${Math.floor(r%SKIN_DAY/36e5)} 小時`;}
function skinPanel(){
  const p=skinPromoOpen(),own=Object.keys(SAVE.skin.own);
  if(p)return `<div class="panel" style="text-align:center"><b>🎁 ${p.name}</b><br><span class="dim small">免費領取 ${p.skins.map(k=>SKINS[k].icon+SKINS[k].name).join("、")}，試用 ${p.days} 天，到期自動回收。純外觀，不影響能力。</span><div class="row" style="justify-content:center;margin-top:6px"><button class="pri" onclick="claimSkins('${p.id}')">領取試用</button></div></div>`;
  if(own.length)return `<div class="panel small" style="text-align:center">🎨 試用造型剩餘 <b>${skinLeft()}</b>，到角色頁就能替角色換造型。</div>`;
  return "";
}
function skinHtml(id){
  const own=Object.keys(SAVE.skin.own);if(!own.length)return "";
  const w=skinOf(id);
  return `<div class="sk small"><b>🎨 造型（試用，剩 ${skinLeft()}）</b><div class="skrow">
    <button class="mini ${w?"":"on"}" onclick="wearSkin('${id}','')">預設</button>
    ${own.map(k=>`<button class="mini ${w===k?"on":""}" onclick="wearSkin('${id}','${k}')">${SKINS[k].icon}${SKINS[k].name}</button>`).join("")}
    <button class="mini" style="margin-left:auto" onclick="toggleSkFx('${id}')">${document.body.classList.contains("noskfx")?"開啟":"關閉"}特效動畫</button></div>
    <div class="dim small" style="margin-top:4px">純外觀，不影響能力。每名角色可以各自選不同的造型；到期後自動換回預設。</div></div>`;
}
function toggleSkFx(cid){const on=document.body.classList.toggle("noskfx");try{localStorage.setItem("jbts_noskfx",on?"1":"");}catch(e){}SFX.click();showCard(cid);}
try{if(localStorage.getItem("jbts_noskfx"))document.body.classList.add("noskfx");}catch(e){}
const brTier=br=>br>=10?"brk4":br>=7?"brk3":br>=4?"brk2":br>=1?"brk1":"";
function starStr(n,br=0){return (br?`<b class="brk">突破${br}</b> `:"")+"★".repeat(n)+"<span style='opacity:.25'>"+"★".repeat(5-n)+"</span>";}
// 星級：每多1星全能力+10%，3星起防禦+1。突破後保留之前的能力，每次突破 +1.5%，
// 之後每升 1 星只 +2.5%（一輪 5★ 共 +10%）；最後套用職業加成
function starMult(stars,br){
  if(!br)return 1+.1*(stars-1);
  return 1.4+(br-1)*.1+br*.015+.025*(stars-1);
}
function cardStats(id,stars=1,scale=1,br=0){
  const c=DEF(id), m=starMult(stars,br)*scale;
  const s={maxHp:Math.round(c.hp*m),atk:Math.max(1,Math.round(c.atk*m)),def:c.def+(stars>=3||br?1:0),spd:c.spd};
  if(c.cls==="tank"){s.maxHp=Math.round(s.maxHp*1.15);s.def++;}
  if(c.cls==="warrior")s.atk+=Math.max(1,Math.round(s.atk*.15));
  if(c.cls==="assassin")s.spd+=3; // 刺客職業特色：速度 +3
  return s;
}

