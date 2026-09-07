"use client";
import {useNotification} from "@/workspace-ui/src";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, IconButton, Popover, Dialog } from "@/workspace-ui/src";
import styles from "./ContactObject.module.css";
import EnvironmentCreator from "./EnvironmentCreator";
import {defaultEnvironment,type EnvironmentSettings} from "@/lib/robot/environment";
import ExpressionCreator from "./ExpressionCreator";
import type { RobotPerformance } from "@/lib/robot/contracts";

type Mode = "idle" | "voice" | "camera";
export default function ContactObject({performance,onReady,onInteract,onConfigure,configureDisabled,dark=false,previewOnly=false,centered=false,environmentSettings}:{environmentSettings?:EnvironmentSettings;centered?:boolean;previewOnly?:boolean;onConfigure?:(value:RobotPerformance)=>void;configureDisabled?:boolean;dark?:boolean;performance?:RobotPerformance;onReady?:(ready:boolean)=>void;onInteract?:()=>void}) {
 const notify=useNotification();
  const [environmentOpen,setEnvironmentOpen]=useState(false);
  const [environment,setEnvironment]=useState(defaultEnvironment);
  const activeEnvironment=environmentSettings??environment;
  const environmentFiles=useRef<string[]>([]);
  function changeEnvironment(value:EnvironmentSettings){if(value.hdriUrl&&!environmentFiles.current.includes(value.hdriUrl))environmentFiles.current.push(value.hdriUrl);setEnvironment(value);}
  useEffect(()=>()=>{environmentFiles.current.forEach(url=>URL.revokeObjectURL(url));},[]);
  const [studioOpen,setStudioOpen]=useState(false);
  const host = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const cleanup = useRef<() => void>(() => {});
  const reset = useRef<() => void>(() => {});
  const request = useRef(0);
  const signal = useRef({environment:activeEnvironment,environmentStatus:"",dark,centered,energy:0,x:0,y:0,active:false,performance:undefined as RobotPerformance | undefined,depth:null as Float32Array | null,bands:new Uint8Array(128),sample:()=>{}});
  useEffect(()=>{signal.current.environment=activeEnvironment;},[activeEnvironment]);
  useEffect(()=>{signal.current.dark=dark;},[dark]);
  useEffect(()=>{signal.current.centered=centered;},[centered]);
  useEffect(()=>{signal.current.performance=performance;},[performance]);
  useEffect(()=>{if(performance && performance.id>0)stop();},[performance?.id]);
  const [mode,setMode] = useState<Mode>("idle");
  const [pending,setPending] = useState(false);
  const [loadingMessage,setLoadingMessage] = useState("Waiting for device permission…");
  const [ready,setReady] = useState(false);
  const [error,setError] = useState("");
  const [environmentStatus,setEnvironmentStatus]=useState("");
  useEffect(()=>{if(error)notify(error);},[error,notify]);
  useEffect(()=>{if(environmentStatus&&environmentStatus!=='Loading environment…')notify(environmentStatus);},[environmentStatus,notify]);

  useEffect(()=>{const timer=setInterval(()=>setEnvironmentStatus(signal.current.environmentStatus),250);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    let disposed=false;let release=()=>{};
    import("./contact-scene").then(({createContactScene})=>{
      if(disposed || !host.current)return;
      const scene=createContactScene(host.current,signal.current);
      release=scene.dispose;reset.current=scene.reset;setReady(true);onReady?.(true);
    }).catch(()=>setError("3D is unavailable in this browser. Try a browser with WebGL enabled."));
    return()=>{disposed=true;request.current++;cleanup.current();release();};
  },[]);
  useEffect(()=>{
    const hide=()=>{if(document.hidden)stop();};
    document.addEventListener("visibilitychange",hide);
    return()=>document.removeEventListener("visibilitychange",hide);
  },[]);
  function stop(){request.current++;cleanup.current();cleanup.current=()=>{};signal.current.sample=()=>{};signal.current.active=false;signal.current.depth=null;signal.current.energy=0;signal.current.x=0;signal.current.y=0;signal.current.bands.fill(0);setMode("idle");setPending(false);}
  async function enable(next:Mode){
    onInteract?.();
    stop();setError("");setLoadingMessage("Waiting for device permission…");setPending(true);
    const token=request.current;
    let stream:MediaStream|undefined;let audio:AudioContext|undefined;let worker:Worker|undefined;let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("Media access requires HTTPS or localhost and a supported browser.");
      stream=await navigator.mediaDevices.getUserMedia(next==="voice"?{audio:true}:{video:{width:320,height:240,facingMode:"user"}});
      if(token!==request.current){stream.getTracks().forEach(t=>t.stop());return;}
      const release=()=>{worker?.terminate();clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());if(audio && audio.state!=="closed")void audio.close().catch(()=>{});if(video.current)video.current.srcObject=null;};
      cleanup.current=release;
      if(next==="voice"){
        audio=new AudioContext();await audio.resume();
        if(token!==request.current){release();return;}
        const analyser=audio.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.75;
        audio.createMediaStreamSource(stream).connect(analyser);
        const samples=new Uint8Array(128);
        signal.current.sample=()=>{analyser.getByteFrequencyData(samples);signal.current.bands.set(samples);signal.current.energy=samples.reduce((a,b)=>a+b,0)/samples.length/150;};
      }else{
        setMode("camera");
        const player=video.current!;player.hidden=false;player.srcObject=stream;await player.play();
        if(token!==request.current){release();return;}
        const canvas=document.createElement("canvas");canvas.width=252;canvas.height=252;
        const context=canvas.getContext("2d",{willReadFrequently:true})!;
        setLoadingMessage("Loading depth model · first use downloads model files. Camera images stay local.");
        worker=new Worker("/workers/contact-depth.js",{type:"module"});
        const capture=()=>{
          if(token!==request.current)return;
          if(player.readyState<2){timer=setTimeout(capture,100);return;}
          const side=Math.min(player.videoWidth,player.videoHeight);
          context.drawImage(player,(player.videoWidth-side)/2,(player.videoHeight-side)/2,side,side,0,0,canvas.width,canvas.height);
          const frame=context.getImageData(0,0,canvas.width,canvas.height);
          worker!.postMessage({type:"frame",pixels:frame.data.buffer,width:canvas.width,height:canvas.height},[frame.data.buffer]);
        };
        worker.onmessage=({data})=>{
          if(token!==request.current)return;
          if(data.type==="loading")setLoadingMessage(`Downloading depth model file · ${data.progress}%. Camera images stay local.`);
          if(data.type==="ready"){setLoadingMessage("Estimating the first depth frame…");capture();}
          if(data.type==="depth"){
            signal.current.depth=data.values;
            signal.current.active=true;
            setMode("camera");setPending(false);
            timer=setTimeout(capture,0);
          }
          if(data.type==="error"){stop();setError(`Depth processing failed: ${String(data.message || "Unknown model error").slice(0,220)}`);}
        };
        worker.onerror=(event)=>{if(token===request.current){stop();setError(`Depth worker failed: ${event.message || "Could not load the model runtime. Check your connection and retry."}`);}};
        worker.postMessage({type:"init"});

      }
      for(const track of stream.getTracks())track.onended=()=>{if(token===request.current){stop();setError("Input disconnected. You can enable it again.");}};
      if(next==="voice"){signal.current.active=true;setMode(next);setPending(false);}
    }catch(e){stream?.getTracks().forEach(t=>t.stop());if(audio && audio.state!=="closed")void audio.close().catch(()=>{});if(token===request.current){stop();setError(e instanceof DOMException && e.name==="NotAllowedError"?"Permission wasn’t granted. You can still drag the object, or enable access in your browser and retry.":e instanceof Error?e.message:"Could not start this input.");}}
    finally{if(token===request.current && next==="voice")setPending(false);}
  }
  return <div className={styles.object}>
    <div className={styles.stage} ref={host} tabIndex={0} role="img" aria-label="Interactive dark robot with a circular amber display. Move your pointer or use arrow keys to turn its head. Drag to orbit the robot." />
    {!previewOnly&&<div className={styles.controlDock}>
    <Popover side="left" align="center" title="Robot controls" closeLabel="Close robot controls" trigger={<IconButton label="Robot controls" variant="ghost" className={styles.controlTrigger}><SlidersHorizontal size={20}/>{(mode!=="idle"||pending)&&<span className={styles.activeDot}/>}</IconButton>}>
    <div className={styles.controls}>
      <Button disabled={!ready||pending} aria-pressed={mode==="voice"} onClick={()=>mode==="voice"?stop():void enable("voice")}>{mode==="voice"?"Stop microphone":"Sound reactive"}</Button>
      <Button disabled={!ready||pending} aria-pressed={mode==="camera"} onClick={()=>mode==="camera"?stop():void enable("camera")}>{mode==="camera"?"Stop camera":"Use camera"}</Button>
      <Button disabled={!ready} onClick={()=>{onInteract?.();reset.current();}}>Reset pose</Button>
      {pending && <Button onClick={stop}>Cancel</Button>}
    {onConfigure&&<Button variant="ghost" disabled={!ready||configureDisabled} onClick={()=>{onInteract?.();setStudioOpen(true);}}>Expression studio ↗</Button>}
      <Button variant="ghost" disabled={!ready} onClick={()=>setEnvironmentOpen(true)}>Environment studio ↗</Button>
    </div>
    </Popover>
    </div>
    }
    {!previewOnly&&onConfigure&&<Dialog open={studioOpen} onOpenChange={setStudioOpen} title="Expression studio" description="Shape Ohi’s expression. Changes preview live."><div className={styles.studio}><div className={styles.studioPreview}><ContactObject previewOnly environmentSettings={activeEnvironment} dark={dark} performance={performance}/></div><aside className={styles.studioSettings} aria-label="Expression settings"><ExpressionCreator expanded disabled={configureDisabled} onChange={value=>{stop();onConfigure(value);}}/></aside></div></Dialog>}
    {!previewOnly&&<Dialog open={environmentOpen} onOpenChange={setEnvironmentOpen} title="Environment studio" description="Tune light, reflections and lens effects. Changes preview live."><div className={styles.studio}><div className={styles.studioPreview}><ContactObject previewOnly dark={dark} environmentSettings={activeEnvironment} performance={performance}/></div><aside className={styles.studioSettings} aria-label="Environment settings"><EnvironmentCreator value={activeEnvironment} onChange={changeEnvironment}/></aside></div></Dialog>}
    <video className={styles.video} ref={video} muted playsInline hidden={mode!=="camera"} aria-label="Your local camera preview" />


  </div>;
}
