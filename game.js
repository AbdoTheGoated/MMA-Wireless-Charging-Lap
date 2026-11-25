/* Find the Perfect Charging Position - interactive lab game (Exp 04).
   One physics engine (solve) drives the animation, charts, dashboard and feedback.
   Simplified educational model: all values are simulated estimates. */
const GAME=(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),PI=Math.PI,rad=d=>d*PI/180;

/* ---------- Model parameters (assumptions, not measured device data) ---------- */
const C={f:127e3,R1:.024,R2:.018,N1:12,N2:14,a:5e-4,I1:1.8,r1:.15,r2:.15,RL:5,Pth:1,n:48};
const MU=4e-7*PI,W=2*PI*C.f;
const loopL=R=>MU*R*(Math.log(8*R/C.a)-2);            // self inductance of one circular loop
const L1=C.N1*C.N1*loopL(C.R1),L2=C.N2*C.N2*loopL(C.R2);
const ZMIN=.5,ZMAX=6,TMAX=60,XL=5,YL=4,PW=6.6,PT=.8,PL=13.4,CY=1.5; // cm / deg (phone size, coil offset)

/* TX loop is fixed: pre-compute its points and segment vectors (metres) */
const TXP=[],TXD=[];
for(let i=0;i<C.n;i++){const p=(i+.5)/C.n*2*PI,s=Math.sin(p),c=Math.cos(p),d=2*PI/C.n;
 TXP.push([C.R1*c,C.R1*s]);TXD.push([-C.R1*s*d,C.R1*c*d])}

/* lowest allowed gap: the phone cannot sink into the pad, so tilting lifts it */
function zEff(z,th){const t=rad(th);return Math.max(z,PW/2*Math.abs(Math.sin(t))+.25*Math.cos(t)-.3)}

/* Neumann formula for the mutual inductance of two circular filaments, one turn each.
   RX centre (x,y,z) in cm, tilted by th degrees about the y axis. */
function mutual(x,y,z,th){const t=rad(th),ct=Math.cos(t),st=Math.sin(t),cx=x/100,cy=y/100,cz=z/100,R=C.R2,n=C.n;let sum=0;
 for(let j=0;j<n;j++){const p=(j+.5)/n*2*PI,s=Math.sin(p),c=Math.cos(p),d=R*2*PI/n;
  const qx=cx+R*c*ct,qy=cy+R*s,qz=cz-R*c*st,dx=-s*ct*d,dy=c*d,dz=s*st*d;
  for(let i=0;i<n;i++){const rx=TXP[i][0]-qx,ry=TXP[i][1]-qy;sum+=(TXD[i][0]*dx+TXD[i][1]*dy)/Math.sqrt(rx*rx+ry*ry+qz*qz)}}
 return MU/(4*PI)*sum}

/* k = f(x,y,z,theta), then the circuit: tuned series coils, regulated TX current I1 */
function solve(s){const z=zEff(s.z,s.th),M=C.N1*C.N2*mutual(s.x,s.y,z,s.th),k=M/Math.sqrt(L1*L2),wM=Math.abs(W*M);
 const kT=1+.0039*((s.T===undefined?25:s.T)-25);              // copper: resistance rises about 0.39 % per degC
 const r1=C.r1*kT,r2=C.r2*kT;
 const Voc=wM*C.I1,I2=Voc/(r2+C.RL),Po=I2*I2*C.RL,Pin=Po+C.I1*C.I1*r1+I2*I2*r2;
 return{k:Math.abs(k),M,Voc,I2,Po,Pin,eff:Po/Pin,z}}
const REF=solve({x:0,y:0,z:ZMIN,th:0}).Po;
/* Shared with Exp 02, Exp 03 and Factors: whole-charger efficiency = coil efficiency x about 85 % for the electronics
   (inverter, rectifier, regulator), so the best case is near 79 % (real Qi systems measure roughly 60 to 80 %). */
const ETA_EL=.85;
const sysEff=(d,x,T)=>solve({x,y:0,z:d,th:0,T}).eff*ETA_EL;
/* Phone thermal protection (simplified): full power up to 38 degC, then it slows down, 30 % at 48 degC and above */
const derate=T=>T<=38?1:T>=48?.3:1-.7*(T-38)/10;              // best power the model can give
const relG=s=>solve(s).Po/REF;

/* ---------- Levels ---------- */
const LV=[
{name:'Find the Center',free:'x',start:{x:2.4,y:0,z:1,th:0},ok:.95,
 goal:'Drag the phone left and right until the receiver coil sits right over the transmitter coil. Watch k and the received power change while you move. The gap is fixed at 1.0 cm.',
 aim:'Goal: reach 95% of the best power possible at this gap.',
 ctl:'Controls this level: drag the phone left and right (arrow keys work too). Distance and Tilt are locked.'},
{name:'Control the Distance',free:'z',start:{x:0,y:0,z:4.5,th:0},ok:.85,
 goal:'The phone is centered. Use the Distance slider to change the vertical gap between the coils and see what happens to k, induced voltage and received power.',
 aim:'Goal: reach 85% of the best power possible when centered.',
 ctl:'Controls this level: the Distance slider only. Dragging and Tilt are locked.'},
{name:'The Perfect Setup',free:'xyzt',start:{x:-1.2,y:.8,z:1.5,th:20},ok:.92,
 goal:'Everything is free now. Drag the phone in any direction, change the gap and tilt the phone. Find the best combination of position, distance and orientation.',
 aim:'Goal: reach 92% of the best power the model can give.',
 ctl:'Controls this level: everything. Drag the phone, plus the Distance and Tilt sliders.'},
{name:'Challenge Mode',free:'xyzt',start:{x:1.4,y:-1,z:1.4,th:-30},target:.85,limit:25,
 goal:'Your smartphone is barely getting any power. Find the correct position to improve wireless power transfer.',
 aim:'Target: 85% of the maximum power the model allows, within 25 seconds.',
 ctl:'Controls: everything is free. Drag, Distance and Tilt.'}];
const has=(lv,f)=>LV[lv].free.includes(f);

/* ---------- State ---------- */
let lv=0,S={...LV[0].start},T={...LV[0].start};
const done=[false,false,false,false];let hold=0,flash=0;
const CH={st:'idle',t:0,hold:0,res:null};
const hist=[];let hAcc=0,tm=0,chartKey='',fbKey='',goalKey='',V={},drag=null;

const $g=id=>document.getElementById(id);
const top=$g('g_top'),side=$g('g_side');
const pct=v=>Math.round(clamp(v,0,9.99)*100)+'%';

/* Best reachable power for this level: free factors at their optimum, locked ones unchanged */
function optOf(s){return{x:has(lv,'x')?0:s.x,y:has(lv,'y')?0:s.y,z:has(lv,'z')?ZMIN:s.z,th:has(lv,'t')?0:s.th}}
const relLevel=(s,P)=>P/solve(optOf(s)).Po;

/* Why is the result what it is? Fix each free factor alone and see what it would give. */
function analyse(s,P){const out=[],g=P/REF,d=Math.hypot(s.x,s.y);
 const add=(o,txt)=>{const to=solve(o).Po;if(to/P>1.06)out.push({gain:to/P,txt:txt+` Fixing only this would raise power from ${pct(g)} to ${pct(to/REF)}.`})};
 if(has(lv,'x')||has(lv,'y'))add({...s,x:has(lv,'x')?0:s.x,y:has(lv,'y')?0:s.y},`Offset ${d.toFixed(1)} cm: the coil centers do not line up, so less of the transmitter's flux passes through the receiver coil.`);
 if(has(lv,'z'))add({...s,z:ZMIN},`Gap ${solve(s).z.toFixed(1)} cm: the field weakens quickly with distance, so the receiver coil catches less flux.`);
 if(has(lv,'t'))add({...s,th:0},`Tilt ${Math.abs(s.th).toFixed(0)}°: the receiver coil faces partly sideways, so the flux crosses it at an angle and less of it links.${solve(s).z>s.z+.01?' Tilting also lifts the phone off the pad.':''}`);
 return out.sort((a,b)=>b.gain-a.gain)}

/* ---------- Drawing helpers ---------- */
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r)};
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const col=(g,al)=>{const m=mix([64,170,255],[55,230,160],clamp((g-.6)/.4,0,1));return`rgba(${m[0]},${m[1]},${m[2]},${al})`};

function drawTop(cv,s,r,g){const c=cv.getContext('2d'),w=cv.w,h=cv.h;if(!w)return;c.clearRect(0,0,w,h);
 const sc=Math.min(w/16,h/26),cx=w/2,cy=h*.4;V={sc,cx,cy};const t=rad(s.th),ct=Math.cos(t);
 const show=$g('g_in').checked;
 // pad
 const ps=11.6*sc;c.save();c.shadowColor=col(g,.5*g+.1);c.shadowBlur=26;rr(c,cx-ps/2,cy-ps/2,ps,ps,1.7*sc);
 const gr=c.createLinearGradient(0,cy-ps/2,0,cy+ps/2);gr.addColorStop(0,'#1a2a4d');gr.addColorStop(1,'#0a1226');c.fillStyle=gr;c.fill();c.restore();
 c.strokeStyle='#ced6e2';c.lineWidth=2;rr(c,cx-ps/2,cy-ps/2,ps,ps,1.7*sc);c.stroke();
 c.strokeStyle='#1a3a78';c.lineWidth=1;rr(c,cx-ps/2+7,cy-ps/2+7,ps-14,ps-14,1.4*sc);c.stroke();
 // TX coil
 const halo=c.createRadialGradient(cx,cy,0,cx,cy,4.8*sc);halo.addColorStop(0,col(g,.35*g));halo.addColorStop(1,'rgba(30,109,240,0)');c.fillStyle=halo;c.beginPath();c.arc(cx,cy,4.8*sc,0,7);c.fill();
 for(let i=0;i<6;i++){c.beginPath();c.arc(cx,cy,(C.R1*100-i*.28)*sc,0,7);c.strokeStyle=`rgba(64,170,255,${show?.95:.18})`;c.lineWidth=show?2:1.2;c.stroke()}
 c.fillStyle='#8c9eb8';c.font='11px sans-serif';c.textAlign='center';c.fillText('TX COIL',cx,cy+ps/2-8);
 c.fillStyle=g>.9?'#37e6a0':Math.hypot(0,r.Po)<C.Pth?'#ff5a6a':'#40aaff';c.beginPath();c.arc(cx+ps/2-14,cy-ps/2+14,4,0,7);c.fill();
 // phone
 const px=cx+s.x*sc,py=cy+s.y*sc,pcy=py+CY*sc,pw=(PW*ct+PT*Math.abs(Math.sin(t)))*sc,ph=PL*sc;
 // link line + pulses
 c.save();c.setLineDash([5,6]);c.lineDashOffset=-tm*30;c.strokeStyle=col(g,.25+.6*g);c.lineWidth=1.5;c.beginPath();c.moveTo(cx,cy);c.lineTo(px,py);c.stroke();c.restore();
 for(let i=0;i<3;i++){const u=(tm*.6+i/3)%1;c.beginPath();c.arc(px,py,(C.R2*100*ct+u*2.6)*sc*(.4+.6*1),0,7);c.strokeStyle=col(g,(1-u)*.55*g);c.lineWidth=2;c.stroke()}
 c.save();c.shadowColor=col(g,.9);c.shadowBlur=8+22*g;rr(c,px-pw/2,pcy-ph/2,pw,ph,1.2*sc);
 const pg=c.createLinearGradient(px-pw/2,0,px+pw/2,0);pg.addColorStop(0,show?'rgba(10,16,34,.78)':'#0b1220');pg.addColorStop(1,show?'rgba(14,24,50,.78)':'#101b36');c.fillStyle=pg;c.fill();
 c.strokeStyle='#ced6e2';c.lineWidth=3;c.stroke();c.restore();
 c.strokeStyle='rgba(206,214,226,.35)';c.lineWidth=1;rr(c,px-pw/2+5,pcy-ph/2+5,pw-10,ph-10,.9*sc);c.stroke();
 c.fillStyle='#060c1a';rr(c,px-pw*.18,pcy-ph/2+8,pw*.36,5,3);c.fill();
 if(show){for(let i=0;i<3;i++){c.beginPath();c.ellipse(px,py,(C.R2*100-i*.4)*sc*ct,(C.R2*100-i*.4)*sc,0,0,7);c.strokeStyle=i?'#96d6ff':'#fff';c.lineWidth=2;c.stroke()}
  c.fillStyle='#8c9eb8';c.font='10px sans-serif';c.textAlign='center';c.fillText('RX',px,py-C.R2*100*sc-4)}
 // status on screen
 const chg=r.Po>=C.Pth;c.fillStyle=chg?'#fff':'#ff8a96';c.textAlign='center';c.font=`700 ${Math.max(12,sc*1.2)}px sans-serif`;
 c.fillText(chg?'⚡ '+r.Po.toFixed(1)+' W':'No charge',px,pcy+ph*.3);
 c.fillStyle='#8c9eb8';c.font='11px sans-serif';c.fillText('x '+s.x.toFixed(1)+'  y '+s.y.toFixed(1)+' cm',cx,h-8)}

/* Field lines of the TX loop in the x-z plane (Biot-Savart, computed once) */
const FL=[];
(function(){const R=C.R1*100,n=40,P=[],D=[];for(let i=0;i<n;i++){const p=(i+.5)/n*2*PI,s=Math.sin(p),c=Math.cos(p),d=2*PI/n;P.push([R*c,R*s]);D.push([-R*s*d,R*c*d])}
 const B=(x,z)=>{let bx=0,bz=0;for(let i=0;i<n;i++){const rx=x-P[i][0],ry=-P[i][1],r2=rx*rx+ry*ry+z*z,ir=1/(r2*Math.sqrt(r2)+1e-9);bx+=D[i][1]*z*ir;bz+=(D[i][0]*ry-D[i][1]*rx)*ir}return[bx,bz]};
 [-2.1,-1.6,-1.1,-.65,-.25,.25,.65,1.1,1.6,2.1].forEach(x0=>{let x=x0,z=.05;const pts=[[x,z]];
  for(let k=0;k<420;k++){const b=B(x,z),m=Math.hypot(b[0],b[1])||1,ds=.13,x2=x+b[0]/m*ds*.5,z2=z+b[1]/m*ds*.5,b2=B(x2,z2),m2=Math.hypot(b2[0],b2[1])||1;
   x+=b2[0]/m2*ds;z+=b2[1]/m2*ds;pts.push([x,z]);if(z<-.25||Math.abs(x)>10||z>12)break}
  FL.push(pts)})})();
const segHit=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0};

function drawSide(cv,s,r,g){const c=cv.getContext('2d'),w=cv.w,h=cv.h;if(!w)return;c.clearRect(0,0,w,h);
 const sc=Math.min(w/16,h/11.5),cx=w/2,gy=h-1.7*sc,X=x=>cx+x*sc,Y=z=>gy-z*sc,t=rad(s.th),z=r.z,ct=Math.cos(t),st=Math.sin(t);
 // pad
 rr(c,X(-5.8),Y(-.3),11.6*sc,1.3*sc,6);const pg=c.createLinearGradient(0,Y(-.3),0,Y(-1.6));pg.addColorStop(0,'#2a3b5e');pg.addColorStop(1,'#0a1226');c.fillStyle=pg;c.fill();c.strokeStyle='#ced6e2';c.lineWidth=2;c.stroke();
 // RX chord in this plane (shows only if the plane cuts the coil)
 const ch=Math.abs(s.y)<C.R2*100?Math.sqrt((C.R2*100)**2-s.y*s.y):0,A=[s.x-ch*ct,z+ch*st],Bp=[s.x+ch*ct,z-ch*st];
 // field lines
 if($g('g_fl').checked){c.lineCap='round';
  FL.forEach(l=>{[1,-1].forEach(sg=>{let linked=false;if(ch>0)for(let i=1;i<l.length&&!linked;i++)linked=segHit([sg*l[i-1][0],l[i-1][1]],[sg*l[i][0],l[i][1]],A,Bp);
   c.beginPath();l.forEach((p,i)=>i?c.lineTo(X(sg*p[0]),Y(p[1])):c.moveTo(X(sg*p[0]),Y(p[1])));
   if(linked){c.shadowColor='#40aaff';c.shadowBlur=6+12*g;c.strokeStyle=`rgba(150,214,255,${.35+.6*g})`;c.lineWidth=1.5+1.8*g;c.setLineDash([]);c.stroke();c.shadowBlur=0;
    c.setLineDash([4,10]);c.lineDashOffset=-tm*60*(.3+g);c.strokeStyle=`rgba(255,255,255,${.3+.6*g})`;c.lineWidth=1.5;c.stroke()}
   else{c.setLineDash([3,9]);c.lineDashOffset=-tm*25;c.strokeStyle='rgba(64,170,255,.35)';c.lineWidth=1.2;c.stroke()}c.setLineDash([])})})}
 // TX coil section
 [-C.R1*100,C.R1*100].forEach(x=>{c.beginPath();c.arc(X(x),Y(0),.22*sc,0,7);c.fillStyle='#40aaff';c.fill()});
 c.strokeStyle='rgba(64,170,255,.5)';c.lineWidth=2;c.beginPath();c.moveTo(X(-C.R1*100),Y(0));c.lineTo(X(C.R1*100),Y(0));c.stroke();
 c.fillStyle='#8c9eb8';c.font='11px sans-serif';c.textAlign='center';c.fillText('TX COIL (in pad)',X(0),Y(-.9));
 // energy transfer particles (count and speed follow calculated power)
 const N=Math.round(26*Math.pow(clamp(g,0,1),.7)),rc=[s.x,z];
 for(let i=0;i<N;i++){const u=(tm*(.25+.5*g)+i/N)%1,lane=((i*7)%5-2)/2,sx=lane*C.R1*100*.9,ex=s.x+lane*C.R2*100*.9*ct,ez=z-lane*C.R2*100*.9*st,mx=(sx+ex)/2,mz=(0+ez)/2+.7;
  const bx=(1-u)*(1-u)*sx+2*(1-u)*u*mx+u*u*ex,bz=(1-u)*(1-u)*0+2*(1-u)*u*mz+u*u*ez;
  c.beginPath();c.arc(X(bx),Y(bz),1.6+2*g,0,7);c.fillStyle=`rgba(255,255,255,${.35+.6*Math.sin(u*PI)})`;c.shadowColor='#40aaff';c.shadowBlur=10;c.fill();c.shadowBlur=0}
 // phone
 c.save();c.translate(X(s.x),Y(z));c.rotate(t);
 c.shadowColor=col(g,.9);c.shadowBlur=8+22*g;rr(c,-PW/2*sc,-.55*sc,PW*sc,.8*sc,5);const fg=c.createLinearGradient(0,-.55*sc,0,.25*sc);fg.addColorStop(0,'#1a2440');fg.addColorStop(1,'#8f9aae');c.fillStyle=fg;c.fill();c.strokeStyle='#ced6e2';c.lineWidth=2;c.stroke();c.restore();
 c.save();c.translate(X(s.x),Y(z));c.rotate(t);c.shadowBlur=0;c.fillStyle='#060c1a';rr(c,-PW/2*sc+4,-.5*sc,PW*sc-8,.12*sc+2,2);c.fill();
 c.restore();
 // RX coil section
 {const a=[X(s.x-C.R2*100*ct),Y(z+C.R2*100*st)],b=[X(s.x+C.R2*100*ct),Y(z-C.R2*100*st)];
  c.strokeStyle='rgba(150,214,255,.7)';c.lineWidth=2;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
  [a,b].forEach(p=>{c.beginPath();c.arc(p[0],p[1],.2*sc,0,7);c.fillStyle='#96d6ff';c.fill()})}
 c.fillStyle='#8c9eb8';c.textAlign='left';c.fillText('RX COIL (in phone)',Math.min(X(s.x)+PW/2*sc+6,w-110),Y(z)-.9*sc);
 // gap marker
 c.setLineDash([3,4]);c.strokeStyle='rgba(206,214,226,.5)';c.lineWidth=1;c.beginPath();c.moveTo(X(s.x),Y(0));c.lineTo(X(s.x),Y(z));c.stroke();c.setLineDash([]);
 c.fillStyle='#ced6e2';c.textAlign='left';c.font='700 12px sans-serif';c.fillText('gap '+z.toFixed(2)+' cm',X(s.x)+6,Y(z/2)+4);
 c.font='11px sans-serif';c.fillStyle='#8c9eb8';c.textAlign='left';c.fillText('tilt '+s.th.toFixed(0)+'°',8,16);
 if(Math.abs(s.y)>.05){c.fillText('y offset '+s.y.toFixed(1)+' cm (out of this plane)',8,32)}}

/* ---------- Charts ---------- */
function drawHist(cv){const c=cv.getContext('2d'),w=cv.w,h=cv.h;if(!w)return;c.clearRect(0,0,w,h);const L=46,B=30,Tp=14,R=14;
 c.strokeStyle='#1a3a78';c.fillStyle='#8c9eb8';c.font='11px sans-serif';c.lineWidth=1;c.textAlign='right';
 for(let i=0;i<=4;i++){const y=Tp+(h-Tp-B)*i/4;c.beginPath();c.moveTo(L,y);c.lineTo(w-R,y);c.stroke();c.fillText(100-i*25+'%',L-6,y+4)}
 c.textAlign='center';c.fillText('Last 12 seconds',(L+w-R)/2,h-6);
 const ln=(f,color,dash)=>{c.beginPath();hist.forEach((p,i)=>{const x=L+(w-L-R)*(1-(tm-p.t)/12),y=Tp+(h-Tp-B)*(1-clamp(f(p),0,1));i?c.lineTo(x,y):c.moveTo(x,y)});c.setLineDash(dash);c.strokeStyle=color;c.lineWidth=3;c.stroke();c.setLineDash([])};
 ln(p=>p.g,'#40aaff',[]);ln(p=>p.k,'#f0f4fa',[5,5]);
 c.textAlign='left';c.fillStyle='#40aaff';c.fillText('relative power',L+8,Tp+12);c.fillStyle='#f0f4fa';c.fillText('k',L+104,Tp+12)}

const CS={key:'',x:[],z:[]};
function drawCharts(s){const key=[s.x,s.y,s.z,s.th].map(v=>v.toFixed(2)).join();
 if(key!==CS.key){CS.key=key;CS.x=[];CS.z=[];for(let i=0;i<=100;i++){CS.x.push(clamp(relG({...s,x:-XL+2*XL*i/100}),0,1));CS.z.push(clamp(relG({...s,z:ZMIN+(ZMAX-ZMIN)*i/100}),0,1))}}
 const look=(arr,a,b)=>v=>arr[clamp(Math.round((v-a)/(b-a)*100),0,100)];
 plot($g('g_c1'),look(CS.x,-XL,XL),-XL,XL,clamp(s.x,-XL,XL),'Horizontal offset x (cm)','Relative power');
 plot($g('g_c2'),look(CS.z,ZMIN,ZMAX),ZMIN,ZMAX,clamp(s.z,ZMIN,ZMAX),'Distance z (cm)','Relative power');
 drawHist($g('g_c3'))}

/* ---------- Dashboard + feedback ---------- */
const tiles=[['g_k','COUPLING k'],['g_v','INDUCED VOLTAGE'],['g_p','RECEIVED POWER'],['g_r','RELATIVE TRANSFER'],['g_e','COIL EFFICIENCY'],['g_s','STATUS']];
$g('g_m').innerHTML=tiles.map(t=>`<div><b id="${t[0]}">-</b><span>${t[1]}</span></div>`).join('');

function status(r,g){return r.Po<C.Pth?'Not charging':g<.4?'Slow charging':g<.9?'Charging':'Charging strong'}

function updateDash(s,r,g,rl){
 $g('g_k').textContent=r.k.toFixed(3);$g('g_v').textContent=r.Voc.toFixed(2)+' V';$g('g_p').textContent=r.Po.toFixed(1)+' W';
 $g('g_r').textContent=pct(g);$g('g_e').textContent=pct(r.eff);const st=$g('g_s');st.textContent=status(r,g);st.style.fontSize='17px';st.style.color=r.Po<C.Pth?'var(--bad)':g>=.9?'var(--ok)':'#fff';
 $g('g_bar').style.width=clamp(g*100,1,100)+'%';$g('g_pct').textContent='Relative power transfer '+pct(g)+' of the model maximum';
 $g('g_pos').textContent=`x ${s.x.toFixed(1)} · y ${s.y.toFixed(1)} · gap ${r.z.toFixed(2)} cm · tilt ${s.th.toFixed(0)}°`;
 $g('g_zv').textContent=s.z.toFixed(1)+' cm';$g('g_tv').textContent=s.th.toFixed(0)+'°';
 // feedback (rebuilt only when its content changes)
 const opt=rl>=.95,why=analyse(s,r.Po);
 const head=r.Po<C.Pth?['Weak Magnetic Coupling','bad']:opt?['Optimal Alignment','pass']:rl>=.5?['Alignment Could Be Improved','cy']:['Weak Magnetic Coupling','bad'];
 const warn=r.Po<C.Pth?`<p class="bad">⚠ Charging warning: modeled received power (${r.Po.toFixed(2)} W) is below the ${C.Pth} W charging threshold of this model.</p>`:'';
 const body=opt?`<p>${has(lv,'z')&&!has(lv,'x')?'The gap is as small as the model allows and the coils are centered':'The free factors are at their best'}: the most flux links the receiver coil, so k, induced voltage and power are as high as they can be here. Power now: <b class="cy">${r.Po.toFixed(1)} W</b>.</p>`
  :`<p>Coupling k is ${r.k.toFixed(3)}, so the receiver gets <b class="cy">${r.Po.toFixed(1)} W</b> (${pct(g)} of the maximum). Why:</p><ul style="margin:0 0 6px;padding-left:20px">${why.map(w=>`<li>${w.txt}</li>`).join('')}</ul>`;
 const html=`<h3 class="${head[1]}" style="font-size:22px">${head[0]}</h3>${warn}${body}`;
 const key=head[0]+warn.length+body;if(key!==fbKey){fbKey=key;$g('g_fb').innerHTML=html}}

/* ---------- Level panel ---------- */
function renderTabs(){const unlocked=done[0]&&done[1]&&done[2];
 $g('g_lv').innerHTML=LV.map((l,i)=>`<button data-l="${i}" class="${i==lv?'on':''}" ${i==3&&!unlocked?'disabled title="Complete levels 1 to 3 first"':''}>${i==3?(unlocked?'':'🔒 '):(done[i]?'✔ ':'')}${i==3?'':i+1+' · '}${l.name}</button>`).join('')}

function renderGoal(){const l=LV[lv];let h=`<span class="tag">${lv==3?'CHALLENGE':'LEVEL '+(lv+1)}</span><h3>${l.name}</h3><p>${l.goal}</p><p class="cy">${l.aim}</p><p class="sm">${l.ctl}</p>`;
 if(lv==3){
  if(CH.st=='idle')h+=`<div class="row"><button class="btn" id="g_go">Start challenge</button></div><p class="sm">The timer starts when you press the button. The phone starts in a poor position.</p>`;
  else if(CH.st=='run')h+=`<div class="row"><b id="g_tmr" style="font-size:26px;color:#fff"></b><button class="btn o" id="g_lock">Lock in position</button></div>`;
 }else if(done[lv]){h+=`<p class="pass"><b>✔ Level complete!</b> ${lv<2?'Move on to the next level.':'Challenge Mode is now unlocked.'}</p><div class="row"><button class="btn" id="g_next">${lv<2?'Next level':'Go to Challenge Mode'}</button></div>`}
 else h+=`<p class="sm">Hold the best position for half a second to complete the level.</p>`;
 $g('g_goal').innerHTML=h}

function applyLock(){const f=LV[lv].free,run=lv<3||CH.st=='run',dragFree=run&&(f.includes('x')||f.includes('y'));$g('g_z').disabled=!(f.includes('z')&&run);$g('g_t').disabled=!(f.includes('t')&&run);
 $g('g_z').value=T.z;$g('g_t').value=T.th;top.style.cursor=dragFree?'grab':'default'}

function setLevel(i){lv=i;T={...LV[i].start};hold=0;CH.st='idle';CH.res=null;$g('g_res').hidden=true;fbKey='';renderTabs();renderGoal();applyLock()}
function resetPos(){if(lv==3&&CH.st!='run')return;T={...LV[lv].start};hold=0;applyLock()}

/* Challenge */
function endChallenge(ok){const l=LV[3],s={...S},r=solve(s),g=r.Po/REF,left=Math.max(0,l.limit-CH.t);
 const score=Math.round(700*clamp(g,0,1)+(ok?300*left/l.limit:0)),why=analyse(s,r.Po);
 CH.st='end';CH.res={ok,score};if(ok)done[3]=true;
 const e=ok?`<p>Your final position links almost all the flux the model allows, so k reached ${r.k.toFixed(3)} and the receiver gets ${r.Po.toFixed(1)} W.</p>`
  :`<p>Final k is ${r.k.toFixed(3)}, giving ${r.Po.toFixed(1)} W (${pct(g)} of the maximum). What held it back:</p><ul style="margin:0 0 6px;padding-left:20px">${why.map(w=>`<li>${w.txt}</li>`).join('')||'<li>Almost nothing. A tiny bit more precision would reach the target.</li>'}</ul>`;
 const el=$g('g_res');el.hidden=false;
 el.innerHTML=`<span class="tag">FINAL RESULT</span><h3 class="${ok?'pass':'bad'}" style="font-size:24px">${ok?'Target reached!':'Target not reached'}</h3>
 <div class="m"><div><b>${score}</b><span>SCORE / 1000</span></div><div><b>${pct(g)}</b><span>POWER TRANSFER</span></div><div><b>${CH.t.toFixed(1)} s</b><span>TIME USED</span></div><div><b>${Math.hypot(s.x,s.y).toFixed(1)} cm</b><span>OFFSET</span></div><div><b>${r.z.toFixed(1)} cm</b><span>GAP</span></div><div><b>${Math.abs(s.th).toFixed(0)}°</b><span>TILT</span></div></div>
 ${e}<p class="sm">Score = 70% accuracy (final power vs the model maximum) + 30% speed bonus when the target is reached.</p><div class="row"><button class="btn" id="g_again">Try again</button></div>`;
 renderTabs();renderGoal();applyLock()}

/* ---------- Events ---------- */
$g('g_lv').onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled)setLevel(+b.dataset.l)};
$g('g_goal').onclick=e=>{const b=e.target.closest('button');if(!b)return;
 if(b.id=='g_next')setLevel(lv<2?lv+1:3);
 if(b.id=='g_go'){CH.st='run';CH.t=0;CH.hold=0;T={...LV[3].start};renderGoal();applyLock()}
 if(b.id=='g_lock')endChallenge(relG(S)>=LV[3].target)};
$g('g_res').onclick=e=>{if(e.target.id=='g_again')setLevel(3)};
$g('g_rs').onclick=resetPos;
$g('g_z').oninput=e=>{T.z=+e.target.value};$g('g_t').oninput=e=>{T.th=+e.target.value};
const canMove=()=>lv<3||CH.st=='run';
const pt=e=>{const r=top.getBoundingClientRect();return{x:(e.clientX-r.left-V.cx)/V.sc,y:(e.clientY-r.top-V.cy)/V.sc}};
top.onpointerdown=e=>{if(!canMove()||!V.sc||!(has(lv,'x')||has(lv,'y')))return;const p=pt(e);drag={dx:T.x-p.x,dy:T.y-p.y};top.setPointerCapture(e.pointerId);top.style.cursor='grabbing'};
top.onpointermove=e=>{if(!drag)return;const p=pt(e);if(has(lv,'x'))T.x=clamp(p.x+drag.dx,-XL,XL);if(has(lv,'y'))T.y=clamp(p.y+drag.dy,-YL,YL)};
top.onpointerup=top.onpointercancel=()=>{drag=null;top.style.cursor=(canMove()&&(has(lv,'x')||has(lv,'y')))?'grab':'default'};
top.onkeydown=e=>{if(!canMove())return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();
 if(has(lv,'x'))T.x=clamp(T.x+d[0]*.25,-XL,XL);if(has(lv,'y'))T.y=clamp(T.y+d[1]*.25,-YL,YL)};
['g_in','g_fl'].forEach(i=>$g(i).onchange=()=>{});

/* ---------- Main loop (called by the lab loop while this tab is visible) ---------- */
function frame(dt){tm+=dt;const a=1-Math.exp(-dt*14);
 for(const k of ['x','y','z','th'])S[k]+=(T[k]-S[k])*a;
 const r=solve(S),g=r.Po/REF,rl=relLevel(S,r.Po);
 hAcc+=dt;if(hAcc>.05){hAcc=0;hist.push({t:tm,g:clamp(g,0,1),k:r.k});while(hist.length&&tm-hist[0].t>12)hist.shift()}
 // level logic
 if(lv<3&&!done[lv]){hold=rl>=LV[lv].ok?hold+dt:0;if(hold>.5){done[lv]=true;renderTabs();renderGoal()}}
 if(lv==3&&CH.st=='run'){CH.t+=dt;const left=Math.max(0,LV[3].limit-CH.t),tm2=$g('g_tmr');if(tm2)tm2.textContent='⏱ '+left.toFixed(1)+' s';
  CH.hold=g>=LV[3].target?CH.hold+dt:0;if(CH.hold>1)endChallenge(true);else if(left<=0)endChallenge(false)}
 updateDash(S,r,g,rl);drawTop(top,S,r,g);drawSide(side,S,r,g);drawCharts(S)}

setLevel(0);
return{frame,solve,sysEff,derate,REF,C,get S(){return S},get T(){return T},setLevel,unlock(){done[0]=done[1]=done[2]=true;renderTabs()},get lv(){return lv}}
})();
