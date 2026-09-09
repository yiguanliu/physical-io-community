'use client';
import {useNotification} from '@/workspace-ui/src';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import {Phone,PhoneOff,Video} from 'lucide-react';
import {Button,IconButton,Popover} from '@/workspace-ui/src';
import styles from './RobotExperience.module.css';
type Props={actionDock?:HTMLElement|null;windowControls?:React.ReactNode;onStart:()=>void;onActive:(active:boolean)=>void;onMessage:(role:'user'|'assistant',text:string)=>void;onExpression:(speaking:boolean,listening:boolean)=>void};
export default function RobotCall(props:Props){
 const notify=useNotification();
 const callbacks=useRef(props);callbacks.current=props;
 const [state,setState]=useState<'idle'|'connecting'|'voice'|'video'>('idle');const [error,setError]=useState('');
 useEffect(()=>{if(error)notify(error);},[error,notify]);
 const resources=useRef<{pc?:RTCPeerConnection;media?:MediaStream;audio?:HTMLAudioElement;timer?:ReturnType<typeof setInterval>;timeout?:ReturnType<typeof setTimeout>;abort?:AbortController}>({});
 const preview=useRef<HTMLVideoElement>(null);const generation=useRef(0);
 function release(){generation.current++;const r=resources.current;resources.current={};clearInterval(r.timer);clearTimeout(r.timeout);r.abort?.abort();r.pc?.close();r.media?.getTracks().forEach(t=>t.stop());if(r.audio){r.audio.pause();r.audio.srcObject=null;}if(preview.current)preview.current.srcObject=null;}
 function end(){release();setState('idle');callbacks.current.onActive(false);callbacks.current.onExpression(false,false);}
 useEffect(()=>()=>release(),[]);
 // Keep the camera preview attached when its controls move between header and dock.
 useEffect(()=>{
  if(state==='video'&&preview.current&&resources.current.media){
   preview.current.srcObject=resources.current.media;
   void preview.current.play().catch(()=>{});
  }
 },[state,props.actionDock]);
 async function start(mode:'voice'|'video'){
  end();callbacks.current.onStart();callbacks.current.onActive(true);setState('connecting');setError('');const token=generation.current;
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:mode==='video'?{width:640,height:480}:false});
   if(token!==generation.current){media.getTracks().forEach(t=>t.stop());return;}
   resources.current.media=media;
   const pc=new RTCPeerConnection();resources.current.pc=pc;
   const audio=new Audio();audio.autoplay=true;resources.current.audio=audio;
   pc.ontrack=e=>{audio.srcObject=e.streams[0];void audio.play().catch(()=>{setError('Audio playback was blocked. End the call and try again.');end();});};
   media.getAudioTracks().forEach(track=>pc.addTrack(track,media));
   media.getTracks().forEach(track=>track.onended=()=>{if(token===generation.current)end();});
   const channel=pc.createDataChannel('oai-events');
   channel.onopen=()=>{
    if(token!==generation.current)return;clearTimeout(resources.current.timeout);resources.current.timeout=setTimeout(()=>{setError('Call ended after 10 minutes. You can start another.');end();},600000);setState(mode);
    if(preview.current&&mode==='video'){preview.current.srcObject=media;void preview.current.play().catch(()=>{});}
    channel.send(JSON.stringify({type:'response.create'}));
    if(mode==='video'){
     const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
     resources.current.timer=setInterval(()=>{const video=preview.current;if(channel.readyState!=='open'||!video||video.readyState<2)return;canvas.getContext('2d')!.drawImage(video,0,0,320,240);channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_image',image_url:canvas.toDataURL('image/jpeg',.6)}]}}));},2000);
    }
   };
   channel.onmessage=e=>{if(token!==generation.current)return;try{const event=JSON.parse(e.data);
    if(event.type==='conversation.item.input_audio_transcription.completed'&&event.transcript)callbacks.current.onMessage('user',event.transcript);
    if(event.type==='response.output_audio_transcript.done'&&event.transcript)callbacks.current.onMessage('assistant',event.transcript);
    if(event.type==='output_audio_buffer.started')callbacks.current.onExpression(true,false);
    if(event.type==='output_audio_buffer.stopped'||event.type==='output_audio_buffer.cleared')callbacks.current.onExpression(false,false);
    if(event.type==='input_audio_buffer.speech_started')callbacks.current.onExpression(false,true);
    if(event.type==='error'){setError('The call encountered an error. Please try again.');end();}
   }catch{}};
   pc.onconnectionstatechange=()=>{if(token!==generation.current)return;if(['failed','disconnected','closed'].includes(pc.connectionState)){setError('Call disconnected.');end();}};
   resources.current.timeout=setTimeout(()=>{if(token===generation.current){setError('The call timed out. Please try again.');end();}},45000);
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);const abort=new AbortController();resources.current.abort=abort;
   const response=await fetch('/api/robot/call',{method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp,signal:abort.signal});
   if(!response.ok)throw new Error((await response.json()).error||'Could not connect.');const answer=await response.text();if(token!==generation.current)return;
   await pc.setRemoteDescription({type:'answer',sdp:answer});
  }catch(e){if(token!==generation.current)return;setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone or camera permission was denied.':e instanceof Error?e.message:'Could not start the call.');end();}
 }
 const callControls=<>
  {state==='idle'?<Popover title="Call Ohi" closeLabel="Close call options" side={props.actionDock?'top':'bottom'} align="end" trigger={props.actionDock?<Button variant="primary"><Phone size={18}/>Call</Button>:<IconButton label="Call Ohi" variant="primary"><Phone size={18}/></IconButton>}><div className={styles.callChoices}><Button variant="ghost" onClick={()=>void start('voice')}><Phone size={18}/>Voice call</Button><Button variant="ghost" onClick={()=>void start('video')}><Video size={18}/>Video call</Button></div></Popover>:<><span role="status">{state==='connecting'?'Connecting…':state==='video'?'Video call':'Voice call'}</span><IconButton label="End call" variant="primary" onClick={end}><PhoneOff size={18}/></IconButton></>}
  <video ref={preview} hidden={state!=='video'} className={styles.callPreview} muted playsInline aria-label="Your camera"/>

 </>;
 return <div className={styles.callHeader}>
  {props.windowControls}
  {props.actionDock?createPortal(callControls,props.actionDock):callControls}
 </div>;
}
