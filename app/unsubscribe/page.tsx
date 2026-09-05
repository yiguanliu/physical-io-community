'use client';
import { useEffect,useState } from 'react';
import { ThemeProvider,Card,Button,Alert,defaultTheme } from '@/workspace-ui/src';
import '@/workspace-ui/src/styles.css';
export default function Unsubscribe(){
 const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 useEffect(()=>{setToken(new URLSearchParams(location.search).get('token')??'');},[]);
 return <ThemeProvider theme={defaultTheme}><main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'var(--ui-space-section)'}}><Card style={{maxWidth:480,display:'grid',gap:'var(--ui-space-section)'}}><h1>Email preferences</h1><p>Stop community email from Physical I/O.</p>{message&&<Alert title={done?'Unsubscribed':'Unable to update preferences'}>{message}</Alert>}{!done&&<Button variant="primary" busy={busy} disabled={!token} onClick={async()=>{setBusy(true);try{const r=await fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`,{method:'POST'});if(!r.ok)throw new Error('Please check your link and try again.');setDone(true);setMessage('You will no longer receive community emails.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>Confirm unsubscribe</Button>}</Card></main></ThemeProvider>;
}
