"use strict";
/* ===================== RUN: STATE ===================== */
let RUN=null;
function hasRun(tag){return !!RUN&&RUN.party.some(m=>m.alive&&!m.ally&&CARDS[m.id].run===tag);}
function own(){return RUN.party.filter(m=>!m.ally&&!m.story);} // 劇情隊友不算自己的角色（不吃經驗、不算覆沒）
function aliveMembers(){return RUN.party.filter(m=>m.alive);}
function allyMember(){return RUN.party.find(m=>m.ally&&m.alive);}
function memberAtk(m){const w=m.weapon?ITEMS[m.weapon].weapon*(m.id==="merc"?2:1):0;return (m.bonus.atk||0)+w+(m.gear?m.gear.atk:0);}
function mkMember(id,stars,extra={}){
  const s=cardStats(id,stars,extra.scale||1,extra.br||0),gr=extra.gear||null,hp=s.maxHp+(gr?gr.hp:0);
  return {id,stars,name:extra.name||CARDS[id].name,maxHp:hp,hp:extra.hp!=null?extra.hp:hp,bonus:{atk:0,def:0,spd:0},
    weapon:null,ally:!!extra.ally,trust:extra.trust||0,alive:true,scale:extra.scale||1,br:extra.br||0,gear:gr};
}
function memberToUnit(m){
  const g=m.gear||{};
  return {id:m.id,stars:m.stars,scale:m.scale,br:m.br||0,name:m.name,hp:m.hp,maxHp:m.maxHp,atk:memberAtk(m),def:(m.bonus.def||0)+(g.def||0),spd:(m.bonus.spd||0)+(g.spd||0),ally:m.ally,ref:m,gx:{crit:g.crit||0,steal:g.steal||0,dodge:g.dodge||0,dr:g.dr||0,acc:g.acc||0,pen:g.pen||0,ccres:g.ccres||0}};
}
function gasIdx(){return Math.floor((RUN.time-1)*.9)-1;}
function addGold(n){n=Math.round(n*(hasRun("rich")?1.3:1)*dMul());RUN.gold+=n;return n;}
function gainItem(id){RUN.items.push(id);return `${ITEMS[id].icon}${ITEMS[id].name}`;}
// 遠征中的戰鬥經驗：給自己的角色（盟友不算），倒下的減半；升級要等下次出戰才生效
function runExp(n){
  const mine=own(),ups=gainExp(mine.map(m=>m.id),n,mine.filter(m=>!m.alive).map(m=>m.id));
  return expLine(n,ups)+(ups.length?`<br><span class="dim small">（升級的能力下次出戰生效）</span>`:"");
}

// 主線難度：普通＝敵人生命與攻防速 ×2、掉落 ×2；困難 ×3、掉落 ×3（無盡深淵不分難度）
const DIFFS={1:{name:"簡單",icon:"🟢",desc:"原本的難度"},2:{name:"普通",icon:"🟡",desc:"敵人生命、攻擊、防禦、速度 ×2；金條、突破石、魔王掉落的裝備 ×2"},3:{name:"困難",icon:"🔴",desc:"敵人生命、攻擊、防禦、速度 ×3；金條、突破石、魔王掉落的裝備 ×3"}};
function diffName(d){return DIFFS[d||1].name;}
function dMul(){return RUN&&RUN.ch!==ABYSS?(RUN.diff||1):1;}
function openDiff(c){
  const C=CHAPTERS[c],dc=(SAVE.prog.dclears||{})[c]||{};
  openModal(`<h3>${C.icon} ${C.s3?`第 ${c-S3_FIRST_CH+16} 章`:C.fatty?`肥宅物語 第 ${c-FATTY_FIRST_CH+1} 章`:`第 ${c+1} 章`}　${C.name}</h3><p class="dim small">${C.sub}</p><p>選擇難度：</p>
    <div class="opts">${[1,2,3].map(d=>`<button class="${d===1?"":d===2?"gold":"pri"}" onclick="closeModal();startRun(${c},${d})">${DIFFS[d].icon} ${DIFFS[d].name}${dc[d]?`　✓ 已逃出 ${dc[d]} 次`:""}<br><span class="small dim">${DIFFS[d].desc}</span></button>`).join("")}</div>
    <div class="row" style="margin-top:10px"><button onclick="closeModal()">取消</button></div>`);
}
function startRun(c=0,diff=1){
  stopEndVoice();
  let team=SAVE.team.filter(id=>SAVE.owned[id]);
  if(!team.length){toast("先去「隊伍」編隊吧");return;}
  if(!unlocked(c)){toast("尚未解鎖");return;}
  const C=CHAPTERS[c];
  if(C.fatty){
    team=team.filter(id=>id!=="fatty"&&id!=="fatty2"); // 肥宅是故事主角，以劇情隊友加入，不能再當自己的隊員
    if(!team.length){toast("肥宅物語需要至少 1 名其他角色出戰（肥宅本人會自動加入）");return;}
  }
  // 這條故事線會讓阿燼、晴以劇情版加入：你隊伍裡同一張卡暫時休息（不消耗），避免出現兩個同一個人。劇情夥伴不佔出戰名額
  const matesHere=C.mates||[],sitOut=team.filter(id=>matesHere.includes(id));
  if(sitOut.length){
    team=team.filter(id=>!matesHere.includes(id));
    if(!team.length){toast(`${sitOut.map(id=>CARDS[id].name).join("、")}會以劇情夥伴的身分加入，請再編至少 1 名其他角色出戰`);return;}
    toast(`${sitOut.map(id=>CARDS[id].name).join("、")} 由劇情版出場，你的卡這次先休息`);
    glog("👥MATE",`出戰卡休息：${sitOut.join("、")}`);
  }
  if(C.abyss)diff=1;
  glog("🚩RUN",`開始：${C.name}（${diffName(diff)}）`);
  RUN={active:true,ch:c,diff,fi:0,time:0,food:3,gold:0,items:[],party:team.map(id=>mkMember(id,SAVE.owned[id].stars,{gear:equipBonus(id),scale:lvScale(id),br:brOf(id)})),
    visited:{},choices:null,scene:null,sel:null,log:[],floors:C.abyss?[{label:"D0"}]:C.floors.map(f=>({label:f.label,rooms:f.rooms}))};
  (C.mates||[]).forEach(id=>{const mt=storyMate(id);if(C.mateNames&&C.mateNames[id])mt.name=C.mateNames[id];RUN.party.push(mt);}); // 這條故事線已經加入的同伴
  if(C.fatty)RUN.party.push(storyMate(fattyMateId())); // 肥宅物語：肥宅本人加入
  const st=SAVE.stash,packed=st.items.map(gainItem);RUN.food+=st.food;
  const intro=[];if(packed.length||st.food)intro.push(`🎒 你們帶上了從商店買的行囊：${packed.join("、")}${st.food?`${packed.length?"、":""}🥫補給+${st.food}`:""}。`);
  SAVE.stash={items:[],food:0};
  SAVE.stats.runs++;save();
  const it=pick(["pill","knife","wine"]);gainItem(it);
  RUN.visited[0]=C.startLoc.split(" · ")[1];
  setScene(C.startLoc,C.startTitle,C.intro(`${ITEMS[it].icon}${ITEMS[it].name}`).concat(intro),[{label:C.abyss?"⬇ 往下走":"⬆ 往上爬",cls:"pri",act:toChoose}]);
  if(C.introPics)RUN.scene.pics=C.introPics; // 故事插圖（肥宅物語）
  if(C.abyss)kingSay("abyss",0);else kingSay("intro",c);
  VIEW="run";render();
  if(C.fatty)playIntroVoice(c);
}
// 遠征存檔：選房間畫面存完整進度；進房間後存「事件中」，重開時跳過該事件（守門者／魔王會重打）
function persistRun(stage){
  if(!RUN||!RUN.active)return;
  const {scene,sel,...rest}=RUN;
  SAVE.run=JSON.parse(JSON.stringify({...rest,stage}));
  if(stage==="choose")SAVE.runCk=JSON.parse(JSON.stringify(SAVE.run)); // 這一層的重置點
  save();
}
function resumeRun(){
  const s=SAVE.run;if(!s)return;
  const stage=s.stage;RUN={...s,scene:null,sel:null};delete RUN.stage;VIEW="run";
  if(stage==="choose"&&RUN.choices){render();return;}
  if(stage==="post")return abyssPost([]);
  const l=["記憶斷斷續續……你們在一陣混亂中回過神來。"];
  if(isBossFloor(RUN.fi))return RUN.ch===ABYSS?abyssBoss(l):helipad(l);
  if(RUN.visited[RUN.fi]==="封存的牢房"&&!hasStory("qing"))return qingCamp({id:FL()[RUN.fi].rooms[0],name:"封存的牢房",ev:"qing"},["記憶斷斷續續……你們回到了牢房前。"]);
  if(RUN.visited[RUN.fi]==="營火邊"&&!hasStory("ashen"))return ashenCamp({id:FL()[RUN.fi].rooms[0],name:"營火邊",ev:"ashen"},["記憶斷斷續續……你們回到了營火邊。"]);
  aliveMembers().forEach(m=>m.hp=Math.max(1,m.hp-Math.ceil(m.maxHp*.15)));
  l.push("<span class='dim'>（遠征中途離開：這個房間的事件已經錯過，全員受到少量傷害。）</span>");
  setScene(FL()[RUN.fi].label+" · "+(RUN.visited[RUN.fi]||""),"🔄 繼續遠征",l,cont());render();
}
function setScene(loc,title,lines,opts){RUN.scene={loc,title,lines,opts};RUN.choices=null;glog("📍SCENE",`${loc}｜${title}`);}
function nextLabel(){ensureFloor(RUN.fi+1);return FL()[RUN.fi+1]?FL()[RUN.fi+1].label:"";}
function cont(extra=[]){return extra.concat([{label:`${RUN.ch===ABYSS?"⬇":"⬆"} 前往 ${nextLabel()}`,cls:"pri",act:toChoose}]);}

/* ---- 時間流逝：毒氣 ---- */
function passTime(lines){
  RUN.time++;
  if(RUN.fi<=gasIdx()){
    if(RUN.items.includes("gasmask")){RUN.items.splice(RUN.items.indexOf("gasmask"),1);lines.push("☣ 毒氣湧進房間！你們戴上 😷防毒面具，撐過了這一波。");return;}
    SFX.gas();
    const hurt=[];
    aliveMembers().forEach(m=>{
      if(m.id==="diver"&&!m.ally)return;
      let d=3-(hasRun("gasResist")?1:0)-(m.id==="survivor"?1:0);
      if(d>0){m.hp-=d;hurt.push(`${m.name}-${d}`);}
    });
    lines.push(`☣ <span style="color:var(--gas)">毒氣已經淹到這層樓！</span>${hurt.join("、")||"（無人受傷）"}`);
    checkMemberDeaths(lines);
  }else if(RUN.fi===gasIdx()+1)lines.push(`<span style="color:var(--gas)">樓梯口飄上來刺鼻的綠霧……毒氣就在下一層了。</span>`);
}
function checkMemberDeaths(lines){
  RUN.party.forEach(m=>{if(m.alive&&m.hp<=0){m.hp=0;m.alive=false;lines.push(`<span style="color:var(--red)">✝ ${m.name} 倒下了。</span>`);}});
}
function runLost(){return !own().some(m=>m.alive);}

/* ---- 選房間 ---- */
function rollUnknown(){
  const r=rnd();
  return r<.38?"rival":r<.52?"shade":r<.72?"loot":r<.82?"stash":r<.91?"gasleak":"empty";
}
function toChoose(){
  if(runLost())return endRun(false);
  const fi=RUN.fi+1;
  if(RUN.ch===ABYSS){ensureFloor(fi);RUN.choices=abyssChoices(fi);}
  else{
    const F=FL()[fi];if(!F)return;
    const rooms=fi===LAST()?F.rooms.slice():shuffle(F.rooms).slice(0,3+(hasRun("climb")?1:0));
    RUN.choices=rooms.map(id=>{const n=ROOM_NAME[id];return {id,name:n||"",ev:n?ROOM_EV[n]:rollUnknown()};});
  }
  RUN.scene=null;persistRun("choose");render();
}
function abyssChoices(fi){
  if(fi%5===0)return [{id:`D${fi}`,name:"守門者之間",ev:"abyssboss"}];
  return Array.from({length:3+(hasRun("climb")?1:0)},(_,k)=>{
    const id=`D${fi}-${k+1}`;
    if(rnd()<.3){const ev=pick(Object.keys(ABYSS_ROOMS));return {id,name:ABYSS_ROOMS[ev],ev};}
    return {id,name:"",ev:rollUnknown()};
  });
}
function canRope(){return RUN.items.includes("rope")&&(RUN.ch===ABYSS?(RUN.fi+1)%5!==0:RUN.fi+1<LAST()-1);}
function canReveal(){return hasRun("reveal");}
function chooseRoom(i){
  if(!RUN||!RUN.choices||!RUN.choices[i]||!tapOk())return;
  const ch=RUN.choices[i];SFX.click();glog("🚪ROOM",`${FL()[RUN.fi+1].label} 選 ${ch.id}${ch.name?" "+ch.name:""}`);
  RUN.fi++;RUN.visited[RUN.fi]=ch.name||ch.id;
  const lines=[];
  // 補給消耗
  if(RUN.food>0){
    if(hasRun("chef")&&rnd()<.5)lines.push("🍳 廚師把剩菜變成一餐，沒有消耗補給。");
    else{RUN.food--;own().forEach(m=>{if(m.alive&&m.id==="gourmet")m.hp=Math.min(m.maxHp,m.hp+2);});}
  }else{
    aliveMembers().forEach(m=>m.hp-=2);
    lines.push(`<span style="color:var(--red)">🍽 補給耗盡，全員飢餓 -2。</span>`);
  }
  passTime(lines);
  if(hasRun("miner")&&rnd()<.4)lines.push(`⛏ 礦工在牆縫敲出了 🪙${addGold(2)}。`);
  persistRun("event");
  // 盟友信任
  const al=allyMember();
  if(al){
    al.trust-=6;
    if(al.trust<25&&rnd()<.35)return allyBetrays(al,lines,ch);
    if(al.trust<35)lines.push(`<span class="dim">${al.name} 一路上都沒說話，眼神時不時瞟向你們的背包……</span>`);
  }
  checkMemberDeaths(lines);
  if(runLost())return endRun(false,lines);
  runEvent(ch,lines);
}
function useRope(){
  const i=RUN.items.indexOf("rope");if(i<0)return;
  RUN.items.splice(i,1);RUN.fi++;ensureFloor(RUN.fi);RUN.visited[RUN.fi]="（繩索攀爬）";
  toChoose();
}

/* ---- 事件 ---- */
function loc(ch){return `${FL()[RUN.fi].label} · ${ch.id}${ch.name?" "+ch.name:""}`;}
function restOpt(ch){
  return {label:"🛌 原地休息（全員恢復25%生命，耗時1）",act(){
    const l=["你們靠著牆輪流守夜，閉眼休息了一會兒。"];
    aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.25)));
    const al=allyMember();if(al)al.trust+=3;
    passTime(l);checkMemberDeaths(l);if(runLost())return endRun(false,l);
    setScene(loc(ch),"休息過後",l,cont());render();}};
}
function searchOpt(ch,label,fn){
  return {label:label+"（耗時1）",act(){const l=[];passTime(l);checkMemberDeaths(l);if(runLost())return endRun(false,l);fn(l);setScene(loc(ch),"再次搜索",l,cont());render();}};
}
function lootLine(n){
  const got=[];for(let i=0;i<n;i++)got.push(gainItem(pick(LOOT_TABLE)));
  if(hasRun("scavenge")&&rnd()<.4)got.push(gainItem(pick(LOOT_TABLE))+"（拾荒者）");
  return "找到了 "+got.join("、")+"。";
}
function runEvent(ch,pre){
  const L=pre.slice(),fi=RUN.fi,ev=ch.ev,where=loc(ch);
  // 第2章以後重用同一套事件，標題換成這間房間自己的名字
  const S=(title,lines,opts)=>{if(RUN.ch&&ch.name&&EV_ICON[ev])title=`${EV_ICON[ev]} ${ch.name}`;setScene(where,title,L.concat(lines),opts);render();};
  switch(ev){
  case "scrap":{ // 深淵專用：拆 3 件道具當零件，裝給一名隊員（攻擊或防禦 +1，每間限一次）；35% 有回收者看守，可以選擇迎戰或離開
    const scrapUI=pre=>{
      const junk=RUN.items.filter(i=>i!=="rope"&&i!=="gasmask"),intro=["廢鐵堆成小山，一台壓縮機還在嗡嗡運轉。牆上寫著：「拆得越碎，越有用。」"];
      if(junk.length<3)return S("♻️ 回收廠",pre.concat(intro,["你們身上的道具不夠拆（要 3 件，防毒面具與繩索不拆）。"]),cont());
      const take=junk.slice(0,3),names=take.map(i=>ITEMS[i].icon+ITEMS[i].name).join("、");
      const use=(m,k,txt)=>({label:`🔩 拆 ${names} → ${m.name} ${txt}+1`,act(){
        take.forEach(i=>RUN.items.splice(RUN.items.indexOf(i),1));m.bonus[k]+=1;SFX.click();
        setScene(where,"♻️ 拆解完成",[`零件被塞進 ${m.name} 的裝備裡。${txt}+1（本次遠征）。`],cont());render();}});
      return S("♻️ 回收廠",pre.concat(intro,["這裡能把 3 件道具拆成零件，裝在一個人身上（只能拆一次）。"]),
        [...aliveMembers().filter(m=>!m.ally).flatMap(m=>[use(m,"atk","攻擊"),use(m,"def","防禦")]),...cont()]);
    };
    if(rnd()<.35){
      const g=[{id:"reclaimer",stars:1,scale:1+fi*.04,name:"回收廠看守・回收者"}];
      return S("♻️ 回收廠",["廢鐵堆後面站起一個鐵灰色的身影。「不合格的物品，需要回收。」","回收者擋在壓縮機前，想用這台機器，就得先打倒它。"],[
        {label:"⚔️ 迎戰回收者",cls:"pri",act:()=>runBattle(ch,g,null,"鐵爪從廢鐵堆裡伸了出來！",()=>scrapUI(["回收者倒下了，壓縮機的電源重新亮起。"]))},...cont()]);
    }
    return scrapUI([]);}
  case "forge":{ // 深淵專用：丟 2 件道具重鑄成 1 件隨機新道具，每間最多 2 次；D20 起火箭筒、霰彈槍更容易出現
    let uses=0;
    const forgeUI=(first,pre)=>{
      const left=RUN.items.slice();if(first)left.splice(left.indexOf(first),1);
      const intro=["一座還燒著的熔爐，旁邊堆著碎掉的零件。爐口寫著：「兩件舊的，換一件新的。」"];
      if(uses>=2)return S("🔥 重鑄爐",pre.concat(["爐火熄了。"]),cont());
      if(left.length<(first?1:2))return S("🔥 重鑄爐",pre.concat(intro,["你們身上的道具不夠重鑄（要 2 件）。"]),cont());
      const cnt={};left.forEach(i=>cnt[i]=(cnt[i]||0)+1);
      const btns=Object.keys(cnt).map(id=>({label:`${ITEMS[id].icon}${ITEMS[id].name}${cnt[id]>1?` ×${cnt[id]}`:""}`,act(){
        if(!first)return forgeUI(id,[]);
        RUN.items.splice(RUN.items.indexOf(first),1);RUN.items.splice(RUN.items.indexOf(id),1);uses++;
        const got=gainItem(pick(LOOT_TABLE.concat(fi>=20?["rocket","shotgun"]:[])));SFX.click();
        forgeUI(null,[`${ITEMS[first].icon}${ITEMS[first].name} 和 ${ITEMS[id].icon}${ITEMS[id].name} 被丟進爐裡，火光一閃——爐口吐出了 ${got}。`]);}}));
      return S("🔥 重鑄爐",pre.concat(intro,[first?`已選 ${ITEMS[first].icon}${ITEMS[first].name}，再選第二件要丟進去的道具。`:`選擇要丟進爐裡的道具（已重鑄 ${uses}／2 次）。`]),
        [...btns,...(first?[{label:"← 重選",act:()=>forgeUI(null,[])}]:[]),...cont()]);
    };
    return forgeUI(null,[]);}
  case "wine":{gainItem("wine");gainItem("wine");return S("🍷 酒窖",["一排排落滿灰塵的酒桶。你們拎走了兩瓶還沒壞的 🍷酒。"],cont([restOpt(ch)]));}
  case "ration":{RUN.food+=2;return S("🥫 配給站",["自動販賣機吐出兩包配給。<b>補給+2</b>。"],cont([searchOpt(ch,"🔨 敲打販賣機",l=>{if(rnd()<.5){RUN.food++;l.push("咚！又掉出一包。補給+1。");}else l.push("機器發出刺耳的警報……什麼也沒掉出來。");})]));}
  case "granary":{RUN.food+=3;return S("🌾 糧倉",["麻袋堆到天花板。你們塞滿了背包。<b>補給+3</b>。"],cont([restOpt(ch)]));}
  case "water":{RUN.food+=2;aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.1)));return S("💧 水塔",["清涼的水從破裂的管線湧出。全員恢復10%生命，<b>補給+2</b>。"],cont([restOpt(ch)]));}
  case "pharmacy":{gainItem("pill");gainItem("adrenaline");return S("💊 藥房",["藥櫃被翻得亂七八糟，但還剩下 💊藥片 和 💉腎上腺素。"],cont([searchOpt(ch,"🔍 再翻翻藥櫃",l=>l.push(rnd()<.6?"在櫃子底下摸到 "+gainItem("pill")+"。":"只剩空藥瓶。"))]));}
  case "junk":{
    const r=rnd();
    if(r<.25)return shadeAmbush(ch,L.concat(["垃圾堆裡傳來窸窣聲……一隻暗影從廢鐵下鑽了出來！"]),1);
    const line=r<.6?(hasRun("scavenge")?`滿地垃圾。拾荒者眼睛一亮：「這些能換吃的。」補給+${(RUN.food+=2,2)}`:"滿地垃圾，什麼有用的都沒有。"):"在廢鐵堆裡挖出了 "+gainItem(pick(["rope","gasmask","rocket"]))+"！";
    return S("🗑️ 垃圾場",[line],cont([searchOpt(ch,"🗑 繼續翻垃圾",l=>l.push(rnd()<.5?"翻到 "+gainItem(pick(["rope","gasmask","rocket","knife"]))+"。":"只有一堆生鏽的罐頭。"))]));}
  case "warehouse":{
    RUN.food++;const got=lootLine(2);
    if(rnd()<.45)return rivalEncounter(ch,L.concat([`大倉庫裡貨架林立。${got}補給+1。`,"……但貨架後面有人。"]),rivalGroup(fi));
    return S("🏭 大倉庫",[`大倉庫裡貨架林立。${got}補給+1。`],cont([restOpt(ch)]));}
  case "teleport":return S("🌀 傳送室",["房間中央的傳送台嗡嗡作響，螢幕閃著「目的地：未知」。"],[
    {label:"🌀 站上傳送台（直接跳過下一層，20%機率傳送失誤）",cls:"pri",act(){
      const l=[];
      if(rnd()<.2){aliveMembers().forEach(m=>m.hp-=3);l.push("傳送失誤！你們被甩在地上，全員-3。");checkMemberDeaths(l);if(runLost())return endRun(false,l);}
      else l.push("一陣白光——你們出現在兩層樓之上。");
      RUN.fi=Math.min(RUN.fi+1,LAST()-1);RUN.visited[RUN.fi]="（傳送）";
      setScene(`${FL()[RUN.fi].label} · ???`,"🌀 傳送完成",l,cont());render();}},
    ...cont()]);
  case "lotto":{
    let plays=0;
    const play=()=>({label:`🎰 投 🪙3 拉一次（剩 ${3-plays} 次）`,act(){
      if(RUN.gold<3){toast("金條不足");return;}
      RUN.gold-=3;plays++;const d=ri(1,6);let r;
      if(d<=2)r="什麼都沒有。";else if(d<=4)r=`吐出 🪙${addGold(5)}。`;else if(d===5)r="掉出 "+gainItem(pick(LOOT_TABLE))+"！";else{r=`🎉 頭獎！🪙${addGold(12)}`;SFX.ssr();}
      setScene(where,"🎰 樂透房",[`🎲 ${d}——${r}`],cont(plays<3?[play()]:[]));render();}});
    return S("🎰 樂透房",["一台還插著電的拉霸機在角落閃爍。"],cont([play()]));}
  case "respec":return S("🧬 操作室",["一台改造艙。螢幕上寫著：「強化實驗・僅限一人」。"],[
    ...aliveMembers().filter(m=>!m.ally).map(m=>({label:`🧬 讓 ${m.name} 進去（本次遠征攻擊 +2）`,act(){m.bonus.atk+=2;setScene(where,"強化完成",[`${m.name} 從艙裡出來，肌肉明顯緊繃了不少。本次遠征攻擊 +2。`],cont());render();}})),
    ...cont()]);
  case "surgery":{
    const alive=aliveMembers().length,dead=own().filter(m=>!m.alive);
    if(alive<2&&!own().some(m=>m.alive&&m.id==="medic"))return S("🏥 手術室",["手術台需要兩個人才能操作。你一個人只能望著器械發呆。"],cont());
    aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.5)));
    const l=["你們輪流替彼此縫合傷口。全員恢復50%生命。"];
    if(dead.length){const d=dead[0];d.alive=true;d.hp=Math.ceil(d.maxHp*.4);l.push(`你們把 ${d.name} 抬上手術台……電擊！他重新睜開了眼。`);}
    return S("🏥 手術室",l,cont());}
  case "canteen":{RUN.food++;return rivalEncounter(ch,L.concat(["餐廳的長桌上擺著冷掉的飯菜（補給+1）。","長桌另一端，有人正在默默吃飯。他抬頭看了你們一眼，沒有拔刀。"]),[rivalUnit(fi)],{peaceful:true});}
  case "vault":{
    const g=addGold(ri(6,10));
    if(rnd()<.5)return rivalEncounter(ch,L.concat([`金庫門半開著，你們抓了一把金條（🪙${g}）。`,"「放下。」——金庫深處有人守著。"]),rivalGroup(fi));
    return S("🏦 金庫",[`金庫門半開著。你們抓了一把金條，🪙+${g}。`],cont());}
  case "control":{RUN.time=Math.max(0,RUN.time-2);return S("🖥️ 控制室",["滿牆的監視螢幕。你找到通風系統的開關，把排風扇開到最大。","<span style='color:var(--gas)'>毒氣上升的速度被壓了回去（時間-2）。</span>"],cont());}
  case "recycle":{
    const sell=RUN.items.filter(i=>i!=="rope"&&i!=="gasmask");
    return S("♻️ 回收站",["一台吃道具吐金條的回收機。每件道具換 🪙3。"],cont(sell.length?[{label:`♻️ 回收所有道具（除了繩索、防毒面具）→ 🪙${sell.length*3}`,act(){
      RUN.items=RUN.items.filter(i=>i==="rope"||i==="gasmask");const g=addGold(sell.length*3);setScene(where,"♻️ 回收完成",[`機器嘩啦啦吐出 🪙${g}。`],cont());render();}}]:[]));}
  case "armory":{
    const w=rnd()<.5?"knife":rnd()<.7?"pistol":"shotgun";
    if(rnd()<.4){RUN.pendingLoot=w;return rivalEncounter(ch,L.concat(["武器庫的槍架上還有東西。但一個人影擋在前面，手已經按在槍套上。"]),rivalGroup(fi));}
    return S("🔫 武器庫",[`槍架上還剩一把 ${gainItem(w)}。到隊伍面板裝備它。`],cont());}
  case "laser":{
    const l=["紅色雷射網在房間裡緩緩掃動。你們必須穿過去。"];
    aliveMembers().forEach(m=>{const spd=CARDS[m.id].spd+(m.bonus.spd||0);if(spd<5&&rnd()<.5){m.hp-=5;l.push(`${m.name} 被雷射掃到，-5！`);}else l.push(`${m.name} 靈巧地閃過。`);});
    checkMemberDeaths(l);if(runLost())return endRun(false,L.concat(l));
    l.push("房間盡頭的能量核心還在發光。");
    return S("🔴 激光室",l,[...aliveMembers().filter(m=>!m.ally).map(m=>({label:`⚡ 讓 ${m.name} 吸收核心（本次遠征攻擊 +2）`,act(){m.bonus.atk+=2;setScene(where,"能量灌注",[`${m.name} 的雙眼泛起紅光。本次遠征攻擊 +2。`],cont());render();}})),...cont()]);}
  case "gene":return S("🧪 基因庫",[CH().prep],
    aliveMembers().filter(m=>!m.ally).flatMap(m=>[
      {label:`🧪 ${m.name}：生命上限+8`,act(){m.maxHp+=8;m.hp+=8;geneDone(m,"生命上限+8");}},
      {label:`🧪 ${m.name}：防禦+2`,act(){m.bonus.def+=2;geneDone(m,"防禦+2");}}
    ]).concat([{label:`${CH().vehIcon} 不拿了，直接前往${CH().bossRoom}`,cls:"pri",act:goHelipad}]));
  case "fsnack":{
    const C=CH();RUN.food++;
    aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.25)));
    S("🍜 泡麵角落",[pick(C.snack||["一個藏在角落的泡麵小站。"]),"全員恢復25%生命，<b>補給+1</b>。"],cont());
    playFattyVoice(RUN.ch,"snack");return;}
  case "helipad":return helipad(L);
  case "ashen":return ashenCamp(ch,L);
  case "qing":return qingCamp(ch,L);
  case "qing2":return qingLastPage(ch,L);
  case "whisper":return whisperRoom(ch,L);
  case "seat37":return seat37Room(ch,L);
  case "abyssboss":return abyssBoss(L);
  case "cryo":{
    const dead=own().filter(m=>!m.alive);
    if(dead.length){const d=dead[0];d.alive=true;d.hp=Math.ceil(d.maxHp*.5);
      return S("🧊 冷凍艙",["一排冷凍艙還在運轉，白霧從縫隙裡冒出來。",`你們把 ${d.name} 的身體放進去……解凍程序結束時，他咳嗽著醒了過來（50%生命）。`],cont());}
    return S("🧊 冷凍艙",["一排冷凍艙還在運轉。只剩一個艙能用。"],[
      ...aliveMembers().filter(m=>!m.ally).map(m=>({label:`🧊 讓 ${m.name} 進艙（生命全滿、上限+4）`,act(){m.maxHp+=4;m.hp=m.maxHp;SFX.heal();setScene(where,"🧊 解凍完成",[`${m.name} 從艙裡出來，傷口全都癒合了。生命上限+4（本次遠征）。`],cont());render();}})),
      ...cont()]);}
  case "prisoncell":return rivalEncounter(ch,L.concat(["鐵欄後面關著一個人。他抬起頭，眼神裡有一點希望。","「放我出去。我會報答你們的。」"]),[rivalUnit(fi)],{peaceful:true,bonus:.35});
  case "blackmarket":return blackMarket(ch,L,shuffle(Object.keys(SHOP)).slice(0,4));
  case "casino":{
    let plays=0;
    const bet=all=>({label:all?`🃏 全部押上（🪙${RUN.gold}，45%翻倍）`:`🃏 押一半（🪙${Math.floor(RUN.gold/2)}，45%翻倍）`,act(){
      const b=all?RUN.gold:Math.floor(RUN.gold/2);if(b<1){toast("沒有金條可以押");return;}
      plays++;let r;
      if(rnd()<.45){RUN.gold+=b;r=`🎉 莊家翻牌——你贏了！🪙+${b}`;SFX.ssr();}else{RUN.gold-=b;r=`莊家冷笑著把 🪙${b} 掃走。`;SFX.lose();}
      setScene(where,"🃏 賭場",[r,`目前金條 🪙${RUN.gold}。`],cont(plays<2&&RUN.gold>0?[bet(false),bet(true)]:[]));render();}});
    return S("🃏 賭場",["綠色的牌桌、刺眼的吊燈。一個沒有臉的荷官正在洗牌。","「下注吧。最多兩把。」"],cont(RUN.gold>0?[bet(false),bet(true)]:[]));}
  case "chapel":return S("🕯️ 禮拜堂",["幾根快燒完的蠟燭。這裡安靜得讓人想哭。"],[
    {label:"🕯️ 在這裡過夜（全員生命全滿，盟友信任+15，耗時1）",cls:"pri",act(){
      const l=["你們靠著長椅睡了一覺。醒來時，傷口好像沒那麼痛了。"];
      aliveMembers().forEach(m=>m.hp=m.maxHp);const al=allyMember();if(al)al.trust+=15;
      passTime(l);checkMemberDeaths(l);if(runLost())return endRun(false,l);
      setScene(where,"🕯️ 天亮了",l,cont());render();}},
    ...cont()]);
  case "rival":return rivalEncounter(ch,L,rivalGroup(fi));
  case "shade":return shadeAmbush(ch,L.concat([pick(CH().shade)]),(RUN.ch===ABYSS?fi>=10:fi>=5)?2:1);
  case "loot":{const t=lootLine(ri(1,2));if(rnd()<.4)RUN.food++;return S("📦 散落的物資",[pick(["有人在這裡打過一架，東西散了一地。","一個被撬開的置物櫃。"]),t],cont([restOpt(ch)]));}
  case "stash":return S("💰 暗格",[`你在通風口裡摸到一個布包。🪙+${addGold(ri(4,7))}。`],cont([restOpt(ch)]));
  case "gasleak":{
    const l=["管線突然爆裂，綠色的毒霧噴了出來！"];
    if(RUN.items.includes("gasmask")){RUN.items.splice(RUN.items.indexOf("gasmask"),1);l.push("你們及時戴上 😷防毒面具。");}
    else{aliveMembers().forEach(m=>{if(!(m.id==="diver"&&!m.ally))m.hp-=Math.max(1,3-(hasRun("gasResist")?1:0));});l.push("全員嗆咳不止，受到毒氣傷害。");checkMemberDeaths(l);if(runLost())return endRun(false,L.concat(l));}
    l.push("毒霧散去後，你們在管線旁發現了 "+gainItem(pick(LOOT_TABLE))+"。");
    return S("☣️ 毒氣外洩",l,cont());}
  default:return S("🕸️ 空房間",[pick(["牆上用指甲刻滿了正字記號。數到第三百多天就停了。","一張翻倒的椅子、一灘乾掉的血。這裡什麼都沒有。","廣播突然響起：「目前存活人數……」然後就斷訊了。"]),rnd()<.3?(RUN.food++,"角落有一包沒拆的乾糧。補給+1。"):""],cont([restOpt(ch)]));
  }
}
function geneDone(m,txt){const C=CH();setScene(C.prepLoc,"強化完成",[`${m.name} 的血管浮起一層微光。${txt}（本次遠征）。`],[{label:`${C.vehIcon} 前往${C.bossRoom}`,cls:"pri",act:goHelipad}]);render();}
function goHelipad(){
  const l=[];passTime(l);checkMemberDeaths(l);if(runLost())return endRun(false,l);
  RUN.visited[LAST()]=CH().bossRoom;helipad(l);
}
function blackMarket(ch,L,stock){
  const where=loc(ch);
  setScene(where,"🕶️ 黑市",L.concat(["一個戴墨鏡的男人坐在一堆箱子上。「現金交易，不找零。」",`你們身上有 🪙${RUN.gold}。`]),[
    ...stock.map((id,i)=>({label:`${ITEMS[id].icon} ${ITEMS[id].name}　🪙${SHOP[id]}`,act(){
      if(RUN.gold<SHOP[id]){toast("金條不足");return;}
      RUN.gold-=SHOP[id];gainItem(id);SFX.click();toast(`買下 ${ITEMS[id].name}`);
      blackMarket(ch,[],stock.filter((_,j)=>j!==i));}})),
    {label:"🥫 補給 ×1　🪙3",act(){if(RUN.gold<3){toast("金條不足");return;}RUN.gold-=3;RUN.food++;toast("補給+1");blackMarket(ch,[],stock);}},
    ...cont()]);render();
}

/* ---- 對手 ---- */
const PRISONER_NO=()=>"#"+String(ri(1,999)).padStart(3,"0");
function rivalUnit(fi){
  const c=effCh();let pool,stars,scale;
  if(c===0){pool=fi<3?POOL.R:fi<6?POOL.R.concat(POOL.SR,POOL.SR):CARD_IDS;stars=clamp(1+Math.floor(fi/3)+(rnd()<.3?1:0),1,5);scale=.78+fi*.06;}
  else if(c===ABYSS){pool=CARD_IDS;stars=clamp(2+Math.floor(fi/8)+(rnd()<.3?1:0),1,5);scale=1+fi*.035;}
  else{pool=fi<3?POOL.R.concat(POOL.SR):CARD_IDS;stars=clamp(1+Math.floor((fi+c*3)/4)+(rnd()<.3?1:0),1,5);scale=.78+fi*.05+c*.07;}
  const id=pick(pool);
  return {id,stars,scale,name:CARDS[id].name+PRISONER_NO()};
}
function rivalGroup(fi){
  const r=rnd(),n0=fi<2?1:r<.5?1:r<.85?2:3,n=n0+(n0>1?extraFoes():0);
  return Array.from({length:n},()=>rivalUnit(fi));
}
function rivalEncounter(ch,L,group,opt={}){
  const where=loc(ch),solo=group.length===1,g=group[0],al=allyMember(),full=RUN.party.filter(m=>m.alive&&!m.story).length>=teamMax()+1;
  const desc=group.map(x=>`${x.name}（${CARDS[x.id].r} ${"★".repeat(x.stars)}）`).join("、");
  const lines=L.concat([`<div class="row" style="gap:6px;margin:6px 0">${group.map(x=>`<div style="width:56px;height:56px;border-radius:8px;overflow:hidden;border:2px solid var(--sideB)">${avatar(x.id)}</div>`).join("")}</div>`,
    `遭遇：<b style="color:var(--sideB)">${desc}</b>`,
    solo?pick(["「別緊張。我也只是想活著出去。」","「……你們有吃的嗎？」","他握著刀，但刀尖朝下。"]):pick(["他們交換了一個眼神，慢慢散開成包圍隊形。","「三個位子，我們剛好三個人。你們懂的。」"])]);
  const bonus=opt.bonus!=null?opt.bonus:opt.peaceful?.2:0,opts=[];
  if(solo&&!al&&!full){
    opts.push({label:`🤝 提議結盟（${Math.round((.35+bonus)*100)}%）`,act:()=>tryAlly(ch,g,.35+bonus,"")});
    if(RUN.food>0)opts.push({label:`🤝 分他1份補給並提議結盟（${Math.round((.6+bonus)*100)}%）`,act:()=>{RUN.food--;tryAlly(ch,g,.6+bonus,"你遞出一包配給。");}});
    if(RUN.gold>=3)opts.push({label:`🤝 塞給他🪙3並提議結盟（${Math.round(Math.min(.95,.75+bonus)*100)}%）`,act:()=>{RUN.gold-=3;tryAlly(ch,g,Math.min(.95,.75+bonus),"你把金條塞進他手裡。");}});
  }
  if(solo&&(al||full))lines.push(`<span class="dim">（已有盟友，無法再結盟）</span>`);
  if(RUN.gold>=5)opts.push({label:"💱 交易：🪙5 換一件他的道具",act(){RUN.gold-=5;const t=gainItem(pick(LOOT_TABLE));setScene(where,"交易完成",[`對方收下金條，丟給你 ${t}。「快走吧，別讓我改變主意。」`],cont());render();}});
  opts.push({label:"⚔️ 先下手為強（突襲：敵人開場-3生命）",cls:"pri",act:()=>runBattle(ch,group,"A",`你們撲向 ${desc}！`)});
  opts.push({label:`🏃 悄悄繞開（${opt.peaceful?90:55}%）`,act(){
    if(rnd()<(opt.peaceful?.9:.55)){setScene(where,"溜走了",["你們貼著牆根退了出去，對方沒有追來。"],cont());render();}
    else runBattle(ch,group,"B","「想走？」——你們被堵住了！");}});
  setScene(where,solo?"👤 另一名逃殺者":"👥 敵對小隊",lines,opts);render();
}
function tryAlly(ch,g,chance,pre){
  const where=loc(ch);
  if(rnd()<chance){
    const m=mkMember(g.id,g.stars,{scale:g.scale,name:g.name,ally:true,trust:60});
    RUN.party.push(m);SFX.sr();
    setScene(where,"🤝 結盟成功",[pre,`${g.name} 點了點頭：「先說好，出去之前我們是一夥的。」`,`<span class="dim">盟友會自動戰鬥。信任度每層-6，低於40時可能在戰鬥中倒戈、低於25時可能捲款跑路。分補給可以提升信任。若帶著盟友一起逃出，你會得到他的職業卡。</span>`],cont());
  }else{
    if(rnd()<.5){setScene(where,"談判破裂",[pre,`${g.name} 冷笑一聲，轉身消失在走廊盡頭。`],cont());}
    else return runBattle(ch,[g],"B",`${pre}${g.name}：「謝啦——」話音未落，刀已經捅了過來！`);
  }
  render();
}
function allyBetrays(al,lines,ch){
  al.alive=false;al.betrayed=true;
  if(rnd()<.5){
    const n=Math.min(2,RUN.items.length),stolen=[];
    for(let i=0;i<n;i++)stolen.push(RUN.items.splice(ri(0,RUN.items.length-1),1)[0]);
    const g=Math.floor(RUN.gold/2);RUN.gold-=g;
    RUN.party=RUN.party.filter(m=>m!==al);
    SFX.lose();
    setScene(loc(ch),"🗡 背叛",lines.concat([`你們醒來時，${al.name} 已經不見了。`,`他帶走了 ${stolen.map(i=>ITEMS[i].icon+ITEMS[i].name).join("、")||"……什麼也沒拿到"}，還有 🪙${g}。`]),[{label:"……繼續前進",cls:"pri",act:()=>runEvent(ch,[])}]);
    render();
  }else{
    RUN.party=RUN.party.filter(m=>m!==al);
    const g={id:al.id,stars:al.stars,scale:al.scale*1.1,name:al.name,hp:al.hp};
    runBattle(ch,[g],"B",`${al.name}：「我算過了，四個人上不了直升機。」——盟友拔刀相向！`,()=>runEvent(ch,[]));
  }
}
function shadeAmbush(ch,L,n){
  const fi=RUN.fi,c=effCh(),id=c===ABYSS?pick(["ghost","mutant","guard","drone","deepone","mirror","echo","doppel","cameraman","fanatic","rookie","guardian"]):CH().minion,M=MONSTERS[id];
  const scale=c===0?.8+fi*.07:c===ABYSS?1+fi*.04:.8+fi*.05+c*.08;
  n+=n>1?extraFoes():0;
  const g=Array.from({length:n},()=>({id,stars:1,scale}));
  setScene(loc(ch),`${M.emoji} ${M.name}`,L,[
    {label:"⚔️ 迎戰",cls:"pri",act:()=>runBattle(ch,g,null,`${M.name}${n>1?"們":""}撲了過來！`)},
    {label:"🏃 逃跑（50%，失敗則被伏擊）",act(){if(rnd()<.5){setScene(loc(ch),"逃脫",["你們頭也不回地衝向樓梯。"],cont());render();}else runBattle(ch,g,"B",`${M.name}比你們更快！`);}}
  ]);render();
}
function runBattle(ch,group,ambush,intro,after){
  const where=loc(ch),fi=RUN.fi,members=aliveMembers();
  startBattle({title:`${where}`,home:"run",items:RUN.items,ambush,intro,
    A:members.map(memberToUnit),B:group.map(g=>({...g,mult:dMul(),pow:chPow()})),
    resultNote:B=>B.over==="A"?"":"全隊覆沒……",
    onEnd(win,B){
      B.units.filter(u=>u.ref).forEach(u=>{u.ref.hp=Math.max(0,u.hp);u.ref.alive=u.alive&&u.side==="A";});
      RUN.party=RUN.party.filter(m=>!m.betrayed);
      CUR_B=null;VIEW="run";
      const l=[];
      if(!win||runLost())return endRun(false,["你們倒在了"+where+"。"]);
      const n=group.length,g=addGold((RUN.ch===ABYSS?2+Math.floor(fi/4):1+Math.floor(fi/2)+effCh())*n);l.push(`戰鬥勝利。從對手身上搜出 🪙${g}。`);
      if(!MONSTERS[group[0].id]){
        if(RUN.pendingLoot){l.push("槍架上的 "+gainItem(RUN.pendingLoot)+" 歸你們了。");RUN.pendingLoot=null;}
        else if(rnd()<.6)l.push("還撿到 "+gainItem(pick(LOOT_TABLE))+"。");
      }
      if(hasRun("courier")&&rnd()<.3)l.push("郵差從對方包裡翻出 "+gainItem(pick(LOOT_TABLE))+"。");
      l.push(runExp(4+fi+effCh()*3+n*2));
      const al=allyMember();if(al){al.trust+=5;l.push(`<span class="dim">${al.name} 對你們多了幾分信任。</span>`);}
      if(B.units.some(u=>u.ref&&u.ref.betrayed))l.push("叛徒的屍體倒在你們腳邊。");
      if(after)return after();
      setScene(where,"⚔️ 戰鬥結束",l,cont([restOpt(ch)]));render();
    }});
}

/* ===== 劇情隊友（《名冊》故事線）：能力跟著自己隊伍的平均值走，不吃養成 ===== */
const hasStory=id=>!!RUN&&RUN.party.some(m=>!m.ally&&m.id===id); // 劇情版或你自己出戰的同一張卡，隊伍裡已經有了就不再加入
function storyMate(id){
  const t=RUN.party.filter(m=>!m.ally&&!m.story),n=Math.max(1,t.length);
  const avg=f=>t.reduce((a,x)=>a+f(x),0)/n;
  const gear={};["hp","atk","def","spd","crit","steal","dodge","dr","acc","pen","ccres"].forEach(k=>gear[k]=Math.round(avg(x=>(x.gear&&x.gear[k])||0)));
  const m=mkMember(id,clamp(Math.round(avg(x=>x.stars)),1,5),{scale:avg(x=>x.scale||1),br:Math.round(avg(x=>x.br||0)),gear});
  m.story=true;m.trust=100;return m;
}
// 依隊伍裡的職業觸發不同的對白（隨機挑一個在場的職業）
const BANTER={
  ashen_meet:{
    tank:n=>`阿燼看了 <b>${n}</b> 的盾一眼，微微點頭。「……站得穩。」`,
    warrior:n=>`阿燼打量著 <b>${n}</b> 的武器。「別衝太前面。」`,
    assassin:n=>`阿燼瞥了 <b>${n}</b> 一眼。「不要消失太久。」`,
    ranger:n=>`阿燼朝 <b>${n}</b> 點點頭，把自己的位置往前挪了一步。「你在後面，我在前面。」`,
    mage:n=>`阿燼看著 <b>${n}</b> 手裡的東西，沉默了一下。「……小心，別傷到自己人。」`,
    support:n=>`阿燼的視線在 <b>${n}</b> 身上停了一下。「……別累倒。保護你們，是我的事。」`},
  ashen_after:{
    tank:n=>`<b>${n}</b> 把盾放下。阿燼走過去，用手背敲了敲盾面，什麼也沒說。`,
    warrior:n=>`<b>${n}</b> 甩了甩手腕。阿燼看了一眼，微微點頭：「……不錯。」`,
    assassin:n=>`<b>${n}</b> 擦著刀從陰影裡走出來。阿燼瞥了一眼：「下次，先說一聲。」`,
    ranger:n=>`<b>${n}</b> 收起武器。阿燼回頭看了一眼：「你的位置，很好。」`,
    mage:n=>`<b>${n}</b> 手上的光還沒散。阿燼問：「……累嗎？」語氣很輕，像怕驚動什麼。`,
    support:n=>`<b>${n}</b> 替大家處理傷口。阿燼低頭看著手臂上被包好的繃帶，沉默了一下：「……謝謝。」`}
};
function banter(key){
  const T=BANTER[key],ms=own().filter(m=>m.alive);if(!T||!ms.length)return "";
  const m=pick(ms),f=T[CARDS[m.id].cls];return f?f(m.name):"";
}
BANTER.qing_meet={
  tank:n=>`晴看著 <b>${n}</b> 身上的傷痕，輕輕皺眉。「你一直擋在最前面，對嗎。……辛苦了。」`,
  warrior:n=>`晴注意到 <b>${n}</b> 握武器的手在微微發抖。「讓我看看你的手。」`,
  assassin:n=>`晴看著 <b>${n}</b> 腰間的刀，輕聲說：「走在暗處的人，也需要被記得。」`,
  ranger:n=>`晴朝 <b>${n}</b> 微微點頭。「你看得很遠。……謝謝你，替大家看路。」`,
  mage:n=>`晴看見 <b>${n}</b> 手上殘留的光，眼睛亮了一下。「你的光，跟我的有點像。」`,
  support:n=>`晴看著 <b>${n}</b> 腰間的藥袋，露出今天第一個笑容。「我們是同行呢。」`};
BANTER.qing_after={
  tank:n=>`<b>${n}</b> 擋在最前面。晴把手掌覆在他的肩甲上，淡綠色的光緩緩滲了進去。「辛苦了。」`,
  warrior:n=>`晴替 <b>${n}</b> 包紮手上的傷口。「下次，先顧自己，好嗎。」`,
  assassin:n=>`<b>${n}</b> 從陰影裡走出來，晴遞過去一塊乾淨的布。「臉上有血。」`,
  ranger:n=>`晴蹲下，替 <b>${n}</b> 把散落的東西整理好。「謝謝你，一直在後面守著我們。」`,
  mage:n=>`<b>${n}</b> 手上的光漸漸暗下去。晴輕聲說：「別硬撐，光會回來的。」`,
  support:n=>`晴和 <b>${n}</b> 對看了一眼，同時伸手去拿同一卷繃帶，然後兩個人都笑了。`};
const QING_NPC=lines=>({id:"qing",name:"晴",img:"images/avatars/qing.webp",icon:"✨",lines});
function qingCamp(ch,L){
  const where=loc(ch);
  if(hasStory("qing")){setScene(where,"📖 封存的牢房",L.concat(["牢房的門開著。晴坐在門口，一邊翻著名冊，一邊輕聲唸著什麼。"]),cont([restOpt(ch)]));return render();}
  setScene(where,"📖 封存的牢房",L.concat([
    "走廊盡頭，是一間用鐵欄封起來的牢房。牆上貼滿了被撕下來的名牌。",
    "牢房中央，一個長髮的女孩坐在地上，膝蓋上攤著一本厚得誇張的冊子。她手裡的羽毛筆沒有停，一邊寫，一邊用很輕的聲音唸著什麼。",
    "她身邊飄著幾根白色的羽毛。每寫完一個名字，就有一根亮起來，然後慢慢升到天花板上，消失。",
    "阿燼走到鐵欄前，站住了。他沒有說話，但擋在了你們和牢房之間——像是在確認，裡面的人有沒有危險。"]),[
    {label:"🗣 「你是誰？為什麼被關在這裡？」",cls:"pri",act:()=>qingTalk(ch)},
    {label:"🔓 「阿燼，打開它。」",act:()=>qingFree(ch,["阿燼看了你們一眼，點點頭。"])}]);
  render();
}
function qingTalk(ch){
  setScene(loc(ch),"📖 封存的牢房",["女孩停下了筆，抬起頭。"],[
    {label:"🔓 「我們帶你出去。」",cls:"pri",act:()=>qingFree(ch,["你們對她伸出手。"])}]);
  RUN.scene.npc=QING_NPC(["……你們受傷了。","（她抬起頭，第一句話，卻是這個。）","我叫晴。以前，是替被淘汰的人祈福、記下名字的人。","他們要我把名字刪掉。我沒有答應。","所以我被關在這裡。……不過沒關係，他們關得住我，關不住名字。"]);
  render();
}
function qingFree(ch,pre){
  setScene(loc(ch),"📖 封存的牢房",pre.concat([
    "阿燼上前一步，重劍落下，鐵鎖應聲斷開。",
    "晴站起來，抱著名冊，朝你們輕輕鞠了一個躬。",banter("qing_meet"),
    "她看了阿燼一眼，視線停在他的盔甲和重劍上。「你一直在守著別人，對不對。」<br>阿燼沒有回答，只是把頭轉開了半寸。",
    "走廊另一頭傳來沙沙聲——白色的人影開始靠近，一頁一頁，抹掉牆上的名字。晴把名冊抱得更緊。「他們來刪名字了。」"].filter(Boolean)),[
    {label:"🛡 「站我們後面。」",cls:"pri",act:()=>qingJoin(ch)}]);
  RUN.scene.npc=ASHEN_NPC(["……站我後面。","（他對晴說。聲音很輕，是這一路上，他第一次主動開口。）"]);
  render();
}
function qingJoin(ch){
  RUN.party.push(storyMate("qing"));SAVE.lore=SAVE.lore||{};SAVE.lore.s_qing=1;save();SFX.sr();
  aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.3)));
  const g=Array.from({length:2+extraFoes()},()=>({id:CH().minion,stars:1,scale:.8+RUN.fi*.05+effCh()*.08}));
  setScene(loc(ch),"✨ 名字不會消失",["晴把羽毛筆插回髮間，翻開名冊。「我跟你們走。……我也想看看，外面有沒有天亮。」","她替每個人包紮了傷口，動作很輕。全隊恢復了一些體力。","白色的人影圍了上來，沒有五官，卻有一雙很大的、空白的手。"],[
    {label:"⚔️ 迎戰",cls:"pri",act:()=>runBattle(ch,g,null,"「站我後面。」——阿燼橫劍擋在晴的前面。",()=>qingAfter(ch))}]);
  RUN.scene.npc=QING_NPC(["治愈之光，與你同在。","……請多指教。"]);
  render();
}
function qingAfter(ch){
  setScene(loc(ch),"📖 名字不會消失",["最後一個白色的人影倒下，原本被它抹掉的牆面，慢慢浮現出了字跡。",banter("qing_after"),
    "戰鬥一結束，晴第一件事不是看敵人，而是蹲到阿燼面前。「你的手臂。」「……沒事。」「讓我看。」",
    "淡綠色的光從她掌心浮起。阿燼沒有再說話，只是把視線移向旁邊，耳尖有一點點紅。",
    "「我會守住你，直到黎明。」他低聲說。晴愣了一下，笑著點頭。「嗯。我記得。」",
    "<span class='dim'>（晴加入了隊伍。羈絆「名冊合照」生效：阿燼和晴同時在場時，阿燼攻擊+4%、晴的治療量+7.5%。）</span>"].filter(Boolean),cont([restOpt(ch)]));
  render();
}
function qingLastPage(ch,L){
  const where=loc(ch);
  setScene(where,"📖 最後一頁",L.concat([
    "剪輯室就在前面。走廊盡頭有一張被燈照亮的小桌，桌上攤開著名冊。",
    "晴翻到某一頁，停了下來。那一頁上寫著一個名字：<b>阿燼</b>。名字下面，有一行小字：<span class='dim'>第二季・留下斷後・未歸。</span>",
    "阿燼低頭看著那一行字。很久，什麼也沒說。",
    "「他們把你寫成『未歸』。」晴輕聲說。「但我知道，你有回來。」"]),[
    {label:"🕯️ 安靜地陪著他們（全隊恢復 25% 生命）",cls:"pri",act(){
      aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.25)));SFX.heal();
      setScene(where,"📖 最後一頁",["沒有人說話。燈下，晴一筆一畫，把「未歸」兩個字輕輕劃掉，在旁邊寫上：<b>歸來</b>。","阿燼轉過身，背對著大家，肩膀很輕地動了一下。全隊恢復了一些體力。"],cont([restOpt(ch)]));render();}},
    {label:"🛡 「剪輯師就在前面。我們替你把名字守住。」（本次遠征全隊攻擊 +2）",act(){
      aliveMembers().forEach(m=>m.bonus.atk=(m.bonus.atk||0)+2);SFX.sr();
      setScene(where,"📖 最後一頁",["阿燼抬起頭，看向走廊盡頭的剪輯室，手慢慢握緊了劍柄。","「……好。」他說。這是他第一次，把『好』說得這麼用力。本次遠征全隊攻擊 +2。"],cont([restOpt(ch)]));render();}}]);
  RUN.scene.npc=ASHEN_NPC(["……那一頁，是怎麼來的。","我在深淵喊過很多次。沒有人回答。","後來，我就不喊了。","……原來，有人聽見。"]);
  render();
}
function whisperRoom(ch,L){
  const where=loc(ch),g=Array.from({length:3+extraFoes()},()=>({id:CH().minion,stars:1,scale:.8+RUN.fi*.05+effCh()*.08}));
  setScene(where,"👥 無名的低語",L.concat([
    "一排影子轉過頭來。它們沒有嘴，聲音卻從四面八方傳來：「……我是誰？」",
    "晴往前一步，翻開名冊。她看著其中一個影子，一個字一個字，念出了一個名字。影子停住了，肩膀輕輕顫了一下。",
    "阿燼站在她的斜前方，重劍橫在身側。他沒有看影子，只是看著晴的背影。"]),[
    {label:"🕯️ 讓晴一個一個唸出名字（全隊恢復 30% 生命）",cls:"pri",act(){
      aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.3)));SFX.heal();
      setScene(where,"👥 被唸出名字的人",["晴一個一個唸下去。每唸出一個名字，就有一個影子慢慢站直了身體，朝她點點頭，然後安靜地退回黑暗裡。","阿燼始終守在她前面，沒有放下劍。全隊恢復了一些體力。"],cont([restOpt(ch)]));render();}},
    {label:"⚔️ 這些影子不會讓我們過",act:()=>runBattle(ch,g,null,"影子們伸出了手——",null)}]);
  render();
}
function seat37Room(ch,L){
  const where=loc(ch);
  setScene(where,"🪑 第三十七個座位",L.concat([
    "舞台正中央，擺著一把椅子。它是整座大廳裡，唯一乾淨的一把。椅背上刻著一個數字：<b>37</b>。",
    "晴把名冊翻到最後一頁。那一頁是空白的，只有最上面一行小字：<span class='dim'>為前來接人的人，保留。</span>",
    "「這個座位，」晴輕聲說，「一直在等人。……不是被丟下的人，是來接他們的人。」",
    "阿燼看著那把椅子，很久。最後，他搖了搖頭。「……我不坐。我守著。」"]),[
    {label:"✍️ 晴把你們的名字，一個一個寫在最後一頁（全隊攻擊 +2、恢復 25% 生命）",cls:"pri",act(){
      aliveMembers().forEach(m=>{m.bonus.atk=(m.bonus.atk||0)+2;m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.25));});SFX.ssr();
      setScene(where,"🪑 第三十七個座位",["羽毛筆在紙上沙沙地走。一個、兩個、三個……每寫完一個名字，就有一根白羽毛亮起來，繞著你們轉了一圈。","「寫好了。」晴合上名冊，輕聲說。「以後，沒有人會被忘記。」本次遠征全隊攻擊 +2，並恢復了一些體力。"],cont([restOpt(ch)]));render();}},
    {label:"🛡 阿燼：「我守著。」（全隊防禦 +10）",act(){
      aliveMembers().forEach(m=>m.bonus.def=(m.bonus.def||0)+10);SFX.sr();
      setScene(where,"🪑 第三十七個座位",["阿燼走到椅子後面，站定，重劍立在身前。像一座沉默的牆。","「……不管來什麼，」他說，「都得先過我這裡。」本次遠征全隊防禦 +10。"],cont([restOpt(ch)]));render();}}]);
  RUN.scene.npc=QING_NPC(["我一直在想，這個座位是留給誰的。","現在我知道了。","——是留給，願意回頭的人。"]);
  render();
}
/* ===== 劇情配音（voice/story/）：對話框裡有配音的句子，會依序播放；播放期間選項鎖住，聽完才能繼續 ===== */
// 原句 → 檔名（舞台提示「（……）」不唸）。音效關閉時不播也不鎖；檔案載入失敗或瀏覽器擋住自動播放時，會自動解鎖，不會卡死
const STORY_VOX={
 "……往上的路，被回收者堵住了。": "ashen_01",
 "它抓走很多人。我守著這裡，沒讓它進來。": "ashen_02",
 "（他回頭看了一眼火堆旁的人。）……能不能，讓他們也跟著走。": "ashen_03",
 "……阿燼。": "ashen_04",
 "我的名字。": "ashen_05",
 "站我後面。": "ashen_06",
 "……站我後面。": "ashen_07",
 "……那一頁，是怎麼來的。": "ashen_08",
 "我在深淵喊過很多次。沒有人回答。": "ashen_09",
 "後來，我就不喊了。": "ashen_10",
 "……原來，有人聽見。": "ashen_11",
 "……你們受傷了。": "qing_01",
 "我叫晴。以前，是替被淘汰的人祈福、記下名字的人。": "qing_02",
 "他們要我把名字刪掉。我沒有答應。": "qing_03",
 "所以我被關在這裡。……不過沒關係，他們關得住我，關不住名字。": "qing_04",
 "治愈之光，與你同在。": "qing_05",
 "……請多指教。": "qing_06",
 "我一直在想，這個座位是留給誰的。": "qing_07",
 "現在我知道了。": "qing_08",
 "——是留給，願意回頭的人。": "qing_09"
};
// 第 13～15 章的結局配音（key＝章節索引 12、13、14）：旁白用一個聲音，阿燼、晴的台詞用各自的聲音，依序播放；不鎖按鈕，可隨時離開或按「重聽結局」
const END_VOX={"12": ["end13_01"], "13": ["end14_01", "end14_02", "end14_03", "end14_04", "end14_05", "end14_06", "end14_07"], "14": ["end15_01", "end15_02", "end15_03", "end15_04", "end15_05", "end15_06"]};
// 肥宅物語配音（旁白 Kokoro zm_yunxi、肥宅 edge-tts 雲哲；voice/gen_fatty_voice.py 產生）：每章開場、結局各一組
const FATTY_VOX={"16": {"intro": ["fatty1_intro_01", "fatty1_intro_02", "fatty1_intro_03", "fatty1_intro_04"], "end": ["fatty1_end_01", "fatty1_end_02", "fatty1_end_03", "fatty1_end_04", "fatty1_end_05"], "boss": ["fatty1_boss_01"], "story": ["fatty1_story_01", "fatty1_story_02", "fatty1_story_03", "fatty1_story_04"], "snack": ["fatty1_snack_01", "fatty1_snack_02"]}, "17": {"intro": ["fatty2_intro_01", "fatty2_intro_02"], "end": ["fatty2_end_01", "fatty2_end_02", "fatty2_end_03", "fatty2_end_04", "fatty2_end_05", "fatty2_end_06", "fatty2_end_07"], "boss": ["fatty2_boss_01"], "story": ["fatty2_story_01", "fatty2_story_02", "fatty2_story_03", "fatty2_story_04"], "snack": ["fatty2_snack_01", "fatty2_snack_02"]}, "18": {"intro": ["fatty3_intro_01", "fatty3_intro_02", "fatty3_intro_03", "fatty3_intro_04"], "end": ["fatty3_end_01", "fatty3_end_02", "fatty3_end_03", "fatty3_end_04"], "boss": ["fatty3_boss_01"], "story": ["fatty3_story_01", "fatty3_story_02", "fatty3_story_03"], "snack": ["fatty3_snack_01", "fatty3_snack_02", "fatty3_snack_03", "fatty3_snack_04"]}, "19": {"intro": ["fatty4_intro_01", "fatty4_intro_02", "fatty4_intro_03"], "end": ["fatty4_end_01", "fatty4_end_02", "fatty4_end_03", "fatty4_end_04", "fatty4_end_05"], "boss": ["fatty4_boss_01"], "story": ["fatty4_story_01", "fatty4_story_02", "fatty4_story_03"], "snack": ["fatty4_snack_01", "fatty4_snack_02"]}, "20": {"intro": ["fatty5_intro_01", "fatty5_intro_02", "fatty5_intro_03"], "end": ["fatty5_end_01", "fatty5_end_02", "fatty5_end_03", "fatty5_end_04", "fatty5_end_05", "fatty5_end_06"], "boss": ["fatty5_boss_01", "fatty5_boss_02", "fatty5_boss_03", "fatty5_boss_04"], "story": ["fatty5_story_01", "fatty5_story_02", "fatty5_story_03", "fatty5_story_04"], "snack": ["fatty5_snack_01"]}};
Object.keys(FATTY_VOX).forEach(c=>{END_VOX[c]=FATTY_VOX[c].end;});
let ENDV={audio:null,id:0,lock:false,scene:null};
function stopEndVoice(){ENDV.id++;ENDV.lock=false;if(ENDV.audio){try{ENDV.audio.pause();}catch(e){}ENDV.audio=null;}}
function endVoiceUnlock(){
  ENDV.lock=false;
  document.querySelectorAll("#view .scene .opts button").forEach(b=>{b.disabled=false;});
  const h=document.getElementById("npcHint");if(h)h.remove();
}
// force＝第一次通關：結局要聽完才能按按鈕、才能離開；之後重打不強迫
function playEndVoice(ch,force=false){
  stopEndVoice();
  const q=(END_VOX[ch]||[]).slice();if(!q.length||SAVE.muted)return;
  playVoiceList(q,force,"🔊 結局播放中……第一次通關，請先聽完");
}
// 肥宅物語其他場景配音（boss＝魔王戰前、story＝聽魔王的故事、snack＝泡麵角落）；force＝第一次聽要聽完
function playFattyVoice(c,kind,force=true){
  stopEndVoice();
  const q=((FATTY_VOX[c]||{})[kind]||[]).slice();if(!q.length||SAVE.muted)return;
  SAVE.lore=SAVE.lore||{};const key="fv"+kind+c;
  playVoiceList(q,force&&!SAVE.lore[key],"🔊 故事播放中……第一次進入這一幕，請先聽完",()=>{if(!SAVE.lore[key]){SAVE.lore[key]=1;save();}});
}
// 肥宅物語開場配音：第一次進入這一章要聽完（聽完會記起來），之後不強迫
function playIntroVoice(c){
  stopEndVoice();
  const q=((FATTY_VOX[c]||{}).intro||[]).slice();if(!q.length||SAVE.muted)return;
  SAVE.lore=SAVE.lore||{};const key="fv"+c;
  playVoiceList(q,!SAVE.lore[key],"🔊 故事播放中……第一次進入這一章，請先聽完",()=>{if(!SAVE.lore[key]){SAVE.lore[key]=1;save();}});
}
function playVoiceList(q,force,hint,onDone){
  const my=ENDV.id;
  if(force&&RUN&&RUN.scene){
    ENDV.lock=true;ENDV.scene=RUN.scene;
    const opts=document.querySelector("#view .scene .opts");
    if(opts){opts.querySelectorAll("button").forEach(b=>{b.disabled=true;});
      if(!document.getElementById("npcHint"))opts.insertAdjacentHTML("beforebegin",`<div id="npcHint" class="dim small" style="margin-top:8px">${hint}</div>`);}
  }
  const next=()=>{
    if(ENDV.id!==my)return;
    const f=q.shift();if(!f){if(ENDV.lock)endVoiceUnlock();if(onDone)onDone();return;}
    let adv=false,tm=0;
    const go=()=>{if(adv)return;adv=true;clearTimeout(tm);setTimeout(next,300);};
    try{
      const a=new Audio(`voice/story/${f}.mp3`);ENDV.audio=a;a.volume=.95;
      a.addEventListener("ended",go);a.addEventListener("error",go);
      tm=setTimeout(go,30000);                     // 保險：單段最久等 30 秒
      const pr=a.play();if(pr&&pr.catch)pr.catch(go);
    }catch(e){go();}
  };
  next();
}
let NPCV={scene:null,audio:null,done:true,q:[]};
function npcVoiceLocked(){return !!RUN&&!!RUN.scene&&((NPCV.scene===RUN.scene&&!NPCV.done)||(ENDV.lock&&ENDV.scene===RUN.scene));}
function stopNpcVoice(){if(NPCV.audio){try{NPCV.audio.pause();}catch(e){}NPCV.audio=null;}NPCV.done=true;}
function npcVoiceUnlock(){
  NPCV.done=true;NPCV.audio=null;
  document.querySelectorAll("#view .scene .opts button").forEach(b=>{b.disabled=false;});
  const h=document.getElementById("npcHint");if(h)h.remove();
}
function startNpcVoice(){
  const sc=RUN&&RUN.scene;
  if(VIEW!=="run"||!sc||NPCV.scene===sc)return;     // 同一個場景只播一次
  stopNpcVoice();NPCV.scene=sc;
  const q=sc.npc?sc.npc.lines.map(t=>STORY_VOX[t]).filter(Boolean):[];
  if(!q.length||SAVE.muted){NPCV.done=true;return;}
  NPCV.done=false;NPCV.q=q;
  const opts=document.querySelector("#view .scene .opts");
  if(opts){opts.querySelectorAll("button").forEach(b=>{b.disabled=true;});
    if(!document.getElementById("npcHint"))opts.insertAdjacentHTML("beforebegin",'<div id="npcHint" class="dim small" style="margin-top:8px">🔊 對話播放中……聽完才能繼續</div>');}
  const next=()=>{
    if(NPCV.scene!==sc||NPCV.done)return;
    const f=NPCV.q.shift();if(!f)return npcVoiceUnlock();
    let adv=false,tm=0;
    const go=()=>{if(adv)return;adv=true;clearTimeout(tm);setTimeout(next,350);};
    try{
      const a=new Audio(`voice/story/${f}.mp3`);NPCV.audio=a;a.volume=.95;
      a.addEventListener("ended",go);a.addEventListener("error",go);
      tm=setTimeout(go,15000);                       // 保險：單句最久等 15 秒
      const pr=a.play();if(pr&&pr.catch)pr.catch(go);
    }catch(e){go();}
  };
  next();
}
const ASHEN_NPC=lines=>({id:"ashen",name:"阿燼",img:"images/avatars/ashen.webp",icon:"🗡",lines});
function ashenCamp(ch,L){
  const where=loc(ch);
  if(hasStory("ashen")){setScene(where,"🔥 營火邊",L.concat(["營火還亮著。阿燼靠在重劍旁，閉著眼睛，卻沒有睡。"]),cont([restOpt(ch)]));return render();}
  const talk=pre=>ashenTalk(ch,pre);
  setScene(where,"🔥 營火邊",L.concat([
    "一堆快燒完的火。幾個倖存者縮在火堆後面，抱著膝蓋，沒有人說話。",
    "路中央站著一個穿黑紫色重甲的人。一把幾乎和他一樣高的重劍插在地上，他兩手按著劍柄，一動也不動。",
    "他看著你們。不是敵意——是在掂量，你們會不會傷到他身後的人。"]),[
    {label:"🗣 「我們只是路過，不會動他們。」",cls:"pri",act:()=>talk(["你們把手放在看得見的地方，慢慢開口。","他沒有回答。目光越過你們，掃了一眼身後的黑暗，確認沒有別的東西跟來。"])},
    {label:"🤝 放下武器，慢慢靠近",act:()=>talk(["你們放下武器，掌心朝上，一步一步走近營火。","他的手指在劍柄上收緊了一下，又慢慢鬆開。"])},
    {label:"⚔️ 硬闖過去",act(){
      runBattle(ch,[{id:"ashen",stars:3,scale:1.2,name:"阿燼"}],null,"重劍拔出地面，擦出一串火星——他一句話也沒說，擋在了路中央。",
        ()=>talk(["阿燼單膝跪地，用劍撐著身體。他沒有倒下，只是抬頭看著你們。","「……你們很強。」他喘著氣。「但你們，沒有傷害他們。」"]));}}
  ]);render();
}
function ashenTalk(ch,pre){
  setScene(loc(ch),"🔥 營火邊",pre.concat(["他沉默了很久。最後，往旁邊讓開了半步。",banter("ashen_meet")].filter(Boolean)),[
    {label:"🛡 「我們幫你守。也帶他們一起走。」",cls:"pri",act:()=>ashenJoin(ch)}]);
  RUN.scene.npc=ASHEN_NPC(["……往上的路，被回收者堵住了。","它抓走很多人。我守著這裡，沒讓它進來。","（他回頭看了一眼火堆旁的人。）……能不能，讓他們也跟著走。"]);
  render();
}
function ashenJoin(ch){
  RUN.party.push(storyMate("ashen"));SAVE.lore=SAVE.lore||{};SAVE.lore.s_ashen=1;save();SFX.sr();
  const g=Array.from({length:2+extraFoes()},()=>({id:CH().minion,stars:1,scale:.8+RUN.fi*.05+effCh()*.08}));
  aliveMembers().forEach(m=>m.hp=Math.min(m.maxHp,m.hp+Math.ceil(m.maxHp*.3))); // 營火的暖意：先恢復一些體力
  setScene(loc(ch),"🛡 守夜",["他點了一下頭。很輕，但你們看見了。","營火的暖意讓大家恢復了一些體力。","遠處傳來履帶碾過廢鐵的聲音，越來越近。火堆後的人開始發抖。","阿燼把重劍從地上拔起來，走到所有人的最前面。"],[
    {label:"⚔️ 迎戰",cls:"pri",act:()=>runBattle(ch,g,null,"「站我後面。」——阿燼橫劍擋在最前面。",()=>ashenAfter(ch))}]);
  RUN.scene.npc=ASHEN_NPC(["……阿燼。","我的名字。","站我後面。"]);
  render();
}
function ashenAfter(ch){
  setScene(loc(ch),"🔥 天亮之前",["最後一台機器倒在火堆旁，冒著黑煙。營地安靜了下來。",banter("ashen_after"),
    "倖存者從火堆後面探出頭，有人哭了。阿燼把劍插回地上，背對著大家，站了很久。",
    "「我會守住你們，直到黎明。」他說。像是對所有人說，又像是只對自己說。",
    "<span class='dim'>（阿燼加入了隊伍。他的能力會跟著你們的平均水準成長。）</span>"].filter(Boolean),cont([restOpt(ch)]));
  render();
}

/* ---- 停機坪 ---- */
function helipad(L){
  const C=CH();RUN.fi=LAST();RUN.visited[RUN.fi]=C.bossRoom;
  const size=aliveMembers().length,hp=C.bossHp(size);
  const fight={label:"⚔️ 決戰",cls:"pri",act(){
    startBattle({title:C.bossLoc+" 決戰",home:"run",items:RUN.items,intro:C.bossIntro,
      A:aliveMembers().map(memberToUnit),B:[{id:C.boss,stars:1,scale:C.bossScale,maxHp:hp,hp,mult:dMul(),pow:chPow(),hpPow:CH_POW[effCh()]}].concat((C.escort||[]).map(id=>({id,stars:1,scale:C.bossScale,maxHp:Math.round(hp*.5),hp:Math.round(hp*.5),mult:dMul(),pow:chPow()*.4,hpPow:CH_POW[effCh()]*.4,name:MONSTERS[id].name+"（小弟）"}))),
      onEnd(win,B){
        B.units.filter(u=>u.ref).forEach(u=>{u.ref.hp=Math.max(0,u.hp);u.ref.alive=u.alive&&u.side==="A";});
        RUN.party=RUN.party.filter(m=>!m.betrayed);
        CUR_B=null;VIEW="run";
        if(!win||runLost())return endRun(false,[C.lose]);
        RUN.xpNote=runExp(25+effCh()*12);
        if(C.afterBoss)return C.afterBoss(); // 劇情章節：魔王倒下後自己接後續（例如第三季第 25 章的必敗戰）
        seats();
      }});
  }};
  // 有魔王故事的章節，可以先聽故事再開打
  const opts=C.story?[fight,{label:`📜 聽聽${MONSTERS[C.boss].name}的故事`,act(){setScene(C.bossLoc,`📜 ${MONSTERS[C.boss].name}的故事`,C.story,[fight]);render();if(C.fatty)playFattyVoice(RUN.ch,"story",false);}}]:[fight];
  setScene(C.bossLoc,C.bossTitle,L.concat(C.bossLines),opts);if(C.bossPics)RUN.scene.pics=C.bossPics;kingSay("boss",RUN.ch);render();
  if(C.fatty)playFattyVoice(RUN.ch,"boss");
}
/* ---- 深淵守門者 ---- */
function abyssBoss(L){
  const fi=RUN.fi,id=pick(["warden","zero","chief","host","kraken","judge","loopkeeper","origin","producer","audience","castingdir","pastchamp"]),size=aliveMembers().length,hp=Math.round((50+size*12)*(1+fi*.04));
  const where=`D${fi} · 守門者之間`;RUN.visited[fi]="守門者";
  setScene(where,"💀 守門者",L.concat([`深淵第 ${fi} 層的門後，站著一個熟悉的身影——<b style='color:var(--red)'>${MONSTERS[id].name}</b>。`,"但它的眼睛裡什麼都沒有，只有深淵。"]),[{label:"⚔️ 迎戰",cls:"pri",act(){
    startBattle({title:where,home:"run",items:RUN.items,intro:"深淵在低語。",
      A:aliveMembers().map(memberToUnit),B:[{id,stars:1,scale:1+fi*.03,maxHp:hp,hp,name:"守門者・"+MONSTERS[id].name}],
      onEnd(win,B){
        B.units.filter(u=>u.ref).forEach(u=>{u.ref.hp=Math.max(0,u.hp);u.ref.alive=u.alive&&u.side==="A";});
        RUN.party=RUN.party.filter(m=>!m.betrayed);
        CUR_B=null;VIEW="run";
        if(!win||runLost())return endRun(false,["你們被深淵吞沒了。"]);
        const g=addGold(10+fi*2),t=gainItem(pick(LOOT_TABLE)),l=[`守門者化成一灘黑水。🪙+${g}，還留下了 ${t}。`,runExp(20+fi*2)];
        SAVE.charms.stone++;l.push("💎 撿到突破石 ×1");
        if(FRUIT_OPEN&&rnd()<.25){const fk=pick(Object.keys(FRUITS));SAVE.fruits[fk]++;l.push(`${FRUITS[fk].icon} 黑水裡還沉著一顆 <b>${FRUITS[fk].name}</b>！`);}
        if(rnd()<.35)l.push(`🎁 黑水裡沉著一件裝備：<b>${dropGear(fi>=20&&rnd()<.05?"UR":fi>=15&&rnd()<.3?"SSR":"SR")}</b>（已放進裝備）`);
        SAVE.prog.abyssBest=Math.max(SAVE.prog.abyssBest,fi);
        persistRun("post");
        abyssPost(l);
      }});
  }}]);render();
}
function abyssPost(L){
  const fi=RUN.fi;
  setScene(`D${fi} · 守門者之間`,"💀 守門者倒下",L.concat(["更深處傳來風聲。你們可以帶著戰利品離開，或者繼續往下。",`<span class="dim">撤離：帶回全部金條＋深度獎勵 🪙${fi*2}。繼續：下一個守門者在 D${fi+5}，全滅只能帶回一半。</span>`]),
    [{label:"⬇ 繼續深入",cls:"pri",act:toChoose},{label:"🪜 撤離深淵",act:()=>endRun(true,["你們沿著來時的樓梯，一路爬回了地面。"])}]);render();
}
function seats(){
  const alive=aliveMembers(),C=CH();
  if(C.noSeats||alive.length<=3)return endRun(true,[C.escape]);
  const where=C.bossLoc;
  setScene(where,"💺 三個座位",[
    `${C.fall}你們衝向${C.veh}——`,
    `<b>座位只有三個，而你們有 ${alive.length} 個人。</b>`,
    "所有人都停下了腳步。沒有人先開口。"
  ],[
    ...alive.map(m=>({label:`👋 讓 ${m.name} 留下${m.ally?"（盟友會反抗）":""}`,act(){
      if(m.ally){
        RUN.party=RUN.party.filter(x=>x!==m);
        const g={id:m.id,stars:m.stars,scale:m.scale*1.3,name:m.name};
        startBattle({title:"停機坪・最後的背叛",home:"run",items:RUN.items,intro:`${m.name}：「我就知道。」他擋在艙門前。`,
          A:aliveMembers().map(memberToUnit),B:[g],
          onEnd(win,B){
            B.units.filter(u=>u.ref).forEach(u=>{u.ref.hp=Math.max(0,u.hp);u.ref.alive=u.alive;});
            CUR_B=null;VIEW="run";
            if(!win||runLost())return endRun(false,["你們沒能登上直升機。"]);
            if(aliveMembers().length>3)return seats(); // 還是超過 3 個座位，繼續選誰留下
            endRun(true,[`${m.name} 倒在停機坪上。你們登機，誰也沒有回頭。`]);
          }});
      }else{
        m.alive=false;m.left=true;
        if(aliveMembers().length>3)return seats(); // 5 人隊伍：還要再留下一個人
        endRun(true,[`${m.name} 苦笑著退後一步：「去吧。」艙門關上的那一刻，你看見他朝毒霧走去。`]);
      }}})),
    {label:"🎲 全部擠上去（50%機率超載墜機）",act(){
      if(rnd()<.5)endRun(true,[`${C.veh}搖搖晃晃地出發……居然撐住了！所有人都活著離開了這裡。`]);
      else{aliveMembers().forEach(m=>m.hp=Math.ceil(m.hp/2));RUN.gold=Math.floor(RUN.gold/2);endRun(true,[`超載警報狂響，${C.veh}重重撞了一下——你們爬出殘骸，總算還是逃了出去。一半的金條撒進了夜色裡。`]);}
    }}
  ]);render();
}

/* ---- 結算 ---- */
const effCh0=r=>{const c=CHAPTERS[r.ch];return c&&c.eq!=null?c.eq:r.ch;};
function endRun(escaped,lines=[]){
  stopNpcVoice();stopEndVoice();
  const r=RUN;r.active=false;r.escaped=escaped;SAVE.run=null;SAVE.runCk=null;
  glog("🏁RUN",`${CHAPTERS[r.ch].name}（${diffName(r.diff)}）結束：${escaped?"逃出":"失敗"}，到達 ${r.fi}`);
  const reached=r.fi,C=CHAPTERS[r.ch],abyss=r.ch===ABYSS,P=SAVE.prog;
  const fat=!!C.fatty,s3=!!C.s3,ec=effCh0(r),fk=r.ch-FATTY_FIRST_CH,sk=r.ch-S3_FIRST_CH; // 肥宅物語：fk＝第幾章（0～4）；第三季：sk＝第幾章（0～14）
  const firstClear=!abyss&&escaped&&(s3?(P.s3||0)<=sk:fat?(P.fatty||0)<=fk:P.cleared<=r.ch); // 這一章第一次通關
  let bonus=0;
  const out=lines.slice();
  if(escaped){
    out.push(`<b style="color:var(--gold)">${abyss?"撤離成功！":"逃出成功！"}</b>`);
    if(abyss)bonus=r.fi*2;
    else{
      const dm=r.diff||1;
      bonus=(10+ec*5)*dm;P.clears[r.ch]=(P.clears[r.ch]||0)+1;
      P.dclears=P.dclears||{};P.dclears[r.ch]=P.dclears[r.ch]||{};P.dclears[r.ch][dm]=(P.dclears[r.ch][dm]||0)+1;
      if(dm>1)out.push(`<span style="color:var(--gold)">${DIFFS[dm].icon} ${DIFFS[dm].name}難度：金條、突破石、裝備 ×${dm}</span>`);
      const q=ec>=4?(rnd()<.06?"UR":rnd()<.35?"SSR":"SR"):ec>=2?(rnd()<.12?"SSR":"SR"):(rnd()<.3?"SR":"R");
      for(let k=0;k<dm;k++)out.push(`🎁 ${C.bossRoom}留下了一件裝備：<b>${dropGear(q)}</b>（已放進裝備）`);
      const st=(1+Math.floor(ec/2))*dm;SAVE.charms.stone+=st;out.push(`💎 撿到突破石 ×${st}`);
      if(s3){
        if((P.s3||0)<=sk){
          P.s3=sk+1;bonus+=S3_FIRST[sk];
          out.push(`🏅 首次通關「${C.name}」！額外 🪙${S3_FIRST[sk]}`);
          if(sk<S3_N-1)out.push(`🔓 解鎖新章節：<b>第 ${sk+17} 章「${CHAPTERS[r.ch+1].name}」</b>`);
          else out.push(`🎪 <b>主線 30 章全破！</b>黑暗四天王開放時，你已經具備挑戰資格。`);
        }
      }else if(fat&&(P.fatty||0)<=fk){
        P.fatty=fk+1;bonus+=FATTY_FIRST[fk];
        if(FRUIT_OPEN){const fk2=pick(Object.keys(FRUITS));SAVE.fruits[fk2]++;out.push(`${FRUITS[fk2].icon} 撿到 <b>${FRUITS[fk2].name}</b> ×1（到「隊伍」點角色就能吃）`);}
        out.push(`🏅 首次通關「${C.name}」！額外 🪙${FATTY_FIRST[fk]}`);
        if(fk<4)out.push(`🔓 解鎖新章節：<b>肥宅物語 第 ${fk+2} 章「${CHAPTERS[r.ch+1].name}」</b>`);
        else if(C.finale)out.push(C.finale);
      }else if(!fat&&!s3&&P.cleared<=r.ch){
        P.cleared=r.ch+1;bonus+=FIRST_CLEAR[r.ch];
        if(FRUIT_OPEN){const fk=pick(Object.keys(FRUITS));SAVE.fruits[fk]++;out.push(`${FRUITS[fk].icon} 撿到 <b>${FRUITS[fk].name}</b> ×1（到「隊伍」點角色就能吃）`);}
        out.push(`🏅 首次通關「${C.name}」！額外 🪙${FIRST_CLEAR[r.ch]}`);
        if(r.ch+1<ABYSS)out.push(`🔓 解鎖新章節：<b>第 ${r.ch+2} 章「${CHAPTERS[r.ch+1].name}」</b>`);
        else if(C.finale)out.push(C.finale);
        (C.unlockCards||[]).forEach(id=>{const gr=grant(id);out.push(`💖 <b>${CARDS[id].name}</b> 加入了你的收藏！${gr.isNew?"（NEW!）":""}`);SFX.ssr();});
        if(r.ch===0)out.push(`🔓 解鎖：<b>🕳 無盡深淵</b>（沒有出口，每 5 層一個守門者）`);
      }
    }
    if(r.xpNote)out.push(r.xpNote);
    const al=r.party.find(m=>m.ally&&m.alive);
    if(al){
      const gr=grant(al.id);
      out.push(`🤝 ${al.name} 跟你交換了聯絡方式。<b>獲得職業卡：${CARDS[al.id].name}</b>${gr.isNew?"（NEW!）":`（重複卡 ×${gr.dupe}，可手動升星）`}`);
      SFX.ssr();
    }else SFX.win();
    if(!abyss)SAVE.stats.escapes++;
  }else{out.push(`<b style="color:var(--red)">全隊覆沒。</b>只帶回了一半的金條。`);SFX.lose();}
  const gain=escaped?r.gold+bonus:Math.floor(r.gold/2);
  out.push(`帶回 🪙${gain}（本次遠征共搜得 🪙${r.gold}${bonus?`，${abyss?"深度":"逃出"}獎勵+${bonus}`:""}）`);
  if(abyss){P.abyssBest=Math.max(P.abyssBest,reached);out.push(`<span class="dim">本次到達 D${reached}，最深紀錄 D${P.abyssBest}。</span>`);}
  SAVE.gold+=gain;if(r.ch===0)SAVE.stats.best=Math.max(SAVE.stats.best,reached);save();
  r.scene={loc:escaped?"夜空":"黑暗",title:escaped?(abyss?"🪜 撤離深淵":`${C.vehIcon} 逃出生天`):"✝ 遠征失敗",lines:out,opts:[{label:"回到主頁",cls:"pri",act(){RUN=null;go("home");}},{label:"再來一次",act(){RUN=null;startRun(r.ch,r.diff);}},
    ...(escaped&&!abyss&&END_VOX[r.ch]?[{label:"🔊 重聽結局",act(){playEndVoice(r.ch);}}]:[]),
    ...(escaped&&!abyss&&!fat&&CHAPTERS[r.ch+1]&&r.ch+1<ABYSS?[{label:`➡ 前往第 ${r.ch+2} 章`,act(){RUN=null;startRun(r.ch+1,r.diff);}}]:[]),
    ...(escaped&&s3&&sk<S3_N-1?[{label:`➡ 前往第 ${sk+17} 章`,act(){RUN=null;startRun(r.ch+1,r.diff);}}]:[]),
    ...(escaped&&fat&&fk<4?[{label:`➡ 前往肥宅物語 第 ${fk+2} 章`,act(){RUN=null;startRun(r.ch+1,r.diff);}}]:[]),
    ...(escaped&&fat&&fk===4&&fattyCanEvolve()?[{label:"🆙 肥宅進化",cls:"gold",act(){RUN=null;go("home");confirmEvolve();}}]:[])]};
  if(escaped&&C.endPics)r.scene.pics=C.endPics;
  r.choices=null;if(escaped&&!abyss&&!fat)kingSay("end",r.ch);VIEW="run";render();
  if(escaped&&!abyss)playEndVoice(r.ch,firstClear);
}

/* ---- 遠征介面 ---- */
function useOutItem(i){
  const id=RUN.items[i];SFX.click();
  if(ITEMS[id].out==="rope")return useRope();
  if(ITEMS[id].weapon||ITEMS[id].out==="member"){RUN.sel=RUN.sel===i?null:i;render();return;}
  toast(ITEMS[id].desc);
}
function applyOutItem(mi){
  const m=RUN.party[mi],i=RUN.sel,id=RUN.items[i];if(id==null)return;
  RUN.items.splice(i,1);RUN.sel=null;
  if(ITEMS[id].weapon){if(m.weapon)RUN.items.push(m.weapon);m.weapon=id;toast(`${m.name} 裝備了 ${ITEMS[id].name}`);}
  else if(id==="pill"){m.hp=Math.min(m.maxHp,m.hp+pillHeal());SFX.heal();}
  else if(id==="wine"){const k=ri(1,3);if(k===1){m.hp=Math.min(m.maxHp,m.hp+6);toast("好酒！恢復6");}else if(k===2){m.hp=Math.min(m.maxHp,m.hp+2);toast("微醺，恢復2");}else{m.hp=Math.max(1,m.hp-2);toast("……酒壞了，-2");}}
  render();
}
// 道具顯示：相同的合併成一格（×n），順序照第一次出現；i 是第一個的位置，點擊時用它
function groupItems(ids){
  const m={},out=[];
  ids.forEach((id,i)=>{if(m[id])m[id].n++;else out.push(m[id]={id,n:1,i});});
  return out;
}
// 一鍵補血：從隊伍最前面開始，每人補到滿血為止；先用藥片（穩定），藥片用完才用酒（隨機）
function autoHeal(){
  if(!RUN||!RUN.active)return;
  let pills=0,wines=0;
  RUN.party.forEach(m=>{
    if(!m.alive)return;
    while(m.hp<m.maxHp){
      let i=RUN.items.indexOf("pill");const isPill=i>=0;
      if(!isPill)i=RUN.items.indexOf("wine");
      if(i<0)break;
      const id=RUN.items.splice(i,1)[0];
      if(id==="pill"){m.hp=Math.min(m.maxHp,m.hp+pillHeal());pills++;}
      else{const k=ri(1,3);m.hp=k===1?Math.min(m.maxHp,m.hp+6):k===2?Math.min(m.maxHp,m.hp+2):Math.max(1,m.hp-2);wines++;}
    }
  });
  RUN.sel=null;
  if(!pills&&!wines){toast("沒有需要補血的隊員，或背包裡沒有藥片／酒");return;}
  SFX.heal();toast(`一鍵補血：用了${pills?` 💊×${pills}`:""}${wines?` 🍷×${wines}`:""}`);render();
}
function shareFood(){
  const al=allyMember();if(!al||RUN.food<1)return;
  RUN.food--;al.trust=Math.min(100,al.trust+20);al.hp=Math.min(al.maxHp,al.hp+3);SFX.heal();toast(`${al.name} 接過補給，表情緩和了一點（信任+20）`);render();
}
function abandonRun(){
  openModal(`<h3>放棄遠征？</h3><p class="dim">視同全隊覆沒，只帶回一半金條。</p><div class="row"><button class="pri" onclick="closeModal();endRun(false,['你們選擇放棄，躺回了停屍間的鐵櫃。'])">放棄</button><button onclick="closeModal()">繼續</button></div>`);
}
let RUN_TAB="main";
function setRunTab(k){RUN_TAB=k;SFX.click();render();}
function runTabs(){
  return `<div class="filters" style="margin-top:0"><button class="${RUN_TAB==="main"?"on":""}" onclick="setRunTab('main')">🪜 主線遠征</button>
    ${s3Open()?`<button class="${RUN_TAB==="s3"?"on":""}" onclick="setRunTab('s3')">🎪 第三季</button>`:""}
    <button class="${RUN_TAB==="fatty"?"on":""}" onclick="setRunTab('fatty')">🍔 肥宅物語</button>
    <button class="${RUN_TAB==="dino"?"on":""}" onclick="setRunTab('dino')">🥚 恐龍蛋專區</button></div>`;
}
function fattyChapterCard(i){
  const C=CHAPTERS[i],k=i-FATTY_FIRST_CH,ok=unlocked(i),n=SAVE.prog.clears[i]||0;
  return `<div class="chap ${ok?"":"lockc"}" ${ok&&SAVE.team.length?`onclick="openDiff(${i})"`:""}><div class="ic">${ok?C.icon:"🔒"}</div>
    <div><b>第 ${k+1} 章　${C.name}</b><div class="dim small">${ok?C.sub:k===0?`通關主線第 ${FATTY_REQ} 章後解鎖`:`通關「${CHAPTERS[i-1].name}」後解鎖`}</div>
    <div class="small" style="color:var(--gold)">${n?`已逃出 ${n} 次`:ok?`首通獎勵 🪙${FATTY_FIRST[k]}`:""}</div></div></div>`;
}
// 第三季（主線第 16～30 章，封存中：只有測試帳號看得到）
function s3ChapterCard(i){
  const C=CHAPTERS[i],k=i-S3_FIRST_CH,ok=unlocked(i),n=SAVE.prog.clears[i]||0;
  return `<div class="chap ${ok?"":"lockc"}" ${ok&&SAVE.team.length?`onclick="openDiff(${i})"`:""}><div class="ic">${ok?C.icon:"🔒"}</div>
    <div><b>第 ${k+16} 章　${C.name}</b><div class="dim small">${ok?C.sub:k===0?`通關主線第 ${S3_REQ} 章後解鎖`:`通關「${CHAPTERS[i-1].name}」後解鎖`}</div>
    <div class="small" style="color:var(--gold)">${n?`已逃出 ${n} 次`:ok?`首通獎勵 🪙${S3_FIRST[k]}`:""}</div></div></div>`;
}
function viewS3Story(){
  const done=s3Done(),open=SAVE.prog.cleared>=S3_REQ,arcs=["","簽約篇","馬戲團篇","王城篇"];
  const list=Array.from({length:S3_N},(_,k)=>{const i=S3_FIRST_CH+k,C=CHAPTERS[i];return (k%5===0?`<h3 style="margin-top:14px">${arcs[C.arc]}</h3>`:"")+s3ChapterCard(i);}).join("");
  return `<h2>逃殺遠征</h2>${runTabs()}
  <h3>🎪 第三季（主線第 16～30 章・${done}／${S3_N} 章）</h3>
  <div class="panel small dim">🧪 設計中，目前只有測試帳號看得到。旁白與魔王都還是佔位。通關第 30 章後，開放挑戰黑暗四天王的資格。</div>
  ${open?"":`<div class="panel dim">通關主線第 ${S3_REQ} 章「${CHAPTERS[S3_REQ-1].name}」後開放。</div>`}
  <div class="chapters">${list}</div>
  <h3>出戰隊伍</h3><div class="cardgrid">${SAVE.team.map(id=>cardTile(id,`showCard('${id}')`)).join("")||"<span class='dim'>尚未編隊</span>"}</div>`;
}
function viewFattyStory(){
  const P=SAVE.prog,done=P.fatty||0,open=P.cleared>=FATTY_REQ;
  let evo;
  if(SAVE.owned.fatty2)evo=`<div class="panel small">✅ 你已經有 <b class="rSSR">SSR</b> 肥宅（${SAVE.owned.fatty2.stars}★）。</div>`;
  else if(done>=5)evo=SAVE.owned.fatty?`<div class="panel"><b>🆙 肥宅可以進化了！</b><p class="small dim" style="margin:6px 0">SR 肥宅 → SSR 肥宅，等級、星數、突破、裝備全部保留。</p><button class="pri" onclick="confirmEvolve()">🆙 進化</button></div>`
    :`<div class="panel small dim">你還沒有 SR 肥宅。到招募所抽到他之後，就能在這裡進化成 SSR。</div>`;
  else evo=`<div class="panel small dim">🆙 通關第 5 章後，SR 肥宅可以進化成 SSR。（目前進度 ${done}／5 章）</div>`;
  evo+=`<div class="panel"><b>🔁 SR 肥宅兌換</b>　<span class="small dim">抽到 SR 肥宅 ${fattyCopies()}／${FATTY_EXCHANGE} 張</span>
    <div class="ratebar"><i style="width:${Math.min(100,fattyCopies()/FATTY_EXCHANGE*100)}%"></i></div>
    <p class="small dim" style="margin:6px 0">${fattyExchangeOpen()?`抽到 ${FATTY_EXCHANGE} 張 SR 肥宅就能換 1 張 SSR 肥宅（已經有的話升 1★）。`:`🔒 通關肥宅物語第 5 章後開放。開放後，抽到 ${FATTY_EXCHANGE} 張 SR 肥宅就能換 1 張 SSR 肥宅（已經有的話升 1★）。`}</p>
    <button class="pri" onclick="confirmFattyExchange()" ${fattyCanExchange()?"":"disabled"}>${fattyExchangeOpen()?"🔁 兌換":"🔒 兌換（尚未開放）"}</button></div>`;
  return `<h2>逃殺遠征</h2>${runTabs()}
  <h3>🍔 肥宅物語（支線・${done}／5 章）</h3>
  <p class="dim small" style="margin-top:0">一個把世界當成遊戲的肥宅，一路被看不起，最後成為全隊最可靠的人。<b>肥宅本人會自動加入隊伍</b>（不佔你的出戰名額，出戰隊伍裡的肥宅會暫時休息）。通關第 ${FATTY_REQ} 章後開放。</p>
  ${open?"":`<div class="panel dim">通關主線第 ${FATTY_REQ} 章「${CHAPTERS[FATTY_REQ-1].name}」後開放。</div>`}
  <div class="chapters">${Array.from({length:5},(_,k)=>fattyChapterCard(FATTY_FIRST_CH+k)).join("")}</div>
  ${evo}
  <h3>出戰隊伍</h3><div class="cardgrid">${SAVE.team.map(id=>cardTile(id,`showCard('${id}')`)).join("")||"<span class='dim'>尚未編隊</span>"}</div>
  <p class="dim small">點上面的章節開始。規則和主線遠征一樣（選房間、補給、毒氣），沒有三個座位的限制。</p>`;
}
function scenePics(list){
  return `<div class="spics">${list.map(p=>`<figure style="margin:10px 0"><img src="${p.src}" alt="" style="width:100%;max-width:520px;border-radius:12px;display:block" onerror="this.parentNode.remove()">${p.cap?`<figcaption class="dim small" style="margin-top:4px">${p.cap}</figcaption>`:""}</figure>`).join("")}</div>`;
}
function viewRun(){
  if(!RUN&&SAVE.run)return `<h2>逃殺遠征</h2><div class="panel"><p>你有一場進行中的遠征：<b>${CHAPTERS[SAVE.run.ch].name}</b>・${SAVE.run.floors[SAVE.run.fi].label}</p>
    <div class="row"><button class="pri" onclick="resumeRun()">▶ 繼續遠征</button><button onclick="SAVE.run=null;save();render()">放棄這場遠征</button></div></div>`;
  if(!RUN&&RUN_TAB==="s3"&&s3Open())return viewS3Story();
  if(!RUN&&RUN_TAB==="fatty")return viewFattyStory();
  if(!RUN&&RUN_TAB==="dino")return viewDino();
  if(!RUN)return `<h2>逃殺遠征</h2>${runTabs()}
    <div class="chapters">${CHAPTERS.map((C,i)=>{if(C.fatty||C.s3)return "";const ok=unlocked(i),n=SAVE.prog.clears[i]||0;
      return `<div class="chap ${ok?"":"lockc"}" ${ok&&SAVE.team.length?`onclick="${C.abyss?`startRun(${i})`:`openDiff(${i})`}"`:""}><div class="ic">${ok?C.icon:"🔒"}</div>
        <div><b>${C.abyss?"":`第 ${i+1} 章　`}${C.name}</b><div class="dim small">${ok?C.sub:i===ABYSS?"通關第 1 章後解鎖":`通關「${CHAPTERS[i-1].name}」後解鎖`}</div>
        <div class="small" style="color:var(--gold)">${C.abyss?(SAVE.prog.abyssBest?`最深 D${SAVE.prog.abyssBest}`:""):n?`已逃出 ${n} 次`:ok?`首通獎勵 🪙${FIRST_CLEAR[i]}`:""}</div></div></div>`;}).join("")}</div>
    <div class="panel"><p>每層選一個房間往上爬，打倒最上層的魔王就能逃出。後面的章節敵人更強、獎勵更多。</p>
    <ul class="dim small" style="padding-left:18px;margin:0">
      <li>每上一層消耗 1 份補給，沒有補給全員飢餓 -2。</li>
      <li>毒氣會從底層慢慢往上爬。休息、多搜一次都會耗時——被追上就每步扣血。</li>
      <li>遇到其他逃殺者可以結盟、交易、突襲或避開。盟友能幫你打架，但信任度太低會背叛。</li>
      <li>最上層有魔王，打倒他才能離開。交通工具只有 <b>三個座位</b>。</li>
      <li>逃出：帶回全部金條＋逃出獎勵；全滅：只帶回一半。和盟友一起逃出能獲得他的職業卡。</li>
      <li>遠征會自動存檔，中途關掉網頁，下次打開可以接著玩。</li>
    </ul></div>
    <h3>出戰隊伍</h3><div class="cardgrid">${SAVE.team.map(id=>cardTile(id,`showCard('${id}')`)).join("")||"<span class='dim'>尚未編隊</span>"}</div>
    <p class="dim small">點上面的章節開始遠征。</p>`;
  const r=RUN,g=gasIdx(),ab=r.ch===ABYSS;
  if(ab)ensureFloor(Math.max(0,r.fi-3)+7);
  const idx=ab?Array.from({length:8},(_,k)=>Math.max(0,r.fi-3)+k):FL().map((f,i)=>i);
  const tower=idx.reverse().map(i=>`<div class="fl ${i===r.fi?"cur":""} ${i<r.fi?"done":""} ${i<=g?"gas":""}">
    <span class="lb">${FL()[i].label}</span><span class="rm">${i===r.fi?"🧍 ":""}${r.visited[i]||(isBossFloor(i)?(ab?"💀":CH().vehIcon):"")}</span></div>`).join("");
  let main;
  if(r.choices){
    const rv=canReveal();
    main=`<div class="scene"><div class="loc">${CH().name}・${FL()[r.fi+1].label} 層</div><h2>選擇要進入的房間</h2>
      <div class="dim small">你們爬上樓梯。走廊兩側是幾扇門。</div>
      <div class="choices">${r.choices.map((c,i)=>{const known=c.name||rv;
        return `<div class="door" onclick="chooseRoom(${i})"><div class="di">${known?(c.ev==="shade"?MONSTERS[ab?"ghost":CH().minion].emoji:EV_ICON[c.ev]):"🚪"}</div><div class="dn">${c.id}${c.name?" "+c.name:""}</div>
        <div class="dd">${c.name?"":known?EV_HINT[c.ev]+(rv?"（監控）":""):"未知房間"}</div></div>`;}).join("")}</div>
      ${canRope()?`<div class="opts"><button onclick="useRope()">🪢 用繩索直接攀過這層（不耗時、不觸發事件）</button></div>`:""}</div>`;
  }else{
    const s=r.scene;
    main=`<div class="scene"><div class="loc">${s.loc}</div><h2>${s.title}</h2>
      <div class="txt">${s.lines.filter(Boolean).map((t,i)=>`<p style="animation-delay:${i*.18}s">${t}</p>`).join("")}</div>${s.pics?scenePics(s.pics):""}${s.npc?npcBox(s.npc):""}
      ${npcVoiceLocked()?'<div id="npcHint" class="dim small" style="margin-top:8px">🔊 對話播放中……聽完才能繼續</div>':""}<div class="opts">${s.opts.map((o,i)=>`<button class="${o.cls||""}" ${npcVoiceLocked()?"disabled":""} onclick="sceneOpt(${i})">${o.label}</button>`).join("")}</div></div>`;
  }
  const al=allyMember();
  const party=r.party.map((m,i)=>{const pct=m.hp/m.maxHp*100;
    return `<div class="member ${m.alive?"":"deadm"}"><div class="mav">${avatar(m.id)}</div><div class="mi">
      <b style="color:${m.ally?"var(--gold)":"var(--sideA)"}">${m.ally?"🤝 ":""}${m.name}</b> <span class="stars">${"★".repeat(m.stars)}</span>
      <div class="hpbar ${pct>50?"hi":""}"><i style="width:${pct}%"></i><span>${m.hp}/${m.maxHp}</span></div>
      <div class="dim">⚔${cardStats(m.id,m.stars,m.scale,m.br||0).atk+memberAtk(m)} ${m.weapon?ITEMS[m.weapon].icon:""} ${m.bonus.def?"🛡+"+m.bonus.def:""}</div>
      ${m.ally?`<div class="trust"><i style="width:${clamp(m.trust,0,100)}%;background:${m.trust<40?"var(--red)":"var(--gold)"}"></i></div><div class="dim">信任 ${m.trust}</div>`:""}
    </div>${r.sel!=null&&m.alive&&r.active?`<button class="mini gold" onclick="applyOutItem(${i})">使用</button>`:""}</div>`;}).join("");
  const side=`<div class="panel">
    ${ab?"":`<div class="small" style="margin-bottom:4px">${DIFFS[r.diff||1].icon} 難度：<b>${diffName(r.diff)}</b></div>`}
    <div class="res"><span>🥫 ${r.food}</span><span style="color:var(--gold)">🪙 ${r.gold}</span><span class="dim">⏱ ${r.time}</span></div>
    <div class="gasbar">☣ 毒氣：${g<0?"尚未出現":"已淹到 "+FL()[clamp(g,0,FL().length-1)].label}</div>
    <h3>隊伍</h3>${party}
    ${al&&r.food>0&&r.active?`<button class="mini" onclick="shareFood()">🥫 分補給給盟友（信任+20）</button>`:""}
    <h3>背包</h3>${r.active&&r.items.some(i=>i==="pill"||i==="wine")&&r.party.some(m=>m.alive&&m.hp<m.maxHp)?`<button class="mini gold" onclick="autoHeal()">💊 一鍵補血（前面優先）</button>`:""}<div class="items">${groupItems(r.items).map(g=>`<span class="item ${r.sel!=null&&r.items[r.sel]===g.id?"sel":""}" title="${ITEMS[g.id].desc}" onclick="useOutItem(${g.i})">${ITEMS[g.id].icon}${ITEMS[g.id].name}${g.n>1?`×${g.n}`:""}</span>`).join("")||"<span class='dim small'>空</span>"}</div>
    ${r.sel!=null?`<div class="small" style="color:var(--gold);margin-top:6px">選擇要使用／裝備的隊員 →</div>`:""}
    ${r.active?`<div class="row" style="margin-top:14px"><button class="mini" onclick="abandonRun()">放棄遠征</button><button class="mini" onclick="openStuck()">🐞 卡住了／回報問題</button></div>`:""}
  </div>`;
  return `<div class="runwrap"><div class="tower">${tower}</div><div>${main}</div><div>${side}</div></div>`;
}
// 手機連點：同一個按鈕 0.35 秒內只算一次，避免第二下按到下一個畫面的選項
let TAP_T=0;
function tapOk(){const n=Date.now();if(n-TAP_T<350)return false;TAP_T=n;return true;}
function sceneOpt(i){
  if(npcVoiceLocked()){toast("對話還沒說完，請先聽完");return;}
  if(!tapOk())return;
  const o=RUN&&RUN.scene&&RUN.scene.opts[i];if(!o){glog("❌SCENE","選項不存在："+i);return openStuck();}
  SFX.click();glog("👉CHOICE",`${RUN.scene.title}：${String(o.label).replace(/<[^>]+>/g,"")}`);
  try{o.act();}catch(e){glog("❌SCENE",`${RUN.scene&&RUN.scene.title}：${e&&e.stack||e}`);toast("發生錯誤，已記錄。可以按「🐞 卡住了」重置這一層");}
}

