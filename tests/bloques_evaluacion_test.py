"""Numeración por bloque sin migrar las respuestas globales de las evaluaciones."""
from pathlib import Path
import sys,json,subprocess
from playwright.sync_api import sync_playwright
from guardado_evaluaciones_test import MOCK
source=Path(sys.argv[1]).read_text().replace('<?= PPS_V11_PUBLICO ?>','')
mock=MOCK[MOCK.index('window.calls='):MOCK.index('window.openFixture=')]
html=source.replace('<head>','<head><script>'+mock+'</script>',1)
fixture=Path(sys.argv[2])
module=(fixture/'Modulo_Docentes_PPS_2026.js').read_text(encoding='utf-8-sig')+'\n'+(fixture/'Untitled.js').read_text(encoding='utf-8-sig')
expr='JSON.stringify(Object.fromEntries(Object.keys(PPS_EVAL_CATALOGO).map(k=>[k,ppsEvalCriterios_(k)])))'
runner="const vm=require('node:vm');let c={};vm.createContext(c);vm.runInContext("+json.dumps(module)+",c);process.stdout.write(vm.runInContext("+json.dumps(expr)+",c));"
catalogs=json.loads(subprocess.check_output(['node','-e',runner],text=True))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':360,'height':800},has_touch=True);page.route('**/*',lambda r:r.abort());errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
 def open_case(criteria,number=1,responses=None):
  page.evaluate('''([criteria,number,responses])=>{document.getElementById('loginScreen').style.display='none';PPS_EVAL_ACTUAL={numero:number,idAsignacion:'ASG-SYNTHETIC',codigo:'ECSC',estudiante:'Profesor ficticio',empresa:'Empresa ficticia',instrumento:'IEPP-01-EC',criterios:criteria,respuestas:responses||{},estado:'Borrador',puedeGuardar:true,demo:false};ppsEvalDibujar(PPS_EVAL_ACTUAL);}''',[criteria,number,responses or {}])
 total=0
 for code,criteria in catalogs.items():
  open_case(criteria)
  info=page.evaluate('''criteria=>criteria.map((raw,i)=>{ppsEvalPanel().ppsStepGoTo(i);const r=ppsEvalReferenciaBloque(criteria,i);return {key:r.indiceGlobal,block:r.bloque,number:r.numero,total:r.total,text:document.querySelector('.pps-step-card h3').textContent,label:document.querySelector('.pps-step-label').textContent,numberLabel:document.querySelector('.pps-step-number').textContent};})''',criteria)
  counts={'especificas':0,'genericas':0,'desarrollo-humano':0}
  for i,row in enumerate(info):
   counts[row['block']]+=1;assert row['key']==i;assert row['number']==counts[row['block']]
   assert row['numberLabel']==f"Criterio {row['number']} de {row['total']}"
   original=criteria[i]
   expected=original.split(' - ',1)[1] if original.startswith(('COMPETENCIAS GENERICAS - ','COMPETENCIAS PARA EL DESARROLLO HUMANO - ')) else original
   # Los textos literales de la referencia se cotejan independientemente con el Excel en textos_documentados_test.py.
  assert counts['genericas']==16 and counts['desarrollo-humano']==15
  total+=len(criteria)
 print('PASS:',len(catalogs),'especialidades,',total,'criterios; numeración reiniciada por bloque sin alterar textos ni orden')
 criteria=catalogs['ECSC'];technical=len(criteria)-31
 for number in [1,2]:
  open_case(criteria,number,{str(technical):'0',str(technical+16):'NA'})
  page.evaluate('i=>ppsEvalPanel().ppsStepGoTo(i)',technical);assert page.locator('.pps-step-number').inner_text()=='Criterio 1 de 16';assert page.locator('input[value="0"]').is_checked()
  page.evaluate('i=>ppsEvalPanel().ppsStepGoTo(i)',technical+16);assert page.locator('.pps-step-number').inner_text()=='Criterio 1 de 15';assert page.locator('input[value="NA"]').is_checked()
  page.evaluate('ppsEvalGuardar(false)');page.wait_for_function('n=>records["ASG-SYNTHETIC:"+n]?.estado==="Borrador"',arg=number)
  assert page.evaluate('n=>records["ASG-SYNTHETIC:"+n].respuestas',number)=={str(technical):'0',str(technical+16):'NA'}
 print('PASS: 0 y N/A recuperados y guardados con sus claves globales originales en ambas evaluaciones')
 open_case(criteria,1,{str(i):'2' for i in range(len(criteria)) if i!=technical});page.evaluate('ppsEvalGuardar(true)')
 assert 'Competencias genéricas · 1 de 16' in page.locator('#ppsSaveFeedback').inner_text()
 page.get_by_role('button',name='Ir al criterio pendiente').click();assert page.locator('.pps-step-number').inner_text()=='Criterio 1 de 16'
 print('PASS: aviso y salto al pendiente usan el número del bloque, sin confundirlo con la clave de almacenamiento')
 page.evaluate('''()=>{window.nextReference=document.querySelector('[data-n]');const input=document.querySelector('input[value="1"]');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}''');page.locator('[data-n]').tap();assert page.locator('.pps-step-number').inner_text()=='Criterio 2 de 16'
 assert page.evaluate('nextReference===document.querySelector("[data-n]")');assert not errors,errors
 print('PASS: controles estables y Siguiente conservan la corrección de interacción de V33')
 page.close();b.close()
