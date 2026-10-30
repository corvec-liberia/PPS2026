'use strict';
/* Publicación expresamente autorizada. No ejecuta funciones ni escribe filas de Sheets. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
const ROOT=__dirname;
const PROJECT='1Le02XMtS4UigkTG6HW1jHDHccba9DNiclVYYBH0rLwq9nNyFjWZh5vqC';
const DEPLOYMENT='AKfycbwQ9x6TxoBpIgh1u15-5anOOsLEGmP2mypSJp3SU8qNYkFaG5KsOE639YhoZzcRNWz_XA';
const PREVIOUS_VERSION=32,ACCOUNT='cordiempresactpl@gmail.com';
const PUBLIC_URL='https://script.google.com/macros/s/'+DEPLOYMENT+'/exec';
const RESULT=path.join(ROOT,'RESULTADO-INTERACCION.json');
const REMOTE='https://github.com/corvec-liberia/PPS2026/raw/d4fb1b785935c66fecbe40ca4cd839a8a593a301/herramientas-interaccion/';
const RESOURCES={
 'controles-seguros.css':'5823253146d458f374dcde7923cc25ce8b41fb66b053b3e9faacdbb98d0cdd1d',
 'parches-v32.json':'bd23b6bbe98ae990ab93b44a900b5ac1d34c7fc76d503d0b0d93d77cd80037f8',
 'baseline-v32.json':'0b27f2323c6637a1b8dee39ff43ce79bd03f2de40ea20c7fb3104f76c548cc53'
};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function assert(value,message){if(!value)throw new Error(message);}
function npxCli(){
 const bin=path.dirname(process.execPath);
 const candidates=[path.join(bin,'node_modules','npm','bin','npx-cli.js'),path.resolve(bin,'..','lib','node_modules','npm','bin','npx-cli.js'),path.resolve(bin,'..','node_modules','npm','bin','npx-cli.js')];
 const npm=path.join(bin,'npm');if(fs.existsSync(npm))candidates.push(path.join(path.dirname(fs.realpathSync(npm)),'npx-cli.js'));
 const found=candidates.find(p=>fs.existsSync(p));assert(found,'No se encontró npx junto a Node. No cambie permisos; comparta el mensaje.');return found;
}
function clasp(args,cwd,json=false){
 const argv=[npxCli(),'--yes','@google/clasp@3.4.1',...(json?['--json']:[]),'--project',path.resolve(cwd),...args];
 const result=cp.spawnSync(process.execPath,argv,{cwd,encoding:'utf8',shell:false,windowsHide:true});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error('clasp no completó '+args[0]+':\n'+(result.stderr||result.stdout));
 if(json){try{return JSON.parse(result.stdout.trim());}catch(_){throw new Error('Respuesta JSON inesperada en '+args[0]);}}
 if(result.stdout)process.stdout.write(result.stdout);return result.stdout;
}
function canonical(name,content){
 let text=content.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trimEnd();
 if(name==='appsscript.json'){
  const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
  text=JSON.stringify(sort(JSON.parse(text)));
 }
 return hash(Buffer.from(text));
}
function snapshot(folder){
 return Object.fromEntries(fs.readdirSync(folder).filter(n=>n!=='.clasp.json').sort().map(name=>[name,canonical(name,fs.readFileSync(path.join(folder,name)))]));
}
function equal(a,b){return JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());}
function checkProject(folder){
 const settings=JSON.parse(fs.readFileSync(path.join(folder,'.clasp.json'),'utf8'));
 assert(settings.scriptId===PROJECT,'BLOQUEADO: ID de proyecto distinto de la producción autorizada.');
 assert(path.resolve(folder,settings.rootDir||'.')===path.resolve(folder),'BLOQUEADO: rootDir apunta fuera de la copia de trabajo.');
}
function deployment(cwd){
 const list=clasp(['list-deployments',PROJECT],cwd,true);assert(Array.isArray(list),'No se recibió la lista de implementaciones.');
 const found=list.find(d=>d.deploymentId===DEPLOYMENT);assert(found,'No se encontró la implementación de producción autorizada en este proyecto.');return found;
}
function clone(version,destination){
 fs.mkdirSync(destination,{recursive:true});clasp(['clone-script',PROJECT,...(version===null?[]:[String(version)])],destination);checkProject(destination);return snapshot(destination);
}
function applyPatch(source,edits,css) {
 assert(!source.includes('id="pps-controles-seguros"'),'La corrección de interacción ya está presente.');
 let fixed=source;
 for(const [before,after] of edits){assert(fixed.split(before).length===2,'El HTML ya no coincide con V32: '+before.slice(0,60));fixed=fixed.replace(before,()=>after);}
 fixed+='\n<style id="pps-controles-seguros">\n'+css+'\n</style>\n';
 [...fixed.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].forEach((m,i)=>new vm.Script(m[1].replace('<?= PPS_V11_PUBLICO ?>',''),{filename:'Index-script-'+i}));
 return fixed;
}
async function resources(){
 const pairs=await Promise.all(Object.entries(RESOURCES).map(async([name,sha])=>{
  const response=await fetch(REMOTE+name,{signal:AbortSignal.timeout(30000)});assert(response.ok,'No se pudo descargar '+name+'. HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());assert(hash(data)===sha,'Integridad incorrecta: '+name);return [name,data.toString('utf8')];
 }));return Object.fromEntries(pairs);
}
function save(record){fs.writeFileSync(RESULT,JSON.stringify(record,null,2));}
function readResult(){
 assert(fs.existsSync(RESULT),'No existe un registro local de publicación para verificar o revertir.');
 const record=JSON.parse(fs.readFileSync(RESULT,'utf8'));
 assert(record.project===PROJECT&&record.deployment===DEPLOYMENT,'Registro de otra operación bloqueado.');return record;
}
function verifyPublished(record){
 const current=deployment(ROOT);assert(current.versionNumber===record.newVersion,'La implementación no apunta a la versión registrada; no se hizo ningún cambio.');
 const folder=fs.mkdtempSync(path.join(ROOT,'verificacion-publicada-'));
 const published=clone(record.newVersion,folder);assert(equal(published,record.candidate),'El código publicado no coincide con la candidata verificada.');
 record.phase='PUBLICACION_VERIFICADA';record.publicationVerifiedAt=new Date().toISOString();record.verificationFolder=folder;save(record);
 console.log('\nPRODUCCIÓN ACTUALIZADA Y VERIFICADA POR API. Versión '+record.newVersion+'\n'+PUBLIC_URL+'\nPWA: https://corvec-liberia.github.io/PPS2026/');
 console.log('No se ejecutaron funciones ni se escribieron filas de Sheets. Para cargar el HTML nuevo, actualizar o cerrar y reabrir la PWA.');
 console.log('Respaldo y referencia de reversión: '+record.session);return record;
}
async function main(){
 assert(!process.argv.includes('--publicar')||!process.argv.includes('--comprobar'),'Elija comprobar o publicar.');
 const user=clasp(['show-authorized-user'],ROOT,true);
 assert(user.loggedIn&&String(user.email||'').toLowerCase()===ACCOUNT,'Use la cuenta de coordinación autorizada en clasp. No comparta contraseñas ni tokens.');
 if(process.argv.includes('--verificar'))return verifyPublished(readResult());
 if(process.argv.includes('--revertir')){
  const record=readResult(),current=deployment(ROOT);
  assert(current.versionNumber===record.newVersion,'La versión publicada cambió después de esta operación; reversión automática bloqueada.');
  checkProject(record.work);
  clasp(['create-deployment','--deploymentId',DEPLOYMENT,'--versionNumber',String(PREVIOUS_VERSION),'--description','REVERSION_INTERACCION_V32'],record.work,true);
  assert(deployment(ROOT).versionNumber===PREVIOUS_VERSION,'No se pudo verificar la reversión.');
  record.phase='REVERTIDA_A_V32';save(record);console.log('La implementación vuelve a V32. No se modificaron datos ni se sobrescribió el HEAD del editor.');return;
 }
 const current=deployment(ROOT);
 if(current.versionNumber!==PREVIOUS_VERSION&&fs.existsSync(RESULT)){
  const record=readResult();if(record.newVersion===current.versionNumber)return verifyPublished(record);
 }
 assert(current.versionNumber===PREVIOUS_VERSION,'Producción ya no está en V32. Se detuvo para no sobrescribir cambios posteriores.');
 const session=fs.mkdtempSync(path.join(ROOT,'publicacion-interaccion-'));
 const record={project:PROJECT,deployment:DEPLOYMENT,previousVersion:PREVIOUS_VERSION,url:PUBLIC_URL,session,phase:'RESPALDANDO',startedAt:new Date().toISOString()};save(record);
 try{
  console.log('PRODUCCIÓN AUTORIZADA: '+PROJECT+'\nSe respaldará V32 y HEAD. No se ejecutarán funciones de Apps Script.');
  const r=await resources(),baseline=JSON.parse(r['baseline-v32.json']);
  const original=path.join(session,'respaldo-version-32'),head=path.join(session,'respaldo-head');
  const previous=clone(PREVIOUS_VERSION,original);assert(equal(previous,baseline),'La V32 obtenida no coincide con el código auditado.');
  const headSnapshot=clone(null,head);
  const work=path.join(session,'proyecto-completo');fs.cpSync(original,work,{recursive:true});checkProject(work);
  const fixed=applyPatch(fs.readFileSync(path.join(original,'Index.html'),'utf8'),JSON.parse(r['parches-v32.json']),r['controles-seguros.css']);
  fs.writeFileSync(path.join(work,'Index.html'),fixed);
  const candidate=snapshot(work);const changed=Object.keys(baseline).filter(name=>baseline[name]!==candidate[name]);
  assert(changed.length===1&&changed[0]==='Index.html','La candidata cambia archivos no autorizados.');
  assert(equal(headSnapshot,baseline)||equal(headSnapshot,candidate),'HEAD contiene trabajo posterior o no publicado. Se detuvo antes de subir.');
  const manifest=JSON.parse(fs.readFileSync(path.join(work,'appsscript.json'),'utf8'));
  assert(manifest.webapp.access==='ANYONE_ANONYMOUS'&&manifest.webapp.executeAs==='USER_DEPLOYING','El acceso público del manifiesto no coincide con el original.');
  Object.assign(record,{work,backupPublished:original,backupHead:head,candidate,previous,phase:'RESPALDO_Y_CANDIDATA_VERIFICADOS'});save(record);
  fs.writeFileSync(path.join(session,'REFERENCIA-REVERSION.txt'),'Implementación: '+DEPLOYMENT+'\nVersión anterior: 32\nPara revertir con comprobación de versión, ejecutar el mismo asistente con --revertir desde su ubicación original. No revierte datos ni el HEAD del editor.');
  console.log('Verificado: 19 archivos; solo cambia Index.html. Backend, coordinación, criterios y manifiesto conservados.');
  if(!process.argv.includes('--publicar')){console.log('SOLO COMPROBACIÓN completada. No se subió ni publicó nada.');return;}
  assert(deployment(ROOT).versionNumber===PREVIOUS_VERSION,'La versión de producción cambió durante la preparación.');
  if(!equal(headSnapshot,candidate)){
   record.phase='INICIANDO_PUSH';save(record);clasp(['push','--force'],work);
  }
  record.phase='HEAD_ACTUALIZADO';save(record);
  const version=clasp(['create-version','CONTROLES_SIN_INTERFERENCIA_VALIDADOS'],work,true);
  assert(Number.isInteger(version.versionNumber)&&version.versionNumber!==PREVIOUS_VERSION,'No se confirmó una versión nueva.');
  record.newVersion=version.versionNumber;record.phase='VERSION_CREADA';save(record);
  const versionDir=path.join(session,'verificacion-version-nueva');
  assert(equal(clone(record.newVersion,versionDir),candidate),'La versión inmutable nueva no coincide con la candidata; producción no se actualizó.');
  assert(deployment(ROOT).versionNumber===PREVIOUS_VERSION,'Otra publicación cambió producción. No se reemplazó.');
  record.phase='ACTUALIZANDO_IMPLEMENTACION';save(record);
  const deployed=clasp(['create-deployment','--deploymentId',DEPLOYMENT,'--versionNumber',String(record.newVersion),'--description','CONTROLES_SIN_INTERFERENCIA_VALIDADOS'],work,true);
  assert(deployed.deploymentId===DEPLOYMENT,'La respuesta no corresponde a la implementación autorizada.');
  record.phase='IMPLEMENTACION_ENVIADA';save(record);
  return verifyPublished(record);
 }catch(error){
  record.error=error.message;record.failedAt=new Date().toISOString();save(record);
  throw new Error(error.message+'\nFase registrada: '+record.phase+'\nRegistro: '+RESULT+'\nSi hubo un error después del push, el HEAD puede haber cambiado. No reintente a ciegas. Use --verificar para consultar, o comparta este mensaje sin credenciales.');
 }
}
main().catch(error=>{console.error('\nDETENIDO: '+error.message);process.exitCode=1;});
