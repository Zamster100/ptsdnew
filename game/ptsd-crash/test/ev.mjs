import crypto from "node:crypto";
import { buildPath, multAt, paidMult, timeForMult, crashFromR, MAX_MULT, EDGE } from "../public/path.js";
function crash(){return crashFromR(crypto.randomInt(0,2**47)/2**47);}
const targets=[1.2,1.5,2,3,5,10,25,40,60,99];
const N=Number(process.argv[2]||20000);
const sum=Object.fromEntries(targets.map(t=>[t,0])); let maxSeen=0, botSoldBeforeCrash=0, maxRounds=0;
for(let i=0;i<N;i++){
  const C=crash(); const p=buildPath(crypto.randomBytes(16).toString("hex")); const T=timeForMult(C);
  if(C>=MAX_MULT) maxRounds++;
  const exit=p.bot.find(b=>b.exit); if(exit.t<T) botSoldBeforeCrash++;
  const hit={};
  for(let t=0;t<T;t+=0.03){const m=Math.min(paidMult(p,t),C); if(m>maxSeen)maxSeen=m; for(const x of targets) if(!(x in hit)&&m>=x) hit[x]=m;}
  if(C>=MAX_MULT) for(const x of targets) if(!(x in hit)) hit[x]=MAX_MULT;
  for(const x of targets) sum[x]+= (hit[x]||0);
}
for(const x of targets) console.log(`sell at ${x}x -> return ${(sum[x]/N*100).toFixed(1)}%`);
console.log("max seen",maxSeen,"bot exits before crash",(botSoldBeforeCrash/N*100).toFixed(1)+"%","max rounds",(maxRounds/N*100).toFixed(2)+"%");
