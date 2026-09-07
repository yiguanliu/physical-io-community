'use client';
import {useState} from 'react';
import {Button,Field,Select} from '@/workspace-ui/src';
import {robotReplySchema,type FaceSettings,type RobotPerformance} from '@/lib/robot/contracts';
import styles from './ContactObject.module.css';
const defaults:FaceSettings={eyeSize:3.5,eyeSpacing:17,smile:6,brightness:1};
export default function ExpressionCreator({onChange,disabled,expanded=false}:{expanded?:boolean;onChange:(value:RobotPerformance)=>void;disabled?:boolean}){
 const [expression,setExpression]=useState<RobotPerformance['expression']>('friendly');const [face,setFace]=useState(defaults);const [notice,setNotice]=useState('');
 function preview(next=face,preset=expression){onChange({id:Date.now(),reply:'',expression:preset,gesture:'none',display:'face',displayText:'',face:next});}
 function update(key:keyof FaceSettings,value:number){const next={...face,[key]:value};setFace(next);preview(next);setNotice('');}
 function save(){try{localStorage.setItem('ohi-custom-face',JSON.stringify({expression,face}));setNotice('Saved on this device.');}catch{setNotice('Could not save on this device.');}}
 function load(){try{const saved=JSON.parse(localStorage.getItem('ohi-custom-face')||'null');if(!saved)throw Error();const preset=robotReplySchema.shape.expression.parse(saved.expression);const ranges={eyeSize:[1,6],eyeSpacing:[10,24],smile:[-8,8],brightness:[.2,1.5]};for(const [key,[min,max]] of Object.entries(ranges)){const value=saved.face?.[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error();}setExpression(preset);setFace(saved.face);preview(saved.face,preset);setNotice('Loaded saved face.');}catch{setNotice('No saved face available.');}}
 return <details open={expanded||undefined} className={`${styles.expressionCreator} ${expanded?styles.expandedCreator:""}`}><summary>Expression creator</summary><fieldset disabled={disabled}>
 <Select label="Expression" value={expression} disabled={disabled} options={robotReplySchema.shape.expression.options.map(value=>({value,label:value.charAt(0).toUpperCase()+value.slice(1)}))} onValueChange={value=>{const preset=robotReplySchema.shape.expression.parse(value);setExpression(preset);setFace(defaults);preview(defaults,preset);}}/>
 <Field label="Eye size" type="range" min={1} max={6} step={.5} value={face.eyeSize} onChange={e=>update('eyeSize',Number(e.target.value))}/>
 <Field label="Eye spacing" type="range" min={10} max={24} step={1} value={face.eyeSpacing} onChange={e=>update('eyeSpacing',Number(e.target.value))}/>
 <Field label="Smile / frown" type="range" min={-8} max={8} step={1} value={face.smile} onChange={e=>update('smile',Number(e.target.value))}/>
 <Field label="LED brightness" type="range" min={.2} max={1.5} step={.1} value={face.brightness} onChange={e=>update('brightness',Number(e.target.value))}/>
 <div><Button variant="primary" onClick={()=>preview()}>Preview</Button><Button variant="ghost" onClick={()=>{setFace(defaults);setExpression('friendly');preview(defaults,'friendly');}}>Reset</Button></div>
 <div><Button variant="ghost" onClick={save}>Save face</Button><Button variant="ghost" onClick={load}>Load saved</Button></div>
 </fieldset>{notice&&<p role="status">{notice}</p>}</details>;
}
