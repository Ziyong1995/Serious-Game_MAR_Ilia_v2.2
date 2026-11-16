const MAPS = {
  valley: {name:'River Valley', geology:'Silt', hp:10, level:9, low:6, high:12, min:2, max:16, water:5, cash:8, seep:0, riverbank:true, opener:'rain', reserve:'drought'},
  coast: {name:'Coastal Lowlands', geology:'Clay', hp:8, level:14, low:7, high:12, min:3, max:16, water:6, cash:8, seep:-1, opener:'rain', reserve:'flood'},
  plains: {name:'Dry Plains', geology:'Sand', hp:8, level:5, low:5, high:10, min:2, max:15, water:4, cash:9, seep:1, opener:'dry', reserve:'drought'}
};
const ROLES = [
  {name:'Farmer', hue:'#b77a46', ability:'Start with 1 extra Water and Drip Irrigation in hand.', reserve:{cash:4,water:6}},
  {name:'Water Official', hue:'#526e9b', ability:'Start with 2 extra Cash.', reserve:{cash:10,water:3}},
  {name:'Ecologist', hue:'#658559', ability:'Wetland Restoration costs 1 less Cash.', reserve:{cash:4,water:5,hp:8}},
  {name:'Private Company', hue:'#83688d', ability:'Earn 1 extra Cash at the start of each later turn.', reserve:{cash:12}},
  {name:'Water Utility', hue:'#54878e', ability:'Start with 1 non-pumped Water credit.', reserve:{cash:7,water:6}}
];
const CARDS = {
  pond:{name:'Infiltration Pond', short:'Infiltration Pond', kind:'mar', cost:4, art:'pond', rule:'Each of your turns: recharge 1, adjusted by soil.', text:'Spread water over permeable ground so it can seep to the aquifer. Fine sediment can clog the basin. In this game, sand adds 1 recharge and clay subtracts 1.', source:'https://www.inowas.com/mar-methods/infiltration-ponds-and-basins/'},
  well:{name:'Recharge Well', short:'Recharge Well', kind:'mar', cost:5, art:'well', rule:'Each of your turns: recharge 2.', text:'Inject suitable source water directly below a slow-infiltrating surface. Because injection bypasses soil filtration, source-water quality and treatment matter. Watch the shared water level.', source:'https://www.inowas.com/tools/t06-mar-method-selection/'},
  bank:{name:'Riverbank Filtration', short:'Bank Filtration', kind:'mar', cost:4, art:'bank', rule:'Gain 2 Water credits now and on each of your turns.', text:'A well near a connected river draws water through the riverbank sediments. The sediment can help filter it, but the system depends on river flow and suitable geology. Available in River Valley.', source:'https://www.inowas.com/mar-methods/induced-bank-filtration/'},
  sat:{name:'Soil Aquifer Treatment', short:'Soil Treatment', kind:'mar', cost:4, art:'sat', rule:'Each of your turns: recharge 1 below the safe ceiling.', text:'Pre-treated effluent is spread over permeable soil. Passage through sediment can improve water quality before recovery. Treatment and monitoring remain necessary. Available on Sand and Silt.', source:'https://www.inowas.com/mar-methods/soil-aquifer-treatment-sat/'},
  checkdam:{name:'Recharge Dam', short:'Recharge Dam', kind:'mar', cost:3, art:'checkdam', rule:'Resolve ordinary rain or flood if there is room to recharge 1.', text:'A small dam can slow runoff and hold water long enough for infiltration. It needs a permeable bed and a site with room to store more groundwater. Available on Sand and Silt.', source:'https://www.inowas.com/mar-methods/recharge-dams/'},
  drain:{name:'Drainage Canal', short:'Drainage Canal', kind:'drain', cost:4, art:'drain', rule:'Each of your turns: drain up to 2 above the safe band.', text:'A canal or subsurface drain carries excess water away from waterlogged land. It can handle a flood warning or emergency.'},
  drip:{name:'Drip Irrigation', short:'Drip Irrigation', kind:'efficiency', cost:3, art:'drip', rule:'Gain 2 Water credits now and each of your turns.', text:'Emitters deliver water near plant roots. Credits cover water costs without drawing down the aquifer or affecting other players.'},
  network:{name:'Network Repair', short:'Network Repair', kind:'efficiency', cost:3, art:'pipe', rule:'Gain 1 Water credit each of your turns. Fix Pipe Burst.', text:'Repairing leaky distribution pipes reduces water demand. This project also resolves a Pipe Burst for free.'},
  wetland:{name:'Wetland Restoration', short:'Wetland', kind:'wetland', cost:4, art:'wetland', rule:'Absorb excess rain. Each of your turns: +1 shared HP.', text:'Wetlands store and slowly release floodwater. They can handle ordinary floods and absorb 1 Water from a heavy rain event.'},
  tank:{name:'Rainwater Tank', short:'Rainwater Tank', kind:'efficiency', cost:3, art:'tank', rule:'Gain 1 Water credit each of your turns.', text:'Collect rain in a tank for later use. Stored rainwater offsets pumping when you pay Water to resolve an event.'},
  industry:{name:'Water Bottling Plant', short:'Bottling Plant', kind:'industry', cost:3, art:'industry', rule:'Each of your turns: pump 1 Water to earn 3 Cash.', text:'Bottling makes money and uses groundwater. Each pump also reduces every other player’s Water by 1.'},
  filter:{name:'Remediation Well', short:'Remediation Well', kind:'filter', cost:4, art:'well', rule:'Resolve spill and nitrate events for free.', text:'Remediation wells recover contaminated groundwater for treatment. They resolve Industrial Spill or Nitrate Leaching.'},
  grant:{name:'Green Grant', short:'Green Grant', kind:'action', cost:0, art:'grant', rule:'Gain 3 Cash now.', text:'A one-time grant frees up cash for infrastructure or an emergency response.'},
  monitor:{name:'Monitoring Survey', short:'Monitoring Survey', kind:'action', cost:1, art:'survey', rule:'Restore 2 shared HP now.', text:'Monitoring helps detect falling water levels and contamination early. In this game, a survey restores 2 Aquifer HP.'},
  cistern:{name:'Emergency Cistern', short:'Emergency Cistern', kind:'action', cost:2, art:'tank', rule:'Gain 3 Water credits now.', text:'Use emergency stored water to cover the current event. Credits avoid additional drawdown in the game and disappear when your next turn starts.'},
  produce:{name:'Raise Produce Prices', short:'Produce Prices', kind:'policy', role:0, cost:0, art:'drip', rule:'Each other player pays you up to 1 Cash.', text:'Water scarcity can cut yields and raise the cost of producing food. This card models a farmer passing some of that cost on to buyers.', source:'https://www.fao.org/land-water/water/drought/en/'},
  subsidycut:{name:'Cut Irrigation Subsidy', short:'Subsidy Cut', kind:'policy', role:1, cost:0, art:'grant', rule:'The Farmer returns up to 2 Cash to you.', text:'Reducing a pumping subsidy can make abstraction more expensive and reduce an incentive to pump. It can also squeeze the farm budget for improvements such as drip irrigation.', source:'https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/03/financing-a-water-secure-future_27cd3a4c/a2ecb261-en.pdf'},
  permitfee:{name:'Well Permit Fee', short:'Permit Fee', kind:'policy', role:1, cost:0, art:'survey', rule:'The other user with the most Water pays up to 2 Cash.', text:'Managing permits and monitoring withdrawals takes money. A fee shifts some of that cost to users. In this game the largest available allocation is used to select the payer.'},
  flow:{name:'Reserve Water for Streams', short:'Stream Reserve', kind:'policy', role:2, cost:0, art:'wetland', rule:'Largest other Water reserve loses up to 2. Restore 1 shared HP.', text:'Pumping can reduce groundwater discharge to streams. Reserving part of an allocation for the environment can protect connected habitats. The HP represents ecosystem condition.', source:'https://www.inowas.com/applications/'},
  priority:{name:'Priority Pumping', short:'Priority Pumping', kind:'policy', role:3, cost:0, art:'well', rule:'Pump 2 Water for 3 Cash. Other players lose 1 Water. Groundwater −1.', text:'Pumping can lower the water table near a well and reduce supply at neighboring wells. The company earns money from selling water while its neighbors bear part of the drawdown.', source:'https://pubs.usgs.gov/gip/gw_ruralhomeowner/gw_ruralhomeowner_new.html'},
  tariff:{name:'Emergency Water Tariff', short:'Emergency Tariff', kind:'policy', role:4, cost:0, art:'pipe', rule:'When groundwater is low or forecast low, charge each other player up to 1 Cash. Gain 1 Water credit.', text:'Higher water charges can help manage peak demand and fund an emergency supply, but they raise bills for customers already under stress. The credit represents that emergency supply.', source:'https://www.epa.gov/waterfinancecenter/water-affordability-resources-utilities'}
};
const EVENTS = {
  rain:{name:'Heavy Rain', tag:'Weather', art:'rain', cash:5, water:3, shift:2, damage:2, kind:'flood', text:'Intense rain raises the water table and threatens low-lying land.'},
  flood:{name:'Hundred-Year Flood', tag:'Weather', art:'rain', cash:6, water:4, shift:3, damage:3, kind:'flood', text:'The river overtops its banks and saturates the floodplain.'},
  dry:{name:'Dry Spell', tag:'Weather', art:'drought', cash:4, water:3, shift:-1, damage:2, kind:'drought', text:'Rainfall drops and water demand rises across the basin.'},
  drought:{name:'Megadrought', tag:'Weather', art:'drought', cash:6, water:4, shift:-2, damage:3, kind:'drought', text:'Prolonged drought cuts natural recharge and strains every well.'},
  heat:{name:'Heatwave', tag:'Demand', art:'drought', cash:4, water:3, shift:-1, damage:2, kind:'heat', text:'A hot spell pushes farms and towns to draw more water.'},
  spill:{name:'Industrial Spill', tag:'Quality', art:'industry', cash:5, water:null, shift:0, damage:3, kind:'quality', text:'A contaminant plume threatens groundwater supply.'},
  nitrate:{name:'Nitrate Leaching', tag:'Quality', art:'drip', cash:4, water:null, shift:0, damage:2, kind:'quality', text:'Fertilizer washes through the soil into groundwater.'},
  burst:{name:'Pipe Burst', tag:'Infrastructure', art:'pipe', cash:4, water:3, shift:0, damage:2, kind:'pipe', text:'A damaged mains pipe interrupts the local supply.'},
  demand:{name:'Peak Demand', tag:'Demand', art:'tank', cash:5, water:4, shift:0, damage:2, kind:'demand', text:'Farms, industry and the town all need water at once.'},
  compliance:{name:'Pumping Limit', tag:'Policy', art:'survey', cash:4, water:null, shift:0, damage:2, kind:'policy', text:'A new pumping cap forces users to fund alternative supply.'},
  subsidy:{name:'Green Subsidy', tag:'Policy', art:'grant', cash:3, water:2, shift:0, damage:1, kind:'policy', text:'A matching grant can cover a basin improvement this turn.'}
};
const MIN_PACT_HP=6, MAX_HP=12, MAX_WATER=8;
const CARDS_BY_KIND={mar:'MAR project',drain:'Drainage',wetland:'Nature-based',efficiency:'Water savings',industry:'Industry',filter:'Water quality',action:'Action',policy:'Stakeholder policy'};
const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
const shuffle=items=>{
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
};
const mapFor=g=>MAPS[g.map];
function severity(roll){
  return roll<=2?-1:roll<=4?0:1;
}
function eventFor(g){
  const event=EVENTS[g.event];
  const modifier=g.roll?severity(g.roll):0;
  if(event.shift) return {...event,shift:event.shift+Math.sign(event.shift)*modifier};
  return {...event,cash:Math.max(1,event.cash+modifier),water:event.water&&Math.max(1,event.water+modifier)};
}
const roleGoal=role=>Object.entries(role.reserve).map(([resource,amount])=>amount+' '+{cash:'Cash',water:'Water',hp:'shared HP'}[resource]).join(' + ');
function hasReserve(g,p){
  const {cash=0,water=0,hp=0}=ROLES[p.role].reserve;
  return p.cash>=cash&&p.water>=water&&g.hp>=hp;
}
const readyForPact=(g,p)=>hasReserve(g,p)&&p.helped;
const safeLevel=g=>g.level>=mapFor(g).low&&g.level<=mapFor(g).high;
const canAgree=g=>g.hp>=MIN_PACT_HP&&safeLevel(g)&&g.players.every(p=>readyForPact(g,p));
const preparing=g=>g.phase==='roll'||g.phase==='event';
const gainWater=(p,n)=>{p.water=clamp(p.water+n,0,MAX_WATER);};
const shift=(g,n)=>{g.level=clamp(g.level+n,0,18);};
function pump(g,player,n){
  if(!n) return;
  g.players.forEach((p,i)=>gainWater(p,i===player?-n:-1));
  shift(g,-Math.ceil(n/3));
}
function equipmentFor(map){
  return Object.keys(CARDS).filter(key=>CARDS[key].kind!=='policy'&&
    (key!=='bank'||MAPS[map].riverbank)&&(!['sat','checkdam'].includes(key)||MAPS[map].seep>=0));
}
function makeGame(map,roles,policies=true){
  const basin=MAPS[map];
  const events=shuffle(Object.keys(EVENTS).filter(k=>k!==basin.opener&&k!==basin.reserve));
  if(map!=='valley') events.splice(roles.length,0,basin.reserve);
  else events.splice(roles.length+1,0,'drought');
  const supply=equipmentFor(map).filter(key=>key!=='grant');
  const deck=shuffle([...supply,...supply,...supply,'grant','grant']);
  const kits=['drip','network','wetland','industry','tank'];
  const starter=map==='plains'?'well':'drain';
  const starterHands=roles.map((role,i)=>i===0?[kits[role],starter]:[kits[role]]);
  for(const hand of starterHands){
    for(const key of hand) deck.splice(deck.indexOf(key),1);
    hand.unshift('grant');
  }
  const players=roles.map((role,i)=>{
    const hand=starterHands[i];
    while(hand.length<4){
      const next=deck.findIndex(key=>!hand.includes(key));
      hand.push(...deck.splice(next,1));
    }
    if(policies) hand.push(['produce',roles.includes(0)?'subsidycut':'permitfee','flow','priority','tariff'][role]);
    return {role,cash:basin.cash+(role===1?2:0),water:basin.water+(role===0?1:0),credits:role===4?1:0,
      hand,projects:[],helped:false};
  });
  const game={v:2,map,players,hp:basin.hp,level:basin.level,events:[basin.opener,...events],deck,active:0,turn:0,phase:'roll',status:'',policies,claims:[]};
  dealEvent(game);
  return game;
}
function dealEvent(g){
  if(!g.events.length) g.events=shuffle(Object.keys(EVENTS));
  g.event=g.events.shift();
  g.phase='roll';
  g.roll=null;
  g.emergency=null;
  g.eventMissed=false;
  g.funding=null;
  g.recycled=false;
}
function recordPlay(g,event){
  const effects=g.effects??=[];
  effects.push({...event,turn:g.turn,id:(effects.at(-1)?.id??0)+1});
  if(effects.length>12) effects.shift();
}
function rollEvent(g,roll=1+Math.floor(Math.random()*6)){
  if(g.phase!=='roll'||!Number.isInteger(roll)||roll<1||roll>6) return false;
  g.roll=roll;
  g.phase='event';
  refreshEmergency(g);
  recordPlay(g,{type:'die',face:roll});
  return true;
}
function refreshEmergency(g){
  g.emergency=null;
  if(g.phase!=='event') return;
  const map=mapFor(g), event=eventFor(g), forecast=g.level+event.shift;
  if(EVENTS[g.event].shift>0&&forecast>=map.max) g.emergency='flood';
  if(EVENTS[g.event].shift<0&&forecast<=map.min) g.emergency='drought';
}
function projectEffect(g,i,key){
  const p=g.players[i], map=mapFor(g);
  const recharge=key==='pond'?Math.max(0,1+map.seep):key==='well'?2:0;
  if(recharge){shift(g,recharge);gainWater(p,1);}
  if(key==='sat'&&g.level<map.high) shift(g,1);
  if(key==='drain') shift(g,-Math.min(2,Math.max(0,g.level-map.high)));
  if(key==='wetland') g.hp=Math.min(MAX_HP,g.hp+1);
  if(key==='drip'||key==='bank') p.credits=Math.min(4,p.credits+2);
  if(['network','tank'].includes(key)) p.credits=Math.min(4,p.credits+1);
  if(key==='industry'&&p.water>0&&g.level>0){pump(g,i,1);p.cash+=3;}
}
function openTurn(g){
  const p=g.players[g.active], map=mapFor(g);
  if(g.turn>=g.players.length){
    p.cash+=p.role===3?4:3;
    p.credits=0;
    if(g.level>=map.low) gainWater(p,g.players.length>=4?2:1);
    p.projects.forEach(key=>projectEffect(g,g.active,key));
    if(p.hand.length<6){
      if(!g.deck.length) g.deck=shuffle(equipmentFor(g.map));
      p.hand.push(g.deck.shift());
    }
  }
  dealEvent(g);
  g.status='';
}
function canPlay(g,i,index){
  if(!preparing(g)) return 'The event is closed. You can play cards on the next turn.';
  const p=g.players[i], key=p.hand[index], card=CARDS[key];
  if(!card) return 'Card unavailable.';
  if(card.kind==='policy') return policyError(g,i,key);
  if(card.kind!=='action'&&p.projects.length>=2) return '2 infrastructure slots are full. Retire a project first.';
  const reserved=g.funding?.kind==='cash'?g.funding.pay[i]:0;
  if(p.cash-reserved<cardCost(p,key)){
    if(p.cash>=cardCost(p,key)) return 'That Cash is pledged. Reduce your pledge to use it here.';
    return 'You need '+(cardCost(p,key)-p.cash)+' more Cash.';
  }
  if(card.kind!=='action'&&p.projects.includes(key)) return 'You already have this project.';
  return '';
}
function canRecycle(g,i,index){
  return preparing(g)&&g.active===i&&!g.recycled&&Boolean(g.players[i].hand[index]);
}
function recycleCard(g,i,index){
  if(!canRecycle(g,i,index)) return false;
  const p=g.players[i],key=p.hand.splice(index,1)[0];
  p.cash+=2;
  g.recycled=true;
  g.status=ROLES[p.role].name+' recycled '+CARDS[key].name+' for 2 Cash.';
  return true;
}
const cardCost=(p,key)=>CARDS[key].cost-(p.role===2&&key==='wetland'?1:0);
function playCard(g,i,index){
  if(canPlay(g,i,index)) return false;
  const p=g.players[i], key=p.hand.splice(index,1)[0], card=CARDS[key];
  if(card.kind==='policy'){
    playPolicy(g,i,key);
    recordPlay(g,{type:'card',player:i,key});
    return true;
  }
  p.cash-=cardCost(p,key);
  if(card.kind!=='action') p.projects.push(key);
  if(key==='drip'||key==='bank') p.credits=Math.min(4,p.credits+2);
  if(key==='grant') p.cash+=3;
  if(key==='monitor') g.hp=Math.min(MAX_HP,g.hp+2);
  if(key==='cistern') p.credits=Math.min(4,p.credits+3);
  g.status=ROLES[p.role].name+' played '+card.name+'.';
  recordPlay(g,{type:'card',player:i,key});
  return true;
}
function routesFor(g){
  const e=eventFor(g), n=g.players.length;
  if(g.emergency) return [{kind:'cash',amount:6+Math.ceil(n/2),label:g.emergency==='flood'?'Emergency drainage':'Emergency recharge'}];
  const routes=[{kind:'cash',amount:e.cash,label:'Fund response'}];
  if(e.water) routes.push({kind:'water',amount:e.water,label:'Supply water'});
  return routes;
}
function projectRoutes(g){
  const e=eventFor(g);
  return g.players.flatMap((p,i)=>p.projects.filter(key=>{
    if(e.kind==='flood') return key==='drain'||(!g.emergency&&(key==='wetland'||
      (key==='checkdam'&&g.level+e.shift<mapFor(g).high)));
    if(e.kind==='drought'||e.kind==='heat') return key==='well'||(key==='pond'&&mapFor(g).seep>=0);
    if(e.kind==='quality') return key==='filter';
    if(e.kind==='pipe') return key==='network';
    return false;
  }).map(key=>({player:i,key})));
}
function maxPay(g,i,kind){
  const p=g.players[i];
  return kind==='cash'?p.cash:p.water+p.credits;
}
function policyTargets(g,actor,key){
  const others=g.players.map((p,i)=>({p,i})).filter(({i})=>i!==actor);
  if(key==='subsidycut') return others.filter(({p})=>p.role===0&&p.cash>0);
  if(key==='flow'||key==='permitfee') return others.sort((a,b)=>b.p.water-a.p.water).slice(0,1)
    .filter(({p})=>key==='flow'?p.water>0:p.cash>0);
  return others.filter(({p})=>key==='priority'?p.water>0:p.cash>0);
}
function policyError(g,actor,key){
  if(!g.policies||g.players[actor].role!==CARDS[key].role) return 'This class cannot play that policy.';
  if(actor!==g.active) return 'Play your policy on your own turn.';
  if(key==='priority'){
    if(g.players[actor].water<2||!g.level) return 'Priority pumping requires 2 Water.';
    // A funded response uses the emergency forecast to set its price.
    if(g.funding) return 'Close the open response before changing the groundwater forecast.';
    return '';
  }
  if(key==='tariff'&&g.level+Math.min(0,eventFor(g).shift)>mapFor(g).low) return 'The emergency tariff requires low groundwater.';
  if(!policyTargets(g,actor,key).length) return 'There are no eligible stakeholders to charge.';
  return '';
}
function transferCash(g,from,to,amount){
  const payer=g.players[from];
  const paid=Math.min(payer.cash,amount);
  payer.cash-=paid;
  g.players[to].cash+=paid;
  return paid;
}
function updatePledges(g){
  if(!g.funding) return;
  const f=g.funding;
  f.pay=f.pay.map((n,i)=>Math.min(n,maxPay(g,i,f.kind)));
}
function playPolicy(g,actor,key){
  const p=g.players[actor];
  const targets=policyTargets(g,actor,key);
  if(key==='priority'){
    pump(g,actor,2);
    p.cash+=3;
    refreshEmergency(g);
  }else if(key==='flow'){
    gainWater(targets[0].p,-2);
    g.hp=Math.min(MAX_HP,g.hp+1);
  }else{
    const amount=['permitfee','subsidycut'].includes(key)?2:1;
    for(const {i} of targets) transferCash(g,i,actor,amount);
    if(key==='tariff') p.credits=Math.min(4,p.credits+1);
  }
  for(const {i} of targets){
    const expires=g.turn+(i-actor+g.players.length)%g.players.length;
    g.claims.push({id:g.turn+'-'+i,actor,target:i,key,expires});
  }
  updatePledges(g);
  g.status=ROLES[p.role].name+' played '+CARDS[key].name+(targets.length?'. Affected players can challenge.':'.');
}
function claimsFor(g,target){
  return (g.claims||[]).filter(c=>c.target===target&&c.expires>=g.turn);
}
function challengeError(g,target,claim){
  if(!preparing(g)&&g.phase!=='resolved') return 'This match has ended.';
  if(!claim||!claimsFor(g,target).includes(claim)) return 'That challenge has expired.';
  if(g.players[target].cash<1) return 'A challenge costs 1 Cash.';
  if(g.players[claim.actor].cash<2) return 'The other player has fewer than 2 Cash to refund.';
  return '';
}
function challenge(g,target,id){
  const claim=claimsFor(g,target).find(c=>c.id===id);
  if(challengeError(g,target,claim)) return false;
  g.players[target].cash--;
  transferCash(g,claim.actor,target,2);
  g.claims=g.claims.filter(c=>c.id!==id);
  updatePledges(g);
  g.status=ROLES[g.players[target].role].name+' challenged '+CARDS[claim.key].name+' and recovered 2 Cash.';
  return true;
}
function responseShift(g,route){
  const map=mapFor(g), e=eventFor(g);
  const predicted=g.level+e.shift;
  if(route.key==='drain'||(route.kind==='cash'&&g.emergency==='flood')) return -Math.max(0,predicted-map.high);
  if(route.key==='wetland') return -1;
  if(route.key==='checkdam') return 1;
  if(route.key==='pond') return Math.max(1+map.seep,g.emergency?map.low-predicted:0);
  if(route.key==='well'||(route.kind==='cash'&&g.emergency==='drought')) return Math.max(2,g.emergency?map.low-predicted:0);
  return 0;
}
function settle(g,route,pay=[]){
  if(g.phase!=='event') return false;
  const e=eventFor(g);
  const helpers=[];
  const project=route.kind==='project';
  const failure=route.kind==='pass';
  let pumps=[];
  if(project){
    if(!projectRoutes(g).some(r=>r.key===route.key&&r.player===route.player)) return false;
    if(route.player!==g.active) helpers.push(route.player);
  }else if(!failure){
    const selected=routesFor(g).find(r=>r.kind===route.kind);
    if(!selected||pay.length!==g.players.length||pay.some((n,i)=>!Number.isInteger(n)||n<0||n>maxPay(g,i,route.kind))||pay.reduce((a,b)=>a+b,0)!==selected.amount) return false;
    pay.forEach((n,i)=>{
      const payer=g.players[i];
      if(n>=2&&i!==g.active) helpers.push(i);
      if(route.kind==='cash') payer.cash-=n;
      else{
        const credits=Math.min(n,payer.credits);
        payer.credits-=credits;
        if(n>credits) pumps.push({i,amount:n-credits});
      }
    });
  }
  const counter=responseShift(g,route);
  let rain=e.shift;
  if(e.kind==='flood'&&!g.emergency&&!route.key&&g.players.some(p=>p.projects.includes('wetland'))) rain=Math.max(0,rain-1);
  shift(g,rain+counter-pumps.reduce((sum,x)=>sum+Math.ceil(x.amount/3),0));
  const drawdown=new Map(pumps.map(x=>[x.i,x.amount]));
  g.players.forEach((payer,i)=>{
    const own=drawdown.get(i)||0;
    gainWater(payer,-own-(pumps.length-Number(own>0)));
  });
  g.phase='resolved';
  g.eventMissed=failure;
  g.funding=null;
  if(failure){
    g.hp=Math.max(0,g.hp-e.damage);
    g.status=e.name+' went unresolved. −'+e.damage+' shared HP.';
    if(g.emergency){
      g.hp=0;
      finish(g,g.emergency==='flood'?'Emergency drainage was needed to prevent basin-wide flooding.':'Emergency recharge was needed to keep the basin’s wells working.');
      return true;
    }
  }else{
    helpers.forEach(i=>{g.players[i].helped=true;});
    g.status=e.name+' resolved.'+(pumps.length?' Pumping reduced neighboring water access.':'')+(helpers.length?' '+helpers.length+' stakeholder'+(helpers.length===1?' helped.':'s helped.'):'');
  }
  const map=mapFor(g);
  if(g.level<=map.min||g.level>=map.max){
    g.hp=0;
    finish(g,g.level<=map.min?'The aquifer ran too low to sustain its wells.':'Groundwater rose to the flooding limit.');
  }else{
    if(g.level<map.low||g.level>map.high){
      g.hp=Math.max(0,g.hp-1);
      g.status+=' Water outside the safe band: −1 HP.';
    }
    if(!g.hp) finish(g,'The shared aquifer lost all its HP.');
  }
  return true;
}

function finish(g,reason=''){
  g.phase='over';
  g.result={win:!reason,reason};
}
function nextTurn(g){
  if(g.phase!=='resolved') return false;
  const roundEnd=g.active===g.players.length-1;
  if(roundEnd&&canAgree(g)){
    finish(g);
    return true;
  }
  if(roundEnd) g.players.forEach(p=>{p.helped=false;});
  g.turn++;
  if(g.claims) g.claims=g.claims.filter(c=>c.expires>=g.turn);
  g.active=g.turn%g.players.length;
  openTurn(g);
  return true;
}

export {
  MAPS, ROLES, CARDS, EVENTS, MIN_PACT_HP, MAX_HP, CARDS_BY_KIND, mapFor, severity, eventFor, roleGoal,
  hasReserve, readyForPact, safeLevel, canAgree, preparing, makeGame, rollEvent, cardCost, canPlay, playCard,
  canRecycle, recycleCard, routesFor, projectRoutes, maxPay, claimsFor, challengeError, challenge, settle, nextTurn
};
