"use client";
import type {DotAgent} from "@/lib/dot-policy";
import styles from "./dot-workspace.module.css";
export default function DotMascot({agent,state="idle",animate=true}:{agent:DotAgent;state?:string;animate?:boolean}){
 const color={pipo:"#2887ef",nino:"#9a72ef",bubu:"#39bcff",mimo:"#20bdaa"}[agent];
 return <svg viewBox="0 0 120 130" aria-hidden="true" className={`${styles.robot} ${animate?styles.animated:""}`} data-state={state} style={{"--agent":color} as React.CSSProperties}>
  <ellipse cx="60" cy="119" rx="29" ry="5" fill={color} opacity=".14"/>
  <g className={styles.body}>
   {agent==="nino"?<path d="M38 24 33 11 51 20M69 20 87 11 82 29" fill={color}/>:<><path d="M60 26V13" stroke={color} strokeWidth="4"/><circle cx="60" cy="11" r="5" fill={color}/></>}
   <path d={agent==="bubu"?"M60 28a39 39 0 1 0 0 78 39 39 0 0 0 0-78":"M32 38Q30 27 46 26H75Q91 27 91 43L94 83Q95 105 76 108H44Q26 105 26 87Z"} fill={agent==="bubu"?color:"#eef8ff"} stroke={color} strokeWidth="3"/>
   <rect x="34" y="43" width="53" height="35" rx="15" fill="#10243e"/>
   <g className={styles.eyes} fill={agent==="mimo"?"#8ff8dc":"#96eaff"}><ellipse cx="49" cy="59" rx="5" ry={state==="complete"?3:6}/><ellipse cx="72" cy="59" rx="5" ry={state==="complete"?3:6}/></g>
   <path d={state==="blocked"?"M55 69Q60 65 66 69":"M55 68Q60 72 66 68"} fill="none" stroke="#a7def9" strokeWidth="2" strokeLinecap="round"/>
   {agent==="bubu"?<path d="m50 91 10-8 10 8-10 8Z" fill="#e2fbff"/>:agent==="mimo"?<path d="M47 87h26v13H47zM60 87v13" fill="none" stroke={color} strokeWidth="3"/>:<text x="60" y="98" textAnchor="middle" fill={color} fontSize="17" fontWeight="bold">{agent==="nino"?"‹/›":"•"}</text>}
   <path d="M26 68 17 77M94 68l9 9" stroke={color} strokeWidth="8" strokeLinecap="round"/>
  </g>
  {["thinking","coding","testing"].includes(state)&&<g className={styles.orbit} fill={color}><circle cx="16" cy="33" r="3"/><circle cx="101" cy="29" r="4"/><circle cx="104" cy="97" r="2"/></g>}
 </svg>;
}
