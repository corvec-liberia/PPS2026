'use strict';
/* Se ejecuta localmente. Nunca lee/imprime tokens ni apunta a producción. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const ROOT=__dirname,PROJECT='1nGQjNeAKJMtTBizaYU2u0C09SkS_pVEynW0dIcLJlcT6rroZfXNg80fu';
const sourceDir=path.join(ROOT,'proyecto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function assert(c,m){if(!c)throw new Error(m);}
function npxCli(){
 const bin=path.dirname(process.execPath);
 const candidates=[path.join(bin,'node_modules','npm','bin','npx-cli.js'),path.resolve(bin,'..','lib','node_modules','npm','bin','npx-cli.js'),path.resolve(bin,'..','node_modules','npm','bin','npx-cli.js')];
 const npm=path.join(bin,'npm');
 if(fs.existsSync(npm))candidates.push(path.join(path.dirname(fs.realpathSync(npm)),'npx-cli.js'));
 const found=candidates.find(p=>fs.existsSync(p));
 assert(found,'No se encontró npx-cli.js junto a Node. Comparta este mensaje; no cambie permisos.');
 return found;
}
function clasp(args,cwd,json=false){
 const command=['--yes','@google/clasp@3.4.1',...(json?['--json']:[]),'--project',path.resolve(cwd),...args];
 // Ejecutar npx con Node directamente, sin shell ni concatenación de argumentos.
 const result=cp.spawnSync(process.execPath,[npxCli(),...command],{cwd,encoding:'utf8',shell:false,windowsHide:true});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error('clasp no completó '+args[0]+':\n'+(result.stderr||result.stdout));
 if(!json){if(result.stdout)process.stdout.write(result.stdout);return result.stdout;}
 const text=result.stdout.trim();const start=text.indexOf('{'),end=text.lastIndexOf('}');
 assert(start>=0&&end>=start,'No se recibió JSON válido en '+args[0]);return JSON.parse(text.slice(start,end+1));
}

const PREVIOUS={"files": {"PruebaGuardado.html": "dbd31972028179f34bb1a7464cf146aefdcf069b019361b17e3dd98f218c3ac5", "ServidorPruebaGuardado.js": "81b380630101de85f0492ab3f042f869b4f5cc698f2cd7a9c8d5756b431ac469", "appsscript.json": "586e7c220be7ecf2fd19feeed040fcebf54b696421fa3f73c85e446c70382855"}, "deploymentId": "AKfycbykVC1Hs9XxcDq4gJKVGOfgpP3Nrg3cuzpSXnLGGEOJNfOdq1Z1tJ-wK1YYefSN_hOC"};
const HTML_SHA='873aa9c597f7fa7b37147267f0ded6607b805fc2237494d8a77ea1162a1f2b85';
const HTML_URL='https://github.com/corvec-liberia/PPS2026/raw/3591a90bf6ddcca5af42fcd5d580f3077f0db83d/herramientas-pruebas/retroalimentacion/PruebaGuardado.html';
function canonical(name,content){
 let text=content.toString('utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trimEnd();
 if(name==='appsscript.json'){
  const v=JSON.parse(text);const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
  text=JSON.stringify(sort(v));
 }
 return sha(Buffer.from(text));
}
function snapshot(folder){
 const names=fs.readdirSync(folder).filter(n=>n!=='.clasp.json').sort();
 return Object.fromEntries(names.map(n=>[n,canonical(n,fs.readFileSync(path.join(folder,n)))]));
}
function match(a,b){return JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());}
async function main(){
 assert(fs.existsSync(sourceDir),'Ejecute desde la carpeta original PPS2026-pruebas.');
 const settings=JSON.parse(fs.readFileSync(path.join(sourceDir,'.clasp.json'),'utf8'));
 assert(settings.scriptId===PROJECT,'BLOQUEADO: destino diferente del proyecto de pruebas.');
 console.log('Actualización limitada a retroalimentación y preguntas pendientes del MISMO enlace privado de pruebas.');
 const backup=path.join(ROOT,'respaldo-retroalimentacion-'+Date.now());fs.mkdirSync(backup);
 clasp(['clone-script',PROJECT],backup);
 assert(JSON.parse(fs.readFileSync(path.join(backup,'.clasp.json'),'utf8')).scriptId===PROJECT,'Proyecto inesperado en el respaldo.');
 const remote=snapshot(backup);
 const response=await fetch(HTML_URL,{signal:AbortSignal.timeout(30000)});
 assert(response.ok,'No se pudo descargar el HTML validado. HTTP '+response.status);
 const html=Buffer.from(await response.arrayBuffer());assert(sha(html)===HTML_SHA,'El HTML descargado no coincide con el verificado.');
 const next=Object.assign({},PREVIOUS.files,{'PruebaGuardado.html':canonical('PruebaGuardado.html',html)});
 assert(match(remote,PREVIOUS.files)||match(remote,next),'El proyecto remoto cambió fuera del ensayo conocido. Se detuvo sin subir.');
 const local=snapshot(sourceDir);assert(match(local,PREVIOUS.files)||match(local,next),'Los archivos locales cambiaron. Se detuvo sin subir.');
 const manifest=JSON.parse(fs.readFileSync(path.join(sourceDir,'appsscript.json'),'utf8'));
 assert(manifest.webapp.access==='MYSELF'&&manifest.webapp.executeAs==='USER_DEPLOYING','El ensayo debe seguir privado.');
 fs.writeFileSync(path.join(sourceDir,'PruebaGuardado.html'),html);
 const expected={};for(const n of fs.readdirSync(sourceDir))expected[n]=sha(fs.readFileSync(path.join(sourceDir,n)));
 fs.writeFileSync(path.join(ROOT,'paquete-esperado.json'),JSON.stringify(expected,null,2));
 assert(match(snapshot(sourceDir),next),'La copia local no coincide con la candidata.');
 console.log('Respaldo y estados verificados. Solo cambia el HTML; servidor y datos no cambian.');
 if(!match(remote,next))clasp(['push','--force'],sourceDir);
 const version=clasp(['create-version','RETROALIMENTACION_PENDIENTES'],sourceDir,true);assert(Number.isInteger(version.versionNumber),'Versión no confirmada.');
 const deployment=clasp(['create-deployment','--deploymentId',PREVIOUS.deploymentId,'--versionNumber',String(version.versionNumber),'--description','RETROALIMENTACION_PENDIENTES'],sourceDir,true);
 assert(deployment.deploymentId===PREVIOUS.deploymentId,'La implementación devuelta no coincide con la privada de pruebas.');
 const url='https://script.google.com/macros/s/'+deployment.deploymentId+'/exec';
 fs.writeFileSync(path.join(ROOT,'RESULTADO-RETROALIMENTACION.json'),JSON.stringify({scriptId:PROJECT,version:version.versionNumber,url,respaldo:backup},null,2));
 console.log('\nMISMO ENLACE PRIVADO DE PRUEBAS ACTUALIZADO:\n'+url+'\n');
 console.log('Recargue la página con Ctrl+F5 e ingrese al ensayo. Al intentar finalizar con respuestas pendientes, verá los números y el botón Ir al criterio pendiente junto a Guardar borrador.');
 console.log('Producción no es destino. Los registros de pruebas anteriores se conservan.');
}
main().catch(error=>{console.error('\nDETENIDO: '+error.message+'\nComparta el mensaje antes de reintentar.');process.exitCode=1;});
