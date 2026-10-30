'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(ROOT,'herramientas-autoguardado/publicar-autoguardado.cjs'),'utf8');
const fixture=process.argv[2],original=path.join(fixture,'original'),candidate=path.join(fixture,'candidate');
const PROJECT='1Le02XMtS4UigkTG6HW1jHDHccba9DNiclVYYBH0rLwq9nNyFjWZh5vqC';
const DEP='AKfycbwQ9x6TxoBpIgh1u15-5anOOsLEGmP2mypSJp3SU8qNYkFaG5KsOE639YhoZzcRNWz_XA';
(async()=>{
for(const scenario of ['correcto','comprobar','cuenta_incorrecta','head_no_publicado','version_cambiada','proyecto_incorrecto','version_inmutable_distinta','recurso_corrupto','reanudar_head_candidato']){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pps-prod-check-'));const head=path.join(root,'mock-head');fs.cpSync(scenario==='reanudar_head_candidato'?candidate:original,head,{recursive:true});
 if(scenario==='head_no_publicado')fs.appendFileSync(path.join(head,'Code.js'),'\n// Trabajo posterior no publicado\n');
 let published=scenario==='version_cambiada'?37:30,newVersion=0,exitCode=0,calls=[],errors=[];
 const cp={spawnSync(command,args,opts){
  assert.equal(command,process.execPath);assert.equal(opts.shell,false);assert.equal(args[args.indexOf('--project')+1],path.resolve(opts.cwd));calls.push(args);
  const result=value=>({status:0,stdout:JSON.stringify(value),stderr:''});
  if(args.includes('show-authorized-user'))return result({loggedIn:true,email:scenario==='cuenta_incorrecta'?'otra@example.invalid':'cordiempresactpl@gmail.com'});
  if(args.includes('list-deployments')){assert(args.includes(PROJECT));return result([{deploymentId:DEP,versionNumber:published},{deploymentId:'HEAD',description:'head'}]);}
  if(args.includes('clone-script')){
   assert(args.includes(PROJECT));const i=args.indexOf('clone-script'),v=args[i+2];
   fs.cpSync(v==='30'?original:v?candidate:head,opts.cwd,{recursive:true});
   if(scenario==='proyecto_incorrecto')fs.writeFileSync(path.join(opts.cwd,'.clasp.json'),JSON.stringify({scriptId:'OTRO_PROYECTO'}));
   if(scenario==='version_inmutable_distinta'&&v&&v!=='30')fs.appendFileSync(path.join(opts.cwd,'Code.js'),'\n// Versión inesperada\n');
   return {status:0,stdout:'Clone simulado\n',stderr:''};
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(opts.cwd,'.clasp.json'))).scriptId,PROJECT);
  if(args.includes('push')){
   fs.cpSync(opts.cwd,head,{recursive:true});
   const names=fs.readdirSync(opts.cwd).filter(n=>n!=='.clasp.json');assert.equal(names.length,19);
   for(const n of names)if(n!=='Index.html')assert(fs.readFileSync(path.join(head,n)).equals(fs.readFileSync(path.join(original,n))));
   for(const n of ['Index.html'])assert(fs.readFileSync(path.join(head,n)).equals(fs.readFileSync(path.join(candidate,n))),'Paridad de candidata: '+n);
   return {status:0,stdout:'Push simulado\n',stderr:''};
  }
  if(args.includes('create-version')){newVersion=100;return result({versionNumber:newVersion});}
  if(args.includes('create-deployment')){assert.equal(args[args.indexOf('--deploymentId')+1],DEP);published=Number(args[args.indexOf('--versionNumber')+1]);return result({deploymentId:DEP,versionNumber:published});}
  throw new Error('Comando inesperado');
 }};
 const processMock={platform:process.platform,execPath:process.execPath,argv:['node','publicacion.cjs',...(scenario==='comprobar'?['--comprobar']:['--publicar'])],stdout:{write(){}},get exitCode(){return exitCode;},set exitCode(v){exitCode=v;}};
 const sandbox={Buffer,__dirname:root,require:n=>n==='node:child_process'?cp:require(n),fetch:async url=>{
  const data=fs.readFileSync(path.join(ROOT,'herramientas-autoguardado',url.split('/').pop()));const bytes=scenario==='recurso_corrupto'?Buffer.from('CORRUPTO'):data;
  return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 },AbortSignal,console:{log(){},error(m){errors.push(m);}},process:processMock};
 await vm.runInNewContext(script,sandbox);
 const mutating=()=>calls.filter(a=>a.includes('push')||a.includes('create-version')||a.includes('create-deployment'));
 if(scenario==='correcto'||scenario==='reanudar_head_candidato'){
  assert.equal(exitCode,0,errors.join('\n'));assert.equal(published,100);
  assert.equal(calls.filter(a=>a.includes('push')).length,scenario==='correcto'?1:0);
  const record=JSON.parse(fs.readFileSync(path.join(root,'RESULTADO-AUTOGUARDADO.json')));assert.equal(record.phase,'PUBLICACION_VERIFICADA');assert.equal(record.previousVersion,30);assert.equal(record.newVersion,100);
  if(scenario==='correcto'){
   const before=mutating().length;processMock.argv=['node','publicacion.cjs','--verificar'];await sandbox.main();assert.equal(mutating().length,before);assert.equal(published,100);
   processMock.argv=['node','publicacion.cjs','--revertir'];await sandbox.main();assert.equal(published,30);assert.equal(calls.filter(a=>a.includes('push')).length,1);
   console.log('PASS: consulta de verificación sin escrituras y reversión de versión sin tocar HEAD ni datos');
  }
 }else if(scenario==='comprobar'){
  assert.equal(exitCode,0,errors.join('\n'));assert.equal(mutating().length,0);assert.equal(published,30);
 }else{
  assert.equal(exitCode,1);assert.equal(published,scenario==='version_cambiada'?37:30);
  if(scenario!=='version_inmutable_distinta')assert.equal(mutating().length,0);
  assert(!calls.some(a=>a.includes('create-deployment')));
 }
 assert(!calls.some(a=>a.includes('run')||a.includes('run-function')));
 console.log('PASS:',scenario,'— API/clasp simulados, sin operaciones en Google');
}
})().catch(error=>{console.error(error);process.exitCode=1;});
