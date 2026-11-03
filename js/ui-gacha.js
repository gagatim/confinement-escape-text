"use strict";
/* ===================== GACHA ===================== */
const PULL_COST=10,TEN_COST=90,FIFTY_COST=450; // 十連、50 連都是 9 折
function viewGacha(){
  const feat=gachaPool("SSR");
  return `<h2>招募所</h2>
  <div class="banner">
    <h2>🩸 鐵櫃招募・常駐</h2>
    <div class="dim" style="position:relative">每個鐵櫃裡都關著一名囚犯。打開它，他就是你的人——直到直升機起飛為止。</div>
    <div class="feat">${feat.map(id=>`<div class="av" title="${CARDS[id].name}">${avatar(id)}</div>`).join("")}</div>
    <div class="row" style="position:relative">
      <button class="gold" onclick="doPull(1)">單抽 🪙${PULL_COST}</button>
      <button class="pri" onclick="doPull(10)">十連 🪙${TEN_COST}${SAVE.firstTen?"（首次必出SSR）":""}</button>
      <button class="pri" onclick="doPull(50)">50 連 🪙${FIFTY_COST}</button>
      <span class="dim small">距離保底 SSR：${60-SAVE.pity} 抽</span>
    </div>
  </div>
  <div class="panel small dim" style="margin-top:10px">🧩 遣散 SSR 角色可以得到碎片，到「隊伍」頁按「🧩 碎片兌換」可以指定換角色或補星。</div>
  <h3>機率</h3>
  <div class="panel small">
    <span class="rSSR">SSR 3.1%</span>（${gachaPool("SSR").map(i=>CARDS[i].name).join("、")}）<br>
    <span class="rSR">SR 15%</span>（${gachaPool("SR").map(i=>CARDS[i].name).join("、")}）<br>
    <span class="rR">R 30%</span>（其他 ${gachaPool("R").length} 名）<br>
    <span class="rN">N 51.9%</span>（${JUNK_IDS.map(i=>JUNK[i].name).join("、")}；白卡可遣散換 🪙${JUNK_PRICE}，或 ${JUNK_COST} 張合成 1 名 R；不能組隊、升星）<br>
    <span class="dim">重複抽到不會自動升星，會記成「重複卡」，到角色頁手動升星（每星全能力+10%，3星起防禦+1）；5星的重複卡也會留著，突破後可以再用，或遣散換金條。</span>
  </div>
  <h3>賺金條</h3>
  <div class="panel small dim">逃殺遠征（逃出時全額帶走、陣亡帶走一半）・競技場勝利</div>`;
}
function shardPanel(){
  return `<div class="panel small" style="margin:10px 0"><b>🧩 碎片</b>：${["R","SR","SSR"].filter(r=>r==="SSR"||SAVE.shards[r]>0).map(r=>`<span class="r${r}">${r} ×${SAVE.shards[r]}</span>`).join("　")}
    <button class="mini gold" style="margin-left:8px" onclick="openShards('SSR')">兌換角色</button>
    <button class="mini" onclick="openDismantle()">🔨 拆解 SSR</button>
    <div class="dim small" style="margin-top:6px;line-height:1.7">
      <b>怎麼取得</b>：只有拆解 SSR 角色（點「🔨 拆解 SSR」，或到角色頁遣散）會得到，每張重複卡／每星 +3。R、SR 不會產生碎片，其他地方也不會掉。<br>
      <b>怎麼用</b>：碎片分稀有度，R 碎片只能換 R 角色，SR、SSR 同理。沒有的角色：R 25／SR 80／SSR 200 換 1★。已擁有但未滿 5★ 的角色：R 8／SR 25／SSR 70 補 1★。<br>
      <b>提醒</b>：價格故意訂得很高，抽卡仍是主要的取得方式。</div></div>`;
}
let SHARD_TAB="SSR";
function openShards(t){
  if(t)SHARD_TAB=t;const r=SHARD_TAB,have=SAVE.shards[r];
  const ids=CARD_IDS.filter(id=>CARDS[id].r===r).concat(Object.keys(CARDS).filter(id=>CARDS[id].story&&CARDS[id].r===r&&SAVE.owned[id]));
  openModal(`<h3>🧩 碎片兌換</h3>
    <div class="filters">${["R","SR","SSR"].map(k=>`<button class="${k===r?"on":""}" onclick="openShards('${k}')">${k} ×${SAVE.shards[k]}</button>`).join("")}</div>
    <p class="dim small">沒有的角色 🧩${SHARD_NEW[r]} 換 1★；已擁有但未滿 5★ 的角色 🧩${SHARD_STAR[r]} 補 1★。</p>
    <div style="max-height:50vh;overflow:auto">${ids.map(id=>{const o=SAVE.owned[id],c=CARDS[id];
      const cost=!o?SHARD_NEW[r]:SHARD_STAR[r],full=o&&o.stars>=5;
      return `<div class="row" style="align-items:center;margin:4px 0"><div class="av" style="width:36px;height:36px">${avatar(id)}</div>
        <span class="r${r}">${c.name}</span> <span class="small dim">${o?o.stars+"★":"未獲得"}</span>
        <button class="mini gold" style="margin-left:auto" onclick="buyShard('${id}')" ${full||have<cost?"disabled":""}>${full?"已 5★":(o?"補 1★ ":"獲得 ")+"🧩"+cost}</button></div>`;}).join("")}</div>
    <div class="row"><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}
function buyShard(id){
  const r=CARDS[id].r,o=SAVE.owned[id];
  if(o&&o.stars>=5)return;
  const cost=o?SHARD_STAR[r]:SHARD_NEW[r];
  if(SAVE.shards[r]<cost){toast("碎片不足");return;}
  SAVE.shards[r]-=cost;
  if(o)o.stars++;else SAVE.owned[id]={stars:1};
  save();SFX.ssr();toast(`${CARDS[id].name} ${o?"升至 "+o.stars+"★":"加入收藏"}`);openShards();render();
}
function rollRarity(){
  SAVE.pity++;
  if(SAVE.pity>=60){SAVE.pity=0;return "SSR";}
  const x=rnd();
  if(x<.031){SAVE.pity=0;return "SSR";}
  return x<.181?"SR":x<.481?"R":"N"; // SSR 3.1%／SR 15%／R 30%／N 51.9%
}
function grantJunk(id){SAVE.junk[id]=(SAVE.junk[id]||0)+1;return {id,junk:true};}
function grant(id){
  if(id==="fatty")SAVE.fattyCopies=(SAVE.fattyCopies||0)+1; // 抽到幾張 SR 肥宅（10 張可換 1 張 SSR 肥宅）
  const o=SAVE.owned[id];
  if(!o){SAVE.owned[id]={stars:1};return {id,isNew:true};}
  // 不會自動升星，也不退款：重複的卡一律記成「重複卡」張數，到角色頁手動升星（5★ 的留到突破後再用），或遣散換金條
  o.dup=(o.dup||0)+1;return {id,dupe:o.dup};
}
// 突破：5★ 時消耗突破石嘗試突破。成功率從 30% 起每次 ×0.85 指數下降。
// 成功：星星回到 1★ 重新累積，之前的能力保留，另外全能力 +1.5%。失敗：突破石消失，星數不變（不會降星）。
const BR_MAX=10;
function brRate(b){return Math.round(30*Math.pow(.85,b));}
function brCost(b){return 2+b*2;}
function brOf(id){const o=SAVE.owned[id];return o&&o.br||0;}
function canBreak(id){const o=SAVE.owned[id];return !!o&&o.stars>=5&&brOf(id)<BR_MAX;}
function confirmBreak(id){
  const b=brOf(id),cur=cardStats(id,5,1,b),nx=cardStats(id,1,1,b+1),need=brCost(b),have=SAVE.charms.stone;
  openModal(`<h3>✨ 突破 ${CARDS[id].name}</h3>
    ${BR_RES&&BR_RES.id===id?`<div class="enhres ${BR_RES.ok?"ok":"bad"}">${BR_RES.msg}</div>`:""}
    <p>成功率 <b style="color:var(--gold)">${brRate(b)}%</b>，需要 <b>💎突破石 ×${need}</b>（持有 ${have}）。</p>
    <p class="small">成功：星星回到 <b>1★</b> 重新累積，目前的能力<b>全部保留</b>，另外全能力 <b style="color:var(--gold)">+1.5%</b>（突破後每升 1 星 +2.5%）。<br>
    <span style="color:#ff8a8a">失敗：突破石消失，但<b>不會降星</b>。</span></p>
    <p class="small">突破 ${b} 5★：❤${cur.maxHp} ⚔${cur.atk} → 突破 ${b+1} 1★：<span style="color:var(--green)">❤${nx.maxHp} ⚔${nx.atk}</span></p>
    <p class="dim small">突破石：商店購買、主線魔王、深淵守門者、練功房掉落。突破越多次，需要的突破石越多、成功率越低（最多 ${BR_MAX} 次）。</p>
    <div class="row"><button class="pri" onclick="doBreak('${id}')" ${have<need?"disabled":""}>✨ 突破（💎×${need}）</button>
    ${have<need?`<button class="gold" onclick="SHOP_TAB='charm';closeModal();go('shop')">🛒 去買突破石</button>`:""}
    <button onclick="BR_RES=null;showCard('${id}')">返回</button></div>`);
}
let BR_RES=null;
function doBreak(id){
  if(!canBreak(id))return;
  const o=SAVE.owned[id],b=brOf(id),need=brCost(b);
  if(SAVE.charms.stone<need){toast("突破石不足");return;}
  SAVE.charms.stone-=need;
  if(rnd()*100<brRate(b)){
    o.br=b+1;o.stars=1;BR_RES={id,ok:true,msg:`✨ 突破成功！${CARDS[id].name} 到達突破 ${o.br}`};SFX.ssr();save();render();
    return openModal(`<h3>✨ 突破成功</h3><div class="enhres ok">${CARDS[id].name} 到達突破 ${o.br}！星星回到 1★，全能力再 +1.5%。</div>
      <div class="row"><button class="pri" onclick="BR_RES=null;showCard('${id}')">查看角色</button><button onclick="BR_RES=null;closeModal()">關閉</button></div>`);
  }
  BR_RES={id,ok:false,msg:`💥 突破失敗……💎突破石 ×${need} 消失了（星數沒有變）`};SFX.lose();save();render();confirmBreak(id);
}
function doPull(n){
  if($("#gacha").classList.contains("show")||!tapOk())return;
  const cost=n===50?FIFTY_COST:n===10?TEN_COST:PULL_COST;
  if(SAVE.gold<cost){toast("金條不足！去遠征或競技場賺一些吧");return;}
  SAVE.gold-=cost;SAVE.pulls+=n;
  const rs=[];for(let i=0;i<n;i++)rs.push(rollRarity());
  if(n===10&&SAVE.firstTen){SAVE.firstTen=false;if(!rs.includes("SSR")){rs[9]="SSR";SAVE.pity=0;}}
  if(n>=10)for(let b=0;b<n;b+=10)if(!rs.slice(b,b+10).some(r=>r==="SR"||r==="SSR"))rs[b+9]="SR"; // 每 10 張一組，至少 1 張 SR 以上
  const res=rs.map(r=>r==="N"?grantJunk(pick(JUNK_IDS)):grant(pick(gachaPool(r))));
  save();renderHeader();
  showGacha(res);
}
let GACHA_RES=null;
// 同一張卡合併成一格（×n），依稀有度由高到低排
function groupPulls(res){
  const m={};
  res.forEach(x=>{const g=m[x.id]||(m[x.id]={id:x.id,junk:!!x.junk,n:0,isNew:false,dup:0});
    g.n++;if(x.isNew)g.isNew=true;if(x.dupe)g.dup++;});
  const ord=x=>x.junk?3:R_ORDER[CARDS[x.id].r];
  return Object.values(m).sort((a,b)=>ord(a)-ord(b));
}
function showGacha(res){
  res=groupPulls(res);
  GACHA_RES=res;
  const rOf=x=>x.junk?"N":CARDS[x.id].r;
  const best=res.some(x=>rOf(x)==="SSR")?"SSR":res.some(x=>rOf(x)==="SR")?"SR":res.some(x=>rOf(x)==="R")?"R":"N";
  const glow={SSR:"#f5c451",SR:"#b07cff",R:"#4aa3ff",N:"#9aa0a6"}[best];
  const g=$("#gacha");
  g.innerHTML=`<div class="pod" style="--glow:${glow}"></div><p class="dim">鐵櫃正在開啟……</p>`;
  g.classList.add("show");
  tone(120,1.2,"sawtooth",.03,200);
  setTimeout(()=>{
    g.innerHTML=`<h2>招募結果</h2>
    <div class="pullgrid ${res.length>10?"wide":""}" style="${res.length===1?"grid-template-columns:140px":""}">
      ${res.map((x,i)=>{const c=x.junk?JUNK[x.id]:CARDS[x.id];return `<div class="pull ${c.r}" id="pull${i}" onclick="flipCard(${i})">${x.n>1?`<i class="lay l2"></i><i class="lay l1"></i><span class="cnt">×${x.n}</span>`:""}<div class="in">
        <div class="b">?</div>
        <div class="f"><div class="av">${avatar(x.id)}</div><div class="nm r${c.r}">${c.name}</div>
          <div class="small r${c.r}">${c.r}</div>
          <div class="badge">${x.junk?`<span class="dim">持有 ${SAVE.junk[x.id]}・只能遣散</span>`:[x.isNew?"NEW!":"",x.dup?`重複卡 +${x.dup}`:""].filter(Boolean).join("<br>")}</div></div>
      </div></div>`;}).join("")}
    </div>
    <div class="row"><button onclick="flipAll()">全部翻開</button><button class="pri" onclick="closeGacha()">完成</button></div>`;
  },1300);
}
function flipCard(i){
  const el=$("#pull"+i);if(!el||el.classList.contains("flip"))return;
  el.classList.add("flip");
  const r=GACHA_RES[i].junk?"N":CARDS[GACHA_RES[i].id].r;
  if(r==="SSR")SFX.ssr();else if(r==="SR")SFX.sr();else SFX.flip();
}
function flipAll(){GACHA_RES.forEach((_,i)=>setTimeout(()=>flipCard(i),i*Math.min(140,1200/GACHA_RES.length)));}
function closeGacha(){$("#gacha").classList.remove("show");render();}

