"use strict";
/* ===================== SOUND ===================== */
let AC=null;
function tone(f,d=.1,type="square",vol=.05,slide=0,delay=0){
  if(SAVE.muted) return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const t0=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t0);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t0+d);
    g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
    o.connect(g).connect(AC.destination);o.start(t0);o.stop(t0+d+.02);
  }catch(e){}
}
const SFX={
  click:()=>tone(660,.05,"square",.025),
  hit:()=>tone(150,.14,"sawtooth",.06,-90),
  crit:()=>{tone(240,.18,"sawtooth",.07,-170);tone(900,.08,"square",.03)},
  heal:()=>tone(520,.2,"sine",.05,320),
  miss:()=>tone(900,.07,"triangle",.03,-500),
  death:()=>tone(110,.5,"sawtooth",.07,-70),
  flip:()=>tone(320,.06,"triangle",.03,220),
  sr:()=>[523,784].forEach((f,i)=>tone(f,.2,"triangle",.05,0,i*.08)),
  ssr:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.3,"triangle",.06,0,i*.08)),
  win:()=>[392,523,659,784].forEach((f,i)=>tone(f,.25,"square",.04,0,i*.11)),
  lose:()=>[330,262,196].forEach((f,i)=>tone(f,.35,"sawtooth",.04,0,i*.18)),
  gas:()=>tone(80,.6,"sawtooth",.04,40)
};
function toggleMute(){SAVE.muted=!SAVE.muted;save();renderHeader();}
function toggleBtn3d(){const on=document.body.classList.toggle("btn3d");try{localStorage.setItem("jbts_btn3d",on?"1":"0");}catch(e){}} // 立體按鈕：記在這台裝置（不進存檔），預設關
try{if(localStorage.getItem("jbts_btn3d")==="1")document.body.classList.add("btn3d");}catch(e){}
function toggleBtnGlass(){const on=document.body.classList.toggle("btnglass");try{localStorage.setItem("jbts_btnglass",on?"1":"0");}catch(e){}} // 半透明按鈕：記在這台裝置（不進存檔），預設關；可和立體按鈕同時開
try{if(localStorage.getItem("jbts_btnglass")==="1")document.body.classList.add("btnglass");}catch(e){}
function toggleBfx(){const off=document.body.classList.toggle("nobfx");try{localStorage.setItem("jbts_nobfx",off?"1":"");}catch(e){}} // 戰鬥特效（攻擊、技能、畫面震動）：記在這台裝置，預設開；純視覺，不影響戰鬥結果
try{if(localStorage.getItem("jbts_nobfx"))document.body.classList.add("nobfx");}catch(e){}
function toggleOrd(){const off=document.body.classList.toggle("noord");try{localStorage.setItem("jbts_noord",off?"1":"");}catch(e){}try{render();}catch(e){}} // 戰鬥畫面上方的「行動順序」列：記在這台裝置，預設開；純顯示
try{if(localStorage.getItem("jbts_noord"))document.body.classList.add("noord");}catch(e){}
function toggleSx(){const off=document.body.classList.toggle("nosx");try{localStorage.setItem("jbts_nosx",off?"1":"");}catch(e){}try{render();}catch(e){}} // 戰鬥結束時的「結算統計與 MVP」：記在這台裝置，預設開；純顯示
try{if(localStorage.getItem("jbts_nosx"))document.body.classList.add("nosx");}catch(e){}
function toggleCd(){SAVE.showCd=SAVE.showCd===false;save();render();} // 技能冷卻數字的顯示開關（預設開）
// 右上角 ⚙ 的設定視窗：背景音樂、音效、技能冷卻數字、戰鬥特效、行動順序列、結算統計等開關，加上玩法導引；切換後視窗重開，狀態馬上更新
function openSettings(){
  const row=(ic,name,on,fn)=>`<div class="row" style="align-items:center;margin:8px 0"><span style="flex:1">${ic} ${name}</span><button class="mini ${on?"ok":""}" style="min-width:64px" onclick="${fn};openSettings()">${on?"開":"關"}</button></div>`;
  openModal(`<h3>⚙ 設定</h3>
    ${row("🎵","背景音樂",SAVE.bgm!==false,"toggleBgm()")}
    ${row("🔊","音效",!SAVE.muted,"toggleMute()")}
    ${row("✦","技能冷卻數字（戰鬥中角色左上角）",SAVE.showCd!==false,"toggleCd()")}
    ${row("💥","戰鬥特效（攻擊、技能、畫面震動；只記在這台裝置）",!document.body.classList.contains("nobfx"),"toggleBfx()")}
    ${row("🔢","行動順序列（戰鬥畫面上方；只記在這台裝置）",!document.body.classList.contains("noord"),"toggleOrd()")}
    ${row("📊","結算統計與 MVP（戰鬥結束時；只記在這台裝置）",!document.body.classList.contains("nosx"),"toggleSx()")}
    ${row("🔘","立體按鈕（只記在這台裝置）",document.body.classList.contains("btn3d"),"toggleBtn3d()")}
    ${row("🫧","半透明按鈕（只記在這台裝置）",document.body.classList.contains("btnglass"),"toggleBtnGlass()")}
    <div class="row" style="align-items:center;margin:8px 0"><span style="flex:1">❓ 玩法導引</span><button class="mini" onclick="closeModal();openGuide(0)">開啟</button></div>
    <div class="row" style="margin-top:12px"><button onclick="closeModal()" style="margin-left:auto">關閉</button></div>`);
}

/* ===================== BGM ===================== */
// 依場景換曲：選單 main、遠征探索 run、無盡深淵 abyss（music/ 裡的 CC0 曲子）；
// 戰鬥中與逃出成功的畫面 battle 改播 YouTube 嵌入播放器（不下載音檔）。
// 瀏覽器規定要使用者點過頁面才能出聲，所以第一次點擊時才開始播
const BGM_ID="2uGf8-vfFLI";
const BGM_KEYS=["main","town","shop","ach","train","run","abyss","story","arena","duel","dino","boss_hard1","boss_hard2","boss_heavy1","boss_heavy2"];
// 支線八大魔王各自的戰鬥配樂（OpenGameArt MintoDog，CC0）；越後面的魔王越重
const BOSS_BGM={doomhunter:"boss_hard1",voidlord:"boss_heavy2",fatejudge:"boss_hard2",reaper:"boss_heavy2",abyssking:"boss_hard1",nightemperor:"boss_heavy2",overlord:"boss_heavy1",endwalker:"boss_heavy1"};
let BGM=null,BGM_READY=false,BGM_STARTED=false,BGM_CUR=null;
function loadBgm(){
  BGM_KEYS.forEach(k=>{const a=$("#bgm_"+k);if(a)a.volume=.4;});
  window.onYouTubeIframeAPIReady=()=>{
    BGM=new YT.Player("bgmPlayer",{videoId:BGM_ID,
      playerVars:{loop:1,playlist:BGM_ID,controls:1,playsinline:1,rel:0,modestbranding:1},
      events:{onReady(){BGM_READY=true;BGM.setVolume(35);BGM_CUR=null;syncBgm();}}});
  };
  const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";document.head.appendChild(s);
}
function bgmWant(){
  if(!BGM_STARTED||SAVE.bgm===false)return null;
  if(VIEW==="battle"){
    if(CUR_B&&CUR_B.cfg&&CUR_B.cfg.bgm)return CUR_B.cfg.bgm; // 支線魔王專屬配樂
    // 競技場、雙人對決（含網路對戰）的戰鬥用各自的專屬曲，其他戰鬥用 YouTube 那首
    if(CUR_B&&(CUR_B.online||CUR_B.guest||BATTLE_HOME==="duel"))return "duel";
    if(BATTLE_HOME==="arena")return "arena";
    if(BATTLE_HOME==="train")return "train"; // 練功房的戰鬥也用練功房專屬曲
    return "battle";
  }
  if(VIEW==="run"&&RUN&&!RUN.active&&RUN.escaped)return "battle";
  if(VIEW==="shop")return "shop"; // 商店：輕鬆的爵士
  if(VIEW==="ach")return "ach"; // 成就：凱旋的號角與弦樂
  if(VIEW==="train")return "train"; // 練功房：熱血的重金屬搖滾
  if(VIEW==="arena")return "arena";
  if(VIEW==="boss")return "boss_heavy1"; // 魔王討伐頁：用魔王戰的配樂
  if(VIEW==="duel")return "duel";
  if(VIEW==="run"&&RUN&&RUN.active)return RUN.ch===ABYSS?"abyss":"run";
  if(VIEW==="story")return "story"; // 老國王的故事頁：莊嚴的合唱曲
  if(VIEW==="gacha"||VIEW==="team"||VIEW==="dex"||VIEW==="gear"||VIEW==="log"||VIEW==="qa"||VIEW==="tips"||VIEW==="plan")return "town"; // 招募、隊伍、裝備、更新說明、Q&A：輕鬆的中世紀風
  return "main";
}
function syncBgm(){
  const w=bgmWant();if(w===BGM_CUR)return;BGM_CUR=w;
  BGM_KEYS.forEach(k=>{const a=$("#bgm_"+k);if(!a||!a.play)return;
    if(w===k){a.currentTime=0;a.play().catch(()=>{});}else a.pause();});
  if(BGM_READY){if(w==="battle"){BGM.seekTo(0,true);BGM.playVideo();}else BGM.pauseVideo();}
}
function startBgm(){if(BGM_STARTED)return;BGM_STARTED=true;syncBgm();}
function toggleBgm(){
  SAVE.bgm=SAVE.bgm===false;save();BGM_STARTED=true;syncBgm();
  renderHeader();toast(SAVE.bgm?"🎵 背景音樂：開":"🎵 背景音樂：關");
}

