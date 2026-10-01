'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ThemeProvider,defaultTheme,Card,Field,Button,Alert} from '@/workspace-ui/src';
import {createClient} from '@/utils/supabase/client';
import '@/workspace-ui/src/styles.css';
import '../ohi.css';
export default function SetPassword(){
 const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [ready,setReady]=useState(false);const [pending,setPending]=useState(false);const [message,setMessage]=useState('');const [saved,setSaved]=useState(false);
 useEffect(()=>{(async()=>{
  if(new URLSearchParams(window.location.search).has('error')){setMessage('This link is invalid or has expired. Request another email from the sign-in page.');return;}
  const client=createClient();
  // Invitation emails return the session in the URL fragment (#access_token=…). The PKCE browser
  // client ignores that, so store it explicitly, then drop the tokens from the address bar.
  const hash=new URLSearchParams(window.location.hash.slice(1));
  if(hash.get('error_description')){setMessage('This link is invalid or has expired. Ask a super admin to send a new invitation, or use “Forgot password?” on the sign-in page.');return;}
  const accessToken=hash.get('access_token'),refreshToken=hash.get('refresh_token');
  if(accessToken&&refreshToken){const {error}=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});window.history.replaceState(null,'',window.location.pathname);if(error){setMessage('This link is invalid or has expired. Ask a super admin to send a new invitation, or use “Forgot password?” on the sign-in page.');return;}}
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)setMessage('Open the link from your invitation or reset email first.');else setReady(true);
 })();},[]);
 return <div className="admin-workspace"><ThemeProvider theme={{...defaultTheme,mode:'dark'}}><main className="admin-auth"><Card><form className="admin-stack" onSubmit={async e=>{e.preventDefault();if(pending)return;if(password!==confirm){setMessage('Passwords do not match.');return;}setPending(true);setMessage('');try{const {error}=await createClient().auth.updateUser({password});if(error)throw error;setPassword('');setConfirm('');setSaved(true);}catch(e){setMessage(e instanceof Error?e.message:'Unable to save password.');}finally{setPending(false);}}}><h1>{saved?'Password saved':'Set your password'}</h1>{saved?<Alert title="You’re ready to sign in" tone="success">Sign in with your email and this password. If you requested access yourself, an administrator still needs to approve it.</Alert>:<><Field label="New password" type="password" autoComplete="new-password" required minLength={12} hint="Use at least 12 characters." value={password} onChange={e=>setPassword(e.target.value)} disabled={!ready}/><Field label="Confirm password" type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={!ready}/>{message&&<Alert title="Check your details" tone="danger">{message}</Alert>}<Button type="submit" variant="primary" disabled={!ready} busy={pending}>Save password</Button></>}<Link href="/admin/login">Back to sign in</Link></form></Card></main></ThemeProvider></div>;
}
