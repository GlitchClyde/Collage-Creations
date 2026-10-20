const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const cv=$('cv'),ctx=cv.getContext('2d');
const ASPECTS=[['1:1',1080,1080],['4:5',1080,1350],['9:16',1080,1920],['16:9',1920,1080]];
const LAYOUTS=[['grid','Grid'],['feature','Feature'],['duo','Duo'],['mosaic','Mosaic']];
const S={aspect:1,layout:'grid',gap:16,pad:32,rad:20,bw:0,bc:'#ffffff',bg:'#14213d',pat:'solid'};
const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const newT=()=>({z:1,x:0,y:0,r:0,f:false});
let items=[],dirty=true,busy=false,sel=-1,anim=[],cells=[],patKey='';
const patCv=document.createElement('canvas');
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

// Drawing: each photo has its own zoom / position / rotation / flip
function cover(it,x,y,w,h){
  const el=it.el,t=it.t,sw=el.videoWidth||el.naturalWidth,sh=el.videoHeight||el.naturalHeight;if(!sw)return;
  const s=Math.max(w/sw,h/sh)*t.z;
  ctx.save();ctx.translate(x+w/2+t.x*w/2,y+h/2+t.y*h/2);ctx.rotate(t.r*Math.PI/180);ctx.scale(t.f?-1:1,1);
  ctx.drawImage(el,-sw*s/2,-sh*s/2,sw*s,sh*s);ctx.restore();
}
function render(clean){
  const [,W,H]=ASPECTS[S.aspect];
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;anim=[]}
  if(S.pat==='solid'){ctx.fillStyle=S.bg;ctx.fillRect(0,0,W,H)}
  else{
    const k=S.pat+W+'x'+H;
    if(patKey!==k){patCv.width=W;patCv.height=H;drawPattern(patCv.getContext('2d'),S.pat,W,H);patKey=k}
    ctx.drawImage(patCv,0,0);
  }
  const n=Math.min(9,Math.max(3,items.length)),g=S.gap,p=S.pad-g/2;let moving=false;
  const tg=getRects(n,W/H,S.layout).map(r=>[p+r[0]*(W-2*p)+g/2,p+r[1]*(H-2*p)+g/2,r[2]*(W-2*p)-g,r[3]*(H-2*p)-g]);
  anim.length=tg.length;
  tg.forEach((t,i)=>{ // cells glide to their new spot when the layout changes
    if(!anim[i]||clean||!motion)anim[i]=t.slice();
    else for(let k=0;k<4;k++){const d=t[k]-anim[i][k];if(Math.abs(d)>.4){anim[i][k]+=d*.25;moving=true}else anim[i][k]=t[k]}
  });
  cells=anim.map(a=>a.slice());
  anim.forEach(([x,y,w,h],i)=>{
    if(w<=0||h<=0)return;
    const rad=Math.min(S.rad,w/2,h/2),it=items[i];
    ctx.save();rr(ctx,x,y,w,h,rad);ctx.clip();
    if(it)cover(it,x,y,w,h);
    else{ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x,y,w,h);ctx.fillStyle='rgba(255,255,255,.7)';
      ctx.font=`${Math.min(w,h)*.3}px Inter,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',x+w/2,y+h/2)}
    ctx.restore();
    if(S.bw>0){const b=S.bw;ctx.strokeStyle=S.bc;ctx.lineWidth=b;rr(ctx,x+b/2,y+b/2,w-b,h-b,Math.max(0,rad-b/2));ctx.stroke()}
    if(!clean&&i===sel){
      rr(ctx,x+5,y+5,w-10,h-10,Math.max(0,rad-5));ctx.lineWidth=10;ctx.strokeStyle='#fff';ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle='#2f4bff';ctx.stroke();
    }
  });
  dirty=moving;
}
function tick(){if(dirty||busy||items.some(i=>i.type==='video'))render(busy);requestAnimationFrame(tick)}

// Selecting and editing a photo
const ED=[['ez','z',100],['ex','x',100],['ey','y',100],['er','r',1]];
function syncEd(){
  const it=items[sel];$('editor').disabled=!it;$('selname').textContent=it?it.name:'none selected';
  ED.forEach(([id,k,m])=>{const el=$(id),v=it?Math.round(it.t[k]*m):(k==='z'?100:0);el.value=v;el.parentElement.querySelector('output').textContent=v+(k==='z'?'%':k==='r'?'°':'')});
}
function select(i){sel=i;[...$('list').children].forEach((li,j)=>li.classList.toggle('sel',j===i));syncEd();dirty=true}
ED.forEach(([id,k,m])=>$(id).oninput=e=>{if(sel<0)return;items[sel].t[k]=+e.target.value/m;syncEd();dirty=true});
$('eflip').onclick=()=>{if(sel>=0){items[sel].t.f=!items[sel].t.f;dirty=true}};
$('ereset').onclick=()=>{if(sel>=0){items[sel].t=newT();syncEd();dirty=true}};
const pos=e=>{const r=cv.getBoundingClientRect(),k=cv.width/r.width;return[(e.clientX-r.left)*k,(e.clientY-r.top)*k,k]};
const hit=(x,y)=>cells.findIndex(c=>x>=c[0]&&x<=c[0]+c[2]&&y>=c[1]&&y<=c[1]+c[3]);
let drag=null;
cv.onpointerdown=e=>{
  const [x,y]=pos(e),i=hit(x,y);select(i>=0&&i<items.length?i:-1);
  if(sel>=0){drag={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId)}
};
cv.onpointermove=e=>{
  if(!drag||sel<0)return;const [,,k]=pos(e),c=cells[sel],t=items[sel].t;
  t.x=clamp(t.x+(e.clientX-drag.x)*k/(c[2]/2),-1,1);t.y=clamp(t.y+(e.clientY-drag.y)*k/(c[3]/2),-1,1);
  drag.x=e.clientX;drag.y=e.clientY;syncEd();dirty=true;
};
cv.onpointerup=cv.onpointercancel=()=>{drag=null};
cv.addEventListener('wheel',e=>{
  if(sel<0)return;const [x,y]=pos(e);if(hit(x,y)!==sel)return;
  e.preventDefault();const t=items[sel].t;t.z=clamp(t.z*(e.deltaY<0?1.06:.94),.5,4);syncEd();dirty=true;
},{passive:false});

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
    try{items.push({...await load(f),t:newT(),fresh:true})}catch(err){status('Could not read '+f.name)}
  }
  refresh();
};
function swap(i,j){[items[i],items[j]]=[items[j],items[i]];if(sel===i)sel=j;else if(sel===j)sel=i;refresh()}
function refresh(){
  if(sel>=items.length)sel=-1;
  const l=$('list');l.innerHTML='';
  items.forEach((it,i)=>{
    const li=document.createElement('li');
    li.innerHTML='<button class="nm"></button><span class="ops"><button aria-label="Move earlier">&#9664;</button><button aria-label="Move later">&#9654;</button><button aria-label="Remove">&#10005;</button></span>';
    const th=document.createElement(it.type==='video'?'video':'img');th.className='th';th.muted=true;th.src=it.url;th.alt='';
    li.prepend(th);const nm=li.querySelector('.nm');nm.textContent=it.name;nm.onclick=()=>select(i);
    if(it.fresh){li.classList.add('pop');it.fresh=false}
    const [a,b,c]=li.querySelectorAll('.ops button');
    a.disabled=i===0;b.disabled=i===items.length-1;
    a.onclick=()=>swap(i,i-1);b.onclick=()=>swap(i,i+1);
    c.onclick=()=>{URL.revokeObjectURL(it.url);items.splice(i,1);if(sel===i)sel=-1;else if(sel>i)sel--;refresh()};
    l.appendChild(li);
  });
  $('cnt').textContent=items.length+'/9';
  $('file').disabled=items.length>=9;
  const ok=items.length>=3,hasVid=items.some(i=>i.type==='video');
  $('btnImg').disabled=!ok;$('btnVid').disabled=!ok;$('btnVid').hidden=!hasVid;
  status(ok?'Ready. Click a photo to edit it, then download.':'Add at least 3 photos or videos ('+items.length+' so far).');
  drawThumbs();select(sel);
}

// Canvas size, layout, frame, background
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
$('bc').oninput=e=>{S.bc=e.target.value;dirty=true};
function solidThumb(){const t=$('solidthumb').getContext('2d');t.fillStyle=S.bg;t.fillRect(0,0,112,64)}
$('bg').oninput=e=>{S.bg=e.target.value;solidThumb();dirty=true};
['#14213d','#ffffff','#000000','#ffd23f','#ee6c4d','#3d5a80','#2a9d8f','#f4acb7'].forEach(c=>{
  const b=document.createElement('button');b.style.background=c;b.setAttribute('aria-label','Background '+c);
  b.onclick=()=>{S.bg=c;$('bg').value=c;solidThumb();dirty=true};$('swatches').appendChild(b);
});
function markPats(){[...$('pats').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===S.pat));$('solidopts').hidden=S.pat!=='solid'}
[['solid','Solid'],...PATTERNS].forEach(([k,l])=>{
  const b=document.createElement('button'),c=document.createElement('canvas');c.width=112;c.height=64;
  if(k==='solid')c.id='solidthumb';else drawPattern(c.getContext('2d'),k,112,64,.45);
  b.append(c,l);b.dataset.k=k;b.onclick=()=>{S.pat=k;markPats();dirty=true};$('pats').appendChild(b);
});
solidThumb();markPats();

// Export
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
$('btnImg').onclick=()=>{render(true);cv.toBlob(b=>{dl(b,'collage.png');dirty=true},'image/png')};
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
    busy=false;dirty=true;document.body.classList.remove('busy');status('Video saved. Audio is not included.')};
  rec.start();setTimeout(()=>rec.stop(),dur*1000);
};
refresh();tick();
