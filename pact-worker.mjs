import {readFileSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import {ApiError,fail,json,randomHex,digest,roomCode,playerName,bodyOf,readRoom,memberId,persist} from './game-worker.mjs';
import {
  MAPS,ROLES,CARDS,makeGame,rollEvent,routesFor,projectRoutes,maxPay,settle,nextTurn,preparing,
  canPlay,playCard,canRecycle,recycleCard,claimsFor,challengeError,challenge
} from './public/engine.js';

const endpoints=/^\/api\/pact\/rooms\/([A-Z2-9]{6})(?:\/(join|action))?$/;
const codePattern=/^[A-Z2-9]{6}$/;
const assets=new Map([
  ['/','index.html'],
  ['/pact/style.css','style.css'],
  ['/pact/engine.js','engine.js'],
  ['/pact/art.js','art.js'],
  ['/pact/connection.js','connection.js'],
  ['/pact/effects.js','effects.js'],
  ['/pact/ui.js','ui.js']
].map(([route,file])=>[route,readFileSync(new URL('./public/'+file,import.meta.url))]));
const pageHeaders={
  'Content-Type':'text/html; charset=utf-8',
  'Cache-Control':'no-cache',
  'Referrer-Policy':'same-origin',
  'X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"
};
function project(room,me,version){
  let game=null;
  if(room.game){
    game=structuredClone(room.game);
    delete game.deck;
    delete game.events;
    for(const [i,p] of game.players.entries()){
      p.handCount=p.hand.length;
      if(i!==me) delete p.hand;
    }
  }
  return {
    code:room.code,capacity:room.capacity,map:room.map,policies:room.policies!==false,version,me,host:me===0,
    members:room.members.map(({name,role},id)=>({id,name,role})),game
  };
}
function pickRole(members){
  return ROLES.findIndex((_,role)=>!members.some(m=>m.role===role));
}
function validMap(map){
  return typeof map==='string'&&Object.hasOwn(MAPS,map);
}
async function createRoom(request,db){
  const {name:input,capacity,map,policies=true}=await bodyOf(request),name=playerName(input);
  fail([2,3,4,5].includes(capacity),400,'Choose 2–5 players.');
  fail(validMap(map),400,'Choose a basin.');
  fail(typeof policies==='boolean',400,'Choose whether to use stakeholder policies.');
  const token=randomHex(),tokenHash=await digest(token);
  for(let i=0;i<5;i++){
    const code=roomCode();
    const room={rules:'pact',code,map,capacity,policies,members:[{name,tokenHash,role:0}],game:null,receipts:[]};
    const result=await db.prepare('INSERT OR IGNORE INTO rooms (code, state, version, updated_at) VALUES (?, ?, 1, ?)').bind(code,JSON.stringify(room),Date.now()).run();
    if(result.meta.changes===1) return json({...project(room,0,1),token},201);
  }
  throw new ApiError(503,'Could not create a room. Try again.');
}
async function joinRoom(request,db,code,initial){
  const {name:input}=await bodyOf(request),name=playerName(input);
  const token=randomHex(),tokenHash=await digest(token);
  let {room,version}=initial;
  for(let attempt=0;attempt<5;attempt++){
    fail(!room.game,409,'This match already started. Return in the browser you used to join.');
    fail(room.members.length<room.capacity,409,'This room is full.');
    fail(!room.members.some(m=>m.name.toLowerCase()===name.toLowerCase()),400,'That name is already in use.');
    room.members.push({name,tokenHash,role:pickRole(room.members)});
    try{
      const saved=await persist(db,room,version);
      return json({...project(room,room.members.length-1,saved),token},201);
    }catch(error){
      if(error.status!==409||attempt===4) throw error;
      ({room,version}=await readRoom(db,code));
    }
  }
}
function manageRoom(room,me,action){
  switch(action.act){
    case 'role':
      fail(!room.game,409,'Roles are fixed after the match starts.');
      fail(Number.isInteger(action.role)&&action.role>=0&&action.role<ROLES.length,400,'Choose a role.');
      fail(!room.members.some((m,i)=>i!==me&&m.role===action.role),409,'That role is taken.');
      room.members[me].role=action.role;
      break;
    case 'map':
      fail(me===0&&!room.game,403,'Only the host can change the basin before the match.');
      fail(validMap(action.map),400,'Choose a basin.');
      room.map=action.map;
      break;
    case 'policies':
      fail(me===0&&!room.game,403,'Only the host can change policies before the match.');
      fail(typeof action.enabled==='boolean',400,'Choose whether to use stakeholder policies.');
      room.policies=action.enabled;
      break;
    case 'kick':
      fail(me===0&&!room.game,403,'Only the host can remove players in the lobby.');
      fail(Number.isInteger(action.id)&&action.id>0&&action.id<room.members.length,400,'Choose a player.');
      room.members.splice(action.id,1);
      break;
    case 'start':
      fail(me===0&&!room.game,403,'Only the host can start a new match.');
      fail(room.members.length===room.capacity,400,'Wait for every player to join.');
      room.game=makeGame(room.map,room.members.map(m=>m.role),room.policies!==false);
      break;
    case 'rematch':
      fail(me===0&&room.game?.phase==='over',403,'The host can start a rematch after the match ends.');
      room.game=null;
      break;
    default: return false;
  }
  return true;
}
function gameAction(g,me,action){
  fail(g,400,'Start the match first.');
  fail(action.turn===g.turn,409,'That turn has ended.');
  // A turn number can repeat in a rematch. The room's version covers that race.
  const caller=g.players[me];
  const active=me===g.active;
  const requireActive=()=>fail(active,403,'Only the active player can do that.');
  switch(action.act){
    case 'roll':
      requireActive();
      fail(rollEvent(g,randomInt(1,7)),409,'The die has already been rolled.');
      break;
    case 'play':
    case 'recycle': {
      fail(Number.isInteger(action.index)&&caller.hand[action.index]===action.card&&typeof action.card==='string',409,'That card has moved. Check your hand.');
      if(action.act==='play'){
        const error=canPlay(g,me,action.index);
        fail(!error,400,error);
        playCard(g,me,action.index);
      }else{
        fail(canRecycle(g,me,action.index),400,'You can recycle one card on your turn.');
        recycleCard(g,me,action.index);
      }
      break;
    }
    case 'retire':
      fail(preparing(g)&&Number.isInteger(action.index)&&caller.projects[action.index]===action.card&&typeof action.card==='string',409,'That project is unavailable.');
      caller.projects.splice(action.index,1);
      g.status=CARDS[action.card].name+' was retired.';
      break;
    case 'fund': {
      requireActive();
      fail(g.phase==='event',409,'Roll the die first.');
      fail(!g.funding,409,'There is already a response open.');
      const route=routesFor(g).find(r=>r.kind===action.kind);
      fail(route,400,'That response is unavailable.');
      g.funding={...route,id:randomHex().slice(0,16),pay:g.players.map(()=>0)};
      break;
    }
    case 'pledge':
    case 'confirm-fund':
    case 'cancel-fund': {
      const f=g.funding;
      fail(g.phase==='event'&&f&&f.id===action.fundingId,409,'That response has closed.');
      if(action.act==='pledge'){
        fail(action.delta===1||action.delta===-1,400,'Change your own pledge by one.');
        const total=f.pay.reduce((sum,amount)=>sum+amount,0);
        const amount=f.pay[me]+action.delta;
        fail(amount>=0&&amount<=maxPay(g,me,f.kind)&&total+action.delta<=f.amount,400,'That pledge exceeds the cost or your resources.');
        f.pay[me]=amount;
      }else{
        requireActive();
        if(action.act==='cancel-fund') g.funding=null;
        else fail(settle(g,f,f.pay),400,'Collect the full response cost first.');
      }
      break;
    }
    case 'use-project':
      fail(g.phase==='event'&&projectRoutes(g).some(r=>r.player===me&&r.key===action.card),400,'Only the owner of a matching project can use it.');
      fail(settle(g,{kind:'project',player:me,key:action.card}),409,'That response has closed.');
      break;
    case 'challenge': {
      const claim=claimsFor(g,me).find(c=>c.id===action.id);
      const error=challengeError(g,me,claim);
      fail(!error,400,error);
      challenge(g,me,action.id);
      break;
    }
    case 'pass':
      requireActive();
      fail(settle(g,{kind:'pass'}),409,'That event has closed.');
      break;
    case 'next':
      requireActive();
      fail(nextTurn(g),409,'Resolve the event first.');
      break;
    default: throw new ApiError(400,'Unknown game action.');
  }
}
async function api(request,db,url){
  fail(db,503,'Game storage is unavailable.');
  if(request.method==='POST'){
    const origin=request.headers.get('Origin');
    fail(!origin||origin===url.origin,403,'Cross-site requests are not allowed.');
    fail((request.headers.get('Content-Type')||'').startsWith('application/json'),415,'Use JSON for game actions.');
  }
  if(url.pathname==='/api/pact/rooms'&&request.method==='POST') return createRoom(request,db);
  const match=endpoints.exec(url.pathname);
  fail(match,404,'Room not found.');
  const [,code,route]=match;
  const record=await readRoom(db,code);
  const {room,version}=record;
  fail(room.rules==='pact',404,'This room belongs to the original edition. Open its original invite.');
  if(route==='join'&&request.method==='POST') return joinRoom(request,db,code,record);
  const me=await memberId(room,request);
  if(!route&&request.method==='GET'){
    return url.searchParams.get('since')===String(version)?json({version,unchanged:true}):json(project(room,me,version));
  }
  fail(route==='action'&&request.method==='POST',405,'Method not allowed.');
  const action=await bodyOf(request);
  fail(typeof action.requestId==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(action.requestId),400,'Invalid request identifier.');
  const actor=room.members[me].tokenHash;
  if(room.receipts.some(r=>r.actor===actor&&r.id===action.requestId)) return json(project(room,me,version));
  fail(action.version===version,409,'The table changed. Try your action again.');
  if(!manageRoom(room,me,action)) gameAction(room.game,me,action);
  room.receipts.push({id:action.requestId,actor});
  room.receipts=room.receipts.slice(-128);
  return json(project(room,me,await persist(db,room,version)));
}
export default {
  async fetch(request,{DB}){
    const url=new URL(request.url), path=url.pathname;
    if(path.startsWith('/api/pact/')){
      try{return await api(request,DB,url);}
      catch(error){
        if(!(error instanceof ApiError)) console.error('Pact API error:',error);
        return json({error:error instanceof ApiError?error.message:'The server could not complete this action.'},error.status||500);
      }
    }
    if(!assets.has(path)||!['GET','HEAD'].includes(request.method)) return new Response('Not found',{status:404});
    const room=url.searchParams.get('room')?.toUpperCase();
    if(path==='/'&&DB&&room&&codePattern.test(room)){
      const row=await DB.prepare('SELECT state FROM rooms WHERE code = ?').bind(room).first();
      if(row&&JSON.parse(row.state).rules!=='pact') return new Response(null,{status:302,headers:{Location:'/legacy?room='+room,'Cache-Control':'no-store'}});
    }
    const contentType=path.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8';
    const headers=path==='/'?pageHeaders:{'Content-Type':contentType,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
    return new Response(request.method==='HEAD'?null:assets.get(path),{headers});
  }
};
