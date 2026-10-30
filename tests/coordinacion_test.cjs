'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=process.argv[2],root=require('node:path').resolve(__dirname,'..');
const source=fs.readFileSync(dir+'/Modulo_Docentes_PPS_2026.js','utf8').replace(' const c=JSON.parse(raw);',' const c=ppsValidarContextoCoordinacion_(JSON.parse(raw));')+'\n'+fs.readFileSync(root+'/herramientas-coordinacion/coordinacion-backend.js','utf8');
const cache=new Map();let seq=0;
const c={CacheService:{getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)})},Utilities:{getUuid:()=>String(++seq)},console};vm.createContext(c);vm.runInContext(source,c);
let user={ROL:'ADMIN',ID_USUARIO:'SYNTHETIC-ADMIN',NOMBRE_COMPLETO:'Coordinación ficticia',CEDULA:'SYNTHETIC',CORREO_LOGIN:'coord@example.invalid'},teachers=[];
const assignments={A:{ID_ASIGNACION:'A',ID_ESTUDIANTE:'S-A',CODIGO_ESPECIALIDAD:'CCI'},B:{ID_ASIGNACION:'B',ID_ESTUDIANTE:'S-B',CODIGO_ESPECIALIDAD:'ECSC'}};
let segs=[];
Object.assign(c,{
 validarSesionLogin_:t=>t==='ADMIN-TOKEN'?user:null,
 objsPPS_:name=>name==='DOCENTES'?teachers:segs,
 ppsV11Hash_:x=>crypto.createHash('sha256').update(x).digest('hex'),
 asigIdPPS_:id=>assignments[id]?{obj:assignments[id]}:null,
 normPPS_:x=>String(x||'').trim().toLowerCase(),codPPS_:x=>String(x||'').trim().toUpperCase()
});
function test(name,fn){fn();console.log('PASS:',name);}
let first;
test('Solo ADMIN vigente puede abrir el acceso, sin aceptar roles del cliente',()=>{
 assert.throws(()=>c.apiEntrarEvaluacionesCoordinacionPPS('DOC-TOKEN','CCI'));
 user.ROL='DOCENTE';assert.throws(()=>c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','CCI'));user.ROL='ADMIN';
 assert.throws(()=>c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','INVENTADA'));
});
test('Coordinador sin registro entra sin crear usuario ni cambiar ADMIN',()=>{
 first=c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','CCI');assert.equal(first.demo,false);assert.match(first.idDocente,/^COORD-/);assert.equal(user.ROL,'ADMIN');assert.equal(teachers.length,0);
});
test('Misma identidad al cambiar entre especialidades y sesiones',()=>{
 const b=c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','ECSC');assert.equal(first.idDocente,b.idDocente);assert.equal(b.codigoEspecialidad,'ECSC');assert.notEqual(first.token,b.token);
});
test('Sesión revocada o rol cambiado bloquea inmediatamente la sesión docente',()=>{
 user.ROL='DOCENTE';assert.throws(()=>c.contextoDocPPS_(first.token));user.ROL='ADMIN';
 const id=user.ID_USUARIO;user.ID_USUARIO='OTRA';assert.throws(()=>c.contextoDocPPS_(first.token));user.ID_USUARIO=id;
});
test('Identidad docente existente se reutiliza; duplicados e inactivos se rechazan',()=>{
 teachers=[{ID_DOCENTE:'EXISTENTE',CORREO:'coord@example.invalid',ESTADO:'Activa'}];assert.equal(c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','CCI').idDocente,'EXISTENTE');
 teachers.push({...teachers[0],ID_DOCENTE:'DUPLICADO'});assert.throws(()=>c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','CCI'),/duplicados/);
 teachers.pop();teachers[0].ESTADO='Inactiva';assert.throws(()=>c.apiEntrarEvaluacionesCoordinacionPPS('ADMIN-TOKEN','CCI'),/habilitado/);teachers=[];
});
test('Acceso original rechaza otra especialidad y seguimiento ajeno',()=>{
 assert.throws(()=>c.ppsEvalAcceso_(first.token,'B','ECSC',true),/especialidad/);
 segs=[{ID_ASIGNACION:'A',ESTADO:'Activo',ID_DOCENTE_SEGUIMIENTO:'OTRO'}];assert.throws(()=>c.ppsEvalAcceso_(first.token,'A','CCI',true),/seguimiento/);
 segs[0].ID_DOCENTE_SEGUIMIENTO=first.idDocente;assert.equal(c.ppsEvalAcceso_(first.token,'A','CCI',true).c.idDocente,first.idDocente);
});
test('Guardado original revalida propietario dentro del bloqueo, sin bypass ADMIN',()=>{
 // Llegar al chequeo de propiedad con respuestas/firma válidas sin escribir una sola celda.
 c.ppsEvalCriterios_=()=>[];c.ppsV11Calcular_=()=>({respuestas:{'0':'0','1':'NA'},puntos:0,posibles:2,nota:0});c.ppsV11Firma_=()=>null;
 c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};c.ppsEvalRegistros_=()=>[];
 const q=c.ppsEvalAcceso_(first.token,'A','CCI',true);segs[0].ID_DOCENTE_SEGUIMIENTO='OTRO';
 assert.throws(()=>c.ppsV11Guardar_(q,'A',1,{},false,null,'TEST',''),/responsable/);
 assert.throws(()=>c.ppsV11Guardar_({...q,c:{...q.c,demo:true}},'A',2,{},false,null,'TEST',''),/demostración/);
});
console.log('7 grupos aprobados; datos sintéticos en memoria, sin conexión con Google.');
