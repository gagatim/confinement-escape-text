#!/usr/bin/env node
/* 無畫面的戰鬥模擬工具：載入遊戲原始碼，固定亂數種子，AI 對 AI 打大量戰鬥。
   用途：
   ① 改戰鬥程式後確認「戰鬥結果沒有被影響」：
        node tools/sim.js regress 改前.json 400      在目前的專案資料夾跑 400 場，結果存成 改前.json
        node tools/sim.js regress 改後.json 400 [專案資料夾]   也可以指定另一個資料夾（例如用 git worktree 取出的舊版本）
        node tools/sim.js compare 改前.json 改後.json  逐位元組比對；一樣就是戰鬥行為完全沒變
      （比對時會排除還在調整的新角色，可用環境變數 EXCL=icemage,xxx 把某些角色排除在隨機組隊之外，讓舊結果仍可比對）
   ② 粗略的強弱排名：
        node tools/sim.js rank [場數]                隨機 5 打 5，統計各角色所在隊伍的勝率（Lv.100・5★・突破 10，不含裝備與果實）
      注意：這是「裸裝」基準，跟攻略〈全角色強弱排名〉（滿裝備、含預計角色）的條件不同，只拿來看改數值後的相對變化。
   不會寫進遊戲，也不會動存檔；只讀 js/ 底下的資料與戰鬥程式。 */
const fs=require("fs"),vm=require("vm"),path=require("path");
const [,,MODE,A1,A2,A3]=process.argv;
if(!["regress","compare","rank"].includes(MODE)){console.log(fs.readFileSync(__filename,"utf8").split("*/")[0].replace("#!/usr/bin/env node\n/*",""));process.exit(0);}

if(MODE==="compare"){
  const a=fs.readFileSync(A1),b=fs.readFileSync(A2);
  if(Buffer.compare(a,b)===0){console.log("★ 兩份結果完全一致（戰鬥行為沒有改變）");process.exit(0);}
  const ja=JSON.parse(a),jb=JSON.parse(b);
  const n=Math.min(ja.length,jb.length);let diff=0,first=-1;
  for(let i=0;i<n;i++)if(JSON.stringify(ja[i])!==JSON.stringify(jb[i])){diff++;if(first<0)first=i;}
  console.log(`✗ 有差異：${diff} / ${n} 場不同（第一個不同的是第 ${first} 場）`);process.exit(1);
}

const ROOT=path.resolve(MODE==="regress"?(A3||path.join(__dirname,"..")):path.join(__dirname,".."));
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let R=mulberry(1);
const mkEl=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>"":k==="length"?0:k==="classList"?{add(){},remove(){},contains(){return false},toggle(){return false}}:k==="style"?{setProperty(){}}:mkEl(),apply:()=>mkEl(),set:()=>true});
const store={};
const sandbox={console,Math:Object.create(Math),Date,JSON,Promise,Object,Array,String,Number,RegExp,Error,Set,Map,parseInt,parseFloat,isNaN,
  document:{body:{classList:{add(){},remove(){},contains(){return false},toggle(){return false}}},getElementById:()=>mkEl(),querySelector:()=>mkEl(),querySelectorAll:()=>[],createElement:()=>mkEl(),addEventListener(){}},
  window:{addEventListener(){},location:{search:"",hash:"",pathname:"/"}},location:{search:"",hash:"",pathname:"/"},navigator:{userAgent:"sim"},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
  requestAnimationFrame:f=>f(),setTimeout:f=>{queueMicrotask(f);return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
  Audio:function(){return mkEl()},Image:function(){return mkEl()},firebase:undefined};
sandbox.Math.random=()=>R();sandbox.globalThis=sandbox;sandbox.self=sandbox;
const ctx=vm.createContext(sandbox);
// 戰鬥只需要這幾個檔案（不載入畫面與網路對戰）
for(const f of ["util","data-cards","data-gear","save","audio","ui-core","ui-gacha","ui-team","ui-gear","ui-shop","progress","battle","data-bosses"]){
  try{vm.runInContext(fs.readFileSync(path.join(ROOT,"js",f+".js"),"utf8"),ctx,{filename:f+".js"});}
  catch(e){console.error("載入失敗",f,String(e.message).slice(0,100));}
}
for(const st of ["render=()=>{}","glog=()=>{}","castFx=()=>{}","atkFx=()=>{}","screenShake=()=>{}","fx=()=>{}","Object.keys(SFX).forEach(k=>{SFX[k]=()=>{}})"]){try{vm.runInContext(st,ctx);}catch(e){}}
const EXCL=(process.env.EXCL||"").split(",").filter(Boolean);
const allIds=vm.runInContext("Object.keys(CARDS)",ctx).filter(i=>!EXCL.includes(i));
const bosses=vm.runInContext("typeof BOSS_LIST!=='undefined'?BOSS_LIST:[]",ctx);
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
async function run(cfg){
  vm.runInContext("var __cfg="+JSON.stringify(cfg)+";",ctx);
  const B=vm.runInContext("(function(){const b=startBattle(__cfg);b.fast=true;return b;})()",ctx);
  for(let k=0;k<600&&!B.over;k++)await new Promise(r=>setImmediate(r));
  return B;
}

(async()=>{
  if(MODE==="regress"){
    const OUT=A1,N=+A2||400,out=[];
    for(let i=0;i<N;i++){
      R=mulberry(1000+i);const rr=mulberry(777+i);
      const mk=(n,boss)=>Array.from({length:n},()=>({id:boss&&rr()<.5?pick(bosses,rr):pick(allIds,rr),stars:1+Math.floor(rr()*5),br:Math.floor(rr()*3)}));
      const A=mk(1+Math.floor(rr()*5),false),B=mk(1+Math.floor(rr()*5),true);
      try{const b=await run({title:"sim"+i,A,B,ctrl:{A:"ai",B:"ai"},maxRound:60});
        out.push({i,over:b.over,round:b.round,log:b.log.map(l=>l.html),units:b.units.map(u=>[u.id,u.side,u.hp,u.cd,u.alive])});
      }catch(e){out.push({i,err:String(e.stack||e).split("\n").slice(0,3).join(" | ")});}
    }
    fs.writeFileSync(OUT,JSON.stringify(out));
    const err=out.filter(o=>o.err).length;
    console.log(`完成 ${out.length} 場；打出勝負 ${out.filter(o=>o.over).length}；錯誤 ${err}　→ ${OUT}`);
    if(err)console.log(out.find(o=>o.err).err);
    process.exit(err?1:0);
  }
  if(MODE==="rank"){
    const N=+A1||3000;
    const ids=allIds.filter(i=>{const c=vm.runInContext("CARDS['"+i+"']",ctx);return c&&!c.off&&c.r!=="N";});
    const lv=vm.runInContext("typeof lvMul==='function'?lvMul(100):1",ctx);
    const win={},cnt={};ids.forEach(i=>{win[i]=0;cnt[i]=0;});
    for(let i=0;i<N;i++){
      R=mulberry(40000+i);const rr=mulberry(90000+i);
      const pool=ids.slice(),team=()=>Array.from({length:5},()=>pool.splice(Math.floor(rr()*pool.length),1)[0]);
      const ta=team(),tb=team(),mk=t=>t.map(id=>({id,stars:5,br:10,scale:lv}));
      const b=await run({title:"rank"+i,A:mk(ta),B:mk(tb),ctrl:{A:"ai",B:"ai"},maxRound:60});
      if(!b.over||b.over==="D")continue;
      ta.forEach(id=>{cnt[id]++;if(b.over==="A")win[id]++;});
      tb.forEach(id=>{cnt[id]++;if(b.over==="B")win[id]++;});
    }
    const names=vm.runInContext("Object.fromEntries(Object.entries(CARDS).map(([k,c])=>[k,c.name+'（'+c.r+'）']))",ctx);
    const rows=ids.filter(i=>cnt[i]).map(i=>[names[i],win[i]/cnt[i],cnt[i]]).sort((a,b)=>b[1]-a[1]);
    console.log(`隨機 5 打 5，共 ${N} 場（Lv.100・5★・突破 10，不含裝備與果實）`);
    rows.forEach((r,k)=>console.log(`${String(k+1).padStart(2)}. ${r[0].padEnd(12,"　")} 勝率 ${(r[1]*100).toFixed(0)}%　（${r[2]} 場）`));
    process.exit(0);
  }
})();
