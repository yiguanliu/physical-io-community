'use client';
import {useState} from 'react';
import {Button,Field,Switch} from '@/workspace-ui/src';
import {defaultEnvironment,type EnvironmentSettings} from '@/lib/robot/environment';
import styles from './ContactObject.module.css';
export default function EnvironmentCreator({value,onChange}:{value:EnvironmentSettings;onChange:(value:EnvironmentSettings)=>void}){
 const [fileName,setFileName]=useState('Studio');const [error,setError]=useState('');
 function change(key:keyof EnvironmentSettings,next:number|boolean){onChange({...value,[key]:next});}
 const slider=(label:string,key:keyof EnvironmentSettings,min:number,max:number,step:number)=><Field key={key} label={`${label} · ${value[key]}`} type="range" min={min} max={max} step={step} value={Number(value[key])} onChange={e=>change(key,Number(e.target.value))}/>;
 return <div className={styles.environmentSettings}>
 <fieldset><legend>Glow</legend>{slider('Bloom','bloom',0,1,.01)}{slider('Spread','bloomRadius',0,1,.05)}{slider('Threshold','bloomThreshold',0,3,.1)}</fieldset>
 <fieldset><legend>Lens</legend><Switch label="Depth of field" checked={value.depthOfField} onCheckedChange={v=>change('depthOfField',v)}/>{slider('Aperture','aperture',0,.02,.001)}{slider('Focus offset','focusOffset',-5,5,.1)}</fieldset>
 <fieldset><legend>Environment</legend><p>{fileName}</p><Field label="Load HDRI (.hdr or .exr)" type="file" accept=".hdr,.exr" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(!/\.(hdr|exr)$/i.test(file.name)||file.size>40*1024*1024){setError('Choose an HDR or EXR file under 40 MB.');return;}setError('');setFileName(file.name);onChange({...value,hdriUrl:URL.createObjectURL(file),hdriFormat:file.name.toLowerCase().endsWith('.exr')?'exr':'hdr'});}}/>{error&&<p role="alert">{error}</p>}<Button variant="ghost" onClick={()=>{setFileName('Studio');onChange({...value,hdriUrl:''});}}>Use studio environment</Button>{slider('Rotation','rotation',0,360,1)}{slider('Reflection strength','environmentStrength',0,3,.1)}<Switch label="Show environment backdrop" checked={value.showEnvironment} onCheckedChange={v=>change('showEnvironment',v)}/></fieldset>
 <fieldset><legend>Lighting</legend>{slider('Key light','keyStrength',0,8,.1)}{slider('Fill light','fillStrength',0,5,.1)}{slider('Exposure','exposure',.3,2.5,.1)}<Switch label="Ambient occlusion" checked={value.ambientOcclusion} onCheckedChange={v=>change('ambientOcclusion',v)}/></fieldset>
 <Button variant="ghost" onClick={()=>{setFileName('Studio');setError('');onChange({...defaultEnvironment});}}>Reset environment</Button>
 </div>;
}
