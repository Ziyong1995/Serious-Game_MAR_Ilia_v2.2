const API='/api/pact/rooms';
const CODE=/^[A-Z2-9]{6}$/;
const inviteCode=()=>new URL(location.href).searchParams.get('room')?.trim().toUpperCase()||'';
const seatKey=code=>'aquifer-pact-seat:'+code;
let state=null;
let code='';
let token='';
let timer=0;
let busy=false;
let generation=0;
let reconnecting=false;
let receiver=()=>{};
export const read=(key,fallback=null)=>{
  try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}
};
export function write(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));}catch{}
}
function setLink(code){
  const url=new URL(location.href);
  if(code) url.searchParams.set('room',code);else url.searchParams.delete('room');
  history.replaceState(null,'',url);
}
function notify(message=''){
  receiver(state,message);
}
function schedule(delay=900){
  clearTimeout(timer);
  if(code&&token) timer=setTimeout(poll,delay);
}
async function fetchJSON(path,{body,key}={}){
  const response=await fetch(path,{
    method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(8000),
    headers:{...(body?{'Content-Type':'application/json'}:{}),...(key?{Authorization:'Bearer '+key}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const data=await response.json();
  if(!response.ok){
    const error=new Error(data.error||'The request failed.');
    error.status=response.status;
    throw error;
  }
  return data;
}
function accept(data){
  if(!data.unchanged&&(!state||data.version>=state.version)){
    state=data;
    notify();
  }else if(reconnecting) notify();
  reconnecting=false;
}
async function poll(){
  if(busy){schedule();return;}
  const current=generation;
  try{
    const data=await fetchJSON(API+'/'+code+(state?'?since='+state.version:''),{key:token});
    if(current===generation&&!busy) accept(data);
  }catch(error){
    if(current!==generation||busy) return;
    if(error.status===401||error.status===404){
      write(seatKey(code),null);
      disconnect(false);
      notify(error.message);
      return;
    }
    reconnecting=true;
    notify('Connection interrupted. Reconnecting…');
  }finally{
    if(current===generation) schedule();
  }
}
function disconnect(clearLink=true){
  generation++;
  clearTimeout(timer);
  state=null;code='';token='';busy=false;reconnecting=false;
  if(clearLink) setLink('');
}
async function enter(path,body){
  if(busy) return false;
  busy=true;
  const current=generation;
  try{
    const data=await fetchJSON(path,{body});
    if(current!==generation) return false;
    write('aquifer-player-name',body.name);
    code=data.code;
    token=data.token;
    delete data.token;
    write(seatKey(code),token);
    setLink(code);
    accept(data);
    return true;
  }catch(error){
    if(current===generation) notify(error.status?error.message:'Could not reach the server. Try again.');
    return false;
  }finally{
    if(current===generation){busy=false;schedule();}
  }
}
function changed(error){
  return error.status===409&&/^The (table|game) changed\./.test(error.message);
}
export async function send(act,fields={}){
  if(busy||!state) return false;
  const current=generation;
  const requestId=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const body={...fields,act,requestId,version:state.version,turn:fields.turn??state.game?.turn};
  const url=API+'/'+code;
  busy=true;
  try{
    let data;
    try{
      data=await fetchJSON(url+'/action',{key:token,body});
    }catch(error){
      if(current!==generation) return false;
      if(changed(error)){
        const latest=await fetchJSON(url,{key:token});
        if(current!==generation) return false;
        accept(latest);
        if(latest.game?.turn!==body.turn) throw new Error('That turn has ended. Try again on the current event.');
        body.version=latest.version;
      }else if(error.status) throw error;
      data=await fetchJSON(url+'/action',{key:token,body});
    }
    if(current!==generation) return false;
    accept(data);
    return true;
  }catch(error){
    if(current===generation) notify(error.status?error.message:error.name==='Error'?error.message:'The connection timed out.');
    return false;
  }finally{
    if(current===generation){busy=false;schedule();}
  }
}
export const create=(name,capacity,map,policies)=>enter(API,{name,capacity,map,policies});
export async function join(name,input){
  const target=input.trim().toUpperCase();
  if(!CODE.test(target)){notify('Enter a six-character room code.');return false;}
  const ticket=read(seatKey(target));
  if(ticket){
    generation++;
    code=target;token=ticket;busy=false;
    setLink(code);
    await poll();
    if(state||code) return !!state;
  }
  return enter(API+'/'+target+'/join',{name});
}
export function leave(){
  disconnect();
  notify();
}
export function connect(listener){
  receiver=listener;
  const invited=inviteCode();
  const ticket=CODE.test(invited)&&read(seatKey(invited));
  if(ticket){code=invited;token=ticket;poll();}
}
