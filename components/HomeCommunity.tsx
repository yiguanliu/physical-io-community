"use client";
import { useCallback, useEffect, useState } from "react";
import RobotExperience from "./RobotExperience";
import Link from "next/link";
import { Menu, Moon, Sun, Play, BriefcaseBusiness, Camera } from "lucide-react";
import { ThemeProvider, defaultTheme, IconButton, Popover } from "@/workspace-ui/src";
import { COMMUNITY_FORM_URL, LUMA_URL, YOUTUBE_URL, LINKEDIN_URL, INSTAGRAM_URL, X_URL } from "@/lib/site";
import "@/workspace-ui/src/styles.css";
import styles from "./HomeCommunity.module.css";
import LogoMark from '@/workspace-ui/app/LogoMark';
const JOIN = "/join";
export default function HomeCommunity() {
 const [dark,setDark]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem('ohi-appearance');setDark(saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches);}catch{}},[]);
 function toggleTheme(){setDark(current=>{const next=!current;try{localStorage.setItem('ohi-appearance',next?'dark':'light');}catch{}return next;});}
 const [ready,setReady]=useState(false);
 const [logoShown,setLogoShown]=useState(false);
 const [loading,setLoading]=useState(true);
 const onReady=useCallback(()=>setReady(true),[]);
 const leaving=ready&&logoShown;
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setLogoShown(true);
  const fallback=setTimeout(()=>{setReady(true);setLogoShown(true);},8000);
  return()=>clearTimeout(fallback);
 },[]);
 useEffect(()=>{if(!leaving)return;const timer=setTimeout(()=>setLoading(false),450);return()=>clearTimeout(timer);},[leaving]);
 return <div className={styles.page} data-mode={dark?"dark":"light"}>{loading&&<div className={styles.loadingScreen} data-leaving={leaving} role="status" aria-label="Loading Physical I/O"><div className={styles.loadingMark} onAnimationEnd={()=>setLogoShown(true)}><LogoMark/></div></div>}<ThemeProvider theme={{...defaultTheme,mode:dark?"dark":"light"}}><a className={styles["skip"]} href="#main">Skip to content</a><header className={styles["site-header"]}><a href="#main" className={styles["brand"]} aria-label="Physical I/O home"><LogoMark /><img className={styles.wordmark} src="/assets/physical-io-wordmark.png" alt="Physical I/O" width={879} height={184}/></a><div className={styles.headerTools}><a className={`ui-button ui-button-primary ${styles.headerJoin}`} href={JOIN} aria-label="Join the community"><span className={styles.joinDesktop}>Join the community</span><span className={styles.joinMobile}>Join</span></a><IconButton label={dark?"Switch to light mode":"Switch to dark mode"} title={dark?"Switch to light mode":"Switch to dark mode"} variant="ghost" onClick={toggleTheme}>{dark?<Sun size={20}/>:<Moon size={20}/>}</IconButton><div className={styles.navigationMenu}><Popover title="Explore Physical I/O" closeLabel="Close navigation" trigger={<IconButton label="Open navigation" variant="ghost" className={styles.menuTrigger}><Menu size={22} aria-hidden /></IconButton>}><nav aria-label="Main navigation"><Link href="/about">The culture</Link><a href={LUMA_URL}>The gatherings ↗</a><Link href="/demo">Demo</Link><a href={JOIN}>Join the community ↗</a></nav><div className={styles.socialLinks} aria-label="Social links"><a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Physical I/O on X" title="X"><span aria-hidden="true">𝕏</span><span>X</span></a><a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" aria-label="Physical I/O on YouTube" title="YouTube"><Play size={18}/><span>YouTube</span></a><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="Physical I/O on LinkedIn" title="LinkedIn"><BriefcaseBusiness size={18}/><span>LinkedIn</span></a><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Physical I/O on Instagram" title="Instagram"><Camera size={18}/><span>Instagram</span></a></div></Popover></div></div></header><main id="main"><RobotExperience dark={dark} onReady={onReady} introEnabled={!loading}/></main></ThemeProvider></div>; }
