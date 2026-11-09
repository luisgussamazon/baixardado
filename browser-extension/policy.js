export const SERVER="https://baixardado-production.up.railway.app";
export const SITE="https://icqa-tool-production.up.railway.app";
export const PATHS=["/","/schedule","/dashboard","/inventory","/inventories","/reports"];
export function navigationUrl(value){try{const u=new URL(value);return u.origin===SITE&&!u.username&&!u.password&&!u.search&&!u.hash&&PATHS.includes(u.pathname)?u.href:null;}catch{return null;}}
export function captureAllowed(value){try{const u=new URL(value);return u.origin===SITE&&!u.username&&!u.password&&!u.pathname.includes("%")&&!/^\/(api|login|logout|auth)(\/|$)/i.test(u.pathname);}catch{return false;}}
