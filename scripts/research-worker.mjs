// Bootstrap fixo: importa somente o estudo TypeScript versionado, nunca código do usuário.
import { parentPort, workerData } from 'node:worker_threads';
import { tsImport } from 'tsx/esm/api';
import { performance } from 'node:perf_hooks';
try {
  const { runStudy } = await tsImport('../lib/research/study.ts', import.meta.url);
  const start=performance.now(),cpu=process.cpuUsage();
  const report=runStudy(workerData.dataset,workerData.policy);
  const used=process.cpuUsage(cpu);
  parentPort.postMessage({ok:true,report,resources:{elapsedMs:Number((performance.now()-start).toFixed(3)),cpuMs:Number(((used.user+used.system)/1000).toFixed(3)),heapUsedBytes:process.memoryUsage().heapUsed,node:process.versions.node,platform:process.platform,arch:process.arch}});
}catch{parentPort.postMessage({ok:false,error:'Estudo recusado: entrada inválida ou limite excedido.'});}
