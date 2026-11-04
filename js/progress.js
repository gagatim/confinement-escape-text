"use strict";
/* ===================== LEVEL ===================== */
// 角色等級：戰鬥勝利得經驗，每級全能力 +2%（用 cardStats 的 scale 疊上去），Lv.50 之後經驗 ×5、每級只 +0.8%，上限 Lv.100
const LV_MAX=100,LV_SOFT=50; // 50 級後：所需經驗 ×5、每級加成降為 0.8%（Lv.100 比 Lv.50 多約 20%）
function lvOf(id){const o=SAVE.owned[id];return o&&o.lv||1;}
function lvMul(lv){return 1+.02*(Math.min(lv,LV_SOFT)-1)+(lv>LV_SOFT?.008*(lv-LV_SOFT):0);}
function lvScale(id){return lvMul(lvOf(id));}
function lvNeed(lv){return (8+lv*6)*(lv>=LV_SOFT?5:1);}
// 給經驗：ids 是參戰的自己角色，dead 裡的只拿一半；回傳升級訊息
function gainExp(ids,n,dead=[]){
  const ups=[];
  ids.forEach(id=>{
    const o=SAVE.owned[id];if(!o)return;
    o.lv=o.lv||1;o.exp=o.exp||0;if(o.lv>=LV_MAX)return;
    o.exp+=dead.includes(id)?Math.ceil(n/2):n;
    const from=o.lv;
    while(o.lv<LV_MAX&&o.exp>=lvNeed(o.lv)){o.exp-=lvNeed(o.lv);o.lv++;}
    if(o.lv>=LV_MAX)o.exp=0;
    if(o.lv>from)ups.push(`⬆ ${CARDS[id].name} 升到 <b style="color:var(--gold)">Lv.${o.lv}</b>！`);
  });
  return ups;
}
function expLine(n,ups){return [`📈 參戰角色獲得經驗 +${n}`,...ups].join("<br>");}
function lvBar(id){
  const o=SAVE.owned[id],lv=lvOf(id);if(!o)return "";
  if(lv>=LV_MAX)return `<div class="small"><b>Lv.${LV_MAX}</b> <span class="dim">（已滿級）</span></div>`;
  const e=o.exp||0,need=lvNeed(lv);
  return `<div class="small"><b>Lv.${lv}</b> <span class="dim">經驗 ${e}/${need}・每級全能力+${lv>=LV_SOFT?"0.8":"2"}%</span></div><div class="ratebar" style="height:6px"><i style="width:${e/need*100}%"></i></div>`;
}

/* ===================== TRAINING ===================== */
// 練功房：可以無限重打的怪物關，難度自選（打贏才解鎖下一關），主要給經驗
const TRAIN_MAX=45;
// 第 1～30 關用前 6 種；第 31～45 關陸續加入第 7～12 章的小怪（時間殘響、另一個你、攝影無人機、狂熱粉絲、第二季參賽者、冠軍親衛隊）
const TRAIN_MOBS=["ghost","mutant","guard","drone","deepone","mirror","echo","doppel","cameraman","fanatic","rookie","guardian"];
let TRAIN_SEL=1;
function trainBest(){return SAVE.train.best||0;}
function trainFoes(s){
  const pool=TRAIN_MOBS.slice(0,s<=30?Math.min(6,2+Math.floor(s/5)):Math.min(TRAIN_MOBS.length,6+Math.ceil((s-30)/2.5))),n=(s<3?2:3)+extraFoes();
  return Array.from({length:n},()=>({id:pick(pool),stars:1,scale:.55+s*.07}));
}
// 經驗：6+3×關卡（第 45 關 141），沿用原本的公式
// 金條：第 1～30 關 1+關卡/4；第 30、35、40、45 關分別是 8、9、12、14，中間的關卡依比例推算（四捨五入）
const TRAIN_GOLD_PTS=[[30,8],[35,9],[40,12],[45,14]];
function trainGold(s){
  if(s<=30)return 1+Math.floor(s/4);
  for(let i=1;i<TRAIN_GOLD_PTS.length;i++){const [a,ga]=TRAIN_GOLD_PTS[i-1],[b,gb]=TRAIN_GOLD_PTS[i];if(s<=b)return Math.round(ga+(gb-ga)*(s-a)/(b-a));}
  return TRAIN_GOLD_PTS[TRAIN_GOLD_PTS.length-1][1];
}
function trainReward(s){return {exp:6+s*3,gold:trainGold(s)};}
function viewTrain(){
  const best=trainBest(),top=Math.min(TRAIN_MAX,best+1);TRAIN_SEL=clamp(TRAIN_SEL,1,top);
  const r=trainReward(TRAIN_SEL),sample=trainFoes(TRAIN_SEL)[0],ss=cardStats(sample.id,1,sample.scale);
  return `<h2>🏋 練功房</h2>
  <p class="dim">地下室的鐵籠裡關著抓來的怪物，可以一直重打。打贏一關會解鎖下一關；打低等關卡穩穩練等也可以。</p>
  <div class="panel">
    <div class="row"><b>選擇關卡</b><span class="dim small">（已解鎖到第 ${top} 關／共 ${TRAIN_MAX} 關）</span></div>
    <div class="filters">${Array.from({length:top},(_,i)=>i+1).map(i=>`<button class="${i===TRAIN_SEL?"on":""}" onclick="TRAIN_SEL=${i};render()">${i}${i<=best?"✓":""}</button>`).join("")}</div>
    <div class="small">第 ${TRAIN_SEL} 關：${TRAIN_SEL<3?2:3} 隻怪物（每隻約 ❤${ss.maxHp} ⚔${ss.atk}）</div>
    <div class="small" style="color:var(--gold)">勝利：每名參戰角色經驗 +${r.exp}・🪙${r.gold}・10% 機率掉裝備</div>
    <div class="small dim">戰敗沒有懲罰；倒下的角色經驗減半。</div>
  </div>
  <h3>你的隊伍</h3><div class="cardgrid">${SAVE.team.map(id=>cardTile(id,`showCard('${id}')`)).join("")||"<span class='dim'>尚未編隊</span>"}</div>
  <div class="row" style="margin-top:14px"><button class="pri" onclick="startTrain()" ${SAVE.team.length?"":"disabled"}>⚔ 開始修練</button>
  ${top>1?`<button onclick="TRAIN_SEL=${top};render()">跳到最新關卡</button>`:""}</div>`;
}
function startTrain(){
  if(!SAVE.team.length)return;
  const s=TRAIN_SEL,r=trainReward(s),ids=SAVE.team.slice();
  startBattle({title:`練功房 第${s}關`,home:"train",A:ids.map(teamUnit),B:trainFoes(s),
    intro:"鐵籠的門拉開了。",
    resultNote:B=>B.over==="A"?`經驗 +${r.exp}、🪙${r.gold}`:"打不贏就先回去打低一點的關卡吧。",
    onEnd(win,B){
      const notes=[];
      if(win){
        const dead=B.units.filter(u=>u.side==="A"&&!u.alive).map(u=>u.id);
        notes.push(expLine(r.exp,gainExp(ids,r.exp,dead)));
        SAVE.gold+=r.gold;notes.push(`🪙+${r.gold}`);
        if(rnd()<.08){SAVE.charms.stone++;notes.push("💎 撿到突破石 ×1");}
        if(rnd()<.1)notes.push(`🎁 怪物掉下了 <b>${dropGear(s<5?"N":s>=15&&rnd()<.3?"SR":"R")}</b>（已放進裝備）`);
        if(s>trainBest()){SAVE.train.best=s;if(s<TRAIN_MAX)notes.push(`🔓 解鎖第 ${s+1} 關`);}
      }
      save();CUR_B=null;VIEW="train";render();
      if(win)openModal(`<h3>🏋 修練完成</h3><p>${notes.join("<br>")}</p><div class="row"><button class="pri" onclick="closeModal();startTrain()">再打一次</button><button onclick="closeModal()">關閉</button></div>`);
    }});
}

/* ===================== 恐龍蛋專區 ===================== */
// 遠征頁的獨立專區：連續 10 關，每關 5 顆恐龍蛋；打完一關立刻接下一關（同一場戰鬥，血量不回復）。
// 獎勵：10 關全過才有 🪙DINO_GOLD，並擲一次鞋子掉落（DINO_DROP），沒有其他掉落物；每人每天最多領 DINO_DAILY 次（用這台裝置的日期計算，跟合作討伐一樣）。
// 強度：血厚、傷害低。要調整就改下面幾個數字（hp／atk 是第 1 關的基礎值，每關再乘 dinoScale）
const DINO_WAVES=10,DINO_EGGS=5,DINO_MAXROUND=1000,DINO_PICS=40,DINO_GOLD=400,DINO_DAILY=30;
function dinoLeft(){const c=SAVE.dino;return c&&c.d===coopToday()?Math.max(0,DINO_DAILY-c.n):DINO_DAILY;}
// 通關（領得到獎勵的那一次）擲一次，最多掉一雙鞋子：髒拖鞋 10%、沙灘拖鞋 10%、人化破拖鞋 7%、沒掉 73%
const DINO_DROP=[["slippers",.10],["beachslip",.10],["sadslip",.07]];
function dinoRoll(){let r=rnd();for(const [k,p] of DINO_DROP){if(r<p)return k;r-=p;}return null;}
MONSTERS.dinoegg={name:"恐龍蛋",emoji:"🥚",r:"R",hp:800,atk:3,def:5,spd:3, // 生命 800（原本 80 的 10 倍）；防禦 5（每點讓每次受到的傷害少 0.7，防禦不隨關卡增加）
  skill:{name:"孵化震動",cd:3,t:"enemy",kind:"dmg",desc:"造成1.2倍攻擊傷害。",use(B,u,t){hit(B,u,t,1.2);}},
  passive:{name:"厚實蛋殼",desc:"防禦+15。（第 1 關為 lv1：防禦+3）"}};
// 40 張不同的蛋圖（images/monsters/dinoegg1～40.webp），每顆蛋隨機挑一張；素質都和 dinoegg 一樣
for(let i=1;i<=DINO_PICS;i++)MONSTERS["dinoegg"+i]={...MONSTERS.dinoegg,pic:true};
const dinoScale=w=>1+(w-1)*.35;
const dinoWave=w=>Array.from({length:DINO_EGGS},()=>({id:"dinoegg"+ri(1,DINO_PICS),stars:1,scale:dinoScale(w)}));
// 區域：第一區就是目前的設定（10 關、每關 5 顆恐龍蛋）；第二到第五區先佔位，還沒有怪物，之後要開放就把 open 改成 true 並補上內容
const DINO_ZONES=[{n:"第一區",open:true},{n:"第二區"},{n:"第三區"},{n:"第四區"},{n:"第五區"}];
let DINO_ZONE=1;
function viewDino(){
  const s=cardStats("dinoegg",1,dinoScale(1)),e=cardStats("dinoegg",1,dinoScale(DINO_WAVES)),z=DINO_ZONES[DINO_ZONE-1];
  const tabs=`<div class="filters">${DINO_ZONES.map((o,i)=>`<button class="${i+1===DINO_ZONE?"on":""}" onclick="DINO_ZONE=${i+1};render()">${o.open?"":"🔒 "}${o.n}</button>`).join("")}</div>`;
  if(!z.open)return `<h2>逃殺遠征</h2>${runTabs()}${tabs}
  <div class="panel"><h3 style="margin-top:0">🥚 ${z.n}</h3><p class="dim">🔒 尚未開放。這一區目前還沒有怪物，敬請期待。</p></div>`;
  return `<h2>逃殺遠征</h2>${runTabs()}${tabs}
  <div class="panel"><h3 style="margin-top:0">🥚 ${z.n}</h3>
    <p>連續 <b>${DINO_WAVES}</b> 關，每關 <b>${DINO_EGGS}</b> 顆恐龍蛋。打完一關<b>馬上接著下一關</b>，中間不會回血，也不能換人。</p>
    <ul class="dim small" style="padding-left:18px;margin:0">
      <li>恐龍蛋血很厚、傷害很低，考驗隊伍的持久力。</li>
      <li>每顆約 ❤${s.maxHp} ⚔${s.atk} 🛡${s.def+15}（第 1 關）→ ❤${e.maxHp} ⚔${e.atk} 🛡${e.def+15}（第 ${DINO_WAVES} 關）。防禦含被動「厚實蛋殼」+15。</li>
      <li>全隊倒下就結束；戰敗沒有懲罰，也沒有獎勵。</li>
      <li>獎勵：<b>${DINO_WAVES} 關全部通過</b>可得 🪙${DINO_GOLD}，每天最多領 ${DINO_DAILY} 次（今天還剩 <b>${dinoLeft()}</b> 次，用這台裝置的日期計算）。</li>
      <li>掉落：領到獎勵的那一次還會擲一次鞋子（最多掉一雙）：${DINO_DROP.map(([k,p])=>`${GEAR[k].name} ${Math.round(p*100)}%`).join("、")}。</li>
    </ul></div>
  <div class="row" style="margin-top:14px"><button class="pri" onclick="startDino()" ${SAVE.team.length?"":"disabled"}>⚔ 開始挑戰</button></div>
  <h3>出戰隊伍</h3><div class="cardgrid">${SAVE.team.map(id=>cardTile(id,`showCard('${id}')`)).join("")||"<span class='dim'>尚未編隊</span>"}</div>`;
}
function startDino(){
  if(!SAVE.team.length)return;
  const ids=SAVE.team.slice(),waveTitle=w=>`恐龍蛋專區 第 ${w}／${DINO_WAVES} 關`;
  startBattle({title:waveTitle(1),home:"run",maxRound:DINO_MAXROUND,bgm:"dino",A:ids.map(teamUnit),B:dinoWave(1),
    waves:Array.from({length:DINO_WAVES-1},(_,i)=>dinoWave(i+2)),waveTitle, // 後面 9 關：前一關的蛋全倒，立刻補上下一批
    intro:"一整片恐龍蛋在地上微微晃動……",
    resultNote:B=>B.over==="A"?`${DINO_WAVES} 關全部通過！`:`撐到第 ${B.wave} 關倒下了。`,
    onEnd(win,B){
      const n=win?DINO_WAVES:B.wave-1;
      let note="";
      if(win){
        if(dinoLeft()>0){
          const t=coopToday(),c=SAVE.dino;
          SAVE.dino={d:t,n:(c&&c.d===t?c.n:0)+1};SAVE.gold+=DINO_GOLD;
          const dk=dinoRoll(),dg=dk?addGear(dk):null;save();
          note=`<br>🪙+${DINO_GOLD}（今天還可以領 ${dinoLeft()} 次）`+(dg?`<br>🎁 掉落了 <b class="r${GEAR[dk].q}">${qTag(GEAR[dk].q)}${gearName(dg)}</b>（${statStr(gearStats(dg))}，已放進裝備）`:"");
        }else note=`<br><span class="dim">今天的獎勵已經領滿 ${DINO_DAILY} 次了，明天再來。</span>`;
      }
      CUR_B=null;RUN_TAB="dino";VIEW="run";render();
      openModal(`<h3>🥚 恐龍蛋專區${win?"・全數通過":""}</h3><p>${win?`${DINO_WAVES} 關全部打完了！${note}`:`通過了 ${n}／${DINO_WAVES} 關，第 ${B.wave} 關倒下了。`}</p>
        <div class="row"><button class="pri" onclick="closeModal();startDino()">再挑戰一次</button><button onclick="closeModal()">關閉</button></div>`);
    }});
}

