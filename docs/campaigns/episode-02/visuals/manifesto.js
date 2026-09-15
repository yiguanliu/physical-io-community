/* One deterministic, seekable 30-second GSAP timeline. No generated media or API calls. */
const chapters=[
 {t:0,end:5,id:'curiosity',label:'00 / Curiosity',text:'We begin with curiosity. What happens when intelligence meets the physical world?'},
 {t:5,end:11,id:'love',label:'01 / Love',text:'Love. Connection, expression, gesture. How we relate to machines—and how they respond.'},
 {t:11,end:17,id:'mind',label:'02 / Mind',text:'Intelligence. Perception, computation, tools and learning. Turning signals into understanding.'},
 {t:17,end:23,id:'body',label:'03 / Body',text:'Body. Fabric, force, materials and movement. Ideas meeting the constraints of the world.'},
 {t:23,end:30,id:'community',label:'04 / Coexistence',text:'We are Physical I/O. A community led by curiosity, design and engineering, exploring how humans and intelligent systems coexist.'}
];
const $=s=>document.querySelector(s), fmt=t=>`00:${Math.floor(t).toString().padStart(2,'0')}`;
let lastChapter=-1;
const tl=gsap.timeline({paused:true,defaults:{ease:'power2.inOut'},onUpdate:update,onComplete:()=>{$('#play').textContent='Replay'}});
chapters.forEach((c,i)=>{
 tl.to('#'+c.id,{opacity:1,duration:.65},c.t);
 if(i<4)tl.to('#'+c.id,{opacity:0,duration:.45},c.end-.45);
 const paths=document.querySelectorAll('#'+c.id+' .drawing path');
 paths.forEach(p=>{const len=p.getTotalLength();gsap.set(p,{strokeDasharray:len,strokeDashoffset:len});tl.to(p,{strokeDashoffset:0,duration:1.4},c.t+.2)});
});
tl.fromTo('#pulse0',{attr:{cx:510},opacity:0},{attr:{cx:930},opacity:1,duration:2.2},1.4)
.to('#pulse0',{opacity:0,duration:.4},3.7)
.fromTo('#leftarc',{x:-24},{x:0,duration:2},5.4)
.fromTo('#rightarc',{x:24},{x:0,duration:2},5.4)
.fromTo('#pulse1',{attr:{cx:605},opacity:0},{attr:{cx:837},opacity:1,duration:1.8},6.6)
.to('#pulse1',{attr:{cx:605},duration:1.7},8.4);
const chosen=[0,1,2,11,12,13,22,23,24,33,34,35];
chosen.forEach((n,i)=>tl.to(document.querySelectorAll('.node')[n],{stroke:'#eee',fill:'#eee',fillOpacity:.09,duration:.3},11.7+i*.28));
tl.to('#pulse2',{attr:{cx:576},duration:.5},12)
.to('#pulse2',{attr:{cy:374},duration:.3},12.5)
.to('#pulse2',{attr:{cx:724},duration:.6},12.8)
.to('#pulse2',{attr:{cy:440},duration:.3},13.4)
.to('#pulse2',{attr:{cx:872},duration:.6},13.7)
.to('#pulse2',{attr:{cy:506},duration:.3},14.3)
.to('#pulse2',{attr:{cx:1020},duration:.7},14.6);
document.querySelectorAll('.meshline').forEach((p,i)=>{const y=+p.dataset.y,d=68*Math.sin((i+1)/10*Math.PI);tl.to(p,{attr:{d:`M430 ${y} Q720 ${y+d} 1010 ${y}`},duration:1.7},18.1).to(p,{attr:{d:`M430 ${y} Q720 ${y+8} 1010 ${y}`},duration:1.3},20.5)});
document.querySelectorAll('.meshvert').forEach(p=>{const x=+p.dataset.x,shift=20*Math.sin((x-430)/580*Math.PI);tl.to(p,{attr:{d:`M${x} 285 Q${x+shift} 420 ${x} 509`},duration:1.7},18.1).to(p,{attr:{d:`M${x} 285V509`},duration:1.3},20.5)});
tl.to('#force',{y:28,duration:1.7},18.1).to('#force',{y:0,duration:1.3},20.5);
tl.fromTo('#community .headline',{opacity:0,y:10},{opacity:1,y:0,duration:1.2},24.3)
.fromTo('#community .statement',{opacity:0},{opacity:1,duration:1.2,stagger:.25},25.2)
.to({}, {duration:2},28);
function update(){const t=tl.time();$('#seek').value=t;$('#time').textContent=`${fmt(t)} / 00:30`;$('#counter').textContent=`${fmt(t)} / 00:30`;const i=chapters.findIndex(c=>t>=c.t&&t<c.end);const index=i<0?4:i;if(index!==lastChapter){$('#caption').textContent=chapters[index].text;document.querySelectorAll('.chapters button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===index)));lastChapter=index}$('#play').textContent=tl.paused()?'Play':'Pause'}
function toggle(){if(tl.time()>=30)tl.restart();else tl.paused(!tl.paused());update()}
$('#play').onclick=toggle;
$('#restart').onclick=()=>{tl.restart();update()};
$('#seek').oninput=e=>{tl.pause().time(+e.target.value);update()};
$('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#screen').requestFullscreen()}catch{$('#full').textContent='Fullscreen unavailable'}};
chapters.forEach(c=>{const b=document.createElement('button');b.className='ui-button ui-button-ghost';b.textContent=c.label;b.onclick=()=>{tl.pause().time(c.t+.9);update()};$('.chapters').append(b);const p=document.createElement('p');p.textContent=`${fmt(c.t)}–${fmt(c.end)} — ${c.text}`;$('#transcript').append(p)});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();toggle()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){tl.pause();update()}});
window.filmTimeline=tl;
tl.time(.8);update();
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)tl.play(0);
