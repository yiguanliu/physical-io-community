'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,Check,Moon,Sun} from 'lucide-react';
import {Button,IconButton,Field,TextArea,Switch,ThemeProvider,defaultTheme} from '@/workspace-ui/src';
import LogoMark from '@/workspace-ui/app/LogoMark';
import {joinSchema,roles,experiences,goals,formats,profileChoices} from '@/lib/join/schema';
import {cities} from '@/lib/join/cities';
import HeadshotPicker,{uploadMemberPhoto} from '@/components/members/HeadshotPicker';
import {PENDING_PHOTO_KEY} from '@/components/members/PendingPhotoUpload';
import '@/workspace-ui/src/styles.css';
import styles from './join.module.css';
import homeStyles from '@/components/HomeCommunity.module.css';
const steps=[
 {key:'firstName',title:'First, what’s your name?',type:'name',hint:''},
 {key:'email',title:'What’s your email address?',type:'email',hint:'So the community team can reach you.'},
 {key:'city',title:'Which city are you based in?',type:'text',hint:''},
 {key:'role',title:'What best describes you?',type:'choice',options:roles},
 {key:'experience',title:'How long have you worked in the industry?',type:'choice',options:experiences},
 {key:'work',title:'What are you working on?',type:'long',hint:'Tell us about your work or interests in Physical AI and Spatial Intelligence.'},
 {key:'website',title:'Where can we see your work?',type:'text',hint:'Your company, portfolio or GitHub link. Optional.'},
 {key:'linkedin',title:'What’s your LinkedIn link?',type:'text',hint:'Your personal LinkedIn profile.'},
 {key:'jobTitle',title:'What’s your job title and company?',type:'job',hint:'Optional. Shown on your profile page if you create one.'},
 {key:'photo',title:'Add a profile photo',type:'photo',hint:''},
 {key:'goals',title:'What would you like from this community?',type:'multi',options:goals,hint:'Choose all that feel right.'},
 {key:'formats',title:'What would you actually show up for?',type:'multi',options:formats,hint:'Choose as many as you like.'},
 {key:'suggestions',title:'What would you love to see us do?',type:'long',hint:'Optional.'},
 {key:'publicProfile',title:'Create a public profile page?',type:'profile',options:profileChoices,hint:'Anyone with the link can see your name, job title, company, what you’re working on and the episodes you attend. Your email is never shown. You can hide it anytime from your member page.'},
] as const;
type Key=typeof steps[number]['key'];
const initial={firstName:'',lastName:'',email:'',city:'',role:'',experience:'',work:'',website:'',linkedin:'',jobTitle:'',company:'',publicProfile:false,rsvpEvent:'',goals:[] as string[],formats:[] as string[],suggestions:'',consent:false,updates:false,websiteTrap:''};
export type JoinPrefill=Partial<Pick<typeof initial,'firstName'|'lastName'|'email'|'role'|'linkedin'|'jobTitle'|'company'|'rsvpEvent'>>&{eventName?:string;adminOnboarding?:boolean};
export default function JoinFlow({profileRequired=false,prefill}:{profileRequired?:boolean;prefill?:JoinPrefill}){
 const admin=Boolean(prefill?.adminOnboarding);
 const router=useRouter();
 const [values,setValues]=useState(()=>{const {eventName:_,adminOnboarding:__,...fields}=prefill??{};return {...initial,...fields};});const [photo,setPhoto]=useState<{blob:Blob;preview:string}|null>(null);const [profileChoice,setProfileChoice]=useState('');const [step,setStep]=useState(0);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [dark,setDark]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{try{const saved=localStorage.getItem('ohi-appearance');setDark(saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches);}catch{}},[]);
 function toggleTheme(){setDark(value=>{const next=!value;try{localStorage.setItem('ohi-appearance',next?'dark':'light');}catch{}return next;});}
 useEffect(()=>{heading.current?.focus();},[step,done]);
 function update(key:Exclude<Key,'publicProfile'|'photo'>|'lastName'|'company',value:string|string[]){setValues(v=>({...v,[key]:value}));setError('');}
 function next(){
  const current=steps[step];
  if(current.type==='photo'){if(admin&&!photo){setError('Add a headshot to continue. Community admins need a profile photo.');return;}setError('');setStep(s=>s+1);return;}
  if(current.type==='profile'){if(!profileChoice){setError('Choose one to continue.');return;}setError('');setStep(s=>s+1);return;}
  if(current.type==='job'){const company=joinSchema.shape.company.safeParse(values.company);if(!company.success){setError(company.error.issues[0].message);return;}}
  const result=joinSchema.shape[current.key].safeParse(values[current.key]);
  if(current.type==='name'){const last=joinSchema.shape.lastName.safeParse(values.lastName);if(!last.success){setError('Please enter your last name.');return;}}
  if(!result.success){setError(result.error.issues[0].message);return;}setError('');setStep(s=>s+1);
 }
 async function submit(){
  const parsed=joinSchema.safeParse(values);if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  setBusy(true);setError('');
  try{const response=await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)});const data=await response.json();if(!response.ok)throw new Error(data.error);
   const verified=typeof data.redirectTo==='string'&&data.redirectTo.startsWith('/members');
   // Already verified (e.g. admins): upload now. Otherwise the photo waits in this browser until the email code is confirmed.
   if(photo&&verified){try{await uploadMemberPhoto(photo.blob);}catch{try{sessionStorage.setItem(PENDING_PHOTO_KEY,photo.preview);}catch{}}}
   try{sessionStorage.setItem('member-join-email',parsed.data.email);if(data.next)sessionStorage.setItem('member-join-next',data.next);else sessionStorage.removeItem('member-join-next');if(photo&&!verified)sessionStorage.setItem(PENDING_PHOTO_KEY,photo.preview);}catch{}
   setDone(true);router.replace(verified?(admin&&data.redirectTo==='/members'?'/admin':data.redirectTo):'/login?status=joined');}
  catch(e){setError(e instanceof Error?e.message:'Could not submit. Please try again.');}finally{setBusy(false);}
 }
 const current=steps[step];const review=step===steps.length;
 return <ThemeProvider theme={{...defaultTheme,mode:dark?'dark':'light'}}><main className={styles.page} data-mode={dark?'dark':'light'}>
 <header className={`${homeStyles['site-header']} ${styles.header}`}><Link className={homeStyles.brand} href="/" aria-label="Physical I/O home"><LogoMark/><img className={styles.wordmark} src="/assets/physical-io-wordmark.png" alt="Physical I/O" width={879} height={184}/></Link><IconButton label={dark?'Switch to light mode':'Switch to dark mode'} variant="ghost" onClick={toggleTheme}>{dark?<Sun size={20}/>:<Moon size={20}/>}</IconButton></header>
 {!done&&<div className={styles.progress} role="progressbar" aria-label="Signup progress" aria-valuemin={0} aria-valuemax={steps.length+1} aria-valuenow={step+1}><span style={{width:`${(step+1)/(steps.length+1)*100}%`}}/></div>}
 <section className={styles.content} key={done?'done':step}>
 {done?<><div className={styles.check}><Check size={28}/></div><h1 ref={heading} tabIndex={-1}>Check your email.</h1><p>We’ve sent your one-time code. Continue to member sign-in to confirm your email.</p><Link className="ui-button ui-button-primary" href="/login?status=joined">Member sign in <ArrowRight size={18}/></Link></>:
 <form onSubmit={e=>{e.preventDefault();if(review)void submit();else next();}}>
 {profileRequired&&step===0&&<p role="status">Complete your member profile to access events and recordings.</p>}
 {admin&&step===0&&<p role="status">Complete your member profile to finish your admin onboarding. You’ll also add a headshot.</p>}
 {prefill?.eventName&&step===0&&<p role="status">We’ve filled in what you told us for {prefill.eventName}. Check each answer and add the rest.</p>}
 <div className={styles.counter}>{step+1} / {steps.length+1}</div>
 <h1 ref={heading} tabIndex={-1}>{review?'Make yourself at home.':current.title}</h1>
 {!review&&'hint'in current&&current.hint&&<p>{current.hint}</p>}
 {!review&&current.type==='photo'&&<p>{admin?'Required for community admins. It appears on your profile and in the admin workspace.':'Optional. It appears on your profile page. You can add or change it later.'}</p>}
 {review?<><div className={styles.review}>{steps.map((s,i)=><div key={s.key}><div><span>{s.title}</span><p>{s.type==='photo'?(photo?'Headshot added':'No photo yet'):s.type==='name'?`${values.firstName} ${values.lastName}`:s.type==='job'?([values.jobTitle,values.company].filter(Boolean).join(', ')||'—'):s.type==='profile'?(profileChoice||'—'):Array.isArray(values[s.key])?(values[s.key] as string[]).join(', '):String(values[s.key]||'—')}</p></div><Button variant="ghost" onClick={()=>{setStep(i);setError('');}}>Edit<span className="ui-sr-only"> {s.title}</span></Button></div>)}</div><p className={styles.privacy}>Read our <Link href="/privacy">privacy notice</Link> and <Link href="/terms">terms & conditions</Link>. Your answers are stored by Physical I/O using Supabase and shared with our community team to manage your membership. You can ask to update or remove them at <a href="mailto:soul@physical-io.com">soul@physical-io.com</a>.</p><Switch label="I agree to Physical I/O storing these answers to manage my membership." checked={values.consent} onCheckedChange={consent=>setValues(v=>({...v,consent}))}/><Switch label="Email me about community events and news (optional)." checked={values.updates} onCheckedChange={updates=>setValues(v=>({...v,updates}))}/></>:
 current.type==='name'?<div className={styles.nameFields}><Field label="First name" autoComplete="given-name" required maxLength={160} value={values.firstName} onChange={e=>update('firstName',e.target.value)}/><Field label="Last name" autoComplete="family-name" required maxLength={160} value={values.lastName} onChange={e=>update('lastName',e.target.value)}/></div>:
 current.type==='photo'?<HeadshotPicker admin={admin} name={`${values.firstName} ${values.lastName}`} preview={photo?.preview??null} onChange={(blob,preview)=>{setPhoto({blob,preview});setError('');}} onRemove={()=>setPhoto(null)}/>:
 current.type==='job'?<div className={styles.nameFields}><Field label="Job title" autoComplete="organization-title" maxLength={160} value={values.jobTitle} onChange={e=>update('jobTitle',e.target.value)}/><Field label="Company" autoComplete="organization" maxLength={160} value={values.company} onChange={e=>update('company',e.target.value)}/></div>:
 current.type==='profile'?<div className={styles.choices} role="group" aria-label={current.title}>{current.options.map(option=>{const selected=profileChoice===option;return <Button key={option} variant="secondary" aria-pressed={selected} onClick={()=>{setProfileChoice(option);setValues(v=>({...v,publicProfile:option===profileChoices[0]}));setError('');}}>{option}{selected&&<Check size={18}/>}</Button>;})}</div>:
 current.type==='choice'||current.type==='multi'?<div className={styles.choices} role="group" aria-label={current.title}>{current.options.map(option=>{const selected=current.type==='multi'?(values[current.key] as string[]).includes(option):values[current.key]===option;return <Button key={option} variant="secondary" aria-pressed={selected} onClick={()=>{if(current.type==='multi'){const list=values[current.key] as string[];update(current.key,selected?list.filter(x=>x!==option):[...list,option]);}else update(current.key,option);}}>{option}{selected&&<Check size={18}/>}</Button>;})}</div>:
 current.type==='long'?<TextArea label={current.title} value={values[current.key] as string} maxLength={2000} rows={4} onChange={e=>update(current.key,e.target.value)}/>:
 <><Field list={current.key==='city'?'join-cities':undefined} required={current.key==='linkedin'||current.key==='city'} label={current.title} type={current.type} value={values[current.key] as string} autoComplete={current.key==='email'?'email':current.key==='city'?'address-level2':'url'} readOnly={admin&&current.key==='email'} hint={admin&&current.key==='email'?'Your admin account email. Your member profile is linked to it.':undefined} maxLength={current.key==='website'||current.key==='linkedin'?500:254} onChange={e=>update(current.key,e.target.value)}/>{current.key==='city'&&<datalist id="join-cities">{cities.map(city=><option key={city} value={city}/>)}</datalist>}</>}
 <div className={styles.trap} aria-hidden="true"><input tabIndex={-1} autoComplete="off" name="company_fax" value={values.websiteTrap} onChange={e=>setValues(v=>({...v,websiteTrap:e.target.value}))}/></div>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 <footer className={styles.actions}>{step>0&&<Button variant="ghost" disabled={busy} onClick={()=>{setStep(s=>s-1);setError('');}}><ArrowLeft size={18}/>Back</Button>}<Button variant="primary" type="submit" busy={busy}>{review?(admin?'Complete onboarding':'Join the community'):current.type==='photo'&&!photo&&!admin?'Skip for now':'Continue'}<ArrowRight size={18}/></Button></footer>
 </form>}
 </section></main></ThemeProvider>;
}
