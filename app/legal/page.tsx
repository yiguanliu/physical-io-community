import type {Metadata} from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
export const metadata:Metadata={title:'Legal information | Physical I/O',description:'Legal information, privacy, terms and website storage information for the Physical I/O community.',alternates:{canonical:'/legal'}};
export default function Page(){return <LegalPage title="Legal information">
<p>Physical I/O is a London-rooted community for people exploring and building Physical AI, robotics and spatial intelligence.</p>
<h2>Website operator</h2><p>Physical I/O is operated by Yiguan Liu.</p>
<h2>Contact the community team</h2><p>For questions about the website, membership, privacy or these terms, contact <a href="mailto:soul@physical-io.com">soul@physical-io.com</a>.</p>
<h2>Your information and participation</h2><ul><li><Link href="/privacy">Privacy notice</Link> — how membership details, conversations and other personal information are handled.</li><li><Link href="/terms">Terms & conditions</Link> — using the website, Ohi and community services.</li><li><Link href="/cookies">Cookies & local storage</Link> — preferences, authentication and embedded services.</li></ul>
<p>Individual events may have additional organiser, venue, ticketing and cancellation terms. Check the relevant event listing before booking.</p>
</LegalPage>;}
