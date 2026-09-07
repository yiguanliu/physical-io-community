import {ImageResponse} from 'next/og';
export const alt="Physical I/O — London's Physical AI community";
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'#eaeaea',color:'#171717',padding:'76px',flexDirection:'column',justifyContent:'space-between'}}><div style={{fontSize:46,fontWeight:700}}>Physical I/O</div><div style={{display:'flex',flexDirection:'column',fontSize:80,fontWeight:700,lineHeight:1.05}}><span>Love Intelligence</span><span style={{color:'#cf3d0d'}}>+ Body.</span></div><div style={{fontSize:28}}>London’s community for Physical AI, robotics & spatial intelligence.</div></div>,size);}
