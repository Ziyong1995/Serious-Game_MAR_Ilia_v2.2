const faces=[
  [5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]
];
// Rotations that turn each of the six outward faces toward the viewer.
const orientation=[[0,0],[-90,0],[0,-90],[0,90],[90,0],[0,180]];
const ease='cubic-bezier(.2,.7,.2,1)';
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const make=(tag,className)=>{
  const el=document.createElement(tag);
  el.className=className;
  return el;
};
const center=rect=>({x:rect.left+rect.width/2,y:rect.top+rect.height/2});
const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));
function visiblePoint(point,margin=75){
  return {x:clamp(point.x,margin,innerWidth-margin),y:clamp(point.y,margin,innerHeight-margin)};
}
function place(el,point){
  el.style.left=point.x+'px';
  el.style.top=point.y+'px';
}
function impact(layer,point,tone,delay){
  const ring=make('div','table-impact '+tone);
  ring.style.setProperty('--impact-delay',delay+'ms');
  place(ring,point);
  for(let i=0;i<8;i++){
    const fleck=make('i','table-fleck');
    fleck.style.setProperty('--bearing',i*45+'deg');
    ring.append(fleck);
  }
  layer.append(ring);
  return ring;
}
async function playDice(layer,face,boardRect,eventRect,severityLabel){
  if(reduceMotion()) return;
  const event=center(eventRect);
  const space=boardRect.right-eventRect.right;
  const end=visiblePoint({
    x:space>137?eventRect.right+space/2:event.x,
    y:eventRect.top+(space>137?85:48)
  },59);
  const tone=['mild','normal','severe'][Math.floor((face-1)/2)];
  const flight=make('div','table-die-flight '+tone);
  const cube=make('div','table-die');
  const label=make('span','table-die-label');
  label.textContent=face+' · '+severityLabel;
  const [x,y]=orientation[face-1];
  cube.style.setProperty('--die-x',x+'deg');
  cube.style.setProperty('--die-y',y+'deg');
  for(const [i,pips] of faces.entries()){
    const side=make('div','die-side die-side-'+(i+1));
    for(const position of pips){
      const pip=make('i','die-pip');
      pip.style.gridArea=(Math.floor((position-1)/3)+1)+' / '+((position-1)%3+1);
      side.append(pip);
    }
    cube.append(side);
  }
  flight.append(cube,label);
  place(flight,end);
  layer.append(flight);
  const splash=impact(layer,{x:end.x,y:end.y+24},tone,580);
  const startX=Math.min(114,innerWidth-end.x-33);
  const sequence=flight.animate([
    {transform:'translate('+startX+'px,-75px)',opacity:0},
    {transform:'translate('+startX*.76+'px,-50px)',opacity:1,offset:.13},
    {transform:'translate(21px,0)',opacity:1,offset:.46},
    {transform:'translate(-10px,-18px)',opacity:1,offset:.58},
    {transform:'translate(0,0)',opacity:1,offset:.72},
    {transform:'translate(0,0)',opacity:1,offset:.91},
    {transform:'translate(0,3px)',opacity:0}
  ],{duration:1240,easing:'linear',fill:'both'});
  await sequence.finished.catch(()=>{});
  flight.remove();
  splash.remove();
}
async function playCard(layer,preview,{origin,boardRect,eventRect,landingRect,tone}){
  if(reduceMotion()) return;
  const board=center(boardRect);
  const focus=visiblePoint({x:board.x,y:eventRect.bottom-18});
  const destination=visiblePoint(landingRect?center(landingRect):focus,40);
  const start=origin?center(origin):{x:boardRect.left-25,y:focus.y-20};
  const distanceFromCenter={x:start.x-focus.x,y:start.y-focus.y};
  const isProject=Boolean(landingRect);
  const accent=make('div','table-card-mat '+tone);
  place(accent,focus);
  preview.classList.add('table-card-preview',tone);
  place(preview,focus);
  layer.append(accent,preview);
  const splash=impact(layer,destination,tone,isProject?645:280);
  const transform=(x,y,scale,angle)=>'translate(-50%,-50%) translate('+x+'px,'+y+'px) rotate('+angle+'deg) scale('+scale+')';
  const glide=preview.animate([
    {transform:transform(distanceFromCenter.x,distanceFromCenter.y,origin?Math.min(origin.width/148,1):.53,origin?-8:-18),opacity:origin?.width>90?1:.25,easing:ease},
    {transform:transform(0,-8,1.045,2),opacity:1,offset:.26,easing:ease},
    {transform:transform(0,0,1,0),opacity:1,offset:.38},
    {transform:transform(0,0,1,0),opacity:1,offset:.64,easing:ease},
    {transform:transform(destination.x-focus.x,destination.y-focus.y,isProject?.5:1.13,0),opacity:isProject?1:.45,offset:.87},
    {transform:transform(destination.x-focus.x,destination.y-focus.y,isProject?.45:1.16,0),opacity:0}
  ],{duration:980,fill:'both'});
  await glide.finished.catch(()=>{});
  preview.remove();
  splash.remove();
  accent.remove();
}
export {playDice,playCard};
