// Animal-print generator. Drawn in code, so no image files are needed.
const PATTERNS=[['leopard','Leopard'],['giraffe','Giraffe'],['panda','Panda'],['dalmatian','Dalmatian'],['zebra','Zebra'],['tiger','Tiger']];
function drawPattern(c,type,W,H,u){
  u=u||Math.min(W,H)/1080;
  let s=type.length*977;
  const R=()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const fill=col=>{c.fillStyle=col;c.fillRect(0,0,W,H)};
  c.save();c.lineCap='round';c.lineJoin='round';
  if(type==='leopard'){
    fill('#e2ac4b');const g=150*u;
    for(let y=-g,row=0;y<H+g;y+=g*.85,row++)for(let x=-g+(row%2?g/2:0);x<W+g;x+=g){
      const px=x+(R()-.5)*g*.4,py=y+(R()-.5)*g*.3,r=(.28+R()*.14)*g;
      c.fillStyle='#c9842a';c.beginPath();c.arc(px,py,r*.85,0,7);c.fill();
      c.strokeStyle='#2a1608';c.lineWidth=r*.42;
      for(let k=3+(R()*3|0);k--;){const a=R()*6.28;c.beginPath();c.arc(px,py,r,a,a+.9+R()*.9);c.stroke()}
    }
  }else if(type==='giraffe'){
    fill('#f0d9a0');const g=170*u;
    for(let y=-g,row=0;y<H+g;y+=g*.9,row++)for(let x=-g+(row%2?g/2:0);x<W+g;x+=g){
      const px=x+(R()-.5)*g*.2,py=y+(R()-.5)*g*.2;
      c.fillStyle=c.strokeStyle=R()<.5?'#8b4a1e':'#a85f2a';c.lineWidth=12*u;c.beginPath();
      for(let k=0;k<7;k++){const a=k/7*6.283+R()*.3,r=g*(.3+R()*.09),X=px+Math.cos(a)*r,Y=py+Math.sin(a)*r;k?c.lineTo(X,Y):c.moveTo(X,Y)}
      c.closePath();c.fill();c.stroke();
    }
  }else if(type==='panda'||type==='dalmatian'){
    fill('#f7f7f5');const big=type==='panda',n=(W*H/1166400*(big?26:170))|0;
    for(let i=0;i<n;i++){
      c.fillStyle=big&&R()<.2?'#5a5a5a':'#121212';c.beginPath();
      const rx=(big?40+R()*90:8+R()*18)*u;c.ellipse(R()*W,R()*H,rx,rx*(.6+R()*.4),R()*3.14,0,7);c.fill();
    }
  }else{
    const tg=type==='tiger';fill(tg?'#e8832a':'#f7f7f5');c.strokeStyle=tg?'#1a0e05':'#111';
    const gap=(tg?95:50)*u;
    for(let i=0,x=-H*.35;x<W+gap;x+=gap,i++){
      c.lineWidth=gap*(tg?.3:.45)*(.6+R()*.8);c.beginPath();
      for(let y=-20;y<=H+20;y+=20){const px=x+y*.35+Math.sin(y/(70*u)+i*1.7)*28*u;y<0?c.moveTo(px,y):c.lineTo(px,y)}
      c.stroke();
    }
  }
  c.restore();
}
