"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MemberLoginModal } from '@/components/members/MemberLoginLink';
import RobotExperience from "./RobotExperience";
import PublicHeader from "./public/PublicHeader";
import { usePublicMotion } from "./public/usePublicMotion";
import { ThemeProvider, defaultTheme } from "@/workspace-ui/src";
import "@/workspace-ui/src/styles.css";
import styles from "./HomeCommunity.module.css";
import LogoMark from '@/workspace-ui/app/LogoMark';
export default function HomeCommunity() {
 const [dark,setDark]=useState(true);
 useEffect(()=>{try{const saved=localStorage.getItem('ohi-appearance');setDark(saved !== 'light');}catch{}},[]);
 function toggleTheme(){setDark(current=>{const next=!current;try{localStorage.setItem('ohi-appearance',next?'dark':'light');}catch{}return next;});}
 const [ready,setReady]=useState(false);
 const [logoShown,setLogoShown]=useState(false);
 const [loading,setLoading]=useState(true);
 const motionRoot=useRef<HTMLElement>(null);
 usePublicMotion(motionRoot,!loading,true);
 const onReady=useCallback(()=>setReady(true),[]);
 const leaving=ready&&logoShown;
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setLogoShown(true);
  const fallback=setTimeout(()=>{setReady(true);setLogoShown(true);},8000);
  return()=>clearTimeout(fallback);
 },[]);
 useEffect(()=>{if(!leaving)return;const timer=setTimeout(()=>setLoading(false),450);return()=>clearTimeout(timer);},[leaving]);
 return <div className={styles.page} data-mode={dark?"dark":"light"}>{loading&&<div className={styles.loadingScreen} data-leaving={leaving} role="status" aria-label="Loading Physical I/O"><div className={styles.loadingMark} onAnimationEnd={()=>setLogoShown(true)}><LogoMark/></div></div>}<ThemeProvider theme={{...defaultTheme,mode:dark?"dark":"light"}}><a className={styles["skip"]} href="#main">Skip to content</a><MemberLoginModal/><div className={styles.desktopHeader}><PublicHeader dark={dark} onToggleTheme={toggleTheme}/></div><main id="main" ref={motionRoot} tabIndex={-1}><RobotExperience dark={dark} onReady={onReady} introEnabled={!loading}/><Link href="/events" className={`ui-button ui-button-primary ${styles.learnMore}`}>Learn more<ArrowRight size={16} aria-hidden/></Link></main></ThemeProvider></div>; }
