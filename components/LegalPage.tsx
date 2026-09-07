import Link from 'next/link';
import LogoMark from '@/workspace-ui/app/LogoMark';
import {ThemeProvider,defaultTheme} from '@/workspace-ui/src';
import '@/workspace-ui/src/styles.css';
import styles from './LegalPage.module.css';
export default function LegalPage({title,children}:{title:string;children:React.ReactNode}){
 return <ThemeProvider theme={defaultTheme}><main className={styles.page}><header><Link href="/" aria-label="Physical I/O home"><LogoMark/><span>Physical I/O</span></Link></header><article><p className={styles.eyebrow}>Physical I/O · Updated 7 September 2026</p><h1>{title}</h1>{children}<nav aria-label="Legal information"><Link href="/legal">Legal information</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms & conditions</Link><Link href="/cookies">Cookies & storage</Link></nav></article></main></ThemeProvider>;
}
