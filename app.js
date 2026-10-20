const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const ASPECTS=[['1:1',1080,1080],['4:5',1080,1350],['9:16',1080,1920],['16:9',1920,1080]];
const LAYOUTS=[['grid','Grid'],['feature','Feature'],['duo','Duo'],['mosaic','Mosaic']];
const S={aspect:1,layout:'grid',gap:16,pad:32,rad:20,bw:0,bc:'#ffffff',bg:'#14213d'};
let items=[],dirty=true,busy=false;
const status=t=>$('status').textContent=t;
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h)}

// Layout engine: every cell is [x,y,w,h] in 0..1
function rowsIn(m,rows,x,y,w,h,wt){
  const out=[],base=Math.floor(m/rows),ex=m%rows;
  const hs=[...Array(rows)].map((_,i)=>wt?(i%2?1:1.4):1),ht=hs.reduce((a,b)=>a+b);let cy=y;
  for(let i=0;i<rows;i++){
    const k=base+(i<ex?1:0),rh=h*hs[i]/ht;
    const ws=[...Array(k)].map((_,j)=>wt?((i+j)%2?1:1.6):1),wtot=ws.reduce((a,b)=>a+b);let cx=x;
    for(let j=0;j<k;j++){const cw=w*ws[j]/wtot;out.push([cx,cy,cw,rh]);cx+=cw}
    cy+=rh;
  }
  return out;
}
function getRects(n,aspect,type){
  const m=n-1;
  if(type==='feature'){
    return aspect>=1?[[0,0,.6,1],...rowsIn(m,m<=4?m:Math.ceil(m/2),.6,0,.4,1)]
                    :[[0,0,1,.5],...rowsIn(m,Math.ceil(m/3),0,.5,1,.5)];
  }
  if(type==='duo'){const r=n-2;return [[0,0,.5,.55],[.5,0,.5,.55],...rowsIn(r,r<=4?1:2,0,.55,1,.45)]}
  const cols=Math.min(n,Math.ceil(Math.sqrt(n*aspect)));
  return rowsIn(n,Math.ceil(n/cols),0,0,1,1,type==='mosaic');
}

function cover(el,x,y,w,h){
  const sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight;if(!sw)return;
  const s=Math.max(w/sw,h/sh),dw=sw*s,dh=sh*s;
  ctx.drawImage(el,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function render(){
  const [,W,H]=ASPECTS[S.aspect];
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  ctx.fillStyle=S.bg;ctx.fillRect(0,0,W,H);
  const n=Math.min(9,Math.max(3,items.length)),g=S.gap,p=S.pad-g/2;
  getRects(n,W/H,S.layout).forEach((r,i)=>{
    const x=p+r[0]*(W-2*p)+g/2,y=p+r[1]*(H-2*p)+g/2,w=r[2]*(W-2*p)-g,h=r[3]*(H-2*p)-g;
    if(w<=0||h<=0)return;
    const rad=Math.min(S.rad,w/2,h/2);
    ctx.save();rr(ctx,x,y,w,h,rad);ctx.clip();
    if(items[i])cover(items[i].el,x,y,w,h);
    else{ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x,y,w,h);ctx.fillStyle='rgba(255,255,255,.7)';
      ctx.font=`${Math.min(w,h)*.3}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',x+w/2,y+h/2)}
    ctx.restore();
    if(S.bw>0){const b=S.bw;ctx.strokeStyle=S.bc;ctx.lineWidth=b;rr(ctx,x+b/2,y+b/2,w-b,h-b,Math.max(0,rad-b/2));ctx.stroke()}
  });
  dirty=false;
}
function tick(){if(dirty||items.some(i=>i.type==='video'))render();requestAnimationFrame(tick)}

// Media
function load(f){return new Promise((res,rej)=>{
  const url=URL.createObjectURL(f);
  if(f.type.startsWith('video/')){
    const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.preload='auto';
    v.onloadeddata=()=>{v.play().catch(()=>{});res({type:'video',el:v,url,name:f.name})};v.onerror=rej;v.src=url;
  }else if(f.type.startsWith('image/')){
    const i=new Image();i.onload=()=>res({type:'image',el:i,url,name:f.name});i.onerror=rej;i.src=url;
  }else rej();
})}
$('file').onchange=async e=>{
  const files=[...e.target.files];e.target.value='';
  for(const f of files){
    if(items.length>=9){status('Maximum is 9. Extra files were skipped.');break}
    try{items.push(await load(f))}catch(err){status('Could not read '+f.name)}
  }
  refresh();
};
function refresh(){
  const l=$('list');l.innerHTML='';
  items.forEach((it,i)=>{
    const li=document.createElement('li');
    li.innerHTML='<span class="nm"></span><span class="ops"><button aria-label="Move earlier">&#9664;</button><button aria-label="Move later">&#9654;</button><button aria-label="Remove">&#10005;</button></span>';
    const th=document.createElement(it.type==='video'?'video':'img');th.className='th';th.muted=true;th.src=it.url;th.alt='';
    li.prepend(th);li.querySelector('.nm').textContent=it.name;
    const [a,b,c]=li.querySelectorAll('button');
    a.disabled=i===0;b.disabled=i===items.length-1;
    a.onclick=()=>{[items[i-1],items[i]]=[items[i],items[i-1]];refresh()};
    b.onclick=()=>{[items[i+1],items[i]]=[items[i],items[i+1]];refresh()};
    c.onclick=()=>{URL.revokeObjectURL(it.url);items.splice(i,1);refresh()};
    l.appendChild(li);
  });
  $('cnt').textContent=items.length+'/9';
  $('file').disabled=items.length>=9;
  const ok=items.length>=3,hasVid=items.some(i=>i.type==='video');
  $('btnImg').disabled=!ok;$('btnVid').disabled=!ok;$('btnVid').hidden=!hasVid;
  status(ok?'Ready. Adjust the layout and frame, then download.':'Add at least 3 photos or videos ('+items.length+' so far).');
  drawThumbs();dirty=true;
}

// Controls
function drawThumbs(){
  const n=Math.min(9,Math.max(3,items.length)),[,W,H]=ASPECTS[S.aspect],box=$('layouts');box.innerHTML='';
  LAYOUTS.forEach(([k,label])=>{
    const b=document.createElement('button'),c=document.createElement('canvas');
    c.width=64;c.height=Math.round(64*H/W);const t=c.getContext('2d');
    t.fillStyle='#14213d';t.fillRect(0,0,c.width,c.height);t.fillStyle='#ffd23f';
    getRects(n,W/H,k).forEach(r=>t.fillRect(r[0]*c.width+1.5,r[1]*c.height+1.5,r[2]*c.width-3,r[3]*c.height-3));
    b.append(c,label);b.setAttribute('aria-pressed',S.layout===k);
    b.onclick=()=>{S.layout=k;drawThumbs();dirty=true};box.appendChild(b);
  });
}
ASPECTS.forEach(([label],i)=>{
  const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',i===S.aspect);
  b.onclick=()=>{S.aspect=i;[...$('aspects').children].forEach((x,j)=>x.setAttribute('aria-pressed',j===i));drawThumbs();dirty=true};
  $('aspects').appendChild(b);
});
['gap','pad','rad','bw'].forEach(k=>{
  const el=$(k),o=el.parentElement.querySelector('output');o.textContent=el.value;
  el.oninput=()=>{S[k]=+el.value;o.textContent=el.value;dirty=true};
});
['bc','bg'].forEach(k=>{$(k).oninput=e=>{S[k]=e.target.value;dirty=true}});
['#14213d','#ffffff','#000000','#ffd23f','#ee6c4d','#3d5a80','#2a9d8f','#f4acb7'].forEach(c=>{
  const b=document.createElement('button');b.style.background=c;b.setAttribute('aria-label','Background '+c);
  b.onclick=()=>{S.bg=c;$('bg').value=c;dirty=true};$('swatches').appendChild(b);
});

// Export
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
$('btnImg').onclick=()=>{render();cv.toBlob(b=>dl(b,'collage.png'),'image/png')};
$('btnVid').onclick=async()=>{
  if(busy)return;
  const type=window.MediaRecorder&&['video/webm;codecs=vp9','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!type){status('This browser cannot record video. Try Chrome, Edge, Firefox or Safari 14.1+.');return}
  const vids=items.filter(i=>i.type==='video');
  const dur=Math.min(60,Math.max(...vids.map(v=>isFinite(v.el.duration)?v.el.duration:5)));
  busy=true;document.body.classList.add('busy');
  vids.forEach(v=>{v.el.currentTime=0;v.el.play().catch(()=>{})});
  await new Promise(r=>setTimeout(r,250));
  const chunks=[],rec=new MediaRecorder(cv.captureStream(30),{mimeType:type,videoBitsPerSecond:8e6});
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const t0=performance.now(),iv=setInterval(()=>status('Recording '+Math.min(100,Math.round((performance.now()-t0)/dur/10))+'%'),300);
  rec.onstop=()=>{clearInterval(iv);dl(new Blob(chunks,{type}),'collage.'+(type.includes('mp4')?'mp4':'webm'));
    busy=false;document.body.classList.remove('busy');status('Video saved. Audio is not included.')};
  rec.start();setTimeout(()=>rec.stop(),dur*1000);
};

refresh();tick();
