import type {Metadata} from 'next';
import LegalPage from '@/components/LegalPage';
export const metadata:Metadata={title:'Cookies & storage | Physical I/O',description:'Information about browser preferences, authentication, analytics and third-party embeds on Physical I/O.',alternates:{canonical:'/cookies'}};
export default function Page(){return <LegalPage title="Cookies & local storage">
<h2>Preferences on your device</h2><p>The website uses local storage to remember your light/dark appearance choice and an Ohi expression preset when you choose to save one. These preferences stay in your browser until changed or cleared. They are not a public member profile.</p>
<h2>Authentication</h2><p>Protected administrative areas use authentication cookies to maintain sign-in sessions. Public membership signup does not require an administrator account or grant administrative access.</p>
<h2>Analytics and external content</h2><p>The site includes Vercel Web Analytics. Opening the Luma events calendar loads content from Luma, which receives connection information and may use its own browser storage. External sites linked from this website have their own cookie and privacy practices. Check those services before providing additional information.</p>
<h2>Managing storage and permissions</h2><p>You can clear site storage and cookies in your browser, or revoke microphone and camera permission. Clearing authentication cookies may sign you out; clearing preferences resets saved appearance or expression settings. Contact <a href="mailto:soul@physical-io.com">soul@physical-io.com</a> with questions.</p>
</LegalPage>;}
