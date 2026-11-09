#!/usr/bin/env node
/* 存檔相容檢查：在發佈前確認「改版會不會讓玩家的存檔被判成異常而清空」。
   做法：用兩個版本各自的程式碼，各自產生一份「把能拿到的東西都拿到、數值拉到上限」的合法存檔，再交叉檢查：
     ① 舊版存檔 → 新版檢查：玩家升級後，原本合法的存檔會不會被新版判異常（調降上限、改名、刪除角色／裝備、提高解鎖條件都會觸發）
     ② 新版存檔 → 舊版檢查：還沒重新整理的舊頁面讀到新存檔，會不會被判異常；
        舊頁面有「APP_V」保護：新版的 APP_V 比舊版大，舊頁面就只會提示重新整理、不會清空，所以這種情況只會標示「有保護」。
   用法：
        node tools/check-save.js [舊版] [新版]
        舊版、新版可以寫 git 的版本（commit、分支、標籤，例如 origin/main、HEAD~1、stash@{0}）或資料夾路徑；
        舊版預設 origin/main（目前線上的版本），新版預設是這個專案資料夾（含尚未 commit 的修改）。
   例：node tools/check-save.js            檢查「現在這份工作內容」對線上版本有沒有存檔風險
       node tools/check-save.js HEAD~3 HEAD
   結果有 ✗ 時結束代碼為 1。只讀程式碼，不會動遊戲、存檔或雲端。 */
const fs=require("fs"),vm=require("vm"),path=require("path"),cp=require("child_process"),os=require("os");
const PROJECT=path.resolve(__dirname,"..");
const [,,OLD_ARG="origin/main",NEW_ARG]=process.argv;
if(["-h","--help","help"].includes(OLD_ARG)){console.log(fs.readFileSync(__filename,"utf8").split("*/")[0].replace("#!/usr/bin/env node\n/*",""));process.exit(0);}
const tmp=[];
function resolveRoot(arg){
  if(!arg)return PROJECT;
  if(fs.existsSync(arg)&&fs.statSync(arg).isDirectory())return path.resolve(arg);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"chk-"));fs.rmSync(dir,{recursive:true,force:true});
  try{cp.execSync(`git worktree add -q --detach "${dir}" "${arg}"`,{cwd:PROJECT,stdio:"pipe"});}
  catch(e){console.error("找不到版本："+arg);process.exit(2);}
  tmp.push(dir);return dir;
}
process.on("exit",()=>{for(const d of tmp){try{cp.execSync(`git worktree remove --force "${d}"`,{cwd:PROJECT,stdio:"pipe"});}catch(e){}}try{cp.execSync("git worktree prune",{cwd:PROJECT,stdio:"pipe"});}catch(e){}});

const mkEl=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>"":k==="length"?0:k==="classList"?{add(){},remove(){},contains(){return false},toggle(){return false}}:k==="style"?{setProperty(){}}:mkEl(),apply:()=>mkEl(),set:()=>true});
const FILES=["util","data-cards","data-gear","save","audio","ui-core","ui-gacha","ui-team","ui-gear","ui-shop","progress","battle","data-bosses","meta","data-run","story","run"];
function load(root){
  const store={};
  const sb={console,Math,Date,JSON,Promise,Object,Array,String,Number,RegExp,Error,Set,Map,parseInt,parseFloat,isNaN,
    document:{body:{classList:{add(){},remove(){},contains(){return false},toggle(){return false}}},getElementById:()=>mkEl(),querySelector:()=>mkEl(),querySelectorAll:()=>[],createElement:()=>mkEl(),addEventListener(){}},
    window:{addEventListener(){},location:{search:"",hash:"",pathname:"/"}},location:{search:"",hash:"",pathname:"/"},navigator:{userAgent:"chk"},
    localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},setInterval(){return 0},clearInterval(){},Audio:function(){return mkEl()},Image:function(){return mkEl()},firebase:undefined};
  sb.globalThis=sb;sb.self=sb;const ctx=vm.createContext(sb);
  for(const f of FILES){const p=path.join(root,"js",f+".js");if(!fs.existsSync(p))continue;
    try{vm.runInContext(fs.readFileSync(p,"utf8"),ctx,{filename:f+".js"});}catch(e){/* 載入時缺的畫面相關東西不影響存檔檢查 */}}
  return ctx;
}
const run=(ctx,code)=>vm.runInContext(code,ctx);
// 產生「能拿到的都拿到、數值在合法上限」的存檔（用該版本自己的常數與資料）
function maxedSave(ctx){
  return JSON.parse(run(ctx,`(function(){
    const s=JSON.parse(JSON.stringify(typeof newSave==="function"?newSave():SAVE));
    s.gold=1000000;
    s.owned={};
    for(const id of Object.keys(CARDS)){const c=CARDS[id];
      const o={stars:5,lv:LV_MAX,exp:0,br:BR_MAX,dup:5,fruit:{atk:FRUIT_MAX,def:FRUIT_MAX,spd:FRUIT_MAX},gfruit:{atk:GFRUIT_MAX,def:GFRUIT_MAX,spd:GFRUIT_MAX}};
      if(typeof LV_BASE!=="undefined")o.bk=1;
      s.owned[id]=o;}
    s.team=Object.keys(CARDS).slice(0,5);
    s.prog=Object.assign({},s.prog,{cleared:ABYSS,fatty:5,abyssBest:FIVE_ABYSS,clears:{}});
    s.stored=[null,null,null,null,null];
    s.arenaTier=50;s.train={best:TRAIN_MAX};
    s.charms=Object.assign({},s.charms,{protect:50,luck:50,stone:50});
    s.fruits={atk:5,def:5,spd:5};s.gfruits={atk:5,def:5,spd:5};
    s.gear=[];let uid=1;
    for(const base of Object.keys(GEAR)){const G=GEAR[base];
      const fxKeys=Object.keys(AFFIX).slice(0,Math.min(4,GEAR_FX_SANE));
      s.gear.push({uid:uid++,base,lv:(typeof ENH_OC!=="undefined"&&ENH_OC_Q.includes(G.q))?ENH_OC:ENH_MAX,roll:GEAR_ROLL[G.q][1],
        fx:fxKeys.map(k=>({k,v:affixSpan(k,G.q,G.slot)[1]+1}))});}
    s.gearUid=uid;
    return JSON.stringify(s);})()`));
}
function check(ctx,save){
  const copy=JSON.parse(JSON.stringify(save));
  try{const m=run(ctx,`migrate(${JSON.stringify(copy)})`);return run(ctx,`validSave(${JSON.stringify(m)})`)||"";}
  catch(e){return "檢查程式出錯："+String(e.message).slice(0,80);}
}

const OLD_ROOT=resolveRoot(OLD_ARG),NEW_ROOT=resolveRoot(NEW_ARG);
const oc=load(OLD_ROOT),nc=load(NEW_ROOT);
const oldV=run(oc,"typeof APP_V!=='undefined'?APP_V:0"),newV=run(nc,"typeof APP_V!=='undefined'?APP_V:0");
console.log(`舊版：${OLD_ARG}（APP_V=${oldV}）　新版：${NEW_ARG||"目前專案資料夾"}（APP_V=${newV}）\n`);
let bad=0;
// ① 舊版存檔 → 新版檢查
const oldSave=maxedSave(oc),r1=check(nc,oldSave);
console.log(r1?`✗ ①【玩家升級後】舊版的合法存檔會被新版判成異常：${r1}\n   → 要先在 migrate 把舊存檔壓回新範圍，或不要調降／改名／刪除。`:"✓ ①【玩家升級後】舊版的合法存檔，新版檢查全部通過");
if(r1)bad++;
// ② 新版存檔 → 舊版檢查
const newSave=maxedSave(nc),r2=check(oc,newSave);
if(!r2)console.log("✓ ②【還沒重新整理的舊頁面】讀到新版存檔，舊版檢查也通過");
else if(newV>oldV)console.log(`✓ ②【還沒重新整理的舊頁面】舊版檢查會判「${r2}」，但新版 APP_V(${newV}) 比舊版(${oldV}) 大：舊頁面只會提示重新整理，不會清空（有保護）`);
else{console.log(`✗ ②【還沒重新整理的舊頁面】舊版檢查會把新版存檔判成異常：${r2}\n   → 新版沒有提高 APP_V，舊頁面讀到會清空存檔。請把 APP_V 加 1，或先放寬檢查上線一段時間再開放。`);bad++;}
console.log(bad?"\n結果：有風險，請處理上面標 ✗ 的項目。":"\n結果：沒有發現存檔相容問題。");
process.exit(bad?1:0);
