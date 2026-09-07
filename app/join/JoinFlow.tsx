'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Check,Moon,Sun} from 'lucide-react';
import {Button,IconButton,Field,TextArea,Switch,ThemeProvider,defaultTheme} from '@/workspace-ui/src';
import LogoMark from '@/workspace-ui/app/LogoMark';
import {joinSchema,roles,experiences,goals,formats} from '@/lib/join/schema';
import '@/workspace-ui/src/styles.css';
import styles from './join.module.css';
import homeStyles from '@/components/HomeCommunity.module.css';
const steps=[
 {key:'fullName',title:'First, what’s your name?',type:'text',hint:''},
 {key:'email',title:'What’s your email address?',type:'email',hint:'So the community team can reach you.'},
 {key:'city',title:'Which city are you based in?',type:'text',hint:''},
 {key:'role',title:'What best describes you?',type:'choice',options:roles},
 {key:'experience',title:'How long have you worked in the industry?',type:'choice',options:experiences},
 {key:'work',title:'What are you working on?',type:'long',hint:'Tell us about your work or interests in Physical AI and Spatial Intelligence.'},
 {key:'website',title:'Where can we see your work?',type:'text',hint:'Your company, portfolio or GitHub link. Optional.'},
 {key:'linkedin',title:'What’s your LinkedIn link?',type:'text',hint:'Optional.'},
 {key:'goals',title:'What would you like from this community?',type:'multi',options:goals,hint:'Choose all that feel right.'},
 {key:'formats',title:'What would you actually show up for?',type:'multi',options:formats,hint:'Choose as many as you like.'},
 {key:'suggestions',title:'What would you love to see us do?',type:'long',hint:'Optional.'},
] as const;
type Key=typeof steps[number]['key'];
const initial={fullName:'',email:'',city:'',role:'',experience:'',work:'',website:'',linkedin:'',goals:[] as string[],formats:[] as string[],suggestions:'',consent:false,updates:false,websiteTrap:''};
export default function JoinFlow(){
 const [values,setValues]=useState(initial);const [step,setStep]=useState(0);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [dark,setDark]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{try{const saved=localStorage.getItem('ohi-appearance');setDark(saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches);}catch{}},[]);
 function toggleTheme(){setDark(value=>{const next=!value;try{localStorage.setItem('ohi-appearance',next?'dark':'light');}catch{}return next;});}
 useEffect(()=>{heading.current?.focus();},[step,done]);
 function update(key:Key,value:string|string[]){setValues(v=>({...v,[key]:value}));setError('');}
 function next(){
  const current=steps[step];const result=joinSchema.shape[current.key].safeParse(values[current.key]);
  if(!result.success){setError(result.error.issues[0].message);return;}setError('');setStep(s=>s+1);
 }
 async function submit(){
  const parsed=joinSchema.safeParse(values);if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  setBusy(true);setError('');
  try{const response=await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)});const data=await response.json();if(!response.ok)throw new Error(data.error);setDone(true);}
  catch(e){setError(e instanceof Error?e.message:'Could not submit. Please try again.');}finally{setBusy(false);}
 }
 const current=steps[step];const review=step===steps.length;
 return <ThemeProvider theme={{...defaultTheme,mode:dark?'dark':'light'}}><main className={styles.page} data-mode={dark?'dark':'light'}>
 <header className={`${homeStyles['site-header']} ${styles.header}`}><Link className={homeStyles.brand} href="/" aria-label="Physical I/O home"><LogoMark/><img className={styles.wordmark} src="/assets/physical-io-wordmark.png" alt="Physical I/O" width={879} height={184}/></Link><IconButton label={dark?'Switch to light mode':'Switch to dark mode'} variant="ghost" onClick={toggleTheme}>{dark?<Sun size={20}/>:<Moon size={20}/>}</IconButton></header>
 {!done&&<div className={styles.progress} role="progressbar" aria-label="Signup progress" aria-valuemin={0} aria-valuemax={steps.length+1} aria-valuenow={step+1}><span style={{width:`${(step+1)/(steps.length+1)*100}%`}}/></div>}
 <section className={styles.content} key={done?'done':step}>
 {done?<><div className={styles.check}><Check size={28}/></div><h1 ref={heading} tabIndex={-1}>You’re in good company.</h1><p>Thanks for joining Physical I/O. If you’ve joined before, your existing membership stays unchanged.</p><Link className="ui-button ui-button-primary" href="/">Meet Ohi <ArrowRight size={18}/></Link></>:
 <form onSubmit={e=>{e.preventDefault();if(review)void submit();else next();}}>
 <div className={styles.counter}>{step+1} / {steps.length+1}</div>
 <h1 ref={heading} tabIndex={-1}>{review?'Make yourself at home.':current.title}</h1>
 {!review&&'hint'in current&&current.hint&&<p>{current.hint}</p>}
 {review?<><div className={styles.review}>{steps.map((s,i)=><div key={s.key}><div><span>{s.title}</span><p>{Array.isArray(values[s.key])?(values[s.key] as string[]).join(', '):String(values[s.key]||'—')}</p></div><Button variant="ghost" onClick={()=>{setStep(i);setError('');}}>Edit<span className="ui-sr-only"> {s.title}</span></Button></div>)}</div><p className={styles.privacy}>Your answers are stored by Physical I/O using Supabase and shared with our community team to manage your membership. You can ask to update or remove them at <a href="mailto:soul@physical-io.com">soul@physical-io.com</a>.</p><Switch label="I agree to Physical I/O storing these answers to manage my membership." checked={values.consent} onCheckedChange={consent=>setValues(v=>({...v,consent}))}/><Switch label="Email me about community events and news (optional)." checked={values.updates} onCheckedChange={updates=>setValues(v=>({...v,updates}))}/></>:
 current.type==='choice'||current.type==='multi'?<div className={styles.choices} role="group" aria-label={current.title}>{current.options.map(option=>{const selected=current.type==='multi'?(values[current.key] as string[]).includes(option):values[current.key]===option;return <Button key={option} variant="secondary" aria-pressed={selected} onClick={()=>{if(current.type==='multi'){const list=values[current.key] as string[];update(current.key,selected?list.filter(x=>x!==option):[...list,option]);}else update(current.key,option);}}>{option}{selected&&<Check size={18}/>}</Button>;})}</div>:
 current.type==='long'?<TextArea label={current.title} value={values[current.key] as string} maxLength={2000} rows={4} onChange={e=>update(current.key,e.target.value)}/>:
 <Field label={current.title} type={current.type} value={values[current.key] as string} autoComplete={current.key==='fullName'?'name':current.key==='email'?'email':current.key==='city'?'address-level2':'url'} maxLength={current.key==='website'||current.key==='linkedin'?500:254} onChange={e=>update(current.key,e.target.value)}/>}
 <div className={styles.trap} aria-hidden="true"><input tabIndex={-1} autoComplete="off" name="company_fax" value={values.websiteTrap} onChange={e=>setValues(v=>({...v,websiteTrap:e.target.value}))}/></div>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 <footer className={styles.actions}>{step>0&&<Button variant="ghost" disabled={busy} onClick={()=>{setStep(s=>s-1);setError('');}}><ArrowLeft size={18}/>Back</Button>}<Button variant="primary" type="submit" busy={busy}>{review?'Join the community':'Continue'}<ArrowRight size={18}/></Button></footer>
 </form>}
 </section></main></ThemeProvider>;
}
