'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ThemeProvider,defaultTheme,Card,Field,Button,Alert} from '@/workspace-ui/src';
import {createClient} from '@/utils/supabase/client';
import '@/workspace-ui/src/styles.css';
import '../ohi.css';
export default function SetPassword(){
 const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [ready,setReady]=useState(false);const [pending,setPending]=useState(false);const [message,setMessage]=useState('');const [saved,setSaved]=useState(false);
 useEffect(()=>{if(new URLSearchParams(window.location.search).has('error')){setMessage('This link is invalid or has expired. Request another email from the sign-in page.');return;}createClient().auth.getUser().then(({data,error})=>{if(error||!data.user)setMessage('Open the confirmation link from your email first.');else setReady(true);});},[]);
 return <div className="admin-workspace"><ThemeProvider theme={{...defaultTheme,mode:'dark'}}><main className="admin-auth"><Card><form className="admin-stack" onSubmit={async e=>{e.preventDefault();if(pending)return;if(password!==confirm){setMessage('Passwords do not match.');return;}setPending(true);setMessage('');try{const {error}=await createClient().auth.updateUser({password});if(error)throw error;setPassword('');setConfirm('');setSaved(true);}catch(e){setMessage(e instanceof Error?e.message:'Unable to save password.');}finally{setPending(false);}}}><h1>{saved?'Password saved':'Set your password'}</h1>{saved?<Alert title="You’re ready to sign in" tone="success">Admin access requires approval from your workspace administrator.</Alert>:<><Field label="New password" type="password" autoComplete="new-password" required minLength={12} hint="Use at least 12 characters." value={password} onChange={e=>setPassword(e.target.value)} disabled={!ready}/><Field label="Confirm password" type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={!ready}/>{message&&<Alert title="Check your details" tone="danger">{message}</Alert>}<Button type="submit" variant="primary" disabled={!ready} busy={pending}>Save password</Button></>}<Link href="/admin/login">Back to sign in</Link></form></Card></main></ThemeProvider></div>;
}
