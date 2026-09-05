'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { Button, IconButton, Field, Alert, Dialog } from '@/workspace-ui/src';
import LogoMark from '@/workspace-ui/app/LogoMark';
import { createClient } from '@/utils/supabase/client';

export function AdminSignIn({onSignedIn,error,dark,onToggleAppearance}:{onSignedIn:()=>Promise<void>;error:string;dark:boolean;onToggleAppearance:()=>void}) {
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [visible,setVisible]=useState(false);
 const [pending,setPending]=useState(false);
 const [message,setMessage]=useState('');
 const [remember,setRemember]=useState(false);
 const [dialog,setDialog]=useState<'create'|'forgot'|null>(null);
 const [confirmationEmail,setConfirmationEmail]=useState('');
 const [emailPending,setEmailPending]=useState(false);
 const [emailError,setEmailError]=useState('');
 const [emailSent,setEmailSent]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem('ohi-remembered-email');if(saved){setEmail(saved);setRemember(true);}}catch{}},[]);
 function openEmailDialog(kind:'create'|'forgot'){setConfirmationEmail(email);setEmailError('');setEmailSent(false);setDialog(kind);}

 return <main className="admin-login">
  <div className="admin-login-frame">
   <section className="admin-login-brand" aria-label="Physical I/O">
    <div className="admin-login-art" aria-hidden="true"><LogoMark/></div>
   </section>
   <section className="admin-login-panel" aria-labelledby="login-title">
    <div className="admin-login-top"><Button variant="ghost" onClick={()=>openEmailDialog('create')}>Create account</Button><IconButton variant="ghost" label={dark?'Use light appearance':'Use dark appearance'} onClick={onToggleAppearance}>{dark?<Sun size={18}/>:<Moon size={18}/>}</IconButton></div>
    <form className="admin-login-form" onSubmit={async e=>{
     e.preventDefault();if(pending)return;setPending(true);setMessage('');
     try {
      const {data,error}=await createClient().auth.signInWithPassword({email,password});
      if(error)throw error;
      if(data.user?.app_metadata?.admin_role!=='admin'){
       await createClient().auth.signOut();
       throw new Error('This account does not have admin access. Contact your workspace administrator.');
      }
      try{if(remember)localStorage.setItem('ohi-remembered-email',email.trim());else localStorage.removeItem('ohi-remembered-email');}catch{}
      setPassword('');await onSignedIn();
     }catch(e){setMessage(e instanceof Error?e.message:'Sign-in failed. Please retry.');}
     finally{setPending(false);}
    }}>
     <header className="admin-login-heading"><div className="admin-login-identity"><LogoMark/><span>Physical I/O</span></div><h1 id="login-title">Admin Sign In</h1></header>
     <div className="admin-login-fields">
      <Field label="Email address" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/>
      <div className="admin-login-password"><Field label="Password" type={visible?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/><IconButton label={visible?'Hide password':'Show password'} aria-pressed={visible} variant="ghost" onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</IconButton></div>
     </div>
     <div className="admin-login-options"><label className="admin-remember"><input type="checkbox" checked={remember} onChange={e=>{setRemember(e.target.checked);if(!e.target.checked){try{localStorage.removeItem('ohi-remembered-email');}catch{}}}} aria-describedby="remember-help"/>Remember me</label><Button variant="ghost" onClick={()=>openEmailDialog('forgot')}>Forgot password?</Button></div>
     <span id="remember-help" className="ui-sr-only">Remember your email address on this device. Your password is never saved by this option.</span>
     {(message||error)&&<Alert title="Unable to sign in" tone="danger">{message||error}</Alert>}
     <div className="admin-login-submit"><Button type="submit" variant="primary" busy={pending}>Sign in <ArrowUpRight size={17}/></Button></div>
     {error&&<Button onClick={onSignedIn} variant="ghost">Retry connection</Button>}
    </form>
   </section>
  </div>
 <Dialog open={dialog!==null} onOpenChange={open=>{if(!open&&!emailPending)setDialog(null);}} title={emailSent?'Check your email':dialog==='create'?'Create account':'Reset your password'} description={dialog==='create'?'Confirm your email to set up an account. Admin access still requires administrator approval.':'We’ll email a secure link so you can choose a new password.'}>
  {emailSent?<div className="admin-stack"><Alert title="Email requested" tone="success">If this address is eligible, a confirmation link will arrive shortly. Check your spam folder too.</Alert><Button onClick={()=>setDialog(null)}>Done</Button></div>:<form className="admin-stack" onSubmit={async e=>{e.preventDefault();if(emailPending)return;setEmailPending(true);setEmailError('');try{const redirectTo=`${window.location.origin}/admin/auth/confirm?flow=${dialog}`;const client=createClient();const result=dialog==='create'?await client.auth.signInWithOtp({email:confirmationEmail.trim(),options:{shouldCreateUser:true,emailRedirectTo:redirectTo}}):await client.auth.resetPasswordForEmail(confirmationEmail.trim(),{redirectTo});if(result.error)throw result.error;setEmailSent(true);}catch(e){setEmailError(e instanceof Error?e.message:'Unable to request an email. Please retry.');}finally{setEmailPending(false);}}}>
   <Field label="Email address" type="email" autoComplete="email" required value={confirmationEmail} onChange={e=>setConfirmationEmail(e.target.value)}/>
   {emailError&&<Alert title="Email request failed" tone="danger">{emailError}</Alert>}
   <div className="admin-actions"><Button variant="ghost" disabled={emailPending} onClick={()=>setDialog(null)}>Cancel</Button><Button type="submit" variant="primary" busy={emailPending}>Send confirmation email</Button></div>
  </form>}
 </Dialog>
 </main>;
}
