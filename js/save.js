"use strict";
/* ===================== SAVE ===================== */
const SAVE_KEY="jbts_textgame_v1";
// 遊戲版本（存檔格式有新增內容、舊頁面可能誤判時加 1）。存檔會記錄是哪個版本寫的；
// 舊頁面讀到比自己新的存檔時，不做作弊檢查、不清空、也不寫回，只提示玩家重新整理頁面
const APP_V=8;
let STALE=false;
const isNewerSave=s=>!!s&&(s.appv||0)>APP_V;
function staleNotice(){
  openModal(`<h3>🔄 遊戲有新版本</h3><p>這份存檔是用比較新的版本存的，目前這個頁面太舊了。<br>請<b>重新整理頁面</b>（手機可以關掉分頁重開，電腦按 Ctrl+F5）。</p>
    <p class="dim small">在更新之前，存檔不會被修改，也不會上傳，可以放心。</p>
    <div class="row"><button class="pri" onclick="location.reload()">重新整理</button></div>`);
}
function newSave(){
  const s={v:1,gold:150,pity:0,pulls:0,owned:{},team:[],arenaTier:1,firstTen:true,muted:false,
    stats:{runs:0,escapes:0,best:0,arenaWins:0},prog:{cleared:0,clears:{},abyssBest:0},run:null};
  const starters=shuffle(POOL.R).slice(0,3);
  starters.forEach(id=>s.owned[id]={stars:1});
  s.team=starters.slice();
  return migrate(s);
}
/* ---- 防作弊：存檔簽章 + 數值檢查 ----
   存檔寫入時附上簽章（h）。讀檔時簽章對不上＝存檔在遊戲外被改過；數值超出遊戲規則（星數>5、等級>50、
   裝備強化>10、詞條超出範圍……）＝被改過。兩種情況都會清空存檔重新開始。
   注意：純網頁遊戲沒辦法 100% 防止作弊，這裡擋的是「直接改存檔／改匯出代碼」和「改出不可能的數值」。 */
const SIG_SALT="jbts::禁閉逃殺::v1::"+"7f3a9c";
function sigOf(str){
  let h1=0xdeadbeef^str.length,h2=0x41c6ce57^str.length;const t=SIG_SALT+str;
  for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (h2>>>0).toString(36)+(h1>>>0).toString(36);
}
function packSave(s){const d=JSON.stringify(s);return {d,h:sigOf(d)};}
// 讀出來的原始資料 → {s:存檔, bad:原因}；舊格式（還沒有簽章）照常讀取，下次存檔時補上簽章
function unpackSave(raw){
  if(raw&&typeof raw.d==="string"&&raw.h){
    if(sigOf(raw.d)!==raw.h)return {s:null,bad:"存檔簽章不符（存檔在遊戲外被修改過）"};
    return {s:JSON.parse(raw.d),bad:""};
  }
  return {s:raw,bad:""};
}
let TAMPER="";
function loadSave(){
  try{
    const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(raw){const {s,bad}=unpackSave(raw);if(bad){TAMPER=bad;return newSave();}if(isNewerSave(s)){STALE=true;return s;}if(s&&s.v===1)return migrate(s);}
  }catch(e){}
  return newSave();
}
const isInt=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
// 出戰人數：平常最多 3 人；主線 15 章（簡單難度即可）＋肥宅物語通關＋無盡深淵到達 D150，三個都達成後一次解鎖到 5 人
const TEAM_BASE=3,TEAM_BIG=5,FIVE_ABYSS=150;
const fiveOk=p=>!!p&&(p.cleared||0)>=ABYSS&&(p.fatty||0)>=5&&(p.abyssBest||0)>=FIVE_ABYSS;
const teamMax=()=>fiveOk(SAVE.prog)?TEAM_BIG:TEAM_BASE;
const extraFoes=()=>Math.max(0,SAVE.team.length-TEAM_BASE); // 隊伍比 3 人多幾人，敵人就跟著多幾隻
/* ---- 存入角色系統（架構，目前尚未開放：STORE_OPEN=false）----
   存入第 N 格的角色，會把 STORE_BONUS 裡替他設定的能力，加給「出戰第 N 位」的角色。
   存入位數量跟出戰位一樣（3 人隊 3 格、解鎖五人隊後 5 格）。存入的角色不能同時出戰，也不能遣散、合成、熔煉。
   團隊賽 2v2 不套用存入加成。沒設定的角色加成是 0。 */
const STORE_OPEN=false;
const STORE_BONUS={
  // 角色代號:{hp:生命, atk:攻擊, def:防禦, spd:速度, crit:暴擊%, steal:吸血%, dodge:閃避%, dr:減傷%}，只填要給的項目
  // 範例：ashen:{atk:2,hp:5},
};
const storeMax=()=>teamMax();
const isStored=id=>!!SAVE.stored&&SAVE.stored.includes(id);
// 出戰角色（依它在隊伍的位置）從對應存入格拿到的加成
function storeBonusOf(id){
  if(!STORE_OPEN)return {};
  const i=SAVE.team.indexOf(id);if(i<0||i>=storeMax())return {};
  const sid=SAVE.stored[i];return (sid&&STORE_BONUS[sid])||{};
}
// 檢查存檔裡有沒有遊戲規則不可能出現的數值，有的話回傳原因
function validSave(s){
  if(!isInt(s.gold,0,5000000))return "金條數量異常";
  for(const id in s.owned){
    const o=s.owned[id];
    if(!CARDS[id])return "出現不存在的角色";
    if(!isInt(o.stars,1,5))return `${CARDS[id].name} 星數異常`;
    if(o.dup!=null&&!isInt(o.dup,0,99999))return `${CARDS[id].name} 重複卡數量異常`;
    if(o.lv!=null&&!isInt(o.lv,1,LV_MAX))return `${CARDS[id].name} 等級異常`;
    if(o.br!=null&&!isInt(o.br,0,BR_MAX))return `${CARDS[id].name} 突破次數異常`;
    if(o.fruit!=null&&!["atk","def","spd"].every(k=>isInt((o.fruit||{})[k]||0,0,FRUIT_MAX)))return `${CARDS[id].name} 能力果實異常`;
    if(o.gfruit!=null&&!["atk","def","spd"].every(k=>isInt((o.gfruit||{})[k]||0,0,GFRUIT_MAX)))return `${CARDS[id].name} 金色果實異常`;
    if(o.exp!=null&&!isInt(o.exp,0,lvNeed(o.lv||1)))return `${CARDS[id].name} 經驗值異常`;
  }
  if(!Array.isArray(s.team)||s.team.length>(fiveOk(s.prog)?TEAM_BIG:TEAM_BASE)||s.team.some(id=>!s.owned[id]))return "隊伍資料異常";
  if(s.stored!=null){
    const st=s.stored;if(!Array.isArray(st)||st.length>TEAM_BIG)return "存入角色資料異常";
    const got=st.filter(Boolean);
    if(got.some(id=>!s.owned[id])||new Set(got).size!==got.length||got.some(id=>s.team.includes(id)))return "存入角色資料異常";
    if(st.slice(fiveOk(s.prog)?TEAM_BIG:TEAM_BASE).some(Boolean))return "存入角色資料異常";
  }
  const uids=new Set();
  for(const g of s.gear||[]){
    const G=GEAR[g.base];if(!G)return "出現不存在的裝備";
    if(uids.has(g.uid))return "裝備資料重複";uids.add(g.uid);
    if(!isInt(g.lv,0,GEAR_LV_SANE))return `${G.name} 強化等級異常`;
    if(g.roll!=null&&!isInt(g.roll,GEAR_ROLL[G.q][0],GEAR_ROLL[G.q][1]))return `${G.name} 品質異常`;
    const fx=g.fx||[];if(fx.length>GEAR_FX_SANE||new Set(fx.map(f=>f.k)).size!==fx.length)return `${G.name} 詞條異常`;
    for(const f of fx){const A=AFFIX[f.k];if(!A||!isInt(f.v,1,Math.ceil(affixSpan(f.k,G.q)[1]*1.5)+2))return `${G.name} 詞條數值異常`;}
  }
  for(const k in s.charms)if(!isInt(s.charms[k],0,99999))return "強化道具數量異常";
  if(s.fruits)for(const k in s.fruits)if(!isInt(s.fruits[k],0,99999))return "能力果實數量異常";
  if(s.gfruits)for(const k in s.gfruits)if(!isInt(s.gfruits[k],0,99999))return "金色果實數量異常";
  if(s.shards)for(const k in s.shards)if(!isInt(s.shards[k],0,99999))return "碎片數量異常";
  if(!isInt(s.arenaTier,1,100000))return "競技場層數異常";
  if(s.train&&!isInt(s.train.best,0,TRAIN_MAX))return "練功房進度異常";
  if(!isInt(s.prog.cleared,0,ABYSS))return "主線進度異常";
  if(s.prog.fatty!=null&&!isInt(s.prog.fatty,0,5))return "肥宅物語進度異常";
  if(s.fattyCopies!=null&&!isInt(s.fattyCopies,0,99999))return "肥宅卡片數量異常";
  if(s.junk)for(const k in s.junk)if(!isInt(s.junk[k],0,99999))return "白卡數量異常";
  if(s.run&&!(isInt(s.run.gold,0,5000000)&&isInt(s.run.food,0,9999)))return "遠征資料異常";
  return "";
}
// 發現作弊：清空存檔重新開始
function wipeTampered(why){backupSave(packSave(SAVE),why);SAVE=newSave();RUN=null;CUR_B=null;VIEW="home";save();render();tamperNotice(why);}
function tamperNotice(why){
  openModal(`<h3>⚠ 偵測到存檔被修改</h3><p>原因：<b>${why}</b></p><p class="dim">為了公平，這份存檔已經<b style="color:var(--red)">清空</b>，請重新開始。</p>
    <p class="dim small">如果你沒有改過存檔，可能是遊戲誤判。清空前的存檔已經自動備份，可以按下面的按鈕還原（還原時會再檢查一次，通過才會載入）。</p>
    <div class="row"><button class="pri" onclick="closeModal()">知道了</button><button class="gold" onclick="openRestore()">♻ 還原備份</button></div>`);
}
/* ----- 清空前的備份：本機保留最近 3 份；有登入帳號的話，雲端另存一份在 users/{uid}/backup ----- */
const BK_KEY="jbts_backup";
let PENDING_CLOUD_BK=null;
function readBackups(){try{const l=JSON.parse(localStorage.getItem(BK_KEY));return Array.isArray(l)?l:[];}catch(e){return [];}}
function backupSave(pack,why){
  if(!pack)return;
  try{localStorage.setItem(BK_KEY,JSON.stringify([{t:Date.now(),why,pack},...readBackups()].slice(0,3)));}catch(e){}
  if(typeof ACCT!=="undefined"&&ACCT)cloudBackup(pack,why);else PENDING_CLOUD_BK={pack,why};
}
async function cloudBackup(pack,why){try{await (await fbDb()).ref("users/"+ACCT.uid+"/backup").set({t:Date.now(),why,pack});}catch(e){}}
function bkSummary(pack){try{const {s}=unpackSave(pack);return s?saveSummary(s):"（無法讀取）";}catch(e){return "（無法讀取）";}}
function openRestore(){
  const l=readBackups();
  openModal(`<h3>♻ 還原備份</h3><p class="dim small">清空前自動備份的存檔，最多 3 份。還原會覆蓋目前這台裝置的存檔，而且會重新做一次數值檢查。</p>
    ${l.length?l.map((b,i)=>`<div class="sk"><b>${new Date(b.t).toLocaleString()}</b> <span class="dim small">（原因：${b.why}）</span><br>${bkSummary(b.pack)}
      <div class="row" style="margin-top:6px"><button class="mini pri" onclick="restoreBackup(${i})">還原這份</button><button class="mini" onclick="exportBackup(${i})">匯出代碼</button></div></div>`).join(""):'<p class="dim">這台裝置沒有備份。</p>'}
    <div class="row">${typeof ACCT!=="undefined"&&ACCT?'<button class="gold" onclick="restoreCloudBackup()">☁ 讀取雲端備份</button>':""}<button onclick="closeModal()">關閉</button></div>`);
}
function restorePack(pack){
  try{
    const {s,bad}=unpackSave(pack);
    if(bad||!s||s.v!==1){toast("這份備份無法使用（"+(bad||"格式不對")+"）");return;}
    if(isNewerSave(s)){toast("這份備份來自較新的版本，請先重新整理頁面更新遊戲");return;}
    const m=migrate(s),why=validSave(m);
    if(why){toast("這份備份仍然被判定異常（"+why+"），請等遊戲更新後再試");return;}
    SAVE=m;SAVE.run=null;RUN=null;CUR_B=null;save();closeModal();toast("✅ 已還原備份");go("home");
  }catch(e){toast("還原失敗");}
}
function restoreBackup(i){const b=readBackups()[i];if(b)restorePack(b.pack);}
async function restoreCloudBackup(){
  try{const snap=await (await fbDb()).ref("users/"+ACCT.uid+"/backup").get();
    if(!snap.exists()){toast("雲端沒有備份");return;}restorePack(snap.val().pack);}catch(e){toast("讀取雲端備份失敗");}
}
function exportBackup(i){
  const b=readBackups()[i];if(!b)return;
  const code=btoa(unescape(encodeURIComponent(JSON.stringify(b.pack))));
  openModal(`<h3>匯出備份代碼</h3><p class="dim small">複製這段代碼，可以用「匯入存檔」貼回來，也可以交給開發者檢查。</p>
    <textarea id="saveCode" readonly style="width:100%;height:120px;font-size:11px">${code}</textarea>
    <div class="row"><button class="pri" onclick="copySave()">📋 複製</button><button onclick="openRestore()">返回</button></div>`);
}
function checkIntegrity(){if(!SAVE||STALE)return true;const why=validSave(SAVE);if(why){wipeTampered(why);return false;}return true;}
// 舊存檔補欄位：已逃出過禁閉室就算通關第1章
function migrate(s){
  if(!Array.isArray(s.stored))s.stored=[null,null,null,null,null]; // 存入角色（第 N 格加成給出戰第 N 位）
  if(!s.skin)s.skin={own:{},worn:{},claimed:{},seen:0}; // 造型（試用）：own 擁有、worn 各角色穿著、claimed 已領過的活動
  if(!s.junk)s.junk={}; // N 白卡數量 {代號:張數}
  if(s.prog&&s.prog.fatty==null)s.prog.fatty=0; // 《肥宅物語》進度（0～5）
  if(s.fattyCopies==null)s.fattyCopies=s.owned&&s.owned.fatty?s.owned.fatty.stars:0; // 抽到的 SR 肥宅張數（舊存檔用現有星數估）
  if(!s.prog)s.prog={cleared:s.stats&&s.stats.escapes>0?1:0,clears:{},abyssBest:0};
  if(s.run===undefined)s.run=null;
  // 第5、6章插在無盡深淵前面：舊存檔的深淵遠征 ch 從 4 改成 6
  if(!s.chv){if(s.run&&s.run.ch===4)s.run.ch=6;s.chv=2;}
  // 第7、8章插在無盡深淵前面：深淵 ch 從 6 改成 8
  if(s.chv<3){if(s.run&&s.run.ch===6)s.run.ch=8;s.chv=3;}
  // 第9、10章插在無盡深淵前面：深淵 ch 從 8 改成 10
  if(s.chv<4){if(s.run&&s.run.ch===8)s.run.ch=10;s.chv=4;}
  // 第11、12章插在無盡深淵前面：深淵 ch 從 10 改成 12
  if(s.chv<5){if(s.run&&s.run.ch===10)s.run.ch=12;s.chv=5;}
  // 第13章《名冊》插在無盡深淵前面：深淵 ch 從 12 改成 13
  if(s.chv<6){if(s.run&&s.run.ch===12)s.run.ch=13;if(s.runCk&&s.runCk.ch===12)s.runCk.ch=13;s.chv=6;}
  // 第14、15章《名冊》插在無盡深淵前面：深淵 ch 從 13 改成 15
  if(s.chv<7){if(s.run&&s.run.ch===13)s.run.ch=15;if(s.runCk&&s.runCk.ch===13)s.runCk.ch=15;s.chv=7;}
  if(!s.gear){s.gear=[];s.gearUid=0;}
  // 詞條上限調降（例如吸血 -3）：舊裝備超過「新上限 +1（稀有詞條）」的數值壓回新上限，避免存檔檢查誤判
  for(const g of s.gear){const G=GEAR[g.base];if(!G||!Array.isArray(g.fx))continue;
    g.fx.forEach(f=>{if(!AFFIX[f.k]||!Number.isInteger(f.v))return;const hi=affixSpan(f.k,G.q)[1];if(f.v>hi+1)f.v=hi;});}
  if(!s.stash)s.stash={items:[],food:0};
  if(!s.charms)s.charms={protect:0,luck:0};
  if(!s.fruits)s.fruits={atk:0,def:0,spd:0};
  if(!s.gfruits)s.gfruits={atk:0,def:0,spd:0};
  if(!s.train)s.train={best:0};
  if(!s.bosses)s.bosses={};
  if(!s.coop)s.coop={d:"",n:0};
  if(!s.dino)s.dino={d:"",n:0};
  if(!s.t2)s.t2={d:"",n:0};
  if(!s.ach)s.ach={};
  if(!s.lore)s.lore={};
  s.team=(s.team||[]).filter(id=>s.owned[id]);
  if(s.charms.stone==null)s.charms.stone=0;
  if(!s.shards)s.shards={R:0,SR:0,SSR:0};
  if(!s.login)s.login={last:"",streak:0};
  return s;
}
function exportSave(){
  const code=btoa(unescape(encodeURIComponent(JSON.stringify(packSave({...SAVE,run:null})))));
  openModal(`<h3>匯出存檔</h3><p class="dim small">複製這段代碼，在別的裝置或瀏覽器按「匯入存檔」貼上，就能接著玩。（進行中的遠征不會帶過去）</p>
    <textarea id="saveCode" readonly style="width:100%;height:120px;font-size:11px">${code}</textarea>
    <div class="row"><button class="pri" onclick="copySave()">📋 複製</button><button onclick="closeModal()">關閉</button></div>`);
}
function copySave(){
  const t=$("#saveCode");t.select();
  try{navigator.clipboard.writeText(t.value).then(()=>toast("已複製存檔代碼"),()=>{document.execCommand("copy");toast("已複製存檔代碼");});}
  catch(e){document.execCommand("copy");toast("已複製存檔代碼");}
}
function importSave(){
  openModal(`<h3>匯入存檔</h3><p class="dim small">貼上匯出的代碼。<b style="color:var(--red)">目前這台裝置的存檔會被覆蓋。</b></p>
    <textarea id="saveCode" style="width:100%;height:120px;font-size:11px"></textarea>
    <div class="row"><button class="pri" onclick="doImport()">匯入</button><button onclick="closeModal()">取消</button></div>`);
}
function doImport(){
  try{
    const {s,bad}=unpackSave(JSON.parse(decodeURIComponent(escape(atob($("#saveCode").value.trim())))));
    if(bad){toast("這段存檔代碼被修改過，無法匯入");return;}
    if(isNewerSave(s)){toast("這段存檔代碼來自較新的版本，請先重新整理頁面更新遊戲");return;}
    if(!s||s.v!==1||!s.owned||!s.stats)throw 0;
    const why=validSave(migrate(s));if(why){toast("存檔代碼數值異常（"+why+"），無法匯入");return;}
    SAVE=migrate(s);SAVE.run=null;RUN=null;save();closeModal();toast("匯入成功！");go("home");
  }catch(e){toast("代碼格式不對，請確認有完整複製");}
}
function save(keepTime){
  if(STALE)return;
  SAVE.appv=APP_V;
  if(SAVE_READY&&!checkIntegrity())return;
  if(SAVE_READY)checkAch();
  if(SAVE_READY&&fiveOk(SAVE.prog)&&!SAVE.fiveSeen){SAVE.fiveSeen=1;glog("👥FIVE","解鎖 5 人出戰");setTimeout(()=>toast("🎉 出戰人數解鎖！現在最多可以 5 人出戰"),0);}
  if(!keepTime||!SAVE.updatedAt)SAVE.updatedAt=Date.now(); // 開機那次不更新時間，否則舊存檔會被當成「比雲端新」而蓋掉雲端
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(packSave(SAVE)));}catch(e){}
  if(SAVE_READY&&!keepTime)scheduleUpload();
}
let SAVE_READY=false;
let SAVE=loadSave();

