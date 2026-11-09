"use strict";
/* ===================== DATA: CARDS ===================== */
// 職業取自《禁閉逃殺》本體，數值與技能改寫成回合制戰鬥版本。
// 被動效果大多在戰鬥引擎（hit / handleDeath / turnStart / battleStart）裡依 id 判斷；
// run 欄位是「遠征中」生效的被動標籤。
const CARDS={
  boss:{name:"黑社會老大",r:"SSR",hp:36,atk:6,def:2,spd:3,
    skill:{name:"一呼百應",cd:3,t:"none",kind:"buff",desc:"全體隊友（含自己）防禦+10%（至少+1，2回合），並立刻恢復12%最大生命。",
      use(B,u){mates(B,u).forEach(m=>{buff(B,m,"def",Math.max(1,Math.round(stat(m,"def")*.1)),2);heal(B,m,Math.max(1,Math.round(m.maxHp*.12)));});blog(B,`${nm(u)} 一聲令下，小弟們士氣大振！`);}},
    passive:{name:"你們先上",desc:"自己被攻擊時，有35%機率改由1名隨機的活著的隊友代為承受，代受的傷害為原本的60%。沒有其他隊友可代時不會觸發。"}},
  exorcist:{name:"還魂師",r:"SSR",hp:28,atk:5,def:1,spd:4,
    skill:{name:"安魂儀式",cd:5,t:"none",kind:"heal",desc:"有隊友倒下時：復活其中最大生命最高的1名，復活後恢復40%最大生命。沒人倒下時：全體隊友各恢復8%最大生命（至少4）。",
      use(B,u){const d=deadMates(B,u);if(d.length){const t=d.sort((a,b)=>b.maxHp-a.maxHp)[0];revive(B,t,.4);blog(B,`${nm(u)} 吟唱安魂曲，${nm(t)} 從暗影中歸來！`,"big");}else mates(B,u).forEach(m=>heal(B,m,Math.max(4,Math.round(m.maxHp*.08))));}},
    passive:{name:"臨終祝禱",desc:"每場戰鬥，自己第一次倒下時會立刻復活，恢復30%最大生命，並防禦+15（本場）。每場只會觸發1次。"}},
  butcher:{name:"屠夫",r:"SSR",hp:32,atk:7,def:1,spd:3,
    skill:{name:"屠宰",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成2.2倍攻擊傷害（受對方防禦影響）。",use(B,u,t){hit(B,u,t,2.2);}},
    passive:{name:"鮮血盛宴",desc:"每次造成傷害，恢復該傷害30%的生命（至少1），普通攻擊和技能都算。"}},
  shade:{name:"暗影使者",r:"SSR",hp:26,atk:7,def:0,spd:6,
    skill:{name:"暗影突襲",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.6倍攻擊傷害，無視對方防禦與防禦架勢；施放後自己獲得1次閃避，可以躲掉下一次受到的攻擊（無視防禦、固定傷害的攻擊閃不掉）。",use(B,u,t){hit(B,u,t,1.6,{pierce:true});u.st.evade=(u.st.evade||0)+1;}},
    passive:{name:"暗影共鳴",desc:"場上任何其他角色（敵我皆算）倒下時，自己恢復5%最大生命（至少1），並攻擊永久+3%（至少+1，本場）。"}},
  vampire:{name:"吸血鬼",r:"SSR",hp:30,atk:6,def:1,spd:4,
    skill:{name:"血宴",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成1.0倍攻擊傷害（受對方防禦影響），並把造成的總傷害的50%轉成自己的生命。",
      use(B,u){let s=0;foes(B,u).forEach(t=>s+=hit(B,u,t,1.0)*leechK(t));if(s)heal(B,u,Math.ceil(s/2));}},
    passive:{name:"夜之血族",desc:"每個自己的回合開始時，恢復2%最大生命（至少1）。"}},
  berserker:{name:"狂戰士",r:"SSR",hp:37,atk:7,def:0,spd:4,
    skill:{name:"狂暴旋風",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成1.38倍攻擊傷害（受對方防禦影響）；施放後自己失去0.5%最大生命（至少1點），但生命最低會留在1，不會因此倒下。",
      use(B,u){foes(B,u).forEach(t=>hit(B,u,t,1.38));u.hp=Math.max(1,u.hp-Math.max(1,Math.round(u.maxHp*.005)));}},
    passive:{name:"嗜殺",desc:"自己生命低於最大生命一半時，攻擊提高4%（依自身基礎攻擊計算）；回到一半以上就恢復原狀。"}},
  // 占卜師（暫名）：新 SSR 術士，已開放取得（進招募池、合成、熔煉）。想先封住就加回 off:1（只在圖鑑展示，不算收藏數）
  diviner:{name:"占卜師",r:"SSR",hp:28,atk:6,def:1,spd:5,
    skill:{name:"厄運宣告",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.45倍攻擊傷害（受對方防禦影響；術士加成後約1.74倍），並標記2回合：該敵人受到的傷害+15%；同時使全體敵人攻擊-10%（2回合，每人至少-1）。",
      use(B,u,t){hit(B,u,t,1.45);if(t.alive){t.st.curse=2;fx(B,t,"厄運","sk");poison(B,t,5,3);}
        foes(B,u).forEach(x=>{if(x.alive)buff(B,x,"atk",-Math.max(1,Math.round(stat(x,"atk")*.1)),2);});blog(B,`${nm(u)} 翻開書頁：「你的運氣，到此為止。」`);}},
    passive:{name:"毒傷",desc:"自己攻擊時（普通攻擊與技能），使目標中毒：每回合受到5點傷害，持續3回合（技能施放時因術士加成為6點）。毒傷不受防禦與減傷影響，不會疊加（取最強），可被淨化解除。"}},

  // 毒蛙（暫名）：預計中的新 SSR 術士。off:1＝尚未開放取得（不進招募池、不進合成熔煉、不算收藏數），只在圖鑑展示；開放時拿掉 off 即可
  venomfrog:{name:"毒蛙",r:"SSR",off:1,hp:28,atk:6,def:1,spd:4,
    skill:{name:"毒沫",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.1倍攻擊傷害（受對方防禦影響；術士加成後約1.32倍），並使自己攻擊+30%、其他隊友攻擊+10%（2回合，每人至少+1）。",
      use(B,u,t){hit(B,u,t,1.1);if(t.alive)poison(B,t,Math.max(1,Math.round(stat(u,"atk")*.15)),2);
        buff(B,u,"atk",Math.max(1,Math.round(stat(u,"atk")*.3)),2);
        mates(B,u).filter(m=>m!==u).forEach(m=>buff(B,m,"atk",Math.max(1,Math.round(stat(m,"atk")*.1)),2));blog(B,`${nm(u)} 吐出一口泛著綠光的毒沫。`);}},
    passive:{name:"毒傷",desc:"自己攻擊時（普通攻擊與技能），使目標中毒：每回合受到自己攻擊力15%的傷害（至少1點），持續2回合（技能施放時因術士加成多1點）。毒傷不受防禦與減傷影響，不會疊加（取最強），可被淨化解除。"}},

  // 冰霜葉（暫名）：預計中的新 SSR 術士，有兩個主動技能。off:1＝尚未開放取得，只在圖鑑展示；開放時拿掉 off 即可
  icemage:{name:"冰霜葉",r:"SSR",off:1,hp:30,atk:7,def:2,spd:2,
    skills:[
      {name:"元素漩渦",cd:5,t:"enemy",kind:"dmg",desc:"對1名敵人造成3倍攻擊傷害（術士加成後約3.6倍），有15%機率完全無視對方的防禦，其餘時候受對方防禦影響。",
        use(B,u,t){const ig=rnd()<.15;if(ig)blog(B,`❄ ${nm(u)} 的寒氣穿透了一切防禦！`);hit(B,u,t,3,ig?{ignoreDef:true}:{});}},
      {name:"暴風雪",cd:4,t:"none",kind:"dmg",desc:"對全體敵人各造成1.6倍攻擊傷害（受對方防禦影響；術士加成後約1.92倍），每個被打中的敵人有15%機率暈眩1回合（對魔王只有10%）。",
        use(B,u){blog(B,"🌨 暴風雪席捲了整個戰場。");foes(B,u).forEach(t=>{const d=hit(B,u,t,1.6);if(t.alive&&d>0&&rnd()<((isBossUnit(t)||t.id==="babydragon")?.10:.15))stun(B,t,1);});}}],
    passive:{name:"能量外套",desc:"受到傷害時，實際受到的傷害減免15%。"}},
  master:{name:"主人",r:"SSR",off:1,hp:34,atk:6,def:3,spd:1,
    skill:{name:"乖，過來",cd:2,t:"ally",kind:"heal",desc:"治療1名隊友，治療量為自己攻擊的2.2倍，並清除其負面狀態；被治療的隊友受到的傷害-20%、攻擊+12%（2回合，至少+1）。",
      use(B,u,t){blog(B,`${nm(u)} 招了招手：「乖，過來。」`);heal(B,t,Math.round(stat(u,"atk")*2.2));cleanse(t);
        buff(B,t,"dr",20,2);buff(B,t,"atk",Math.max(1,Math.round(stat(t,"atk")*.12)),2);}},
    passive:{name:"寵愛／神隱",desc:"「寵愛」：自己的回合開始時，全體隊友各回復3%最大生命（自己生命低於40%時為5%）。「神隱」：不會普通攻擊；輪到自己時技能在冷卻中無法施放，就自動進入防禦（受到的傷害減半，並回復1點生命）。"}},

  merc:{name:"雇傭兵",r:"SR",hp:28,atk:6,def:2,spd:3,
    skill:{name:"霰彈掃射",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.75倍攻擊傷害。",use(B,u){foes(B,u).forEach(t=>hit(B,u,t,.75));}},
    passive:{name:"武器精通",desc:"遠征中裝備武器時，武器加成×2。"}},
  hunter:{name:"獵人",r:"SR",hp:26,atk:6,def:1,spd:5,
    skill:{name:"獵殺",cd:2,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.5倍攻擊傷害；目標生命低於40%時改為2.5倍。",use(B,u,t){hit(B,u,t,t.hp<t.maxHp*.4?2.5:1.5);}},
    passive:{name:"埋伏",desc:"戰鬥開始時，全體敵人失去2生命（不會致死）。"}},
  medic:{name:"醫官",r:"SR",hp:24,atk:4,def:1,spd:4,
    skill:{name:"緊急手術",cd:2,t:"ally",kind:"heal",desc:"對1名隊友恢復12生命，並解除中毒與減益。",use(B,u,t){cleanse(t);heal(B,t,12);}},
    passive:{name:"醫者仁心",desc:"每個自己的回合開始時，生命比例最低的受傷隊友恢復2生命。"}},
  fatty:{name:"肥宅",r:"SR",hp:36,atk:4,def:2,spd:2,
    skill:{name:"肥宅味",cd:3,t:"self",kind:"buff",desc:"嘲諷（敵人優先攻擊自己）2回合，防禦+2（2回合）。",use(B,u){u.st.taunt=3;buff(B,u,"def",2,2);blog(B,`一股濃烈的肥宅味瀰漫開來……敵人的視線全被 ${nm(u)} 吸走了。`);}},
    passive:{name:"肥肉坦克",desc:"受到的傷害-2。"}},
  bomb:{name:"橡膠人",r:"SR",hp:28,atk:5,def:1,spd:4,
    skill:{name:"隔空取物",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成0.8倍攻擊傷害，目標攻擊-2（3回合），自己攻擊+2（3回合）。",use(B,u,t){hit(B,u,t,.8);if(t.alive)buff(B,t,"atk",-2,3);buff(B,u,"atk",2,3);}},
    passive:{name:"橡膠身軀",desc:"被攻擊時，有25%機率把一半傷害反彈給攻擊者。"}},
  veteran:{name:"鐵血老兵",r:"SR",hp:30,atk:6,def:2,spd:3,
    skill:{name:"衝鋒",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.5倍攻擊傷害，有30%機率使其暈眩1回合。",use(B,u,t){hit(B,u,t,1.5);if(t.alive&&rnd()<.3)stun(B,t,1);}},
    passive:{name:"破釜沉舟",desc:"自己生命在35%以下時，受到的傷害-4。"}},
  sniper:{name:"狙擊手",r:"SR",hp:22,atk:8,def:0,spd:5,
    skill:{name:"爆頭",cd:4,t:"enemy",kind:"dmg",desc:"對1名敵人造成2.6倍攻擊傷害，無視對方防禦。",use(B,u,t){hit(B,u,t,2.6,{pierce:true});}},
    passive:{name:"鷹眼",desc:"暴擊率提高到20%（一般8%）。"}},
  assassin:{name:"刺客",r:"SR",hp:22,atk:7,def:0,spd:6,
    skill:{name:"背刺",cd:2,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.8倍攻擊傷害；目標速度比自己低時改為2.4倍。",use(B,u,t){hit(B,u,t,stat(t,"spd")<stat(u,"spd")?2.4:1.8);}},
    passive:{name:"無聲離場",desc:"擊倒敵人後，立刻再行動一次（每回合限1次）。"}},
  paramedic:{name:"急救員",r:"SR",hp:24,atk:4,def:1,spd:4,
    skill:{name:"群體急救",cd:3,t:"none",kind:"heal",desc:"全體隊友恢復7生命。",use(B,u){mates(B,u).forEach(m=>heal(B,m,7));}},
    passive:{name:"黃金十分鐘",desc:"每場戰鬥第一位將倒下的隊友會保留1生命。"}},
  tamer:{name:"馴獸師",r:"SR",hp:28,atk:6,def:1,spd:4,
    skill:{name:"巡迴獵犬",cd:2,t:"none",kind:"dmg",desc:"獵犬撲咬隨機敵人2次，每次造成0.7倍攻擊傷害。",use(B,u){for(let i=0;i<2;i++){const f=foes(B,u);if(f.length)hit(B,u,pick(f),.7);}}},
    passive:{name:"獵犬夥伴",desc:"被攻擊時，有25%機率由獵犬反咬攻擊者，造成3點固定傷害。"}},
  geneFreak:{name:"基因怪人",r:"SR",hp:30,atk:6,def:1,spd:3,
    skill:{name:"基因重組",cd:2,t:"self",kind:"buff",desc:"自己失去4生命，攻擊永久+3（本場）。生命需大於5。",use(B,u){u.hp-=4;u.perm.atk=(u.perm.atk||0)+3;fx(B,u,"+3攻","sk");}},
    passive:{name:"先天優勢",desc:"戰鬥開始時，隨機獲得攻擊+2、防禦+2或速度+2（本場）。"}},
  chemist:{name:"化學家",r:"SR",hp:24,atk:5,def:1,spd:4,run:"gasResist",
    skill:{name:"毒性調和",cd:4,t:"none",kind:"dmg",desc:"使全體敵人中毒（每回合3點，3回合）。",use(B,u){foes(B,u).forEach(t=>poison(B,t,3,3));}},
    passive:{name:"抗毒",desc:"免疫中毒；遠征中全隊毒氣傷害-1。"}},
  bodyguard:{name:"保鑣",r:"SR",hp:32,atk:5,def:3,spd:3,
    skill:{name:"鐵壁",cd:4,t:"none",kind:"buff",desc:"直到自己的下回合，全體隊友（含自己）受到的傷害減半。",use(B,u){B.wall[u.side]=u.uid;blog(B,`${nm(u)} 張開雙臂築起鐵壁！`);}},
    passive:{name:"擋刀",desc:"生命低於一半的隊友被攻擊時，有40%機率改由自己承受。"}},
  leader:{name:"團長",r:"SR",hp:28,atk:5,def:2,spd:4,
    skill:{name:"衝啊！",cd:3,t:"none",kind:"buff",desc:"全體隊友攻擊+2、速度+1（2回合）。",use(B,u){mates(B,u).forEach(m=>{buff(B,m,"atk",2,2);buff(B,m,"spd",1,2);});}},
    passive:{name:"指揮",desc:"戰鬥開始時，全體隊友防禦+1（本場）。"}},
  witch:{name:"女巫",r:"SR",hp:24,atk:6,def:0,spd:4,
    skill:{name:"詛咒",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人施加攻擊-3、防禦-2（3回合），並使其中毒（每回合2點，2回合）。",use(B,u,t){buff(B,t,"atk",-3,3);buff(B,t,"def",-2,3);poison(B,t,2,2);blog(B,`${nm(t)} 被女巫的詛咒纏身。`);}},
    passive:{name:"魔女之釜",desc:"每個自己的回合開始時，有30%機率使隨機1名敵人中毒（每回合2點，2回合）。"}},

  gambler:{name:"賭徒",r:"R",hp:24,atk:5,def:1,spd:4,
    skill:{name:"好賭成性",cd:1,t:"enemy",kind:"dmg",desc:"擲骰：1-2 落空且自己失去2生命；3-4 造成1倍攻擊傷害；5-6 造成3倍攻擊傷害。",
      use(B,u,t){let d=ri(1,6);if(!u.flags.gambled){u.flags.gambled=1;d=ri(5,6);}blog(B,`🎲 ${nm(u)} 擲出了 <b>${d}</b>！`);if(d<=2){u.hp=Math.max(1,u.hp-2);fx(B,u,"-2","dmg");}else hit(B,u,t,d<=4?1:3);}},
    passive:{name:"逢賭必贏",desc:"每場戰鬥第一次【好賭成性】必定擲出5-6。"}},
  scavenger:{name:"拾荒者",r:"R",hp:24,atk:5,def:1,spd:4,run:"scavenge",
    skill:{name:"丟垃圾",cd:2,t:"enemy",kind:"dmg",desc:"對1名敵人造成0.9倍攻擊傷害，目標攻擊-2（2回合）。",use(B,u,t){hit(B,u,t,.9);if(t.alive)buff(B,t,"atk",-2,2);}},
    passive:{name:"拾荒嗅覺",desc:"遠征中搜索時，有40%機率多找到1件道具；遇到垃圾堆時額外補給+2。"}},
  trucker:{name:"貨車司機",r:"R",hp:30,atk:5,def:2,spd:3,
    skill:{name:"猛烈衝撞",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成4點固定傷害，自己失去1生命。",use(B,u){foes(B,u).forEach(t=>hit(B,u,t,1,{fixed:4}));u.hp=Math.max(1,u.hp-1);}},
    passive:{name:"卸載加速",desc:"第一回合速度+3。"}},
  bartender:{name:"飲品師",r:"R",hp:24,atk:4,def:1,spd:4,
    skill:{name:"特調精釀",cd:2,t:"ally",kind:"heal",desc:"對1名隊友隨機給一杯特調：恢復8生命／攻擊+3（2回合）／防禦+3（2回合）／解除中毒與減益並恢復4生命。",
      use(B,u,t){const k=ri(1,4);if(k===1)heal(B,t,8);else if(k===2)buff(B,t,"atk",3,2);else if(k===3)buff(B,t,"def",3,2);else{cleanse(t);heal(B,t,4);}blog(B,`🍹 ${nm(t)} 喝下了「${["","血腥瑪麗","烈火龍舌蘭","鐵壁琴通寧","醒酒薄荷"][k]}」。`);}},
    passive:{name:"舉杯共飲",desc:"戰鬥開始時，全體隊友恢復3生命。"}},
  herbalist:{name:"草藥師",r:"R",hp:22,atk:4,def:1,spd:4,run:"herb",
    skill:{name:"草藥敷",cd:2,t:"ally",kind:"heal",desc:"對1名隊友恢復9生命，並解除中毒與減益。",use(B,u,t){cleanse(t);heal(B,t,9);}},
    passive:{name:"藥效增強",desc:"遠征中藥片的恢復量+4。"}},
  runner:{name:"馬拉松跑者",r:"R",hp:24,atk:5,def:1,spd:6,
    skill:{name:"長跑",cd:3,t:"self",kind:"buff",desc:"自己獲得2次閃避，可以躲掉受到的攻擊（無視防禦、固定傷害的攻擊閃不掉）。",use(B,u){u.st.evade=(u.st.evade||0)+2;fx(B,u,"閃避×2","sk");}},
    passive:{name:"耐力訓練",desc:"每個自己的回合開始時恢復1生命。"}},
  chef:{name:"廚師",r:"R",hp:26,atk:5,def:1,spd:3,run:"chef",
    skill:{name:"加菜",cd:3,t:"none",kind:"heal",desc:"全體隊友恢復4生命。",use(B,u){mates(B,u).forEach(m=>heal(B,m,4));}},
    passive:{name:"一餐抵兩餐",desc:"遠征中每上一層，50%機率不消耗補給。"}},
  survivor:{name:"求生教官",r:"R",hp:32,atk:5,def:1,spd:3,run:"tough",
    skill:{name:"野戰急救",cd:3,t:"self",kind:"heal",desc:"自己恢復10生命。",use(B,u){heal(B,u,10);}},
    passive:{name:"強健體魄",desc:"生命較高；遠征中自己受到的毒氣傷害-1。"}},
  diver:{name:"潛水員",r:"R",hp:26,atk:5,def:1,spd:4,run:"breath",
    skill:{name:"水底突襲",cd:2,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.4倍攻擊傷害。",use(B,u,t){hit(B,u,t,1.4);}},
    passive:{name:"憋氣術",desc:"遠征中自己免疫毒氣傷害。"}},
  miner:{name:"礦工",r:"R",hp:28,atk:5,def:2,spd:2,run:"miner",
    skill:{name:"鎬擊",cd:2,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.3倍攻擊傷害，無視對方防禦。",use(B,u,t){hit(B,u,t,1.3,{pierce:true});}},
    passive:{name:"挖礦本能",desc:"遠征中每進入一個房間，40%機率挖到2金條。"}},
  mediocre:{name:"庸才",r:"R",hp:22,atk:4,def:0,spd:3,
    skill:{name:"以命換命",cd:1,t:"enemy",kind:"dmg",desc:"自己失去3生命，對1名敵人造成2.2倍攻擊傷害。生命需大於3。",use(B,u,t){u.hp-=3;hit(B,u,t,2.2);}},
    passive:{name:"庸才逆襲",desc:"每有1名隊友倒下，攻擊永久+2（本場）。"}},
  courier:{name:"郵差",r:"R",hp:24,atk:5,def:1,spd:5,
    skill:{name:"專人配送",cd:2,t:"mate",kind:"buff",desc:"對另1名隊友：技能冷卻歸零，攻擊+2（2回合）。",use(B,u,t){t.cds.fill(0);buff(B,t,"atk",2,2);fx(B,t,"冷卻重置","sk");}},
    passive:{name:"超載快遞",desc:"遠征中戰鬥勝利後，30%機率額外獲得1件道具。"},run:"courier"},
  gourmet:{name:"老饕",r:"R",hp:28,atk:5,def:1,spd:3,run:"gourmet",
    skill:{name:"吃播",cd:3,t:"self",kind:"heal",desc:"自己恢復6生命，攻擊永久+2（本場）。",use(B,u){heal(B,u,6);u.perm.atk=(u.perm.atk||0)+2;}},
    passive:{name:"美食鑑賞",desc:"遠征中每消耗1份補給，自己恢復2生命。"}},
  climber:{name:"攀岩者",r:"R",hp:24,atk:5,def:1,spd:5,run:"climb",
    skill:{name:"飛踢",cd:2,t:"enemy",kind:"dmg",desc:"對1名敵人造成1.3倍攻擊傷害，有30%機率使其暈眩1回合。",use(B,u,t){hit(B,u,t,1.3);if(t.alive&&rnd()<.3)stun(B,t,1);}},
    passive:{name:"垂直攀爬",desc:"遠征中選擇房間時多1個選項。"}},
  hacker:{name:"黑客",r:"R",hp:22,atk:4,def:1,spd:5,run:"reveal",
    skill:{name:"遠端操控",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成0.6倍攻擊傷害，有60%機率使其暈眩1回合。",use(B,u,t){hit(B,u,t,.6);if(t.alive&&rnd()<.6)stun(B,t,1);}},
    passive:{name:"系統監控",desc:"遠征中可看見未知房間裡的事件。"}},
  tycoon:{name:"富豪",r:"R",hp:24,atk:4,def:1,spd:3,run:"rich",
    skill:{name:"撒錢",cd:3,t:"none",kind:"buff",desc:"金條漫天飛舞：每名敵人有35%機率撿錢而暈眩1回合。",use(B,u){blog(B,`💰 ${nm(u)} 把金條撒向空中！`);foes(B,u).forEach(t=>{if(rnd()<.35)stun(B,t,1);});}},
    passive:{name:"腰纏萬貫",desc:"遠征中獲得的金條+30%。"}},
  lucky:{name:"幸運兒",r:"R",hp:24,atk:5,def:1,spd:4,
    skill:{name:"吉星高照",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成1倍攻擊傷害，必定暴擊（暴擊傷害為1.5倍）。",use(B,u,t){hit(B,u,t,1,{crit:true});}},
    passive:{name:"好運連連",desc:"暴擊率25%；被攻擊時，有15%機率閃避。"}},
  arsonist:{name:"縱火犯",r:"R",hp:24,atk:6,def:0,spd:4,
    skill:{name:"縱火",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.5倍攻擊傷害，並使其燃燒（每回合2點，3回合）。",use(B,u){foes(B,u).forEach(t=>{hit(B,u,t,.5);if(t.alive)poison(B,t,2,3);});}},
    passive:{name:"火中取栗",desc:"對中毒／燃燒中的目標傷害+2。"}},
  sentinel:{name:"哨兵",r:"R",hp:28,atk:5,def:2,spd:4,
    skill:{name:"警戒",cd:3,t:"self",kind:"buff",desc:"2回合內被攻擊時，以0.8倍攻擊傷害反擊。",use(B,u){u.st.counter=3;fx(B,u,"警戒","sk");}},
    passive:{name:"哨塔先機",desc:"第一回合速度+5。"}},
  janitor:{name:"清潔工",r:"R",hp:26,atk:5,def:1,spd:4,
    skill:{name:"大掃除",cd:3,t:"none",kind:"buff",desc:"解除全體隊友的中毒與減益，並清除敵人所有增益。",use(B,u){mates(B,u).forEach(cleanse);foes(B,u).forEach(t=>t.buffs=t.buffs.filter(b=>b.v<0));blog(B,`🧹 ${nm(u)} 把戰場掃得一乾二淨。`);}},
    passive:{name:"清理現場",desc:"每有敵人倒下，自己恢復3生命。"}},
  detective:{name:"私家偵探",r:"R",hp:24,atk:5,def:1,spd:4,run:"reveal",
    skill:{name:"推理",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成0.8倍攻擊傷害，並標記2回合：其受到的傷害+50%。",use(B,u,t){hit(B,u,t,.8);if(t.alive){t.st.mark=2;fx(B,t,"標記","sk");}}},
    passive:{name:"洞察",desc:"遠征中可看見未知房間的事件；對標記目標暴擊率+30%。"}},
  // 劇情角色（story:true）：通關第 gachaCh 章後才會進招募池；不能合成、熔煉、遣散，也不能當「轉換」的來源；故事線裡以劇情隊友的身分加入遠征
  ashen:{name:"阿燼",r:"SSR",story:true,gachaCh:15,hp:36,atk:7,def:1,spd:4,
    skill:{name:"撿回來的刀",cd:3,t:"enemy",kind:"dmg",desc:"對1名敵人造成2.0倍攻擊傷害（受對方防禦影響）；自己生命低於50%時，改為2.6倍。",
      use(B,u,t){const low=u.hp<u.maxHp*.5;if(low)blog(B,`${nm(u)} 握緊了劍：「……還沒結束。」`);hit(B,u,t,low?2.6:2.0);}},
    passive:{name:"我不會丟下你",desc:"隊友生命低於35%時，被攻擊有40%機率改由阿燼代為承受，代受的傷害為原本的60%；每代受1次，攻擊永久+6%（至少+1），本場最多疊3次。羈絆「名冊合照」：與晴同時在場時，阿燼的攻擊+4%。"}},
  qing:{name:"晴",r:"SSR",story:true,gachaCh:15,hp:28,atk:4,def:1,spd:4,
    skill:{name:"唸出名字",cd:4,t:"none",kind:"heal",desc:"全體隊友各恢復22.5%最大生命（至少5），並解除中毒與減益。",
      use(B,u){blog(B,`${nm(u)} 輕聲唸出每一個名字。`);mates(B,u).forEach(m=>{heal(B,m,Math.max(5,Math.round(m.maxHp*.225)));cleanse(m);});}},
    passive:{name:"我記得你",desc:"每當有隊友倒下，全體隊友攻擊永久+4%（至少+1），本場最多疊3次。羈絆「名冊合照」：與阿燼同時在場時，晴的治療量+7.5%。"}},
  // 《肥宅物語》通關後，由 SR 肥宅進化而來（不進招募池）
  fatty2:{name:"肥宅",r:"SSR",story:true,evolveFrom:"fatty",gachaCh:9999,hp:54,atk:6,def:3,spd:3,
    skill:{name:"肉盾坦克",cd:3,t:"self",kind:"buff",desc:"嘲諷（敵人優先攻擊自己）2回合，防禦+4（2回合），並恢復10%最大生命。",use(B,u){u.st.taunt=3;buff(B,u,"def",4,2);heal(B,u,Math.max(2,Math.round(u.maxHp*.1)));blog(B,`${nm(u)} 戴上耳機：「好，這一關，我來扛。」`);}},
    passive:{name:"LEVEL UP",desc:"每次被攻擊後，防禦+2（本場，可累加）；每被攻擊5次，防禦再額外+2（本場）。防禦加成上限+25。"}}
};
const MONSTERS={
  ghost:{name:"暗影",emoji:"👻",r:"R",hp:18,atk:6,def:0,spd:5,
    skill:{name:"吸血",cd:2,t:"enemy",kind:"dmg",desc:"造成1.2倍攻擊傷害並恢復傷害一半的生命。",use(B,u,t){const d=hit(B,u,t,1.2);if(d)heal(B,u,Math.ceil(d/2));}},
    passive:{name:"虛體",desc:"受到的傷害-1。"}},
  warden:{name:"看守魔王",emoji:"😈",r:"SSR",hp:80,atk:7,def:3,spd:3,
    skill:{name:"毒氣噴發",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.7倍攻擊傷害並中毒（每回合2點，2回合）。",use(B,u){blog(B,"☣ 魔王的面罩噴出濃稠的綠霧！","bad");foes(B,u).forEach(t=>{hit(B,u,t,.7);if(t.alive)poison(B,t,2,2);});}},
    passive:{name:"魔王之軀",desc:"受到的傷害-1；生命低於一半時攻擊+3。"}},
  mutant:{name:"失控實驗體",emoji:"🧟",r:"R",hp:20,atk:6,def:1,spd:4,
    skill:{name:"撕咬",cd:2,t:"enemy",kind:"dmg",desc:"造成1.2倍攻擊傷害並使目標中毒（每回合2點，2回合）。",use(B,u,t){hit(B,u,t,1.2);if(t.alive)poison(B,t,2,2);}},
    passive:{name:"增生組織",desc:"每回合開始恢復2生命。"}},
  zero:{name:"實驗體零號",emoji:"🧬",r:"SSR",hp:90,atk:7,def:2,spd:4,
    skill:{name:"狂暴撕裂",cd:3,t:"none",kind:"dmg",desc:"攻擊隨機敵人2次（可能是同一人），每次1.1倍傷害。",use(B,u){blog(B,"🧬 零號的手臂裂開成數條觸手！","bad");for(let i=0;i<2;i++){const f=foes(B,u);if(!f.length)break;hit(B,u,pick(f),1.1);}}},
    passive:{name:"再生",desc:"受到的傷害-1；每回合開始恢復4生命。"}},
  guard:{name:"獄警",emoji:"👮",r:"R",hp:22,atk:6,def:2,spd:3,
    skill:{name:"電擊警棍",cd:3,t:"enemy",kind:"dmg",desc:"造成0.9倍攻擊傷害，40%機率暈眩目標1回合。",use(B,u,t){hit(B,u,t,.9);if(t.alive&&rnd()<.4)stun(B,t,1);}},
    passive:{name:"防暴盾",desc:"受到的傷害-1。"}},
  chief:{name:"典獄長",emoji:"🎖️",r:"SSR",hp:100,atk:7,def:4,spd:3,
    skill:{name:"全面鎮壓",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.6倍攻擊傷害，每人25%機率暈眩1回合。",use(B,u){blog(B,"🎖 典獄長吹響哨子：「全部趴下！」","bad");foes(B,u).forEach(t=>{hit(B,u,t,.6);if(t.alive&&rnd()<.25)stun(B,t,1);});}},
    passive:{name:"鐵腕",desc:"受到的傷害-1；生命低於一半時防禦+2。"}},
  drone:{name:"保全機器人",emoji:"🤖",r:"R",hp:20,atk:6,def:2,spd:5,
    skill:{name:"雷射掃射",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.6倍攻擊傷害。",use(B,u){blog(B,"🤖 紅色雷射掃過整個房間！","bad");foes(B,u).forEach(t=>hit(B,u,t,.6));}},
    passive:{name:"機械身軀",desc:"免疫中毒。"}},
  host:{name:"主辦人",emoji:"🎭",r:"SSR",hp:110,atk:8,def:3,spd:5,
    skill:{name:"規則改寫",cd:3,t:"none",kind:"dmg",desc:"隨機發動一條新規則：全體敵人0.8倍傷害／自己恢復15生命／全體敵人中毒（每回合3點，2回合）。",use(B,u){const k=ri(1,3);
      if(k===1){blog(B,"🎭「新規則：所有人一起受罰。」","bad");foes(B,u).forEach(t=>hit(B,u,t,.8));}
      else if(k===2){blog(B,"🎭「新規則：莊家回血。」","bad");heal(B,u,15);}
      else{blog(B,"🎭「新規則：空氣裡加點料。」","bad");foes(B,u).forEach(t=>poison(B,t,3,2));}}},
    passive:{name:"莊家優勢",desc:"受到的傷害-1；第一次倒下時以30%生命重新站起。"}},
  // 第5章以後的怪物：dr 減傷、regen 每回合回血、evade 閃避率、revive 第一次倒下復活比例（由戰鬥引擎通用處理）
  deepone:{name:"深海人",emoji:"🧜",r:"R",hp:22,atk:7,def:1,spd:4,dr:1,
    skill:{name:"高壓水刃",cd:2,t:"enemy",kind:"dmg",desc:"造成1.3倍攻擊傷害，目標防禦-2（2回合）。",use(B,u,t){hit(B,u,t,1.3);if(t.alive)buff(B,t,"def",-2,2);}},
    passive:{name:"鱗甲",desc:"受到的傷害-1。"}},
  kraken:{name:"深海巨獸",emoji:"🐙",r:"SSR",hp:120,atk:8,def:3,spd:3,dr:1,regen:3,
    skill:{name:"觸手絞殺",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.8倍攻擊傷害，每人30%機率被纏住（暈眩1回合）。",use(B,u){blog(B,"🐙 數十條觸手從海水裡竄出！","bad");foes(B,u).forEach(t=>{hit(B,u,t,.8);if(t.alive&&rnd()<.3)stun(B,t,1);});}},
    passive:{name:"深淵之軀",desc:"受到的傷害-1；每回合開始恢復3生命。"}},
  mirror:{name:"鏡像囚犯",emoji:"🪞",r:"R",hp:22,atk:7,def:1,spd:5,evade:.2,
    skill:{name:"倒影",cd:2,t:"enemy",kind:"dmg",desc:"造成1.5倍攻擊傷害。",use(B,u,t){hit(B,u,t,1.5);}},
    passive:{name:"鏡面",desc:"被攻擊時20%機率閃避。"}},
  judge:{name:"審判者",emoji:"⚖️",r:"SSR",hp:130,atk:9,def:3,spd:4,dr:2,revive:.4,
    skill:{name:"最終審判",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.8倍攻擊傷害，再對生命最低的敵人追加1.2倍傷害。",
      use(B,u){blog(B,"⚖ 「被告，全員有罪。」","bad");foes(B,u).forEach(t=>hit(B,u,t,.8));const f=foes(B,u).sort((a,b)=>a.hp-b.hp)[0];if(f)hit(B,u,f,1.2);}},
    passive:{name:"不朽",desc:"受到的傷害-2；第一次倒下時以40%生命重新站起。"}},
  // 第7、8章
  echo:{name:"時間殘響",emoji:"👥",r:"R",hp:24,atk:8,def:2,spd:5,regen:3,
    skill:{name:"重播",cd:2,t:"enemy",kind:"dmg",desc:"把上一回合的攻擊再放一次：造成1.4倍攻擊傷害。",use(B,u,t){hit(B,u,t,1.4);}},
    passive:{name:"回溯",desc:"每回合開始恢復3生命。"}},
  loopkeeper:{name:"輪迴看守",emoji:"⏳",r:"SSR",hp:140,atk:10,def:4,spd:4,dr:2,regen:5,
    skill:{name:"時間停止",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.8倍攻擊傷害，每人40%機率暈眩1回合。",
      use(B,u){blog(B,"⏳ 沙漏翻轉。所有人的動作都停在半空中。","bad");foes(B,u).forEach(t=>{hit(B,u,t,.8);if(t.alive&&rnd()<.4)stun(B,t,1);});}},
    passive:{name:"永恆",desc:"受到的傷害-2；每回合恢復5生命。"}},
  doppel:{name:"另一個你",emoji:"👤",r:"R",hp:26,atk:9,def:2,spd:5,evade:.15,
    skill:{name:"模仿",cd:2,t:"enemy",kind:"dmg",desc:"學你的招式：造成1.6倍攻擊傷害。",use(B,u,t){hit(B,u,t,1.6);}},
    passive:{name:"似曾相識",desc:"被攻擊時15%機率閃避。"}},
  origin:{name:"創始者",emoji:"👁️",r:"SSR",hp:160,atk:11,def:4,spd:5,dr:2,revive:.5,
    skill:{name:"重寫世界",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成1倍攻擊傷害，並隨機施加：攻擊-3／防禦-3／中毒（每回合4點，2回合）。",
      use(B,u){blog(B,"👁 「這個世界，是我寫的。」","bad");foes(B,u).forEach(t=>{hit(B,u,t,1);if(!t.alive)return;const k=ri(1,3);
        if(k===1)buff(B,t,"atk",-3,2);else if(k===2)buff(B,t,"def",-3,2);else poison(B,t,4,2);});}},
    passive:{name:"作者權限",desc:"受到的傷害-2；第一次倒下時以50%生命重新站起。"}},
  // 第9、10章（偏難）
  cameraman:{name:"攝影無人機",emoji:"🎥",r:"R",hp:26,atk:9,def:3,spd:6,evade:.1,
    skill:{name:"特寫鏡頭",cd:2,t:"enemy",kind:"dmg",desc:"鎖定目標造成1.5倍攻擊傷害，並標記2回合（受到的傷害+50%）。",use(B,u,t){hit(B,u,t,1.5);if(t.alive){t.st.mark=2;fx(B,t,"特寫","sk");}}},
    passive:{name:"空拍",desc:"被攻擊時10%機率閃避。"}},
  producer:{name:"製作人",emoji:"🎬",r:"SSR",hp:170,atk:12,def:5,spd:5,dr:3,regen:6,
    skill:{name:"收視率爆發",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成1.1倍攻擊傷害，自己攻擊+3（3回合）。",
      use(B,u){blog(B,"🎬 「收視率還不夠！再來一次！」","bad");foes(B,u).forEach(t=>hit(B,u,t,1.1));buff(B,u,"atk",3,3);}},
    passive:{name:"剪輯權",desc:"受到的傷害-3；每回合恢復6生命。"}},
  fanatic:{name:"狂熱粉絲",emoji:"🤳",r:"R",hp:28,atk:10,def:2,spd:6,regen:3,
    skill:{name:"瘋狂應援",cd:2,t:"enemy",kind:"dmg",desc:"撲上來造成1.6倍攻擊傷害，30%機率暈眩目標1回合。",use(B,u,t){hit(B,u,t,1.6);if(t.alive&&rnd()<.3)stun(B,t,1);}},
    passive:{name:"愛到瘋狂",desc:"每回合開始恢復3生命。"}},
  audience:{name:"千萬觀眾",emoji:"🌐",r:"SSR",hp:200,atk:13,def:5,spd:6,dr:3,regen:8,revive:.4,
    skill:{name:"投票處刑",cd:3,t:"none",kind:"dmg",desc:"全網投票：對生命最低的敵人造成2.5倍攻擊傷害，再對全體敵人各造成0.7倍攻擊傷害。",
      use(B,u){const f=foes(B,u).sort((a,b)=>a.hp-b.hp);if(!f.length)return;blog(B,"🌐 螢幕上的票數瘋狂跳動：「淘汰他！」","bad");hit(B,u,f[0],2.5);foes(B,u).forEach(t=>hit(B,u,t,.7));}},
    passive:{name:"輿論",desc:"受到的傷害-3；每回合恢復8生命；第一次倒下時以40%生命重新站起。"}},
  // 第11、12章（第二季，偏難）
  rookie:{name:"第二季參賽者",emoji:"🎟️",r:"R",hp:30,atk:11,def:3,spd:6,dr:1,
    skill:{name:"新人的狠勁",cd:2,t:"enemy",kind:"dmg",desc:"造成1.6倍攻擊傷害，自己防禦+2（2回合）。",use(B,u,t){hit(B,u,t,1.6);buff(B,u,"def",2,2);}},
    passive:{name:"有備而來",desc:"受到的傷害-1。"}},
  castingdir:{name:"選角導演",emoji:"📋",r:"SSR",hp:190,atk:14,def:6,spd:5,dr:3,regen:8,
    skill:{name:"試鏡淘汰",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成1倍攻擊傷害，並讓生命最低的敵人暈眩1回合。",
      use(B,u){blog(B,"📋 「下一位。」——導演在名單上劃掉一個名字。","bad");foes(B,u).forEach(t=>hit(B,u,t,1));const f=foes(B,u).sort((a,b)=>a.hp-b.hp)[0];if(f)stun(B,f,1);}},
    passive:{name:"選角權",desc:"受到的傷害-3；每回合恢復8生命。"}},
  guardian:{name:"冠軍親衛隊",emoji:"🛡️",r:"R",hp:34,atk:11,def:5,spd:5,regen:3,
    skill:{name:"護駕",cd:2,t:"enemy",kind:"dmg",desc:"造成1.4倍攻擊傷害，嘲諷1回合（敵人優先攻擊自己）。",use(B,u,t){hit(B,u,t,1.4);u.st.taunt=2;}},
    passive:{name:"忠誠",desc:"每回合開始恢復3生命。"}},
  pastchamp:{name:"上一季的你",emoji:"🏆",r:"SSR",hp:210,atk:15,def:6,spd:7,dr:3,evade:.15,revive:.5,
    skill:{name:"冠軍的記憶",cd:3,t:"none",kind:"dmg",desc:"用你們會的每一招反打回來：全體敵人1.3倍傷害，自己恢復8%生命。",
      use(B,u){blog(B,"🏆 「這一招，我上一季就用過了。」","bad");foes(B,u).forEach(t=>hit(B,u,t,1.3));heal(B,u,Math.round(u.maxHp*.08));}},
    passive:{name:"衛冕者",desc:"受到的傷害-3；被攻擊時15%機率閃避；第一次倒下時以50%生命重新站起。"}}
  ,
  // 第13章《名冊》：回收場
  scrapbot:{name:"廢鐵拾荒機",emoji:"🦾",r:"R",hp:36,atk:12,def:5,spd:6,dr:1,
    skill:{name:"拆解",cd:2,t:"enemy",kind:"dmg",desc:"造成1.6倍攻擊傷害，目標防禦-2（2回合）。",use(B,u,t){hit(B,u,t,1.6);if(t.alive)buff(B,t,"def",-2,2);}},
    passive:{name:"廢鐵裝甲",desc:"受到的傷害-1。"}},
  // 第14章《名冊》：檔案館
  eraser:{name:"抹除者",emoji:"🫥",r:"R",hp:38,atk:13,def:5,spd:7,dr:1,
    skill:{name:"抹除",cd:2,t:"enemy",kind:"dmg",desc:"造成1.5倍攻擊傷害，目標攻擊-2（2回合）。",use(B,u,t){hit(B,u,t,1.5);if(t.alive)buff(B,t,"atk",-2,2);}},
    passive:{name:"空白之軀",desc:"受到的傷害-1。"}},
  editor:{name:"剪輯師",emoji:"✂️",r:"SSR",hp:150,atk:18,def:7,spd:7,dr:2,
    skill:{name:"剪掉",cd:3,t:"enemy",kind:"dmg",desc:"造成1.8倍攻擊傷害，並把目標的名字剪掉：標記2回合，受到的傷害+50%。",
      use(B,u,t){blog(B,"✂️ 「這個人，不需要出現。」","bad");hit(B,u,t,1.8);if(t.alive){t.st.mark=2;fx(B,t,"被剪掉","sk");}}},
    passive:{name:"無情剪輯",desc:"受到的傷害-2；對被標記的目標，造成的傷害+25%。擴散攻擊：單體攻擊造成傷害時，其餘敵人各受到該傷害的20%（固定傷害，不吃防禦）。"}},
  // 第15章《名冊》：第三十七個座位
  shadowling:{name:"失名之影",emoji:"👥",r:"R",hp:40,atk:14,def:5,spd:6,dr:1,
    skill:{name:"低語",cd:2,t:"enemy",kind:"dmg",desc:"造成1.5倍攻擊傷害並恢復傷害一半的生命。",use(B,u,t){const d=hit(B,u,t,1.5);if(d)heal(B,u,Math.ceil(d/2));}},
    passive:{name:"失名",desc:"受到的傷害-1。"}},
  nameless:{name:"無名者",emoji:"🫂",r:"SSR",hp:160,atk:20,def:7,spd:7,dr:2,
    skill:{name:"失名之潮",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.8倍攻擊傷害，每人30%機率暈眩1回合。",
      use(B,u){blog(B,"🫂 無數個聲音同時開口：「有人，記得我嗎？」","bad");foes(B,u).forEach(t=>{hit(B,u,t,.8,{noSpread:true});if(t.alive&&rnd()<.3)stun(B,t,1);});}},
    passive:{name:"千人之聲",desc:"受到的傷害-2；每回合開始攻擊永久+3%（最多疊10次）；每當敵方有人倒下，攻擊永久+10%。擴散攻擊：單體攻擊造成傷害時，其餘敵人各受到該傷害的20%（固定傷害，不吃防禦）。"}},
  reclaimer:{name:"回收者",emoji:"🦾",r:"SSR",hp:140,atk:16,def:6,spd:6,dr:2,
    skill:{name:"回收",cd:3,t:"none",kind:"dmg",desc:"對全體敵人各造成0.9倍攻擊傷害，生命最低的敵人再被追加1.3倍傷害，並使其防禦-3（2回合）。",
      use(B,u){blog(B,"🦾 「不合格的物品，需要回收。」鐵籠的門打開了。","bad");foes(B,u).forEach(t=>hit(B,u,t,.9,{noSpread:true}));const f=foes(B,u).sort((a,b)=>a.hp-b.hp)[0];if(f){hit(B,u,f,1.3);if(f.alive)buff(B,f,"def",-3,2);}}},
    passive:{name:"過載運轉",desc:"受到的傷害-2；每回合開始攻擊永久+3%（最多疊10次）；生命低於一半時攻擊額外+12%。擴散攻擊：單體攻擊造成傷害時，其餘敵人各受到該傷害的20%（固定傷害，不吃防禦）。"}}
};
const DEF=id=>CARDS[id]||MONSTERS[id];
// 主動技能清單：新格式寫 skills:[…]（可多個，各自冷卻）；舊格式只有 skill 的角色自動當成只有一個技能。技能序號 i 從 0 開始，戰鬥單位的冷卻存在 u.cds[i]
const skillsOf=id=>{const d=DEF(id);return d?(d.skills||(d.skill?[d.skill]:[])):[];};
// 有插圖的主線小怪與魔王（images/monsters/{代號}.webp）；沒有圖的小怪、或圖片載入失敗時，退回用表情符號
["ghost","guard","drone","mutant","doppel","echo","deepone","mirror","cameraman","fanatic","rookie","guardian","warden","zero","chief","host","kraken","judge","loopkeeper","origin","producer","audience","castingdir","pastchamp","scrapbot","reclaimer","eraser","editor","shadowling","nameless"].forEach(k=>{if(MONSTERS[k])MONSTERS[k].pic=true;});
const POOL={SSR:[],SR:[],R:[]};
Object.keys(CARDS).forEach(id=>{if(!CARDS[id].story&&!CARDS[id].off)POOL[CARDS[id].r].push(id);});
// N 白卡（雜物）：只能遣散換金條，不能組隊、升星、合成、熔煉；用數量堆疊在 SAVE.junk。圖片放 images/avatars/{代號}.webp，沒圖時用表情符號
const JUNK={
  tin:{name:"過期罐頭",emoji:"🥫",r:"N"},
  chair:{name:"斷腿椅子",emoji:"🪑",r:"N"},
  quilt:{name:"發霉棉被",emoji:"🛏️",r:"N"},
  torch:{name:"壞掉的手電筒",emoji:"🔦",r:"N"},
  sock:{name:"一雙襪子",emoji:"🧦",r:"N"},
  locker:{name:"空的鐵櫃",emoji:"🗄️",r:"N"}
};
const JUNK_IDS=Object.keys(JUNK),JUNK_PRICE=1;
const junkCount=()=>JUNK_IDS.reduce((a,k)=>a+((SAVE.junk&&SAVE.junk[k])||0),0);
const storyOn=id=>!!CARDS[id].story;
// 抽卡實際用的池子：一般角色＋已解鎖（通關到 gachaCh 章）的劇情角色。合成、熔煉的結果池不含劇情角色
function gachaPool(r){return POOL[r].concat(Object.keys(CARDS).filter(id=>CARDS[id].story&&CARDS[id].r===r&&SAVE.prog.cleared>=CARDS[id].gachaCh));}
const CARD_IDS=Object.keys(CARDS).filter(id=>!CARDS[id].story&&!CARDS[id].off); // 招募池內的角色（不含劇情角色、尚未開放的角色）
const hasCardOrEvo=(own,id)=>!!own[id]||(id==="fatty"&&!!own.fatty2); // 肥宅進化成 SSR 後，仍算收集到肥宅
const ownedCount=()=>CARD_IDS.filter(id=>hasCardOrEvo(SAVE.owned,id)).length;
const R_ORDER={SSR:0,SR:1,R:2};

/* ===================== DATA: CLASSES ===================== */
// 職業分類：基礎數值加成在 cardStats，暴擊／技能／治療加成在戰鬥引擎；裝備也依職業限制
const CLASSES={
  tank:{name:"坦克",icon:"🛡",desc:"生命+15%、防禦+1"},
  warrior:{name:"戰士",icon:"⚔",desc:"攻擊+15%（至少+1）"},
  assassin:{name:"刺客",icon:"🗡",desc:"速度+3、暴擊率+6%、閃避率+5%"},
  ranger:{name:"射手",icon:"🎯",desc:"暴擊率+12%"},
  support:{name:"輔助",icon:"✚",desc:"治療量+30%"},
  mage:{name:"術士",icon:"🔮",desc:"技能傷害+20%、施加的中毒每回合+1"}
};
const CARD_CLS={
  boss:"support",exorcist:"support",butcher:"warrior",shade:"assassin",vampire:"warrior",berserker:"warrior",
  merc:"ranger",hunter:"ranger",medic:"support",fatty:"tank",bomb:"tank",veteran:"warrior",sniper:"ranger",assassin:"assassin",
  paramedic:"support",tamer:"mage",geneFreak:"warrior",chemist:"mage",bodyguard:"tank",leader:"support",witch:"mage",
  gambler:"warrior",scavenger:"ranger",trucker:"tank",bartender:"support",herbalist:"support",runner:"assassin",chef:"support",
  survivor:"tank",diver:"assassin",miner:"warrior",mediocre:"warrior",courier:"support",gourmet:"tank",climber:"assassin",
  hacker:"mage",tycoon:"mage",lucky:"ranger",arsonist:"mage",sentinel:"tank",janitor:"support",detective:"ranger",
  ashen:"warrior",qing:"support",fatty2:"tank",diviner:"mage",venomfrog:"mage",icemage:"mage",master:"support"
};
Object.keys(CARDS).forEach(id=>CARDS[id].cls=CARD_CLS[id]||"warrior");
const clsOf=u=>CARDS[u.id]?CARDS[u.id].cls:null;
function clsTag(id){const c=CLASSES[CARDS[id].cls];return `<span class="ctag c-${CARDS[id].cls}" title="${c.desc}">${c.icon}${c.name}</span>`;}

