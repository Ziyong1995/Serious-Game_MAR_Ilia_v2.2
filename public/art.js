const ICONS={
  drop:'<path d="M12 2.5c2.1 3.8 6.6 7.5 6.6 12a6.6 6.6 0 0 1-13.2 0c0-4.5 4.5-8.2 6.6-12Z"/><path d="M8.7 14.6c0 2 1.3 3.4 3.1 3.8"/>',
  logo:'<path d="M12 2.5c2.3 4.1 6.2 7.1 6.2 11.2a6.2 6.2 0 1 1-12.4 0C5.8 9.6 9.7 6.6 12 2.5Z"/><path d="M3 17.5c2.5 0 2.5-1.4 5-1.4s2.5 1.4 5 1.4 2.5-1.4 5-1.4h3M3 21c2.5 0 2.5-1.4 5-1.4s2.5 1.4 5 1.4 2.5-1.4 5-1.4h3"/>',
  cash:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2v9.6m2.3-8.2h-3.1a1.7 1.7 0 1 0 0 3.4h1.6a1.7 1.7 0 0 1 0 3.4H9.7"/>',
  heart:'<path d="M12 20.5C10 18.6 3.3 14.6 3.3 9.7c0-4.3 5.7-6.5 8.7-2.3 3-4.2 8.7-2 8.7 2.3 0 4.9-6.7 8.9-8.7 10.8Z"/>',
  map:'<path d="M3 20 9.5 8l3 5.5 3.2-9L21 20H3Zm4-7 2.5 1.5L11 11m3.2-2 1.5 2.2 1.6-1.1"/>',
  cards:'<rect x="8" y="5" width="11" height="15" rx="2"/><path d="M5 17 3 7a2 2 0 0 1 1.6-2.4L13 3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  dice:'<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8" cy="8" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="16" cy="16" r=".7"/>',
  seed:'<path d="M12 20V9m0 6c-5 .8-7-3-7-7 4 0 7 2 7 7Zm0-3c0-4 2-7 7-7 0 4-2 7-7 7Z"/>',
  shield:'<path d="M12 21c-6-3-8-6-8-14l8-4 8 4c0 8-2 11-8 14Z"/><path d="M9 12h6m-3-3v6"/>',
  leaf:'<path d="M5 19c3-7 6-10 12-13M7 16C3 7 12 4 20 4c0 7-3 14-11 13"/>',
  factory:'<path d="M3 21V11l6-4v5l6-4v5h6v8Zm14-8V4h3v9M7 17h1m4 0h1m4 0h1"/>',
  tap:'<path d="M3 11h13a4 4 0 0 1 4 4v2h-4v-2H3Zm7 0V5m-4 0h8m3 15h2"/>'
};
const icon=(name,cls='')=>'<svg class="symbol '+cls+'" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[name]+'</svg>';
const roleIcon=i=>['seed','shield','leaf','factory','tap'][i];
function drawArt(canvas,key){
  const ctx=canvas.getContext('2d');
  ctx.save();
  ctx.scale(canvas.width/320,canvas.height/104);
  function poly(color,...pts){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fill();
  }
  function line(color,width,...pts){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(p=>ctx.lineTo(...p));ctx.stroke();
  }
  function rect(color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function oval(color,x,y,rx,ry){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function tree(x,y,s=1){
    rect('#5e6450',x-2*s,y-16*s,4*s,18*s);
    poly('#57725c',[x-12*s,y-11*s],[x,y-37*s],[x+13*s,y-11*s]);
    poly('#6d8a69',[x-9*s,y-20*s],[x,y-41*s],[x+10*s,y-20*s]);
  }
  function hills(sky,far,near){
    rect(sky,0,0,320,104);
    poly(far,[0,74],[0,52],[47,39],[79,45],[132,19],[166,32],[207,22],[258,46],[292,38],[320,50],[320,104],[0,104]);
    poly(near,[0,62],[52,52],[110,66],[147,59],[195,74],[243,57],[289,64],[320,51],[320,104],[0,104]);
  }
  if(key==='rain'){
    hills('#a0b0b1','#657d7c','#4e655d');
    oval('#889c9e',49,17,90,13);oval('#889c9e',215,11,125,15);oval('#84989a',264,29,72,11);
    poly('#6f9eaa',[153,49],[171,50],[150,61],[160,67],[184,65],[220,75],[218,84],[262,104],[75,104],[99,89],[165,82],[168,77],[133,70],[124,64]);
    line('#accbcb',2,[188,78],[181,83],[135,88],[115,96]);
    line('#b4cdcd',1.3,[222,97],[244,101]);
    for(let i=0;i<21;i++){const x=(i*53)%334;const y=(i*29)%78;line('#d8e3da',1,[x,y],[x-5,y+9]);}
    tree(44,98,1.04);tree(26,102,.8);tree(292,90,.97);tree(309,94,.63);
  }else if(key==='drought'){
    hills('#edc48c','#c39c6d','#bf8b57');oval('#f9da92',235,22,14,14);
    poly('#d9ad74',[0,80],[55,71],[111,81],[163,71],[208,78],[263,68],[320,77],[320,104],[0,104]);
    for(let i=0;i<7;i++){const x=i*56-14;line('#936743',1.6,[x,105],[x+14,92],[x+10,87],[x+32,80]);line('#936743',1,[x+13,92],[x+34,94],[x+44,100]);}
  }else if(['bank','sat','checkdam'].includes(key)){
    hills('#d5e3d9','#a6ba9d','#8ea984');
    poly('#baac88',[0,59],[43,55],[87,62],[146,59],[202,64],[264,60],[320,59],[320,104],[0,104]);
    poly('#8ea9a4',[0,89],[65,87],[132,92],[197,89],[260,86],[320,89],[320,104],[0,104]);
    const arrow=(x,y,endX,endY)=>{
      line('#3f7480',2,[x,y],[endX,endY]);
      const angle=Math.atan2(endY-y,endX-x);
      line('#3f7480',2,[endX-6*Math.cos(angle-.55),endY-6*Math.sin(angle-.55)],[endX,endY],
        [endX-6*Math.cos(angle+.55),endY-6*Math.sin(angle+.55)]);
    };
    if(key==='bank'){
      poly('#84b6c1',[0,53],[96,53],[115,70],[92,83],[0,83]);
      line('#d8e9e6',2,[22,65],[78,65]);
      line('#5a6f6e',9,[233,87],[233,47],[263,47]);
      line('#bfcfc5',3,[233,86],[233,47],[263,47]);
      arrow(113,73,152,87);arrow(162,88,215,88);
    }else if(key==='sat'){
      rect('#718b82',26,31,56,29);
      line('#dae0d2',2,[36,46],[71,46]);
      line('#5b7471',4,[83,42],[128,42],[128,57]);
      poly('#8bbdc5',[112,58],[246,58],[234,70],[123,70]);
      for(const x of [146,179,211]) arrow(x,72,x,93);
    }else{
      poly('#86b3b7',[0,51],[173,51],[182,71],[0,73]);
      poly('#6b7568',[169,74],[187,41],[203,41],[221,74]);
      line('#a5ac94',2,[183,57],[208,57]);
      for(const x of [74,108,142]) arrow(x,73,x,92);
    }
  }else if(['pond','wetland','drain'].includes(key)){
    hills('#c6d8cf','#92ab8c','#789977');oval('#f9e5b4',255,18,9,9);
    const shape=key==='drain'?[[130,49],[181,49],[154,65],[193,78],[232,103],[72,104],[120,84],[106,65]]:[[127,57],[182,49],[252,63],[266,88],[205,101],[94,98],[64,83]];
    poly('#587c70',...shape);
    poly('#8cbbc2',...shape.map(([x,y])=>[160+(x-160)*.83,78+(y-78)*.72]));
    for(let i=0;i<5;i++) line('#c5d6cf',1.4,[108+i*17,75+i*3],[135+i*17,74+i*3]);
    if(key==='drain'){
      line('#e3cc9c',3,[62,104],[110,83],[95,63],[128,50]);
      line('#e3cc9c',3,[239,104],[198,76],[168,64],[187,49]);
    }else if(key==='wetland'){
      for(let i=0;i<11;i++){const x=64+i*18,y=92+(i*9)%12;line('#57794d',2,[x,y],[x-5,y-17]);line('#749658',1.7,[x,y],[x+6,y-12]);}
    }else{
      line('#e0d7b0',2,[76,80],[125,61],[181,54],[237,65]);
    }
    tree(32,90,.85);tree(285,76,.73);tree(303,81,.9);
  }else if(key==='drip'){
    hills('#d9dec1','#9ca477','#8b9866');
    poly('#b8a86e',[0,84],[78,70],[137,63],[202,62],[320,81],[320,104],[0,104]);
    for(let i=0;i<6;i++){
      const x=33+i*51;line('#84754e',5,[x,105],[94+i*25,66]);
      for(let j=0;j<4;j++){const px=x+(94+i*25-x)*j/5,py=102-j*7;oval('#5f8455',px-4,py-3,6,3);oval('#77934f',px+4,py-5,6,3);}
    }
  }else if(['well','pipe','industry','tank'].includes(key)){
    hills('#cad7ce','#9cac8d','#819a78');
    rect('#b8a77e',0,84,320,20);rect('#9a8b66',0,97,320,7);
    if(key==='well'){
      rect('#738383',133,53,54,51);rect('#9dada2',137,55,16,49);
      oval('#4d6b72',160,53,27,8);oval('#a0c4c4',160,52,21,4);
      line('#526469',9,[160,52],[160,23],[205,23],[205,43]);line('#b5c2b7',3,[160,47],[160,23],[205,23],[205,43]);
      oval('#73b9c5',205,51,3,5);
    }else if(key==='pipe'){
      line('#6d7676',21,[41,55],[157,55],[157,83],[255,83]);
      line('#bac8bc',8,[42,52],[155,52],[155,80],[253,80]);
      rect('#6e898a',98,41,14,28);rect('#6e898a',210,69,14,28);
      poly('#507986',[141,56],[153,66],[162,61],[168,62],[156,78]);
      oval('#83b5bd',130,77,3,5);oval('#83b5bd',126,87,3,4);oval('#83b5bd',135,89,3,5);
    }else if(key==='industry'){
      poly('#647c79',[81,87],[81,45],[130,25],[130,45],[183,25],[183,45],[222,45],[222,87]);
      rect('#8d9c8b',187,14,15,38);rect('#5f7976',201,12,5,39);
      for(let i=0;i<4;i++) rect('#caceab',96+i*30,55,9,13);
      rect('#4c645e',171,69,21,18);
    }else{
      rect('#6d8783',113,29,87,52);oval('#6d8783',156.5,81,43.5,8);oval('#abc2b4',156.5,29,43.5,9);
      for(let i=0;i<3;i++) line('#c0cabe',1.5,[117,42+i*14],[197,42+i*14]);
      rect('#515f54',120,88,9,9);rect('#515f54',187,88,9,9);
      line('#526e6a',5,[201,71],[217,71],[217,82],[230,82]);oval('#78acb3',230,90,3,5);
    }
  }else{
    rect(key==='grant'?'#ded4af':'#c1d3c9',0,0,320,104);
    if(key==='grant'){
      for(let i=0;i<4;i++){rect('#a88847',101+i*11,64-i*9,69,9);oval('#d7b96d',135+i*11,64-i*9,34.5,8);}
      oval('#8b9968',195,34,10,17);oval('#66865c',181,21,8,13);
      line('#658156',2,[180,50],[187,30],[190,18]);
    }else{
      for(let i=0;i<7;i++) line('#92ab95',1,[0,i*19],[80,i*19-13],[155,i*19+14],[244,i*19-5],[320,i*19+1]);
      rect('#52736c',124,16,62,72);rect('#f5eee0',131,24,48,56);rect('#698576',143,14,24,9);
      line('#648d93',2,[138,59],[147,55],[157,64],[169,41],[175,46]);
      oval('#52736c',198,63,13,13);oval('#c2d5c7',198,63,9,9);line('#52736c',5,[207,73],[221,87]);
    }
  }
  ctx.restore();
}
function drawBoard(){
  const canvas=document.getElementById('topo'),ctx=canvas.getContext('2d'),w=950,h=490;
  canvas.width=w;canvas.height=h;
  ctx.clearRect(0,0,w,h);
  function terrain(x,y,color,tilt){
    ctx.strokeStyle=color;ctx.lineWidth=1;
    for(let ring=0;ring<12;ring++){
      ctx.beginPath();
      for(let i=0;i<=115;i++){
        const a=i/115*2*Math.PI,r=(35+ring*12)*(1+.19*Math.sin(a*3+tilt)+.07*Math.sin(a*7+.5));
        const dx=x+Math.cos(a)*r*1.27,dy=y+Math.sin(a)*r*.93;
        if(!i)ctx.moveTo(dx,dy);else ctx.lineTo(dx,dy);
      }
      ctx.stroke();
    }
  }
  terrain(32,162,'#a597763b',.1);
  terrain(937,251,'#9d967442',2);
  terrain(214,-40,'#a5977630',3);
  terrain(702,555,'#a5977635',4);
  ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(827,0);ctx.bezierCurveTo(761,88,886,99,842,164);ctx.bezierCurveTo(811,218,766,257,818,330);ctx.bezierCurveTo(868,394,821,451,770,490);ctx.strokeStyle='#79979833';ctx.lineWidth=19;ctx.stroke();
  ctx.strokeStyle='#90a8a44d';ctx.lineWidth=2;ctx.stroke();
}

export {icon,roleIcon,drawArt,drawBoard};
