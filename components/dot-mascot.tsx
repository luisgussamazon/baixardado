"use client";
import type {DotAgent} from "@/lib/dot-policy";
import {useId} from "react";
import styles from "./dot-workspace.module.css";
export default function DotMascot({agent,state="idle",animate=true}:{agent:DotAgent;state?:string;animate?:boolean}){
 const color={pipo:"#2887ef",nino:"#9a72ef",bubu:"#39bcff",mimo:"#20bdaa"}[agent];
 const id=useId().replace(/:/g,"");
 return <svg viewBox="0 0 120 130" aria-hidden="true" className={`${styles.robot} ${animate?styles.animated:""}`} data-state={state} style={{"--agent":color} as React.CSSProperties}>
  <defs><linearGradient id={id+"shell"} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff"/><stop offset=".45" stopColor={agent==="bubu"?"#3ce1ff":"#ecf6ff"}/><stop offset="1" stopColor={agent==="bubu"?"#087aca":"#98b9d5"}/></linearGradient><linearGradient id={id+"screen"} x2=".7" y2="1"><stop stopColor="#102b40"/><stop offset="1" stopColor="#020b17"/></linearGradient><radialGradient id={id+"halo"}><stop stopColor={color} stopOpacity=".4"/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient></defs>
  <ellipse cx="60" cy="75" rx="58" ry="55" fill={`url(#${id}halo)`}/>
  <ellipse cx="60" cy="119" rx="29" ry="5" fill={color} opacity=".14"/>
  <g className={styles.body}>
   {agent==="nino"?<path d="M38 24 33 11 51 20M69 20 87 11 82 29" fill={color}/>:<><path d="M60 26V13" stroke={color} strokeWidth="4"/><circle cx="60" cy="11" r="5" fill={color}/></>}
   <ellipse cx="61" cy="100" rx="19" ry="17" fill={`url(#${id}shell)`} stroke={color} strokeWidth="1.5"/>
   <path d={agent==="bubu"?"M60 25a36 36 0 1 0 0 72 36 36 0 0 0 0-72":"M28 45Q28 25 48 25H73Q94 25 94 46L92 72Q91 88 76 89H44Q28 88 27 73Z"} fill={`url(#${id}shell)`} stroke="#bcf5ff" strokeWidth="1.5"/>
   <path d="M36 42Q39 36 51 35H75Q85 36 86 45" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2"/>
   <rect x="33" y="43" width="55" height="35" rx="16" fill={`url(#${id}screen)`} stroke={color} strokeWidth="1.4"/>
   <g className="agent-eyes"><g className={styles.eyes} fill="none" stroke={agent==="mimo"?"#48ffdc":"#30e9ff"} strokeWidth="3.7" strokeLinecap="round"><path d={state==="blocked"?"M43 59h11M67 59h11":"M43 60q5-11 10 0M67 60q5-11 10 0"}/></g></g>
   <path d={state==="blocked"?"M55 69Q60 65 66 69":"M55 68Q60 72 66 68"} fill="none" stroke="#a7def9" strokeWidth="2" strokeLinecap="round"/>
   {agent==="bubu"?<path d="m53 101 5 4 9-11" fill="none" stroke="#fff" strokeWidth="4"/>:agent==="mimo"?<path d="m48 96 12-6 12 6-12 6Zm0 6 12 6 12-6" fill="none" stroke={color} strokeWidth="2.5"/>:<text x="60" y="107" textAnchor="middle" fill={color} fontSize="15" fontWeight="bold">{agent==="nino"?"‹/›":"A"}</text>}
   <path d="M39 98 26 92M82 98l15-7" stroke={`url(#${id}shell)`} strokeWidth="10" strokeLinecap="round"/>
   <circle cx="22" cy="90" r="6" fill={color}/><circle cx="100" cy="89" r="6" fill={color}/>
   {agent==="nino"&&<path d="m36 91 43 3-2 19-43-3Z" fill="#352455" stroke="#b18aff" strokeWidth="1.5"/>}
   {agent==="nino"&&<text x="57" y="107" textAnchor="middle" fill="#e3cfff" fontSize="14">‹/›</text>}
  </g>
  {["thinking","coding","testing"].includes(state)&&<g className={styles.orbit} fill={color}><circle cx="16" cy="33" r="3"/><circle cx="101" cy="29" r="4"/><circle cx="104" cy="97" r="2"/></g>}
 </svg>;
}
