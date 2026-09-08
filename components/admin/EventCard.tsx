'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {Pencil,Archive,Star,Trash2,Image as ImageIcon} from 'lucide-react';
import {Card,Badge,ContextMenu,IconButton} from '@/workspace-ui/src';
import {stageNames,type Episode} from '@/lib/events/model';
import type {Command} from '@/lib/admin/contracts';
const colours=new Map<string,string>();
function useCoverColour(url:string){
 const [colour,setColour]=useState<string>();
 useEffect(()=>{
  setColour(undefined);if(!url)return;
  const cached=colours.get(url);if(cached){setColour(cached);return;}
  let cancelled=false;const image=new Image();image.crossOrigin='anonymous';
  image.onload=()=>{if(cancelled)return;try{const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;context.drawImage(image,0,0,16,16);const pixels=context.getImageData(0,0,16,16).data;let r=0,g=0,b=0,weight=0;for(let i=0;i<pixels.length;i+=4){const a=pixels[i+3]/255;r+=pixels[i]*a;g+=pixels[i+1]*a;b+=pixels[i+2]*a;weight+=a;}if(!weight)return;const value=`rgb(${Math.round(r/weight*.85)} ${Math.round(g/weight*.85)} ${Math.round(b/weight*.85)})`;if(colours.size>=100)colours.delete(colours.keys().next().value!);colours.set(url,value);setColour(value);}catch{/* Cross-origin images without CORS use the theme's neutral fallback. */}};
  image.src=url;return()=>{cancelled=true;image.onload=null;image.src='';};
 },[url]);return colour;
}
export default function EventCard({event,busy,onOpen,onAction,onDelete}:{event:Episode;busy:boolean;onOpen:()=>void;onAction:(command:Command)=>void;onDelete:()=>void}){
 const cover=event.studio?.cover??'',colour=useCoverColour(cover),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[cover]);
 const featured=event.studio?.featured;
 return <Card className="event-card event-video-card" style={colour?{'--event-cover-colour':colour} as CSSProperties:undefined}>
  <button type="button" className="event-card-open" aria-label={`Open episode: ${event.name}`} onClick={onOpen}/>
  {cover&&!failed?<img src={cover} alt="" className="event-cover" loading="lazy" onError={()=>setFailed(true)}/>:<div className="event-cover event-cover-placeholder" role="img" aria-label="No event cover"><ImageIcon size={20}/></div>}
  <div className="event-card-caption"><div className="event-card-copy"><h2>{featured&&<Star size={14} aria-label="Featured"/>}{event.name}</h2><p className="admin-muted">{event.date?new Date(event.date).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'Date to be confirmed'}{event.location?.trim()&&` · ${event.location.trim()}`}{event.studio?.episode&&` · Episode ${event.studio.episode}`}</p><span className="event-stage-badge" data-stage={event.archived?'archived':event.stage??'proposed'}><Badge>{event.archived?'Archived':stageLabel(event.stage)}</Badge></span></div>
  <ContextMenu label="Episode actions" tooltip="Edit and more actions" trigger={<IconButton className="event-card-edit" label={`Edit and more actions for ${event.name}`} disabled={busy}><Pencil size={16}/></IconButton>} items={[{label:'Edit episode',icon:<Pencil size={16}/>,onSelect:onOpen},{label:featured?'Unfeature':'Feature',icon:<Star size={16}/>,onSelect:()=>onAction({action:'event.feature',id:event.id,version:event.version??0,featured:!featured})},{label:event.archived?'Restore episode':'Archive',icon:<Archive size={16}/>,onSelect:()=>onAction({action:'event.archive',id:event.id,version:event.version??0,archived:!event.archived})},{label:'Delete',icon:<Trash2 size={16}/>,onSelect:onDelete}]}/></div>
 </Card>;
}
function stageLabel(stage:Episode['stage']){return stageNames[stage??'proposed'];}
