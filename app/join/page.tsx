import type {Metadata} from 'next';
import JoinFlow from './JoinFlow';
export const metadata:Metadata={title:'Join the community | Physical I/O',alternates:{canonical:'/join'},description:'Find your people in Physical AI. Join the Physical I/O community.'};
export default function JoinPage(){return <JoinFlow/>;}
