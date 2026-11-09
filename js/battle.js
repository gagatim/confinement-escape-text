"use strict";
/* ===================== BATTLE ENGINE ===================== */
let UID=0,CUR_B=null;
function mkUnit(o){
  const d=DEF(o.id),s=cardStats(o.id,o.stars||1,o.scale||1,o.br||0);
  const u={uid:++UID,id:o.id,name:o.name||d.name,side:o.side,stars:o.stars||1,
    maxHp:o.maxHp||s.maxHp,atk:s.atk+(o.atk||0),def:s.def+(o.def||0),spd:s.spd+(o.spd||0),
    cd:0,buffs:[],st:{},perm:{},flags:{},alive:true,ally:!!o.ally,ref:o.ref||null,gx:o.gx||{},br:o.br||0,pl:o.pl||""};
  const mul=o.mult||1;
  if(mul!==1){u.maxHp=Math.round(u.maxHp*mul);u.atk=Math.round(u.atk*mul);u.def=Math.round(u.def*mul);u.spd=Math.round(u.spd*mul);}
  // 章節強度：越後面的主線章節，敵人生命、攻擊、防禦越高（速度不變）
  // hpPow：生命另外指定倍率（肥宅線的額外倍率只加在攻擊、防禦上，生命只乘章節強度）；沒指定就和攻防同一個倍率
  const pw=o.pow||1,hpw=o.hpPow||pw;
  if(pw!==1){u.atk=Math.round(u.atk*pw);u.def=Math.round(u.def*pw);}
  if(hpw!==1)u.maxHp=Math.round(u.maxHp*hpw);
  u.hp=o.hp!=null?Math.min(Math.round(o.hp*mul*hpw),u.maxHp):u.maxHp; // 開場血量也要乘同一個生命倍率，魔王才會滿血開打
  if(u.hp<=0)u.alive=false;
  return u;
}
const nm=u=>`<b class="s${u.side}">${u.name}</b>`;
const mates=(B,u)=>B.units.filter(x=>x.side===u.side&&x.alive);
const foes=(B,u)=>B.units.filter(x=>x.side!==u.side&&x.alive);
const deadMates=(B,u)=>B.units.filter(x=>x.side===u.side&&!x.alive);
function stat(u,k){
  let v=u[k]+(u.perm[k]||0);
  u.buffs.forEach(b=>{if(b.k===k)v+=b.v;});
  if(k==="atk"&&u.id==="berserker"&&u.hp<u.maxHp/2)v+=Math.round(u.atk*.04);
  if(k==="atk"&&u.id==="warden"&&u.hp<u.maxHp/2)v+=3;
  if(k==="atk"&&u.id==="reclaimer"&&u.hp<u.maxHp/2)v+=Math.max(2,Math.round(u.atk*.12));
  if(k==="atk"&&u.id==="ashen"&&hasBond(u,"qing"))v+=Math.max(1,Math.round(u.atk*.04)); // 羈絆「名冊合照」
  if(k==="def"&&u.id==="chief"&&u.hp<u.maxHp/2)v+=2;
  if(k==="def"&&u.id.startsWith("dinoegg"))v+=(CUR_B&&CUR_B.cfg&&CUR_B.cfg.eggDef)?CUR_B.cfg.eggDef(CUR_B.wave):15; // 恐龍蛋被動「厚實蛋殼」：各區各關的加成由 cfg.eggDef(關數) 決定（見 progress.js 的 DINO_ZONES）
  return Math.max(k==="atk"?1:0,v);
}
// 同一陣營裡有沒有另一名活著的指定角色（羈絆判定用）
// 單位目前顯示的被動：恐龍蛋依區域與關卡（cfg.eggPas）；其他單位用資料裡的被動
function pasOf(u,d){return u.id.startsWith("dinoegg")&&CUR_B&&CUR_B.cfg&&CUR_B.cfg.eggPas?CUR_B.cfg.eggPas(CUR_B.wave):d.passive;}
function hasBond(u,id){return !!CUR_B&&CUR_B.units.some(x=>x.side===u.side&&x.alive&&x.id===id);}
function blog(B,html,cls=""){B.log.push({html,cls});if(B.log.length>120)B.log.shift();}
// 對自己施加的增益多算1，因為回合結束時就會先扣1次
function buff(B,u,k,v,t){u.buffs.push({k,v,t:t+(B.active===u?1:0)});}
function poison(B,t,d,turns){
  if(!t.alive)return;
  if(t.id==="chemist"||t.id==="drone"){fx(B,t,"免疫","miss");return;}
  if(B.casting&&clsOf(B.casting)==="mage"&&B.casting.side!==t.side)d+=1;
  const p=t.st.poison||{d:0,t:0};
  t.st.poison={d:Math.max(p.d,d),t:Math.max(p.t,turns)};
}
function stun(B,t,n){t.st.stun=Math.max(t.st.stun||0,n);blog(B,`${nm(t)} 被暈眩了！`);fx(B,t,"暈眩","sk");}
function cleanse(u){delete u.st.poison;u.buffs=u.buffs.filter(b=>b.v>0);}
function heal(B,u,n){
  if(!u.alive||n<=0)return 0;
  if(B.active&&B.active.side===u.side){
    let f=1;if(clsOf(B.active)==="support")f+=.3;
    if(B.active.id==="qing"&&hasBond(B.active,"ashen"))f+=.075; // 羈絆「名冊合照」
    if(f!==1)n=Math.round(n*f);
  }
  const h=Math.min(n,u.maxHp-u.hp);
  if(h>0){u.hp+=h;fx(B,u,"+"+h,"heal");SFX.heal();}
  return h;
}
function revive(B,u,pct){u.alive=true;u.hp=Math.max(1,Math.ceil(u.maxHp*pct));u.st={};u.buffs=[];fx(B,u,"復活","heal");}

// 吸血減免：怪物資料的 leechRed（0.3＝對自己造成傷害時，吸血效果少 30%）
function leechK(t){const d=DEF(t.id);return 1-((d&&d.leechRed)||0);}
const SPLASH_IDS=["reclaimer","editor","nameless"];
// 支線魔王「激動模式」：這幾位魔王面對 5 人以上的隊伍時啟動（開戰時判斷）：單體攻擊擴散 20%、技能與普通攻擊傷害 +10%
const FRENZY_IDS=["doomhunter","voidlord","fatejudge","reaper","abyssking","nightemperor","overlord","endwalker","fakenight"];
function fattyExp(B,t){ // 肥宅（SSR）被動「LEVEL UP」：被打得越多，本場防禦越高（上限 +25）
  const n=t.flags.fhit=(t.flags.fhit||0)+1,cur=t.perm.def||0;
  const add=2+(n%5===0?2:0),nv=Math.min(25,cur+add);
  if(nv===cur)return;
  t.perm.def=nv;
  fx(B,t,"DEF+"+(nv-cur),"sk");
  if(n%5===0)blog(B,`🆙 <b style="color:var(--gold)">LEVEL UP！</b>${nm(t)} 被打了 ${n} 次，防禦大幅提升（本場防禦 +${nv}）。`);
}
function hit(B,a,t,mult,o={}){
  if(!t||!t.alive)return 0;
  if(!o.counter){
    if(t.id==="boss"&&rnd()<.35){
      const m=mates(B,t).filter(x=>x!==t);
      if(m.length){const n=pick(m);blog(B,`「你們先上！」${nm(t)} 把 ${nm(n)} 推了出去。`);t=n;mult*=.6;}
    }
    if(t.id!=="ashen"&&t.hp<t.maxHp*.35){ // 阿燼「我不會丟下你」
      const g=mates(B,t).find(x=>x.id==="ashen"&&x!==t);
      if(g&&rnd()<.4){
        blog(B,`🛡 ${nm(g)}：「站我後面。」——替 ${nm(t)} 擋下了這一擊。`);
        t=g;mult*=.6;
        if((g.flags.ashenN||0)<3){g.flags.ashenN=(g.flags.ashenN||0)+1;g.perm.atk=(g.perm.atk||0)+Math.max(1,Math.round(g.atk*.06));fx(B,g,"攻擊↑","sk");}
      }
    }
    if(t.id!=="bodyguard"&&t.hp<t.maxHp*.5){
      const g=mates(B,t).find(x=>x.id==="bodyguard");
      if(g&&rnd()<.4){blog(B,`${nm(g)} 撲過去替 ${nm(t)} 擋刀！`);t=g;}
    }
  }
  const evadeChance=Math.min(DODGE_CAP/100,(t.id==="lucky"?.15:(DEF(t.id).evade||0))+((t.gx&&t.gx.dodge)||0)/100+(clsOf(t)==="assassin"?.05:0)); // 刺客職業特色：閃避率 +5%；閃避率總和上限 DODGE_CAP
  if(!o.fixed&&!o.pierce&&((t.st.evade||0)>0||rnd()<evadeChance)){
    if(t.st.evade>0)t.st.evade--;
    blog(B,`${nm(a)} 的攻擊被 ${nm(t)} 閃過了。`);fx(B,t,"MISS","miss");SFX.miss();return 0;
  }
  let d,crit=false;
  if(o.fixed)d=o.fixed;
  else{
    d=stat(a,"atk")*mult*(.9+rnd()*.2);
    if(!o.pierce)d-=stat(t,"def")*.7;
    if(B.casting===a&&clsOf(a)==="mage")d*=1.2;
    let cc=(a.id==="sniper"?.2:a.id==="lucky"?.25:.08)+((a.gx&&a.gx.crit)||0)/100;
    if(clsOf(a)==="ranger")cc+=.12;else if(clsOf(a)==="assassin")cc+=.06;
    if(a.id==="detective"&&t.st.mark)cc+=.3;
    if(o.crit||rnd()<cc){crit=true;d*=1.5;}
    if(a.id==="arsonist"&&t.st.poison)d+=2;
  }
  if(a.flags&&a.flags.frenzy)d*=1.1; // 激動模式
  if(t.st.mark)d*=1.5;
  if(t.st.curse)d*=1.15; // 占卜師「厄運宣告」的標記：另一個狀態，和偵探的標記相乘
  if(a.id==="editor"&&t.st.mark)d*=1.25; // 剪輯師「無情剪輯」
  if(t.st.guard&&!o.pierce)d*=.5;
  if(t.buffs.some(b=>b.k==="dr"&&b.t>0))d*=.8; // 主人「乖，過來」：受到的傷害 −20%
  if(B.wall[t.side]){const w=B.units.find(x=>x.uid===B.wall[t.side]);if(w&&w.alive)d*=.5;}
  if(t.id==="fatty")d-=2;
  if(["ghost","warden","zero","guard","chief","host"].includes(t.id))d-=1;
  if(DEF(t.id).dr)d-=DEF(t.id).dr;
  if(DEF(t.id).drp)d*=1-DEF(t.id).drp;
  if(!o.pierce&&t.gx&&t.gx.dr)d*=1-Math.min(DR_CAP,t.gx.dr)/100;
  if(t.id==="veteran"&&t.hp<=t.maxHp*.35)d-=4;
  if(t.id==="babydragon"&&!t.flags.p2)d*=1-Math.min(.2,.05*B.units.filter(x=>x.side===t.side&&x.alive&&x.id.startsWith("dinoegg")).length); // 寶貝龍「護蛋本能」：每有 1 顆活著的蛋，傷害 −5%（最多 −20%）；變身後失效
  d=Math.max(1,Math.round(d));
  if(t.id==="bomb"&&!o.counter&&rnd()<.25){
    const half=Math.floor(d/2);d-=half;
    if(half>0){blog(B,`${nm(t)} 的橡膠身軀把 ${half} 點傷害彈了回去！`);a.hp-=half;fx(B,a,"-"+half,"dmg");if(a.hp<=0)handleDeath(B,a,t);}
  }
  t.hp-=d;
  blog(B,`${nm(a)} → ${nm(t)}　<b style="color:${crit?"var(--gold)":"#ff8a8a"}">-${d}</b>${crit?" 暴擊！":""}`);
  fx(B,t,(crit?"💥":"")+"-"+d,crit?"crit":"dmg");atkFx(B,a,t,crit);
  if(isBossUnit(a))screenShake(crit||d>=t.maxHp*.25);
  crit?SFX.crit():SFX.hit();
  const lk=leechK(t); // 目標若有「吸血減免」，吸血的回復量打折
  const lh=x=>lk<1?Math.round(x*lk):Math.max(1,Math.round(x)); // 有吸血減免時，不再保底回復 1 點
  if(a.id==="butcher"&&a.alive)heal(B,a,lh(d*.3));
  if(a.gx&&a.gx.steal&&a.alive&&a!==t)heal(B,a,lh(d*a.gx.steal/100));
  if((SPLASH_IDS.includes(a.id)||(a.flags&&a.flags.frenzy))&&!o.noSpread&&!o.counter&&d>0){ // 第13～15章魔王「擴散攻擊」：其餘敵人各受到該傷害的 20%
    const sp=Math.max(1,Math.round(d*.2)),others=foes(B,a).filter(x=>x!==t);
    if(others.length){blog(B,`💥 ${nm(a)} 的攻擊擴散開來，其餘敵人各受到 ${sp} 點傷害。`);
      others.forEach(x=>{x.hp-=sp;fx(B,x,"擴散-"+sp,"dmg");if(x.hp<=0)handleDeath(B,x,a);});}
  }
  if(t.id==="fatty2"&&t.hp>0)fattyExp(B,t); // 肥宅（SSR）「肥肉坦克 Lv.99」
  if(t.hp<=0)handleDeath(B,t,a);
  else if(!o.counter&&a.alive&&a!==t){
    if(t.id==="tamer"&&rnd()<.25){blog(B,`🐕 獵犬撲向 ${nm(a)}！`);hit(B,t,a,1,{fixed:3,counter:true});}
    else if(t.st.counter>0){blog(B,`${nm(t)} 反擊！`);hit(B,t,a,.8,{counter:true});}
  }
  return d;
}
function handleDeath(B,t,killer){
  if(!t.alive)return;
  const pm=B.units.find(x=>x.side===t.side&&x.alive&&x.id==="paramedic"&&x!==t);
  if(pm&&!B.flags["pm"+t.side]){B.flags["pm"+t.side]=1;t.hp=1;blog(B,`🚑 ${nm(pm)} 的黃金十分鐘！${nm(t)} 撐住了最後一口氣。`,"big");return;}
  if(t.id==="exorcist"&&!t.flags.revived){t.flags.revived=1;t.hp=Math.ceil(t.maxHp*.3);t.perm.def=(t.perm.def||0)+15;blog(B,`${nm(t)} 的臨終祝禱生效，從死亡中歸來！（本場防禦+15）`,"big");fx(B,t,"復活","heal");return;}
  if(DEF(t.id).boss2&&!t.flags.p2){
    const b2=DEF(t.id).boss2;t.flags.p2=1;t.hp=Math.ceil(t.maxHp*b2.hp);t.st={};t.buffs=t.buffs.filter(b=>b.v>0);
    t.perm.atk=(t.perm.atk||0)+Math.round(t.atk*b2.atk);t.perm.spd=(t.perm.spd||0)+b2.spd;t.cd=0;
    blog(B,`💢 ${nm(t)} 的氣場爆發了！——第二階段！`,"bad");blog(B,`「${DEF(t.id).quote}」`,"big");fx(B,t,"爆氣！","crit");SFX.ssr();return;}
  if(DEF(t.id).revive&&!t.flags.revived){t.flags.revived=1;t.hp=Math.ceil(t.maxHp*DEF(t.id).revive);blog(B,`⚖ ${nm(t)} 重新站了起來：「判決，還沒有結束。」`,"big");fx(B,t,"復活","heal");return;}
  if(t.id==="host"&&!t.flags.revived){t.flags.revived=1;t.hp=Math.ceil(t.maxHp*.3);blog(B,`🎭 ${nm(t)} 拍了拍身上的灰：「我說過，莊家不會輸。」`,"big");fx(B,t,"復活","heal");return;}
  t.hp=0;t.alive=false;t.st={};t.buffs=[];
  blog(B,`✝ ${nm(t)} 倒下了。`,"bad");SFX.death();
  B.units.forEach(x=>{
    if(!x.alive||x===t)return;
    if(x.id==="shade"){heal(B,x,Math.max(1,Math.round(x.maxHp*.05)));x.perm.atk=(x.perm.atk||0)+Math.max(1,Math.round(x.atk*.03));}
    if(x.id==="mediocre"&&x.side===t.side){x.perm.atk=(x.perm.atk||0)+2;fx(B,x,"+2攻","sk");}
    if(x.id==="janitor"&&x.side!==t.side)heal(B,x,3);
    if(x.id==="nameless"&&x.side!==t.side){x.perm.atk=(x.perm.atk||0)+Math.max(1,Math.round(x.atk*.1));} // 無名者「千人之聲」
    if(x.id==="qing"&&x.side===t.side&&(x.flags.qingN||0)<3){ // 晴「我記得你」
      x.flags.qingN=(x.flags.qingN||0)+1;
      B.units.filter(m=>m.side===x.side&&m.alive).forEach(m=>{m.perm.atk=(m.perm.atk||0)+Math.max(1,Math.round(m.atk*.04));});
      blog(B,`✨ ${nm(x)} 輕聲說：「我記得你。」——全隊攻擊提高了。`);
    }
  });
  if(killer&&killer.id==="assassin"&&killer.alive&&killer.side!==t.side&&!killer.flags.extraUsed){killer.flags.extraPending=1;}
}

// 魔王出手時的螢幕震動：只有支線八大魔王（有立繪 img:true 的）會震；暴擊或重擊（單次傷害 ≥ 目標最大生命 25%）震得更大
function isBossUnit(u){const m=MONSTERS[u.id];return !!m&&m.img===true&&m.r==="SSR";}
function screenShake(big){
  if(VIEW!=="battle"||document.body.classList.contains("nobfx"))return;
  const el=document.getElementById("view");if(!el)return;
  el.classList.remove("bshake","big");void el.offsetWidth;
  el.classList.add("bshake");if(big)el.classList.add("big");
  clearTimeout(screenShake.t);screenShake.t=setTimeout(()=>el.classList.remove("bshake","big"),650);
}
/* ---- 攻擊特效（純視覺，不影響戰鬥結果）----
   出手：攻擊者往目標前衝再退回；命中：依攻擊者職業有不同效果（戰士／預設＝斬擊、坦克＝衝擊環、刺客＝交叉雙斬、
   遊俠＝箭矢飛行、法師＝魔法球飛行、輔助＝光環）；暴擊＝金色放大；技能：施放者發光＋畫面四周變暗。
   快速模式（B.fast）所有動畫時間縮短為 45%。 */
const VFX_COL={warrior:"#ff7a3d",tank:"#8fb4ff",assassin:"#c08bff",ranger:"#7be07a",mage:"#7ad7ff",support:"#ffe27a"};
function vfxAdd(L,cls,x,y,col,k,base,css){
  const e=document.createElement("div");e.className="vfx "+cls;e.style.left=x+"px";e.style.top=y+"px";e.style.setProperty("--col",col);
  if(css)for(const p in css)e.style.setProperty(p,css[p]);
  if(base)e.style.animationDuration=base*k+"s";
  L.appendChild(e);setTimeout(()=>e.remove(),(base||.4)*k*1000+80);return e;
}
function atkFx(B,a,t,crit){
  if(VIEW!=="battle"||a===t||document.body.classList.contains("nobfx"))return;
  requestAnimationFrame(()=>{
    const ea=document.getElementById("u"+a.uid),et=document.getElementById("u"+t.uid),L=$("#fx");
    if(!ea||!et||!L)return;
    const k=B.fast?.45:1,ra=ea.getBoundingClientRect(),rt=et.getBoundingClientRect();
    const ax=ra.left+ra.width/2,ay=ra.top+ra.height/2,tx=rt.left+rt.width/2,ty=rt.top+rt.height*.45;
    const cls=clsOf(a)||"",col=crit?"#ffd23f":(VFX_COL[cls]||"#ff6b6b"),big=crit?1.5:1;
    // 出手前衝
    ea.style.setProperty("--dx",(tx-ax)*.3+"px");ea.style.setProperty("--dy",(ty-ay)*.3+"px");ea.style.setProperty("--lt",.34*k+"s");
    ea.classList.remove("lunge");void ea.offsetWidth;ea.classList.add("lunge");setTimeout(()=>ea.classList.remove("lunge"),360*k);
    // 命中效果（遠程的要等投射物飛到）
    let wait=0;
    if(cls==="ranger"||cls==="mage"){
      const e=vfxAdd(L,cls==="ranger"?"arrow":"orb",ax,ay,col,k,0,{"--ang":Math.atan2(ty-ay,tx-ax)+"rad"});
      wait=.28*k;e.style.transition=`left ${wait}s linear,top ${wait}s linear`;void e.offsetWidth;e.style.left=tx+"px";e.style.top=ty+"px";
    }
    setTimeout(()=>{
      if(a.id==="babydragon"){ // 寶貝龍：火焰噴射（普通攻擊和技能的每一次命中都有；變身成巨龍後更粗更大）
        const p2=a.flags&&a.flags.p2;
        vfxAdd(L,"flame",ax,ay,"#ff6a2a",k,.45,{"--ang":Math.atan2(ty-ay,tx-ax)+"rad","--len":Math.hypot(tx-ax,ty-ay)+"px","--th":(p2?52:36)+"px"});
        setTimeout(()=>vfxAdd(L,"fireburst",tx,ty,"#ff6a2a",k,.4,{"--s":(p2?2.3:1.6)*big}),190*k);
      }
      else if(cls==="assassin"){vfxAdd(L,"slash",tx,ty,col,k,.3,{"--rot":"-35deg","--s":big});setTimeout(()=>vfxAdd(L,"slash",tx,ty,col,k,.3,{"--rot":"35deg","--s":big}),70*k);}
      else if(cls==="tank"){vfxAdd(L,"ring",tx,ty,col,k,.38,{"--s":2.6*big});vfxAdd(L,"slash",tx,ty,col,k,.3,{"--rot":"-90deg","--s":.7*big});}
      else if(cls==="ranger"||cls==="mage"){vfxAdd(L,"ring",tx,ty,col,k,.34,{"--s":(cls==="mage"?3:1.8)*big});}
      else if(cls==="support"){vfxAdd(L,"ring",tx,ty,col,k,.4,{"--s":2.4*big});}
      else vfxAdd(L,"slash",tx,ty,col,k,.3,{"--rot":"-35deg","--s":big}); // 戰士、怪物
      if(crit){
        vfxAdd(L,"ring",tx,ty,"#fff",k,.4,{"--s":3.4});
      }
    },wait*1000);
  });
}
// 技能出招：施放者發光，畫面四周變暗
function castFx(B,u){
  if(VIEW!=="battle"||document.body.classList.contains("nobfx"))return;
  requestAnimationFrame(()=>{
    const e=document.getElementById("u"+u.uid),L=$("#fx");if(!e||!L)return;
    const k=B.fast?.45:1;
    e.style.setProperty("--col",VFX_COL[clsOf(u)]||"#c9a0ff");e.style.setProperty("--lt",.6*k+"s");
    e.classList.remove("casting");void e.offsetWidth;e.classList.add("casting");setTimeout(()=>e.classList.remove("casting"),640*k);
    const d=document.createElement("div");d.className="vdim";d.style.animationDuration=.6*k+"s";L.appendChild(d);setTimeout(()=>d.remove(),680*k);
  });
}
function fx(B,u,text,cls){
  if(VIEW!=="battle")return;
  requestAnimationFrame(()=>{
    const el=document.getElementById("u"+u.uid);if(!el)return;
    const r=el.getBoundingClientRect(),f=document.createElement("div");
    f.className="float "+cls;f.textContent=text;
    f.style.left=(r.left+r.width/2+ri(-18,18))+"px";f.style.top=(r.top+r.height*.4)+"px";
    $("#fx").appendChild(f);setTimeout(()=>f.remove(),900);
    if(cls==="dmg"||cls==="crit"){el.classList.remove("shake");void el.offsetWidth;el.classList.add("shake");}
  });
}

function canUseSkill(B,u){
  const sk=DEF(u.id).skill;
  if(u.cd>0)return false;
  if(u.id==="mediocre"&&u.hp<=3)return false;
  if(u.id==="geneFreak"&&u.hp<=5)return false;
  if(sk.t==="mate"&&mates(B,u).filter(x=>x!==u).length===0)return false;
  return true;
}
function validTargets(B,u,t){
  if(t==="enemy"){const f=foes(B,u),tau=f.filter(x=>x.st.taunt>0);return tau.length?tau:f;}
  if(t==="ally")return mates(B,u);
  if(t==="mate")return mates(B,u).filter(x=>x!==u);
  return [];
}
function aiFoe(B,u){
  const f=validTargets(B,u,"enemy");
  if(!f.length)return null;
  if(rnd()<.6)return f.slice().sort((a,b)=>a.hp-b.hp)[0];
  return pick(f);
}
function aiChoose(B,u){
  const sk=DEF(u.id).skill;
  if(canUseSkill(B,u)){
    const ms=mates(B,u),hurt=ms.filter(m=>m.hp<m.maxHp*.65);
    let ok=true,target=null;
    if(sk.kind==="heal"&&!hurt.length&&!(u.id==="exorcist"&&deadMates(B,u).length))ok=false;
    if(sk.t==="enemy")target=aiFoe(B,u);
    if(sk.t==="ally")target=(hurt.length?hurt:ms).slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(sk.t==="mate")target=pick(validTargets(B,u,"mate"));
    if((u.id==="fatty"||u.id==="fatty2")&&u.st.taunt>0)ok=false;
    if(ok)return {type:"skill",target};
  }
  if(B.items&&u.side==="A"&&!u.ally){
    const low=mates(B,u).filter(m=>!m.ally&&m.hp<m.maxHp*.35)[0],pi=B.items.indexOf("pill");
    if(low&&pi>=0)return {type:"item",idx:pi,target:low};
  }
  if(u.id==="master")return {type:"guard"}; // 主人被動「神隱」：不會普通攻擊，沒技能可放就防禦
  return {type:"attack",target:aiFoe(B,u)};
}

function startBattle(cfg){
  const B={title:cfg.title,units:[],log:[],round:0,ctrl:cfg.ctrl||{A:"human",B:"ai"},items:cfg.items||null,
    wall:{},flags:{},auto:false,fast:false,wait:null,done:false,over:null,cfg,labels:cfg.labels||{A:"我方",B:"敵方"},
    online:cfg.online||null,rseq:0,mySide:cfg.mySide||"A",coop:!!cfg.coop,t2:!!cfg.t2,mySeat:"0",wave:1};
  B.units=cfg.A.map(o=>mkUnit({...o,side:"A"})).concat(cfg.B.map(o=>mkUnit({...o,side:"B"})));
  B.units.forEach(u=>{if(FRENZY_IDS.includes(u.id)&&B.units.filter(x=>x.side!==u.side).length>=5){u.flags.frenzy=1;blog(B,`🔥 ${nm(u)} 面對五人的隊伍，進入了激動模式！`,"bad");}});
  CUR_B=B;BATTLE_HOME=cfg.home||"arena";VIEW="battle";
  if(cfg.intro)blog(B,cfg.intro,"big");
  render();
  battleLoop(B);
  return B;
}
function checkEnd(B){
  if(B.over)return true;
  const a=B.units.some(u=>u.side==="A"&&u.alive),b=B.units.some(u=>u.side==="B"&&u.alive);
  if(a&&!b&&B.cfg.waves&&B.cfg.waves.length){nextWave(B);return false;} // 還有下一波：敵方全倒後立刻補上
  if(!a||!b){B.over=a?"A":"B";return true;}
  return false;
}
// 連續多波的戰鬥（cfg.waves，目前只有恐龍蛋專區用）：移除倒下的敵人，補上下一批，我方狀態不動
function nextWave(B){
  const w=B.cfg.waves.shift();B.wave++;
  B.units=B.units.filter(u=>u.side==="A"||u.alive);
  w.forEach(o=>B.units.push(mkUnit({...o,side:"B"})));
  if(B.cfg.waveTitle)B.title=B.cfg.waveTitle(B.wave);
  blog(B,`🥚 第 ${B.wave} 關：下一批恐龍蛋孵出來了！`,"big");
}
function battleStartPassives(B){
  B.units.forEach(u=>{
    if(!u.alive)return;
    if(u.id==="hunter"){blog(B,`${nm(u)} 的埋伏陷阱觸發！`);foes(B,u).forEach(t=>{const d=Math.min(2,t.hp-1);if(d>0){t.hp-=d;fx(B,t,"-"+d,"dmg");}});}
    if(u.id==="trucker")buff(B,u,"spd",3,1);
    if(u.id==="sentinel")buff(B,u,"spd",5,1);
    if(u.id==="bartender")mates(B,u).forEach(m=>heal(B,m,3));
    if(u.id==="leader")mates(B,u).forEach(m=>m.perm.def=(m.perm.def||0)+1);
    if(u.id==="geneFreak"){const k=pick(["atk","def","spd"]);u.perm[k]=(u.perm[k]||0)+2;blog(B,`${nm(u)} 的基因突變：${{atk:"攻擊",def:"防禦",spd:"速度"}[k]}+2`);}
  });
  if(B.cfg.ambush){
    const side=B.cfg.ambush;blog(B,side==="A"?"⚡ 你們搶先出手！敵人措手不及。":"⚡ 你們遭到伏擊！","big");
    B.units.filter(u=>u.side!==side&&u.alive).forEach(t=>{const d=Math.min(3,t.hp-1);if(d>0){t.hp-=d;fx(B,t,"-"+d,"dmg");}});
  }
}
async function battleLoop(B){
  try{await battleLoopInner(B);}
  catch(e){glog("❌BATTLE",`${B.title} 第${B.round}回合：${e&&e.stack||e}`);
    if(!B.aborted){blog(B,"⚠ 戰鬥發生錯誤。請按上方「🐞 卡住了」重置，並把紀錄回報給開發者。","bad");render();}}
}
async function battleLoopInner(B){
  glog("⚔BATTLE",`開始：${B.title}`);
  await sleep(300);
  battleStartPassives(B);render();
  while(!checkEnd(B)){
    B.round++;
    blog(B,`── 第 ${B.round} 回合 ──`,"rnd");
    const order=B.units.filter(u=>u.alive).map(u=>[u,stat(u,"spd")+rnd()*.5]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
    for(const u of order){
      if(checkEnd(B))break;
      if(!u.alive)continue;
      await takeTurn(B,u);
      if(B.aborted)return;
      render();
      if(checkEnd(B))break;
      await sleep(B.fast?120:450);
    }
    if(B.round>(B.cfg.maxRound||60)){
      if(B.t2){B.over="D";blog(B,"戰鬥拖太久，雙方都筋疲力盡……","bad");} // 團隊賽打滿回合數判平手
      else{B.over="B";blog(B,"戰鬥拖太久，毒氣淹沒了一切……","bad");}}
  }
  B.active=null;B.wait=null;
  blog(B,B.over==="D"?"🤝 回合數用盡，雙方平手。":B.over==="A"?`🏆 ${B.labels.A} 獲勝！`:`☠ ${B.labels.B} 獲勝。`,"big");
  if(B.over==="D")SFX.click();else(B.ctrl.B==="human"||B.over==="A")?SFX.win():SFX.lose();
  render();
}
async function takeTurn(B,u){
  B.active=u;u.flags.extraUsed=0;u.flags.extraPending=0;
  delete u.st.guard;
  if(B.wall[u.side]===u.uid)delete B.wall[u.side];
  if(u.cd>0)u.cd--;
  // 回合開始：中毒、回血類被動
  if(u.st.poison){
    const p=u.st.poison;u.hp-=p.d;fx(B,u,"☠-"+p.d,"dmg");blog(B,`${nm(u)} 受到 ${p.d} 點毒傷。`);
    if(--p.t<=0)delete u.st.poison;
    if(u.hp<=0){handleDeath(B,u,null);if(!u.alive){render();return;}}
  }
  if(u.id==="vampire")heal(B,u,Math.max(1,Math.round(u.maxHp*.02)));
  if(u.id==="runner")heal(B,u,1);
  if(u.id==="mutant")heal(B,u,2);
  if(u.id==="zero")heal(B,u,4);
  if(u.id==="master"){const r=u.hp<u.maxHp*.4?.05:.03;mates(B,u).forEach(m=>heal(B,m,Math.max(1,Math.round(m.maxHp*r))));} // 主人被動「寵愛」
  if((u.id==="reclaimer"||u.id==="nameless")&&(u.flags.oc||0)<10){u.flags.oc=(u.flags.oc||0)+1;u.perm.atk=(u.perm.atk||0)+Math.max(1,Math.round(u.atk*.03));}
  if(DEF(u.id).regen)heal(B,u,DEF(u.id).regen);
  if(DEF(u.id).regenp)heal(B,u,Math.round(u.maxHp*DEF(u.id).regenp));
  if(u.id==="babydragon"&&!u.flags.p2&&u.hp<=u.maxHp*.5){ // 寶貝龍「巨龍覺醒」：生命降到一半以下，回合開始時變身成巨龍
    u.flags.p2=1;u.name="巨龍";u.st={};u.buffs=u.buffs.filter(b=>b.v>0);
    u.perm.atk=(u.perm.atk||0)+Math.round(u.atk*.4);u.perm.def=(u.perm.def||0)+4;u.perm.spd=(u.perm.spd||0)+4;u.cd=0;
    heal(B,u,Math.round(u.maxHp*.3));
    blog(B,`🐲 ${nm(u)} 的蛋殼碎裂，體型暴漲——變身成了巨龍！`,"bad");fx(B,u,"變身！","crit");SFX.ssr();
  }
  if(u.id==="medic"){const h=mates(B,u).filter(m=>m.hp<m.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(h)heal(B,h,2);}
  if(u.id==="witch"&&rnd()<.3){const f=foes(B,u);if(f.length){const t=pick(f);poison(B,t,2,2);blog(B,`🧪 女巫的大釜冒泡，${nm(t)} 中毒了。`);}}
  render();
  if(u.st.stun>0){u.st.stun--;blog(B,`${nm(u)} 暈眩中，無法行動。`);endTurn(u);return;}
  // 盟友背叛：信任太低時有機率在戰鬥中倒戈
  if(u.ally&&u.side==="A"&&u.ref&&u.ref.trust<40&&rnd()<(40-u.ref.trust)/60+.1){
    u.side="B";u.ally=false;u.ref.betrayed=true;
    blog(B,`🗡 ${u.name}：「抱歉了，直升機只有三個位子。」——盟友倒戈！`,"bad");SFX.lose();render();await sleep(600);
    if(checkEnd(B))return;
  }
  for(let n=0;n<2;n++){
    const ctl=B.t2?(u.pl==="0"?"human":"remote"):B.coop&&u.side==="A"&&u.pl==="B"?"remote":B.ctrl[u.side],human=ctl==="human"&&!u.ally&&!B.auto;
    const act=u.id==="master"&&!canUseSkill(B,u)?{type:"guard"}:human?await waitHuman(B,u):ctl==="remote"?await waitRemote(B,u):aiChoose(B,u);
    if(!act)return;
    doAction(B,u,act);
    render();
    if(checkEnd(B)||!u.alive||!u.flags.extraPending)break;
    u.flags.extraPending=0;u.flags.extraUsed=1;
    blog(B,`🗡 ${nm(u)} 無聲離場，再行動一次！`,"big");
    await sleep(B.fast?120:400);
  }
  endTurn(u);
}
function endTurn(u){
  u.buffs.forEach(b=>b.t--);u.buffs=u.buffs.filter(b=>b.t>0);
  ["taunt","mark","curse","counter"].forEach(k=>{if(u.st[k]>0)u.st[k]--;});
}
function doAction(B,u,a){
  if(a.type==="attack"){if(a.target){hit(B,u,a.target,1);if(u.id==="diviner"&&a.target.alive)poison(B,a.target,5,3);if(u.id==="venomfrog"&&a.target.alive)poison(B,a.target,Math.max(1,Math.round(stat(u,"atk")*.15)),2);}} // 占卜師、毒蛙被動「毒傷」（技能的毒寫在技能裡）
  else if(a.type==="skill"){
    const sk=DEF(u.id).skill;
    blog(B,`✦ ${nm(u)} 發動【${sk.name}】`);fx(B,u,sk.name,"sk");castFx(B,u);
    B.casting=u;sk.use(B,u,a.target);B.casting=null;u.cd=sk.cd-(u.flags.p2?1:0);
  }
  else if(a.type==="guard"){u.st.guard=1;blog(B,`${nm(u)} 擺出防禦架勢（受到傷害減半）。`);heal(B,u,1);}
  else if(a.type==="item")useBattleItem(B,u,a.idx,a.target);
}
function useBattleItem(B,u,idx,t){
  const id=B.items[idx];B.items.splice(idx,1);
  const it=ITEMS[id];
  blog(B,`🎒 ${nm(u)} 使用了 ${it.icon}${it.name}${t&&t!==u?"（對 "+nm(t)+"）":""}`);
  if(id==="pill")heal(B,t,pillHeal());
  else if(id==="adrenaline"){buff(B,t,"atk",3,3);buff(B,t,"spd",2,3);fx(B,t,"亢奮","sk");}
  else if(id==="rocket")foes(B,u).forEach(x=>hit(B,u,x,1,{fixed:5}));
  else if(id==="wine"){const k=ri(1,3);if(k===1)heal(B,t,6);else if(k===2)buff(B,t,"atk",2,2);else{poison(B,t,2,2);blog(B,"……這酒好像壞了。");}}
}

/* ---- human input ---- */
function waitHuman(B,u){return new Promise(res=>{KB_SEL="";KB_ROW="act";B.wait={u,res,mode:"menu"};render();});}
function act(kind){
  const B=CUR_B;if(!B)return;
  if(kind==="auto"){B.auto=!B.auto;SFX.click();if(B.auto&&B.wait)return resolveHuman(aiChoose(B,B.wait.u));render();return;}
  const w=B.wait;if(!w)return;
  SFX.click();
  const u=w.u,sk=DEF(u.id).skill;
  if(kind==="attack"){if(u.id==="master")return;w.mode="target";w.action={type:"attack"};w.tt="enemy";w.label="普通攻擊";}
  else if(kind==="skill"){
    if(!canUseSkill(B,u))return;
    if(["enemy","ally","mate"].includes(sk.t)){w.mode="target";w.action={type:"skill"};w.tt=sk.t;w.label=sk.name;}
    else return resolveHuman({type:"skill"});
  }
  else if(kind==="guard")return resolveHuman({type:"guard"});
  else if(kind==="items"){w.mode="items";}
  render();
}
function pickItem(idx){
  const B=CUR_B,w=B&&B.wait,id=B&&B.items&&B.items[idx];if(!w||!id)return;
  if(ITEMS[id].battle==="self"||id==="rocket")return resolveHuman({type:"item",idx,target:w.u});
  w.mode="target";w.action={type:"item",idx};w.tt="ally";w.label=ITEMS[id].name;render();
}
function cancelTarget(){const w=CUR_B&&CUR_B.wait;if(w){w.mode="menu";render();}}
function onUnitClick(uid){
  const B=CUR_B,w=B&&B.wait;if(!w||w.mode!=="target")return;
  const t=B.units.find(x=>x.uid===uid);
  if(!validTargets(B,w.u,w.tt).includes(t))return;
  kbRemember(w.tt,uid);
  resolveHuman({...w.action,target:t});
}
function resolveHuman(a){const B=CUR_B,w=B&&B.wait;if(!w)return;B.wait=null;w.res(a);}

/* ---- battle view ---- */
function unitCard(B,u){
  const w=B.wait,tg=w&&w.mode==="target"&&validTargets(B,w.u,w.tt).includes(u);
  const pct=Math.max(0,u.hp/u.maxHp*100),st=[];
  if(u.st.poison)st.push("☠"+u.st.poison.t);
  if(u.st.stun)st.push("💫");
  if(u.st.taunt)st.push("📢");
  if(u.st.evade)st.push("💨×"+u.st.evade);
  if(u.st.guard)st.push("🛡");
  if(u.st.mark)st.push("🎯");
  if(u.st.curse)st.push("🔮");
  if(u.st.counter)st.push("⚡");
  if(B.wall[u.side])st.push("🧱");
  if(u.buffs.some(b=>b.v>0))st.push("▲");
  if(u.buffs.some(b=>b.v<0))st.push("▼");
  const d=DEF(u.id),cl=CARDS[u.id]?CLASSES[CARDS[u.id].cls]:null;
  return `<div class="ucard s${u.side} ${CARDS[u.id]?"q-"+CARDS[u.id].r:""} ${d.boss2||d.transform?"bossu":""} ${u.flags&&u.flags.p2?"p2":""} ${u.flags&&u.flags.frenzy?"frenzy":""} ${u.br?brTier(u.br):""} ${u.alive?"":"dead"} ${B.active===u&&!B.over?"active":""} ${tg?"targetable":""}" id="u${u.uid}" onclick="onUnitClick(${u.uid})" title="${d.skill.name}：${d.skill.desc}\n${pasOf(u,d).name}：${pasOf(u,d).desc}">
    <div class="uav">${avatar(u.id,u.flags&&u.flags.p2)}</div>
    ${u.cd>0&&u.alive&&SAVE.showCd!==false?`<div class="cdbadge">✦${u.cd}</div>`:""}
    <div class="uname">${cl?`<span title="${cl.name}：${cl.desc}">${cl.icon}</span>`:""}${u.ally?"🤝":""}${(B.coop||B.t2)&&u.pl?`<span class="tag" style="margin-right:3px">${B.t2?(u.pl===B.mySeat?"我":"P"+(+u.pl+1)):u.pl===(B.guest?"B":"A")?"我":"隊友"}</span>`:""}${u.name}${u.br?`<span class="brkname">突破${u.br}</span>`:""}</div>
    <div class="hpbar ${pct>50?"hi":""}"><i style="width:${pct}%"></i><span>${Math.max(0,u.hp)}/${u.maxHp}</span></div>
    <div class="ustat">⚔${stat(u,"atk")} 🛡${stat(u,"def")} 💨${stat(u,"spd")}</div>
    <div class="ust">${st.join(" ")}</div></div>`;
}
function actionPanel(B){
  if(B.over){
    const hot=B.ctrl.A==="human"&&B.ctrl.B==="human",win=B.over===B.mySide;
    const draw=B.over==="D",head=draw?"平手":hot?`${B.labels[B.over]} 勝利！`:win?"勝利":"敗北";
    return `<div class="result ${win||hot||draw?"win":"lose"}"><h2>${head}</h2><div class="dim">${B.cfg.resultNote?B.cfg.resultNote(B):""}</div>
      <button class="pri" data-kb="continue" style="margin-top:8px" onclick="finishBattle()">繼續</button>${KB_HINT}</div>`;
  }
  const w=B.wait;
  if(!w)return `<div class="apanel dim">${B.active?nm(B.active)+" 行動中……":"……"}</div>`;
  const u=w.u,sk=DEF(u.id).skill,who=B.ctrl.A==="human"&&B.ctrl.B==="human"?`<span class="tag">${B.labels[u.side]}</span> `:"";
  if(w.mode==="target")return `<div class="apanel"><div class="who">${who}${nm(u)}：選擇【${w.label}】的目標（點選發光的角色）</div><div class="btns"><button data-kb="back" onclick="cancelTarget()">✕ 取消</button></div>${KB_HINT}</div>`;
  if(w.mode==="items")return `<div class="apanel"><div class="who">選擇道具</div><div class="btns">
    ${groupItems(B.items).map(g=>ITEMS[g.id].battle?`<button data-kb="item${g.i}" onclick="pickItem(${g.i})" title="${ITEMS[g.id].desc}">${ITEMS[g.id].icon}${ITEMS[g.id].name}${g.n>1?`×${g.n}`:""}</button>`:"").join("")||"<span class='dim'>沒有可在戰鬥中使用的道具</span>"}
    <button data-kb="back" onclick="cancelTarget()">返回</button></div>${KB_HINT}</div>`;
  const usable=B.items?B.items.filter(id=>ITEMS[id].battle).length:0;
  return `<div class="apanel"><div class="who">${who}${nm(u)} 的回合</div><div class="btns">
    <button class="atk" data-kb="attack" onclick="act('attack')">⚔ 攻擊</button>
    <button data-kb="skill" onclick="act('skill')" ${canUseSkill(B,u)?"":"disabled"} class="${canUseSkill(B,u)?"pri":""}">✦ ${sk.name}${u.cd>0?`（${u.cd}）`:""}</button>
    <button data-kb="guard" onclick="act('guard')">🛡 防禦</button>
    ${B.items?`<button data-kb="items" onclick="act('items')" ${usable?"":"disabled"}>🎒 道具 ${usable}</button>`:""}
  </div>${KB_HINT}${B.guest?`<div class="skdesc">（${(B.t2?T2_TIMEOUT:REMOTE_TIMEOUT)/1000} 秒內沒有行動會自動出手）</div>`:""}<div class="skdesc">✦ ${sk.desc}　◈ ${pasOf(u,DEF(u.id)).name}：${pasOf(u,DEF(u.id)).desc}</div></div>`;
}

/* ---- 鍵盤操作（戰鬥中） ----
   輪到我方時已經「預先選好一隻目標」（🎯），游標預設在行動列：←→（A D）在 攻擊／技能／防禦／道具 之間切換，Enter 直接執行，攻擊不用再點敵人。
   想換目標：按 ↑（W）把游標移到目標列，←→ 換一隻，Enter 就打這一隻，↓（S）回到行動列；也可以按 Tab 直接換目標。
   進到選道具／選目標畫面時，←→ 換目標、Enter 確認、Esc 返回。 */
let KB_SEL="",KB_ROW="act",KB_TE=0,KB_TA=0; // KB_ROW：游標在「行動列」(act) 還是「目標列」(tgt)；KB_TE／KB_TA：最近選的敵人／我方目標
const KB_ACT=["attack","skill","guard","items"];
const kbKey=e=>(e.dataset&&e.dataset.kb)||e.id;
function kbMenu(){const B=CUR_B;return !!(B&&VIEW==="battle"&&B.wait&&B.wait.mode==="menu");}
function kbActions(){return Array.from(document.querySelectorAll("#view .apanel [data-kb]:not([disabled])")).filter(e=>KB_ACT.includes(kbKey(e)));}
function kbTargetType(a){ // 這個行動需要選哪一種目標：enemy／ally／mate，不用選就回傳 null
  const B=CUR_B,u=B&&B.wait&&B.wait.u;if(!u)return null;
  if(a==="attack")return "enemy";
  if(a==="skill"){const t=DEF(u.id).skill.t;return ["enemy","ally","mate"].includes(t)?t:null;}
  return null;
}
function kbTargets(tt){ // 可選的目標，依畫面由左到右排好（回傳 uid 陣列）
  const B=CUR_B;if(!B||!B.wait||!tt)return [];
  const xOf=u=>{const el=document.getElementById("u"+u.uid);return el?el.getBoundingClientRect().left:0;};
  return validTargets(B,B.wait.u,tt).slice().sort((a,b)=>xOf(a)-xOf(b)).map(u=>u.uid);
}
function kbPickTarget(tt,list){ // 自動選目標：沿用上次選的；沒有就敵人選最左邊、治療類選生命比例最低的
  const B=CUR_B;
  if(!list.length)return 0;
  if(tt==="enemy"&&list.includes(KB_TE))return KB_TE;
  if(tt!=="enemy"&&list.includes(KB_TA))return KB_TA;
  if(tt==="ally"){const u=list.map(id=>B.units.find(x=>x.uid===id)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];return u?u.uid:list[0];}
  return list[0];
}
function kbCurTarget(a){const tt=kbTargetType(a||KB_SEL),list=kbTargets(tt);return {tt,list,id:kbPickTarget(tt,list)};}
function kbRemember(tt,uid){if(tt==="enemy")KB_TE=uid;else KB_TA=uid;}
function kbItems(){
  const B=CUR_B;if(!B||VIEW!=="battle")return [];
  const q=s=>Array.from(document.querySelectorAll(s));
  if(B.over)return q('#view [data-kb="continue"]');
  const w=B.wait;if(!w)return [];
  if(w.mode==="target")return q("#view .ucard.targetable");
  if(w.mode==="menu")return kbActions();
  return q('#view .apanel [data-kb]:not([disabled])'); // 道具選單
}
function kbCur(items){return items.find(e=>kbKey(e)===KB_SEL);}
// 每次畫面重畫後呼叫：標出目前選到的行動（青框）與目標（金框＋🎯）
function kbApply(){
  try{
    document.querySelectorAll("#view .kbsel,#view .kbtgt,#view .kbhold").forEach(e=>e.classList.remove("kbsel","kbtgt","kbhold"));
    const B=CUR_B;if(!B||VIEW!=="battle")return;
    const items=kbItems();if(!items.length)return;
    if(kbMenu()){
      let cur=kbCur(items);
      if(!cur){cur=items.find(e=>kbKey(e)==="attack")||items[0];KB_SEL=kbKey(cur);}
      const t=kbCurTarget();
      if(KB_ROW==="tgt"&&!t.list.length)KB_ROW="act";
      cur.classList.add(KB_ROW==="tgt"?"kbhold":"kbsel");
      if(t.id){const el=document.getElementById("u"+t.id);if(el){el.classList.add("kbtgt");if(KB_ROW==="tgt")el.classList.add("kbsel");}}
      return;
    }
    let cur=kbCur(items);
    if(!cur){
      const w=B.wait;
      if(w&&w.mode==="target"){const id=kbPickTarget(w.tt,kbTargets(w.tt));cur=items.find(e=>e.id==="u"+id);}
      cur=cur||items.find(e=>kbKey(e)==="continue")||items.find(e=>e.closest(".apanel"))||items[0];
      KB_SEL=kbKey(cur);
    }
    cur.classList.add("kbsel");
  }catch(e){}
}
// 非選單畫面（選目標、道具選單）用：把選項依位置分成一排一排，左右鍵同排移動（繞回），上下鍵換排
function kbRows(items){
  const pts=items.map(e=>{const b=e.getBoundingClientRect();return {e,x:b.left+b.width/2,y:b.top+b.height/2,h:b.height};}).sort((a,b)=>a.y-b.y);
  const rows=[];
  pts.forEach(p=>{const r=rows[rows.length-1];if(r&&Math.abs(p.y-r.y)<=Math.max(14,r.h*.5))r.list.push(p);else rows.push({y:p.y,h:p.h,list:[p]});});
  rows.forEach(r=>r.list.sort((a,b)=>a.x-b.x));
  return rows;
}
function kbCycleTarget(d){
  const t=kbCurTarget();
  if(t.list.length>1){const nid=t.list[(t.list.indexOf(t.id)+d+t.list.length)%t.list.length];kbRemember(t.tt,nid);kbApply();}
}
function kbMove(dx,dy){
  if(kbMenu()){
    if(dy<0){ // ↑：把游標移到目標列（只有需要選目標的行動才有）
      if(kbCurTarget().list.length){KB_ROW="tgt";kbApply();}
      return;
    }
    if(dy>0){KB_ROW="act";kbApply();return;} // ↓：回到行動列
    if(KB_ROW==="tgt"){kbCycleTarget(dx);return;} // 目標列：←→ 換目標
    const acts=kbActions();if(!acts.length)return; // 行動列：←→ 在攻擊／技能／防禦／道具之間切換
    const i=Math.max(0,acts.findIndex(e=>kbKey(e)===KB_SEL));
    KB_SEL=kbKey(acts[(i+dx+acts.length)%acts.length]);kbApply();
    return;
  }
  const items=kbItems();if(!items.length)return;
  const cur=kbCur(items)||items[0],rows=kbRows(items);
  let ri=rows.findIndex(r=>r.list.some(p=>p.e===cur));if(ri<0)ri=0;
  const row=rows[ri],ci=Math.max(0,row.list.findIndex(p=>p.e===cur));
  let nx=cur;
  if(dx){nx=row.list[(ci+dx+row.list.length)%row.list.length].e;}
  else if(dy){
    const tr=rows[ri+dy];if(!tr)return;
    const cx=row.list[ci].x;nx=tr.list.reduce((a,b)=>Math.abs(b.x-cx)<Math.abs(a.x-cx)?b:a).e;
  }
  if(nx===cur)return;
  KB_SEL=kbKey(nx);kbApply();
  try{nx.scrollIntoView({block:"nearest",inline:"nearest"});}catch(e){}
}
// 在選單按 Enter：攻擊／要選目標的技能，直接對預先選好的目標出手；其他行動照常執行
function kbExec(a){
  if(a==="attack"||a==="skill"){
    const t=kbCurTarget(a);
    act(a);
    const w=CUR_B&&CUR_B.wait;
    if(w&&w.mode==="target"&&t.id){kbRemember(t.tt,t.id);onUnitClick(t.id);}
  }else act(a);
}
function kbKeydown(e){
  const B=CUR_B;
  if(VIEW!=="battle"||!B||e.ctrlKey||e.altKey||e.metaKey)return;
  const tg=e.target;if(tg&&/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))return;
  const m=$("#modal"),g=$("#gacha");
  if((m&&m.classList.contains("show"))||(g&&g.classList.contains("show")))return;
  if(!B.over&&!B.wait)return; // 對手行動中不攔截按鍵，避免誤觸
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k==="Tab"&&kbMenu()){e.preventDefault();kbCycleTarget(e.shiftKey?-1:1);return;}
  const D={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]};
  if(D[k]){e.preventDefault();kbMove(D[k][0],D[k][1]);return;}
  if(k==="Enter"||k===" "){
    const items=kbItems(),cur=kbCur(items);
    if(!cur)return;
    e.preventDefault();try{document.activeElement.blur();}catch(x){}
    if(kbMenu())kbExec(KB_SEL);else cur.click();
    return;
  }
  if(k==="Escape"||k==="Backspace"){
    const w=B.wait;
    if(w&&(w.mode==="target"||w.mode==="items")){e.preventDefault();cancelTarget();}
  }
}
const KB_HINT=`<div class="kbhint">⌨ ←→（A D）選行動　↑ 換目標（↓ 返回）　Tab 換目標　Enter 確認　Esc 返回</div>`;
function viewBattle(){
  const B=CUR_B;if(!B)return "";
  const me=B.mySide||"A",op=me==="A"?"B":"A";
  const ctl=B.over?"":`<div class="bctl">
    ${B.ctrl.A==="human"&&B.ctrl.B!=="human"?`<button data-kb="auto" onclick="act('auto')" class="${B.auto?"ok":""}">${B.auto?"自動中":"自動"}</button>`:""}
    ${B.guest?"":`<button data-kb="fast" onclick="CUR_B.fast=!CUR_B.fast;render()" class="${B.fast?"ok":""}">${B.fast?"⏩ 快速":"▶ 正常"}</button>`}
    </div>`;
  return `<div class="btop"><div class="ttl">${B.title}　<span class="dim small">第 ${B.round} 回合</span></div></div>
    <div class="side B ${B.units.filter(u=>u.side===op).length>3?"big":""}">${B.units.filter(u=>u.side===op).map(u=>unitCard(B,u)).join("")}</div>
    <div class="vs">— ${B.labels[op]} ／ ${B.labels[me]} —</div>
    <div class="side A ${B.units.filter(u=>u.side===me).length>3?"big":""}">${B.units.filter(u=>u.side===me).map(u=>unitCard(B,u)).join("")}</div>
    <div class="bdock">${ctl}${actionPanel(B)}</div>
    <div class="blog" id="blog">${B.log.map(l=>`<div class="${l.cls}">${l.html}</div>`).join("")}</div>`;
}
function finishBattle(){
  const B=CUR_B;if(!B||B.done)return; // 連點兩下不會重複結算
  B.done=true;glog("⚔BATTLE",`結束：${B.title}（${B.over==="A"?"勝":"敗"}）`);
  if(B.auto&&B.wait)B.wait=null;
  B.cfg.onEnd(B.over==="A",B);
}

