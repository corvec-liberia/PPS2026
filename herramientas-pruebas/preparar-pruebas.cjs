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
function main(){
 assert(fs.existsSync(sourceDir),'Extraiga todo el ZIP antes de ejecutar.');
 const settings=JSON.parse(fs.readFileSync(path.join(sourceDir,'.clasp.json'),'utf8'));
 assert(settings.scriptId===PROJECT,'BLOQUEADO: el destino no es el proyecto aislado.');
 const expectedPack=JSON.parse(fs.readFileSync(path.join(ROOT,'paquete-esperado.json'),'utf8'));
 for(const [name,hash] of Object.entries(expectedPack))assert(sha(fs.readFileSync(path.join(sourceDir,name)))===hash,'El paquete fue modificado: '+name);
 // Reparación del paquete inicial, solo tras verificar TODOS sus hashes.
 const previous='PruebaGuardado.js',renamed='ServidorPruebaGuardado.js';
 if(Object.hasOwn(expectedPack,previous)){
  assert(!fs.existsSync(path.join(sourceDir,renamed)),'Ya existe el archivo de servidor corregido. Se detuvo para no sobrescribirlo.');
  fs.renameSync(path.join(sourceDir,previous),path.join(sourceDir,renamed));
  expectedPack[renamed]=expectedPack[previous];delete expectedPack[previous];
  fs.writeFileSync(path.join(ROOT,'paquete-esperado.json'),JSON.stringify(expectedPack,null,2));
  console.log('Nombre del servidor corregido; contenido y hashes conservados.');
 }
 const basenames=fs.readdirSync(sourceDir).filter(n=>/\.(?:js|gs|html)$/i.test(n)).map(n=>n.replace(/\.(?:js|gs|html)$/i,'').toLowerCase());
 assert(new Set(basenames).size===basenames.length,'Hay nombres base duplicados que Apps Script no acepta. No se subió nada.');
 const manifest=JSON.parse(fs.readFileSync(path.join(sourceDir,'appsscript.json'),'utf8'));
 assert(manifest.webapp.access==='MYSELF'&&manifest.webapp.executeAs==='USER_DEPLOYING','El despliegue debe ser privado para su propietario.');
 console.log('Destino: SOLO proyecto de pruebas existente. Se respaldará antes de actualizar.');
 const backup=path.join(ROOT,'respaldo-'+Date.now());fs.mkdirSync(backup);
 clasp(['clone-script',PROJECT],backup);
 assert(JSON.parse(fs.readFileSync(path.join(backup,'.clasp.json'),'utf8')).scriptId===PROJECT,'Respaldo de proyecto inesperado.');
 const expected=JSON.parse(fs.readFileSync(path.join(ROOT,'snapshot-esperado.json'),'utf8'));
 const actual=fs.readdirSync(backup).filter(n=>n!=='.clasp.json').sort();
 assert(JSON.stringify(actual)===JSON.stringify(Object.keys(expected).sort()),'El proyecto de pruebas cambió desde la auditoría. No se subió nada.');
 for(const [name,hash] of Object.entries(expected)){
  const text=fs.readFileSync(path.join(backup,name),'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  assert(sha(Buffer.from(text))===hash,'El archivo remoto cambió: '+name+'. No se subió nada.');
 }
 console.log('Respaldo local verificado. Los despliegues anteriores no se actualizarán.');
 console.log('Actualizando únicamente el código del proyecto aislado; producción no es destino de este asistente.');
 clasp(['push','--force'],sourceDir);
 const version=clasp(['create-version','GUARDADO_AISLADO_VALIDACION'],sourceDir,true);
 assert(Number.isInteger(version.versionNumber),'No se confirmó el número de versión de pruebas.');
 const deployment=clasp(['create-deployment','--versionNumber',String(version.versionNumber),'--description','GUARDADO_AISLADO_VALIDACION'],sourceDir,true);
 assert(/^AKfy[\w-]+$/.test(deployment.deploymentId),'No se confirmó el ID de implementación.');
 const url='https://script.google.com/macros/s/'+deployment.deploymentId+'/exec';
 const result={entorno:'PRUEBAS_AISLADAS',scriptId:PROJECT,version:version.versionNumber,url,respaldo:backup,acceso:'Solo propietario'};
 fs.writeFileSync(path.join(ROOT,'RESULTADO-PRUEBAS.json'),JSON.stringify(result,null,2));
 console.log('\nENLACE PRIVADO DE PRUEBAS:\n'+url+'\n');
 console.log('Abra el enlace con cordiempresactpl@gmail.com. Google valida esa cuenta y el botón Ingresar como profesor DEMO de pruebas abre el caso ficticio; no se solicita PIN.');
 console.log('Si Google solicita autorización, corresponde al proyecto aislado para leer/escribir su base de pruebas.');
 console.log('En la página pulse Ejecutar pruebas automáticas con Google y comparta el informe, sin credenciales.');
}
try{main();}catch(error){console.error('\nDETENIDO: '+error.message+'\nNo repita a ciegas; comparta este mensaje sin credenciales.');process.exitCode=1;}
