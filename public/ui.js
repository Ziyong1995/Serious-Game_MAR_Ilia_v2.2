import {
  MAPS,ROLES,CARDS,EVENTS,MIN_PACT_HP,MAX_HP,CARDS_BY_KIND,mapFor,severity,eventFor,roleGoal,
  hasReserve,readyForPact,safeLevel,canAgree,preparing,cardCost,canPlay,canRecycle,routesFor,projectRoutes,maxPay,claimsFor,challengeError
} from './engine.js';
import {icon,roleIcon,drawArt,drawBoard} from './art.js';
import {read,write,connect,create,join,leave,send} from './connection.js';
import {playDice,playCard as showCardPlay} from './effects.js';

const $=id=>document.getElementById(id);
let snapshot=null;
let g=null;
let viewer=0;
let guided=!!read('aquifer-guide-v2');
let modal=null;
let previousEvent='';
let flashBoard=false;
let localPlay=null;
let showingEffect=false;
const effectQueue=[];
const severityLabels=['Mild','Normal','Severe'];
const dlg=$('dialog');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>viewer===g.active;
const nameFor=i=>esc(snapshot.members[i].name);
const inviteLink=()=>new URL('/?room='+snapshot.code,location.href).href;
const mapOptions=chosen=>Object.entries(MAPS).map(([key,map])=>'<option value="'+key+'" '+(key===chosen?'selected':'')+'>'+map.name+'</option>').join('');
const setGuide=()=>{guided=true;write('aquifer-guide-v2',true);};
const isRound=()=>Math.floor(g.turn/g.players.length)+1;
const pactHp=()=>Math.max(MIN_PACT_HP,...g.players.map(p=>ROLES[p.role].reserve.hp||0));
const helpRule='Pay at least 2 Cash or Water (credits count), or use your project, to resolve another player’s event.';
const diceRule='Roll one d6 each turn. 1–2 Mild, 3–4 Normal, 5–6 Severe. Mild weather moves groundwater 1 less and severe weather moves it 1 more. For other events, change both response costs by −1 or +1 (minimum 1).';
const incomeRule='From round two, gain 3 Cash and clear unused Water credits. If groundwater is at or above the safe band’s lower limit, recover 1 Water (2 with 4–5 players). Water caps at 8. Apply your projects and draw one card (hand limit 6).';
const policyRule='Play your class policy once, on your turn. If it costs another player Cash or Water, they may spend 1 Cash to recover 2 Cash from you. They can challenge through the end of their next turn.';
const art=(name,cls='')=>'<canvas class="'+cls+'" width="480" height="156" data-art="'+name+'" aria-hidden="true"></canvas>';
const portrait=r=>'<span class="portrait" style="--role:'+ROLES[r].hue+'">'+icon(roleIcon(r))+'</span>';
const signed=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'0';
const stat=(name,value,extra='')=>'<span class="'+name+'" title="'+(name==='cash'?'Cash':'Water'+extra)+'" aria-label="'+value+' '+name+'">'+icon(name==='cash'?'cash':'drop')+value+'</span>';
function renderCanvases(root=document){
  root.querySelectorAll('canvas[data-art]').forEach(canvas=>{
    drawArt(canvas,canvas.dataset.art);
    delete canvas.dataset.art;
  });
}
function render(){
  const map=mapFor(g), e=eventFor(g);
  const levelState=g.level<map.low?'Low':g.level>map.high?'High':'Safe';
  $('basin').innerHTML=
    '<button class="map-info" data-action="map"><span class="map-icon">'+icon('map')+'</span><span><span class="overline">Basin map</span><br><strong>'+map.name+'</strong></span></button>'+
    '<div class="health">'+icon('heart')+'<div><div class="overline">Shared aquifer HP</div><strong>'+g.hp+' <span>/ '+MAX_HP+'</span></strong></div></div>'+
    '<div class="groundwater" title="Safe band '+map.low+'–'+map.high+'"><div class="meterhead"><span class="overline">Groundwater</span><strong>'+g.level+' · '+levelState+'</strong></div><div class="meter" role="meter" aria-label="Groundwater level" aria-valuemin="0" aria-valuemax="18" aria-valuenow="'+g.level+'"><span class="safe" style="left:'+map.low/18*100+'%;width:'+(map.high-map.low)/18*100+'%"></span><i class="needle" style="left:'+g.level/18*100+'%"></i></div></div>'+
    '<button class="round pact" data-action="pact"><span class="overline">Round '+isRound()+'</span><strong>Pact <span>'+g.players.filter(p=>readyForPact(g,p)).length+'/'+g.players.length+'</span></strong></button>';
  $('players').innerHTML=g.players.map((p,i)=>
    '<button class="player '+(i===g.active?'active':'')+'" data-action="role" data-i="'+i+'" aria-label="'+nameFor(i)+', '+ROLES[p.role].name+', '+p.cash+' Cash, '+p.water+' Water, '+p.handCount+' cards">'+portrait(p.role)+
    '<span><b>'+nameFor(i)+(i===viewer?' · You':'')+'</b><span class="player-role">'+ROLES[p.role].name+'</span><span class="turn-tag">Active turn</span><span class="stats">'+stat('cash',p.cash)+stat('water',p.water)+(p.credits?'<span class="water" title="Non-pumped water credits">+'+p.credits+'</span>':'')+'</span></span><span class="count" title="Cards in hand">'+icon('cards')+p.handCount+'</span></button>'
  ).join('');
  $('guide').textContent=guided?'How to play':'First game? Learn to play';
  $('deck').innerHTML='<span class="deck-stack">'+icon('logo')+'</span><span>Event deck</span>';
  const eventId=g.turn+':'+g.event;
  const isNew=eventId!==previousEvent;
  previousEvent=eventId;
  let routes='';
  if(g.phase==='event'){
    if(g.funding) routes=button('view-funding',g.funding.label+' · '+pledged(g.funding)+'/'+g.funding.amount,'small primary');
    else if(active()) routes=routesFor(g).map(r=>'<button class="btn small '+(r.kind==='cash'?'primary':'')+'" data-action="fund" data-kind="'+r.kind+'">'+icon(r.kind==='cash'?'cash':'drop')+r.label+' · '+r.amount+'</button>').join('');
    const yours=projectRoutes(g).filter(r=>r.player===viewer);
    routes+=yours.map(r=>'<button class="btn small project-choice" data-action="project-response" data-key="'+r.key+'">Use '+CARDS[r.key].name+'</button>').join('');
    if(!routes) routes='<span class="waiting">Waiting for '+nameFor(g.active)+' to choose a response.</span>';
  }
  const failed=g.eventMissed??g.status.includes('went unresolved');
  const grade=g.roll?severityLabels[severity(g.roll)+1]:'';
  const rolled=g.roll?'<span class="roll-result '+grade.toLowerCase()+'" aria-label="Rolled '+g.roll+', '+grade+'">'+icon('dice')+' '+g.roll+' · '+grade+'</span>':'';
  const response=g.phase==='roll'?(active()?'<button class="btn small primary" data-action="roll">'+icon('dice')+' Roll d6</button>':'<span class="waiting">Waiting for '+nameFor(g.active)+' to roll.</span>'):
    g.phase==='event'?'<div class="response">'+routes+'</div>':'<div class="resolved-label '+(failed?'unresolved':'')+'">'+(failed?'Unresolved':g.phase==='over'?'Match finished':'Resolved')+'</div>';
  $('event').innerHTML='<article class="event '+(isNew?'is-new ':'')+(g.emergency?'critical ':'')+(['resolved','over'].includes(g.phase)&&!failed?'is-resolved':'')+'">'+art(e.art,'event-art')+
    '<div class="event-body"><div class="event-top"><span class="type">'+(g.emergency?'Critical event':e.tag)+'</span>'+rolled+'</div>'+
    '<h2>'+e.name+'</h2><p>'+e.text+'</p><p class="event-delta">'+(g.phase==='roll'?'Roll to reveal severity.':(e.shift?signed(e.shift)+' groundwater · ':'')+'−'+e.damage+' HP if missed')+'</p>'+
    (g.emergency&&g.phase==='event'?'<p class="critical-copy">'+(g.emergency==='flood'?'Drainage required.':'Recharge required.')+'</p>':'')+response+'</div></article>';
  const projects=g.players.flatMap((p,i)=>p.projects.map((key,j)=>'<button class="mini" data-action="inspect-project" data-i="'+i+'" data-index="'+j+'" data-project="'+key+'" title="'+CARDS[key].name+' · '+ROLES[p.role].name+'">'+art(CARDS[key].art)+'<b>'+CARDS[key].short+'<span>'+ROLES[p.role].name+'</span></b></button>'));
  $('projects').innerHTML=projects.join('')+Array.from({length:Math.max(0,4-projects.length)},()=>'<span class="slot" aria-hidden="true">'+icon('plus')+'</span>').join('');
  const p=g.players[viewer];
  const hand=p.hand.map((key,index)=>card(key,{p,index,fanned:true})).join('');
  const left='<div class="hand-side"><span class="overline">'+(active()?'Your turn':'You can help')+'</span><strong>'+ROLES[p.role].name+'</strong><p>Drag a card onto the board to play it. Click to inspect or recycle.</p></div>';
  const primaryControl=g.phase==='over'?button('result','View outcome','primary'):active()&&g.phase==='resolved'?button('next',g.active===g.players.length-1&&canAgree(g)?'Sign basin pact':'End turn →','primary'):
    active()&&g.phase==='event'?button('pass','Leave unresolved','danger'):'';
  const claims=g.phase==='over'?[]:claimsFor(g,viewer);
  const controls=(claims.length?button('claims','Challenge ('+claims.length+')','policy-button'):'')+primaryControl;
  $('tray').innerHTML=left+'<div class="hand" aria-label="Your cards">'+(hand||'<p>Your hand is empty.</p>')+'</div><div class="turn-controls">'+controls+'</div>';
  $('status').textContent=g.status;
  if(flashBoard){
    $('board').classList.remove('flash');void $('board').offsetWidth;$('board').classList.add('flash');
    flashBoard=false;
  }
  renderCanvases();
}
function card(key,{p,index,fanned=false,block=false,full=false}={}){
  const c=CARDS[key], type=block?'article':'button';
  const offset=fanned?index-(p.hand.length-1)/2:0;
  const reason=block?'':canPlay(g,viewer,index);
  const action=block?'':' data-action="hand-card" data-index="'+index+'" data-key="'+key+'" title="'+esc(reason||'Drag onto the board to play')+'" aria-label="'+c.name+', '+cardCost(p,key)+' Cash'+(reason?', '+esc(reason):'')+'"';
  return '<'+type+' class="game-card '+(reason?'card-blocked':'')+'" data-kind="'+c.kind+'"'+action+' style="--turn:'+offset*2.2+'deg;--lift:'+Math.abs(offset)*3+'px"><span class="cost">'+(p?cardCost(p,key):c.cost)+'</span>'+art(c.art,'card-art')+
    '<b>'+c.name+'</b><div class="card-text"><span class="kind">'+CARDS_BY_KIND[c.kind]+'</span>'+c.rule+(full?'<br>'+c.text:'')+'</div></'+type+'>';
}
function button(action,label,cls='',attr=''){
  return '<button class="btn '+cls+'" data-action="'+action+'" '+attr+'>'+label+'</button>';
}
function overlay(title,body='',actions=''){
  dlg.innerHTML='<section class="modal"><button class="close" data-action="close" aria-label="Close">×</button><h2 id="dialogTitle">'+title+'</h2>'+body+
    '<div id="dialog-notice" class="net-notice" role="status"></div>'+(actions?'<div class="actions">'+actions+'</div>':'')+'</section>';
  renderCanvases(dlg);
  if(!dlg.open) dlg.showModal();
}
function close(){
  dlg.close(); modal=null;
}
function tutorial(step=0){
  modal={type:'tutorial',step};
  const titles=['Share the aquifer','Respond to an event','Know your stakeholder','Win together'];
  const steps=[
    '<p><b>Cash</b> pays for projects and emergency responses. <b>Water</b> is the amount each stakeholder can access. <b>Aquifer HP</b> is shared, and the groundwater meter has a safe range.</p><p>When you pump 3 Water, you spend 3 and every other player loses 1 Water. Water credits cover costs without pumping.</p>',
    '<p>'+diceRule+'</p><p>Then split the cost, use a matching project, or take the impact. Missing a critical event ends the game.</p>',
    (g?roleInfo(g.players[viewer]):ROLES.map((_,role)=>roleInfo({role})).join(''))+
      (g?.policies?'<p>'+policyRule+'</p>':'')+'<p>Each player can reopen their role from their avatar. Only the group wins.</p>',
    '<p>At the end of any round, everyone wins if the basin has <b>at least '+(g?pactHp():MIN_PACT_HP)+' HP</b>, groundwater is in the <b>safe band</b>, and every player still meets their role’s reserves and has helped this round.</p><p>'+helpRule+' Water credits do not count toward reserves.</p>'
  ];
  overlay(titles[step],'<div class="progress" aria-label="Step '+(step+1)+' of 4">'+titles.map((_,i)=>'<span class="'+(i<=step?'on':'')+'"></span>').join('')+'</div>'+steps[step],
    (step?button('tutorial-back','Back'):'')+button('tutorial-next',step===3?'Play':'Next','primary'));
}
function rules(){
  overlay('Rules','<ul><li>'+incomeRule+' Each player can maintain two projects.</li><li>'+diceRule+'</li><li>Drag a card onto the board before or after the roll. On your turn, you can recycle one card for 2 Cash.</li><li>Pledge your own resources, use your project to resolve an event, or accept the impact. Each player who pumps costs every other player 1 Water. Credits are used first.</li>'+
    (!g||g.policies?'<li>'+policyRule+'</li>':'')+'<li>Check the basin pact after every full round. The game continues until you sign the pact or the aquifer collapses.</li></ul>',(g?button('pact','Basin pact'):'')+button('tutorial','Guided tutorial','primary'));
}
function roleInfo(p){
  const r=ROLES[p.role];
  return '<div class="role-info">'+portrait(p.role)+'<b>'+r.name+'</b><p>'+r.ability+' <strong>Goal</strong> '+roleGoal(r)+'</p></div>';
}
function role(i){
  const p=g.players[i],r=ROLES[p.role];
  overlay(r.name,'<p>'+r.ability+'</p><p><b>Personal goal</b> · '+roleGoal(r)+' · '+(hasReserve(g,p)?'Met':'Pending')+'</p><p><b>Help this round</b> · '+(p.helped?'Done':'Pending')+'</p>');
}
function showPact(){
  overlay('Basin pact','<p><b>Shared HP</b> '+g.hp+' / '+pactHp()+' minimum · <b>Groundwater</b> '+(safeLevel(g)?'Safe':'Outside the safe band')+'</p>'+
    g.players.map(p=>'<div class="role-info"><b>'+ROLES[p.role].name+'</b><p>'+roleGoal(ROLES[p.role])+' · '+(hasReserve(g,p)?'Reserves met':'Reserves pending')+'<br>Help this round · '+(p.helped?'Done':'Pending')+'</p></div>').join('')+
    '<p class="aside-note">'+helpRule+' The pact is checked at the end of the round.</p>');
}
function showClaims(){
  const claims=claimsFor(g,viewer);
  if(!claims.length||g.phase==='over'){close();return;}
  modal={type:'claims'};
  overlay('Challenge a policy','<p>Pay 1 Cash to recover 2 Cash from the stakeholder who played the policy.</p>'+
    claims.map(claim=>{
      const error=challengeError(g,viewer,claim);
      return '<div class="claim"><div><b>'+CARDS[claim.key].name+'</b><p>'+nameFor(claim.actor)+(error?' · '+error:'')+'</p></div>'+
        button('challenge','Challenge','small','data-key="'+claim.id+'" '+(error?'disabled':''))+'</div>';
    }).join(''));
}
function showMap(){
  const m=mapFor(g);
  overlay(m.name,'<p><b>'+m.geology+'</b> · Initial groundwater '+m.level+' · Initial shared HP '+m.hp+'</p><p><b>Safe band</b> '+m.low+'–'+m.high+' · <b>Collapse at</b> '+m.min+' or '+m.max+'</p><p>'+(m.seep>0?'Sandy soil adds 1 recharge to ponds.':m.seep<0?'Clay subtracts 1 recharge from ponds. Recharge wells bypass the surface.':'Silt has no effect on pond recharge.')+'</p>');
}
function renderLobby(){
  if(!snapshot){
    const code=(new URL(location.href).searchParams.get('room')||'').slice(0,6).toUpperCase();
    const name=esc(read('aquifer-player-name',''));
    $('lobby').innerHTML='<h2>Play online</h2><p>A shared aquifer and a table for 2–5 players.</p><div class="lobby-panels">'+
      '<form id="create-form"><h3>Create a room</h3><label for="create-name">Your name</label><input id="create-name" name="name" value="'+name+'" maxlength="24" required>'+
      '<div class="split"><div><label for="capacity">Players</label><select id="capacity" name="capacity"><option>2</option><option>3</option><option>4</option><option>5</option></select></div>'+
      '<div><label for="basin-select">Basin</label><select id="basin-select" name="map">'+mapOptions('valley')+'</select></div></div>'+
      '<label class="policy-toggle" for="create-policies"><input type="checkbox" id="create-policies" name="policies" checked> Stakeholder policies</label><button class="btn primary" type="submit">Create room</button></form>'+
      '<form id="join-form"><h3>Join a room</h3><label for="join-name">Your name</label><input id="join-name" name="name" value="'+name+'" maxlength="24" required>'+
      '<label for="room-code">Room code</label><input id="room-code" name="code" value="'+esc(code)+'" maxlength="6" autocapitalize="characters" required><button class="btn primary" type="submit">Join room</button></form></div>';
    if(code) $('join-name').focus();
    return;
  }
  const {capacity,map,members,host}=snapshot;
  const full=members.length===capacity;
  const mine=members[viewer].role;
  $('lobby').innerHTML='<h2>Room '+snapshot.code+'</h2><p>'+members.length+' / '+capacity+' players in '+MAPS[map].name+'</p><div class="lobby-panels">'+
    '<section><h3>Players</h3><ol class="seat-list">'+members.map((m,i)=>'<li>'+portrait(m.role)+'<span><b>'+nameFor(i)+(i===viewer?' · You':'')+'</b><br>'+ROLES[m.role].name+'</span>'+
    (host&&i>0?button('kick','Remove','small','data-i="'+i+'"'):'')+'</li>').join('')+'</ol>'+button('copy','Copy invite','small')+'</section>'+
    '<section><h3>Setup</h3><label for="lobby-role">Your class</label><select id="lobby-role">'+ROLES.map((r,i)=>'<option value="'+i+'" '+(i===mine?'selected':members.some(m=>m.role===i)?'disabled':'')+'>'+r.name+'</option>').join('')+'</select>'+
    '<p class="class-goal">'+ROLES[mine].ability+' Goal: '+roleGoal(ROLES[mine])+'.</p>'+
    (host?'<label for="lobby-map">Basin</label><select id="lobby-map">'+mapOptions(map)+'</select>'+
      '<label class="policy-toggle" for="lobby-policies"><input type="checkbox" id="lobby-policies" '+(snapshot.policies?'checked':'')+'> Stakeholder policies</label>'+
      button('start','Start game','primary',full?'':'disabled'):
    '<p class="class-goal">Stakeholder policies: '+(snapshot.policies?'On':'Off')+'</p><p class="class-goal">Waiting for the host to start.</p>')+'</section></div>';
}
function roomInfo(){
  overlay('Room '+snapshot.code,'<label for="invite-link">Invite link</label><input class="invite-input" id="invite-link" value="'+esc(inviteLink())+'" readonly>',
    button('leave','Back to lobby')+button('copy','Copy invite','primary'));
}
async function copyInvite(){
  try{
    await navigator.clipboard.writeText(inviteLink());
    $('notice').textContent='Invite link copied.';
  }catch{
    roomInfo();
    $('invite-link').select();
  }
}
function inspectCard(i,index,project=false){
  const p=g.players[i],key=(project?p.projects:p.hand)[index],c=CARDS[key];
  if(!c) return;
  const error=project?'':canPlay(g,i,index);
  const attrs='data-index="'+index+'" data-key="'+key+'"';
  const mainAction=project?(i===viewer&&preparing(g)?button('retire','Retire project','danger',attrs):''):
    (canRecycle(g,i,index)?button('recycle','Recycle for 2 Cash','',attrs):'')+button('play','Play card · '+cardCost(p,key)+' Cash','primary',attrs+' '+(error?'disabled':''));
  overlay(c.name,'<div class="detail">'+card(key,{p,block:true})+'<div><p>'+c.text+'</p><p><b>'+c.rule+'</b></p>'+
    (c.kind==='policy'?'<p>Affected players may challenge.</p>':'')+
    (c.source?'<p><a href="'+c.source+'" target="_blank" rel="noopener noreferrer">Read the source ↗</a></p>':'')+
    (error?'<p>'+error+'</p>':'')+'</div></div>',mainAction);
}
const pledged=f=>f.pay.reduce((sum,amount)=>sum+amount,0);
function showFunding(){
  const route=g.funding;
  if(!route){close();return;}
  modal={type:'funding'};
  const {pay}=route,total=pledged(route);
  const pumpInfo=route.kind==='water'?pay.flatMap((n,i)=>{
    const draw=Math.max(0,n-g.players[i].credits);
    return draw?[nameFor(i)+' pumps '+draw]:[];
  }):[];
  overlay(route.label,'<p>Pledge your own resources. A contribution of 2+ on another turn counts toward the pact.</p>'+
    '<div>'+g.players.map((p,i)=>'<div class="fund"><span>'+nameFor(i)+(i===viewer?' · You':'')+'</span><strong title="Available">'+maxPay(g,i,route.kind)+'</strong>'+
      (i===viewer?button('adjust','−','small','aria-label="Remove one from your pledge" data-delta="-1" '+(!pay[i]?'disabled':'')):'<span></span>')+
      '<span class="amount">'+pay[i]+'</span>'+(i===viewer?button('adjust','+','small','aria-label="Add one to your pledge" data-delta="1" '+(total>=route.amount||pay[i]>=maxPay(g,i,route.kind)?'disabled':'')):'<span></span>')+'</div>').join('')+'</div>'+
    '<p class="totals">'+total+' / '+route.amount+' '+(route.kind==='cash'?'Cash':'Water')+'</p>'+
    (route.kind==='water'?'<p class="fund-hint">'+(pumpInfo.length?pumpInfo.join(' · ')+'. Each pump lowers every other player’s Water by 1.':'Water credits cover the allocated amount without pumping.')+'</p>':''),
    active()?button('cancel-fund','Cancel response')+button('confirm-fund','Confirm response','primary',total===route.amount?'':'disabled'):'');
}
function over(){
  if(!g.result) return;
  overlay(g.result.win?'Shared victory':'Basin lost',g.result.win?'<p>You signed the basin pact in round '+isRound()+'.</p>':'<p>'+g.result.reason+'</p>',
    button('pact','Basin pact')+(snapshot.host?button('rematch','Rematch','primary'):''));
}
function copyCard(source){
  const clone=source.cloneNode(true);
  const canvas=clone.querySelector('canvas');
  canvas.getContext('2d').drawImage(source.querySelector('canvas'),0,0);
  clone.removeAttribute('data-action');
  clone.tabIndex=-1;
  clone.setAttribute('aria-hidden','true');
  return clone;
}
async function showEffects(){
  if(showingEffect) return;
  showingEffect=true;
  const layer=$('table-effects');
  try{
    while(effectQueue.length){
      const effect=effectQueue.shift();
      if(!g||g.turn!==effect.turn||document.hidden) continue;
      const boardRect=$('board').getBoundingClientRect();
      const eventArea=$('event');
      const eventRect=eventArea.querySelector('.event').getBoundingClientRect();
      if(effect.type==='die'){
        eventArea.classList.add('is-rolling');
        try {
          await playDice(layer,effect.face,boardRect,eventRect,severityLabels[severity(effect.face)+1]);
        } finally {
          eventArea.classList.remove('is-rolling');
        }
      }else if(effect.type==='card'){
        const player=g.players[effect.player];
        const project=$('projects').querySelector('[data-i="'+effect.player+'"][data-project="'+effect.key+'"]');
        const portrait=$('players').querySelector('[data-i="'+effect.player+'"] .portrait');
        const template=document.createElement('template');
        template.innerHTML=card(effect.key,{p:player,block:true});
        const preview=template.content.firstElementChild;
        renderCanvases(preview);
        await showCardPlay(layer,preview,{
          origin:effect.origin||portrait?.getBoundingClientRect(),
          boardRect,eventRect,landingRect:project?.getBoundingClientRect(),
          tone:CARDS[effect.key].kind==='policy'?'policy-tone':CARDS[effect.key].kind==='action'?'action-tone':'project-tone'
        });
      }
    }
  }finally{
    showingEffect=false;
  }
}
async function play(index,key,turn=g.turn,origin){
  if(localPlay||!g||g.turn!==turn||g.players[viewer].hand[index]!==key) return;
  const reason=canPlay(g,viewer,index);
  if(reason){
    $('notice').textContent=reason;
    return;
  }
  const pending={key,turn,origin:origin||$('tray').querySelector('[data-index="'+index+'"]')?.getBoundingClientRect()};
  localPlay=pending;
  try{
    if(await send('play',{index,card:key,turn})) close();
  }finally{
    if(localPlay===pending) localPlay=null;
  }
}
function printable(title,category,image,body){
  return '<article class="game-card event-print">'+art(image,'card-art')+'<b>'+title+'</b><div class="card-text"><span class="kind">'+category+'</span>'+body+'</div></article>';
}
function printCards(){
  $('printSheet').innerHTML=Object.keys(CARDS).map(key=>card(key,{block:true,full:true})).join('')+
    Object.values(EVENTS).map(e=>printable(e.name,'Event · '+e.tag,e.art,
      e.text+'<br>Cash '+e.cash+(e.water?' or Water '+e.water:'')+' · Miss: −'+e.damage+' HP.'+
      (e.shift?' Groundwater '+signed(e.shift)+'.':'')+(e.kind==='flood'?' Critical at the flood limit. Requires drainage.':e.kind==='drought'?' Critical at the dry limit. Requires MAR.':''))).join('')+
    Object.values(MAPS).map(m=>printable(m.name,'Basin · '+m.geology,m.opener==='dry'?'drought':'rain',
      'Start with '+m.hp+' HP and groundwater '+m.level+'. Safe band '+m.low+'–'+m.high+'. Collapse at '+m.min+' or '+m.max+'. Each player starts with '+m.cash+' Cash and '+m.water+' Water. Pond modifier '+signed(m.seep)+'.')).join('')+
    ROLES.map((r,i)=>printable(r.name,'Stakeholder',['drip','survey','wetland','industry','pipe'][i],r.ability+'<br>Hold '+roleGoal(r)+' at the end of the round.')).join('')+
    printable('Start of turn','Rules','grant',incomeRule+'<br>Then reveal the next event. Shuffle the event deck when it runs out.')+
    printable('Event die','Rules','survey',diceRule+'<br>Emergency drainage or recharge costs 7 Cash with 2 players, 8 with 3–4, or 9 with 5.')+
    printable('Stakeholder policies','Optional rules','grant',policyRule+' Challenges do not count as help toward the pact.')+
    printable('Basin pact','Rules','pond','Win after any full round with 6+ HP, groundwater in the safe band, and every role’s reserves met. '+helpRule+' Clear help markers after each round. Credits never count as reserves.');
  renderCanvases($('printSheet'));
  window.print();
}
dlg.addEventListener('close',()=>{if(!dlg.open) modal=null;});
document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.id!=='create-form'&&form.id!=='join-form') return;
  event.preventDefault();
  const fields=new FormData(form);
  const name=fields.get('name');
  if(form.id==='create-form') create(name,Number(fields.get('capacity')),fields.get('map'),fields.get('policies')==='on');
  else join(name,fields.get('code'));
});
document.addEventListener('change',async event=>{
  const el=event.target;
  if(el.id==='lobby-role'&&!(await send('role',{role:Number(el.value)}))) renderLobby();
  if(el.id==='lobby-map'&&!(await send('map',{map:el.value}))) renderLobby();
  if(el.id==='lobby-policies'&&!(await send('policies',{enabled:el.checked}))) renderLobby();
});
let suppressClick=false;
document.addEventListener('click',async event=>{
  const target=event.target.closest('button[data-action]');
  if(!target||target.disabled) return;
  const {action,kind,key}=target.dataset;
  const i=Number(target.dataset.i),index=Number(target.dataset.index);
  if(action==='hand-card'&&suppressClick){event.preventDefault();return;}
  switch(action){
    case 'close':close();break;
    case 'rules':rules();break;
    case 'tutorial':tutorial();break;
    case 'tutorial-back':tutorial(modal.step-1);break;
    case 'tutorial-next':
      if(modal.step===3){setGuide();close();if(g) render();}else tutorial(modal.step+1);
      break;
    case 'map':showMap();break;
    case 'pact':showPact();break;
    case 'claims':showClaims();break;
    case 'challenge':await send('challenge',{id:key});break;
    case 'role':role(i);break;
    case 'room':roomInfo();break;
    case 'copy':copyInvite();break;
    case 'leave':close();leave();break;
    case 'kick':await send('kick',{id:i});break;
    case 'start':await send('start');break;
    case 'rematch':if(await send('rematch')) close();break;
    case 'hand-card':inspectCard(viewer,index);break;
    case 'inspect-project':inspectCard(i,index,true);break;
    case 'retire':
    case 'recycle':
      if(await send(action,{index,card:key})) close();
      break;
    case 'play':await play(index,key);break;
    case 'roll':
      if(await send('roll')) $('event').querySelector('.response button')?.focus();
      break;
    case 'fund':
      if(await send('fund',{kind})) showFunding();
      break;
    case 'view-funding':showFunding();break;
    case 'adjust':{
      const label=target.getAttribute('aria-label');
      if(await send('pledge',{fundingId:g.funding.id,delta:Number(target.dataset.delta)})){
        Array.from(dlg.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===label&&!b.disabled)?.focus();
      }
      break;
    }
    case 'confirm-fund':
    case 'cancel-fund':
      if(await send(action,{fundingId:g.funding.id})&&g.phase!=='over') close();
      break;
    case 'project-response':
      overlay('Use '+CARDS[key].name,'<p>This project can resolve '+eventFor(g).name+'.</p>',
        button('confirm-project','Resolve event','primary','data-key="'+key+'"'));
      break;
    case 'confirm-project':
      if(await send('use-project',{card:key})&&g.phase!=='over') close();
      break;
    case 'pass':
      overlay('Leave event unresolved?',g.emergency?'<p>This emergency will cause a shared defeat without a response.</p>':'<p>'+eventFor(g).name+' will cost '+eventFor(g).damage+' shared HP. Any groundwater change still applies.</p>',button('confirm-pass','Leave unresolved','danger'));
      break;
    case 'confirm-pass':
      if(await send('pass')&&g.phase!=='over') close();
      break;
    case 'next':await send('next');break;
    case 'result':over();break;
    case 'print':printCards();break;
  }
});

const tray=$('tray'),board=$('board');
let drag=null,scrollFrame=0;
function overBoard(x,y){
  const r=board.getBoundingClientRect();
  return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
function updateGhost(){
  drag.ghost.style.transform='translate3d('+(drag.x-drag.left)+'px,'+(drag.y-drag.top)+'px,0)';
  board.classList.toggle('drop-over',overBoard(drag.x,drag.y));
}
function scrollOnEdge(){
  if(!drag?.ghost) return;
  const edge=64, y=drag.y;
  const speed=y<edge?-(edge-y)*.28:y>innerHeight-edge?(y-innerHeight+edge)*.28:0;
  if(speed){window.scrollBy(0,speed);updateGhost();}
  scrollFrame=requestAnimationFrame(scrollOnEdge);
}
function endDrag(event){
  if(!drag||drag.pointer!==event.pointerId) return;
  const ended=drag;
  drag=null;
  if(!ended.ghost) return;
  cancelAnimationFrame(scrollFrame);
  const origin=ended.ghost.getBoundingClientRect();
  ended.source.classList.remove('card-origin');
  ended.ghost.remove();
  board.classList.remove('drop-ready','drop-over');
  suppressClick=true;
  setTimeout(()=>{suppressClick=false;},0);
  if(event.type==='pointerup'&&overBoard(event.clientX,event.clientY)){
    play(ended.index,ended.key,ended.turn,origin);
  }
}
tray.addEventListener('pointerdown',event=>{
  if(!g||drag||!event.isPrimary||event.button!==0) return;
  const source=event.target.closest('[data-action="hand-card"]');
  if(!source) return;
  const {index,key}=source.dataset;
  if(canPlay(g,viewer,Number(index))) return;
  drag={source,rect:source.getBoundingClientRect(),index:Number(index),key,turn:g.turn,pointer:event.pointerId,left:event.clientX,top:event.clientY};
});
document.addEventListener('pointermove',event=>{
  if(!drag||drag.pointer!==event.pointerId) return;
  const x=event.clientX,y=event.clientY;
  if(!drag.ghost){
    if(Math.hypot(x-drag.left,y-drag.top)<6) return;
    const rect=drag.rect;
    // The tray survives room updates and keeps pointer capture while its cards render.
    tray.setPointerCapture(event.pointerId);
    const ghost=copyCard(drag.source);
    ghost.classList.add('drag-ghost');
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    document.body.append(ghost);
    drag.ghost=ghost;
    drag.source.classList.add('card-origin');
    board.classList.add('drop-ready');
    scrollFrame=requestAnimationFrame(scrollOnEdge);
  }
  drag.x=x;drag.y=y;
  updateGhost();
});
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);
tray.addEventListener('lostpointercapture',event=>{
  if(event.target===tray) endDrag(event);
});
tray.addEventListener('contextmenu',event=>{
  if(event.target.closest('[data-action="hand-card"]')) event.preventDefault();
});

function receive(next,message){
  $('notice').textContent=message;
  if($('dialog-notice')) $('dialog-notice').textContent=message;
  if(next===snapshot) return;
  const previous=g;
  const roomChanged=snapshot?.code!==next?.code;
  snapshot=next;
  g=next?.game||null;
  viewer=next?.me??0;
  $('roomButton').classList.toggle('hide',!next);
  $('lobby').classList.toggle('hide',!!g);
  $('game').classList.toggle('hide',!g);
  if(!g){
    effectQueue.length=0;
    $('table-effects').replaceChildren();
    if(previous||roomChanged) close();
    if(previous) $('status').textContent='';
    renderLobby();
    if(!next&&message) $('notice').textContent=message;
    return;
  }
  if(previous&&previous.turn!==g.turn&&modal?.type==='funding') close();
  flashBoard=previous?.phase==='event'&&g.phase==='resolved'&&!(g.eventMissed??g.status.includes('went unresolved'));
  render();
  if(previous&&!roomChanged&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const last=previous.effects?.at(-1)?.id??0;
    for(const effect of g.effects||[]){
      if(effect.id<=last||effect.turn!==g.turn) continue;
      const origin=effect.player===viewer&&localPlay?.key===effect.key&&localPlay.turn===effect.turn?localPlay.origin:null;
      effectQueue.push({...effect,origin});
    }
    if(effectQueue.length>4) effectQueue.splice(0,effectQueue.length-4);
    showEffects();
  }
  if(g.phase==='over'&&previous?.phase!=='over') over();
  else if(!previous&&!guided) tutorial();
  else if(modal?.type==='funding') showFunding();
  else if(modal?.type==='claims') showClaims();
}

$('brandIcon').innerHTML=icon('logo');
drawBoard();
renderLobby();
connect(receive);
