'use client';
import { flushSync } from 'react-dom';
import { useEffect,useRef,useState } from 'react';
import { ArrowLeft, ArrowUp, Mic, Square, ExternalLink, Maximize2, Minimize2, MessageCircle, Info, CalendarDays, Volume2, VolumeX, X } from 'lucide-react';
import { Button,IconButton,TextArea,Dialog,NotificationProvider,useNotification } from '@/workspace-ui/src';
import { robotReplySchema,type RobotPerformance,type RobotReply } from '@/lib/robot/contracts';
import ContactObject from './ContactObject';
import RobotCall from './RobotCall';
import LogoMark from '@/workspace-ui/app/LogoMark';
import { COMMUNITY_FORM_URL,LUMA_URL,SITE_URL } from '@/lib/site';
import styles from './RobotExperience.module.css';
type Message={role:'user'|'assistant';content:string;animate?:boolean};
function replyContent(text:string){
 const allowed=new Set([COMMUNITY_FORM_URL,LUMA_URL,`${SITE_URL}/about`]);
 return text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part,index)=>{
  const match=part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
  return match&&allowed.has(match[2])?<a key={index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]} <ExternalLink size={13} aria-hidden className={styles.linkIcon}/></a>:part;
 });
}
function IdentityTitle({title='Love Intelligence + Body.',robot=false}:{title?:string;robot?:boolean}){
 const [display,setDisplay]=useState(title);
 const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 function stop(){if(timer.current)clearInterval(timer.current);timer.current=null;setDisplay(title);}
 function play(){
  stop();if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let tick=0;const glyphs='▌/_+—';
  timer.current=setInterval(()=>{
   tick++;const resolved=Math.floor(tick/2);
   setDisplay(title.slice(0,resolved)+(resolved<title.length?glyphs[tick%glyphs.length]:''));
   if(resolved>=title.length)stop();
  },10);
 }
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current);},[]);
 const Heading=robot?'h2':'h1';
 return <Heading className={robot?styles.robotGlitchTitle:styles.chatTitle} tabIndex={0} aria-label={title} onMouseEnter={play} onMouseLeave={stop} onFocus={play} onBlur={stop}>
  <span className={styles.titleSizer} aria-hidden>{title}</span><span className={styles.titleDisplay} aria-hidden>{display.slice(0,18)}<span>{display.slice(18)}</span></span>
 </Heading>;
}
const welcomeMessages:Message[]=[
 {role:'assistant',content:'👋 Hi, I’m Ohi, your AI Chief Community Officer. Ask me about Physical I/O, or tap the mic to talk. Move your pointer and I’ll follow.'},
 {role:'assistant',content:'✨ I can put ideas in lights, too. Here’s ours: Love Intelligence + Body.'},
];
function ReplyText({text,animate=false}:{text:string;animate?:boolean}){
 const [visible,setVisible]=useState(animate?'':text);
 useEffect(()=>{
  if(!animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(text);return;}
  // Reveal complete links atomically so visitors never see partial Markdown or URLs.
  const chunks=text.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)|\S+\s*|\s+/g)||[text];
  let index=0;setVisible('');
  const timer=setInterval(()=>{
   index=Math.min(chunks.length,index+2);
   setVisible(chunks.slice(0,index).join(''));
   if(index===chunks.length)clearInterval(timer);
  },65);
  return()=>clearInterval(timer);
 },[text,animate]);
 return <p><span aria-hidden={animate||undefined}>{replyContent(visible)}</span>{animate&&<span className="ui-sr-only">{replyContent(text)}</span>}</p>;
}
const initial:RobotPerformance={id:0,reply:'',expression:'friendly',gesture:'none',display:'face',displayText:''};
function RobotExperienceContent({onReady,introEnabled=true,dark=false}:{onReady?:()=>void;introEnabled?:boolean;dark?:boolean}){
 const notify=useNotification();
 const [eventsOpen,setEventsOpen]=useState(false);
 const [mobileView,setMobileView]=useState<'robot'|'chat'>('robot');
 const [mobile,setMobile]=useState(false);
 const [actionDock,setActionDock]=useState<HTMLDivElement|null>(null);
 useEffect(()=>{const query=matchMedia('(max-width:760px)');const update=()=>setMobile(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 const [windowMode,setWindowMode]=useState<'normal'|'minimized'|'expanded'>('minimized');
 const [morphing,setMorphing]=useState(false);
 const chatButtonRef=useRef<HTMLButtonElement>(null);
 const transitionRef=useRef<{skipTransition:()=>void;finished:Promise<void>}|null>(null);
 const transitionSequence=useRef(0);
 useEffect(()=>()=>{transitionSequence.current++;transitionRef.current?.skipTransition();},[]);
 async function changeWindow(next:'normal'|'minimized'|'expanded'){
  const sequence=++transitionSequence.current;
  const doc=document as Document & {startViewTransition?:(update:()=>void)=>{skipTransition:()=>void;finished:Promise<void>}};
  transitionRef.current?.skipTransition();
  if(!doc.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){setMorphing(false);setWindowMode(next);return;}
  // Capture only the window surface, so text never stretches with its geometry.
  flushSync(()=>setMorphing(true));
  const transition=doc.startViewTransition(()=>flushSync(()=>setWindowMode(next)));
  transitionRef.current=transition;
  try{await transition.finished;}catch{}
  if(sequence===transitionSequence.current){transitionRef.current=null;setMorphing(false);}
 }
 async function closeChat(){
  if(mobile){setMobileView('robot');requestAnimationFrame(()=>chatButtonRef.current?.focus());return;}
  await changeWindow('minimized');chatButtonRef.current?.focus();
 }

 const [callActive,setCallActive]=useState(false);
 const [sceneReady,setSceneReady]=useState(false);
 const [messages,setMessages]=useState<Message[]>(welcomeMessages);const [input,setInput]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(error)notify(error);},[error,notify]);
 const [performance,setPerformance]=useState(initial);const [voice,setVoice]=useState(false);const [recording,setRecording]=useState(false);const [phase,setPhase]=useState('');
 const abort=useRef<AbortController|null>(null);const generation=useRef(0);const player=useRef<HTMLAudioElement|null>(null);const audioURL=useRef('');const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const recordingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const transcript=useRef<HTMLDivElement>(null);
 function stopAudio(){player.current?.pause();player.current=null;if(audioURL.current)URL.revokeObjectURL(audioURL.current);audioURL.current='';}
 function end(){generation.current++;abort.current?.abort();stopAudio();if(recordingTimer.current)clearTimeout(recordingTimer.current);if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());setRecording(false);setBusy(false);setPerformance(p=>({...p,id:Date.now(),display:'face',expression:'neutral',gesture:'none',speaking:false,listening:false}));setPhase('');}
 useEffect(()=>()=>{generation.current++;abort.current?.abort();stopAudio();if(recordingTimer.current)clearTimeout(recordingTimer.current);if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());},[]);
 useEffect(()=>{const node=transcript.current;if(!node)return;const follow=()=>{node.scrollTop=node.scrollHeight;};const observer=new MutationObserver(follow);observer.observe(node,{childList:true,subtree:true,characterData:true});follow();return()=>observer.disconnect();},[]);
 useEffect(()=>{if(transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight;},[messages,busy]);
 useEffect(()=>{if(sceneReady)onReady?.();},[sceneReady,onReady]);
 // Expressions belong to conversation; silence returns Ohi to a friendly face.
 useEffect(()=>{
  const resting=performance.display==='face'&&performance.expression==='friendly'&&performance.gesture==='none'&&!performance.speaking&&!performance.listening;
  if(!sceneReady||!introEnabled||busy||recording||resting)return;
  const timer=setTimeout(()=>setPerformance(p=>({...p,id:Date.now(),display:'face',displayText:'',expression:'friendly',gesture:'none',speaking:false,listening:false})),10000);
  return()=>clearTimeout(timer);
 },[sceneReady,introEnabled,busy,recording,performance,messages]);
 async function speak(reply:RobotReply,controller:AbortController,token:number){
  setPhase('Preparing voice…');const response=await fetch('/api/robot/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:reply.reply.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/https?:\/\/\S+/g,'the link in our conversation')}),signal:controller.signal});
  if(!response.ok)throw new Error((await response.json()).error||'Voice is unavailable.');
  const blob=await response.blob();if(token!==generation.current)return;
  audioURL.current=URL.createObjectURL(blob);const audio=new Audio(audioURL.current);player.current=audio;
  audio.onended=()=>{if(token===generation.current){setPerformance(p=>({...p,speaking:false}));setPhase('');stopAudio();}};
  audio.onerror=()=>{if(token===generation.current){setPerformance(p=>({...p,speaking:false}));setError('Voice playback failed.');setPhase('');stopAudio();}};
  await audio.play();if(token===generation.current){setPhase('Ohi is speaking…');setPerformance(p=>({...p,speaking:true}));}
 }
 async function send(text:string,speakReply=voice){
  if(!text.trim()||busy)return;end();const token=generation.current;const controller=new AbortController();abort.current=controller;
  const next=[...messages,{role:'user' as const,content:text.trim()}].slice(-16);setMessages(next);setInput('');setBusy(true);setError('');setPhase('Ohi is thinking…');setPerformance({...initial,id:Date.now(),display:'face',expression:'thinking'});
  try{
   const response=await fetch('/api/robot/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next}),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not reach Ohi.');
   const reply=robotReplySchema.parse(data);if(token!==generation.current)return;
   setMessages([...next,{role:'assistant',content:reply.reply,animate:true}]);setPerformance({...reply,id:Date.now()});setPhase('');
   if(speakReply)await speak(reply,controller,token);
  }catch(e){if(token===generation.current && !controller.signal.aborted){setError(e instanceof Error?e.message:'Something went wrong.');setPhase('Try again when you’re ready.');setPerformance({...initial,id:Date.now(),display:'face',expression:'neutral'});}}
  finally{if(token===generation.current)setBusy(false);}
 }
 async function talk(){
  if(recording){recorder.current?.stop();return;}end();setError('');const token=generation.current;setVoice(true);setPhase('Waiting for microphone…');
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Voice recording is unavailable in this browser. You can type instead.');
   const mic=await navigator.mediaDevices.getUserMedia({audio:true});if(token!==generation.current){mic.getTracks().forEach(t=>t.stop());return;}stream.current=mic;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
   const record=new MediaRecorder(mic,mime?{mimeType:mime}:undefined);recorder.current=record;const chunks:Blob[]=[];
   record.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   record.onstop=async()=>{
    mic.getTracks().forEach(t=>t.stop());if(recordingTimer.current)clearTimeout(recordingTimer.current);if(token!==generation.current)return;
    setRecording(false);setBusy(true);setPhase('Listening to your message…');setPerformance(p=>({...p,listening:false}));
    const controller=new AbortController();abort.current=controller;
    try{const body=new FormData();body.append('audio',new Blob(chunks,{type:record.mimeType}),record.mimeType.includes('mp4')?'voice.mp4':'voice.webm');const response=await fetch('/api/robot/transcribe',{method:'POST',body,signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error);if(token!==generation.current)return;setBusy(false);if(!data.text?.trim())throw new Error('I didn’t hear any words. Try again.');void send(data.text,true);}
    catch(e){if(token===generation.current){setBusy(false);setError(e instanceof Error?e.message:'Could not transcribe that.');setPhase('');}}
   };
   record.start();setRecording(true);setPhase('Listening · press Send voice when finished.');setPerformance({...initial,id:Date.now(),display:'face',expression:'curious',listening:true});recordingTimer.current=setTimeout(()=>{if(record.state==='recording')record.stop();},30000);
  }catch(e){if(token===generation.current){setError(e instanceof Error?e.message:'Microphone access failed.');setPhase('You can type instead.');}}
 }
 function toggleVoice(){const next=!voice;setVoice(next);if(!next){stopAudio();setPerformance(p=>({...p,speaking:false}));}}
 return <section className={styles.workspace} data-window={windowMode} data-mobile-view={mobileView} data-morphing={morphing}>
  
  <div className={styles.panel} data-window={windowMode} data-started={messages.length>0||busy}>
   <IdentityTitle/>
   <div className={styles.transitionSkeleton} aria-hidden="true"><div className={styles.skeletonHeading}><i/><span/></div><div className={styles.skeletonLines}><span/><span/><span/></div><div className={styles.skeletonComposer}/></div>

   
   <RobotCall actionDock={actionDock} windowControls={<><IconButton className={styles.mobileBack} label="Back to Ohi" variant="ghost" onClick={()=>void closeChat()}><ArrowLeft size={20}/></IconButton><div className={styles.windowControls} aria-label="Chat window controls"><IconButton variant="ghost" label="Close chat" title="Close chat" onClick={()=>void closeChat()} className={styles.closeControl}><X size={16}/></IconButton><IconButton variant="ghost" label={windowMode==='expanded'?'Restore chat size':'Expand chat'} title={windowMode==='expanded'?'Restore chat size':'Expand chat'} onClick={()=>changeWindow(windowMode==='expanded'?'normal':'expanded')} className={styles.expandControl}>{windowMode==='expanded'?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</IconButton></div></>} onStart={end} onActive={setCallActive} onMessage={(role,content)=>setMessages(previous=>[...previous,{role,content,animate:role==='assistant'}])} onExpression={(speaking,listening)=>setPerformance({...initial,id:Date.now(),display:'face',expression:listening?'curious':'friendly',gesture:speaking?'nod':'none',speaking,listening})}/>

   <div className={styles.transcript} ref={transcript} role="log" aria-label="Conversation with Ohi" aria-live="polite">
    {messages.map((m,i)=><div key={i} className={m.role==='user'?styles.user:styles.reply}>{m.role==='user'?<span className="ui-sr-only">You</span>:<span className={styles.replyAvatar} role="img" aria-label="Ohi"><LogoMark/></span>}<ReplyText text={m.content} animate={m.animate}/></div>)}
    {busy&&<p className={styles.waiting}>{phase}</p>}
   </div>
   {messages.length>0&&<div className={styles.quick} aria-label="Quick actions">
    <Button variant="ghost" disabled={busy||recording||callActive} onClick={()=>void send('What is Physical I/O?')}><Info size={15} aria-hidden/>About us</Button>
    <Button variant="ghost" onClick={()=>setEventsOpen(true)}><CalendarDays size={15} aria-hidden/>Events</Button>
   </div>}
   <form onSubmit={e=>{e.preventDefault();void send(input);}} className={styles.composer}>
    <TextArea label="Message Ohi" placeholder="Ask anything…" value={input} maxLength={2000} rows={2} disabled={busy||recording||callActive} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send(input);}}}/>
    <div className={styles.actions}><IconButton label={voice?'Turn spoken replies off':'Turn spoken replies on'} title={voice?'Turn spoken replies off':'Turn spoken replies on'} variant="ghost" aria-pressed={voice} onClick={toggleVoice}>{voice?<Volume2 size={20}/>:<VolumeX size={20}/>}</IconButton><IconButton label={recording?'Send voice':'Talk to Ohi'} title={recording?'Send voice':'Talk to Ohi'} variant="ghost" disabled={busy||callActive} aria-pressed={recording} onClick={()=>void talk()}><Mic size={20}/></IconButton><IconButton label="Stop" title="Stop" variant="ghost" disabled={callActive} onClick={end}><Square size={16}/></IconButton><IconButton label="Send message" title="Send message" variant="primary" type="submit" disabled={!input.trim()||busy||recording||callActive}><ArrowUp size={20}/></IconButton></div>
    <span className="ui-sr-only" role="status">{busy ? "" : phase}</span>
   </form>
  </div>
  <div className={styles.robot}><div className={styles.robotIntro}><h2>Meet Ohi.</h2><p>Our Chief Community Officer.</p></div><ContactObject centered={mobile||windowMode==='minimized'} dark={dark} performance={performance} onReady={setSceneReady} configureDisabled={callActive} onConfigure={value=>{end();setPerformance(value);}}/></div>
  <nav className={styles.mobileNav} aria-label="Ohi navigation"><Button ref={chatButtonRef} variant="ghost" aria-pressed={mobile?mobileView==='chat':windowMode!=='minimized'} onClick={()=>{if(mobile){setMobileView(view=>view==='chat'?'robot':'chat');return;}if(windowMode==='minimized')void changeWindow('normal');else void closeChat();}}><MessageCircle size={20}/>Chat</Button><div className={styles.mobileCallDock} ref={setActionDock}/></nav>
  <Dialog open={eventsOpen} onOpenChange={setEventsOpen} title="Community events" description="Gatherings, talks and demos from Physical I/O."><div className={styles.eventsCalendar}><iframe src="https://luma.com/embed/calendar/cal-Qb2jFfezFMiVkF1/events" title="Physical I/O event calendar" width="600" height="450" allowFullScreen tabIndex={0}/><a href="https://luma.com/phyiscal-io" target="_blank" rel="noopener noreferrer">Open calendar in Luma <ExternalLink size={14} aria-hidden/></a></div></Dialog>
 </section>;
}

export default function RobotExperience(props:React.ComponentProps<typeof RobotExperienceContent>){return <NotificationProvider><RobotExperienceContent {...props}/></NotificationProvider>;}
