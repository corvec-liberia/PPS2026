from pathlib import Path
import sys,re,json,subprocess
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).parent))
from guardado_evaluaciones_test import harness
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).read_text()
original=re.search(r'<script>\(function\(\)\{window\.ppsEvalDibujar=function\(d\).*?</script>',source,re.S)[0]
source=source.replace(original,'<script>'+ (root/'herramientas-navegacion/renderizador-estable.js').read_text()+'</script>')
html=harness(source)
old=(root/'integracion/guardado-sin-redisenar.js').read_text();assert old in html
html=html.replace(old,(root/'herramientas-navegacion/guardado-navegacion.js').read_text()).replace('},10);','},window.mockLatency||10);')
criteria=['COMPETENCIAS ESPECÍFICAS — Aplica los procedimientos completos del instrumento oficial sin abreviar ningún encabezado ni indicador.','COMPETENCIAS GENÉRICAS — Segundo criterio completo del instrumento de evaluación.','COMPETENCIAS PARA EL DESARROLLO HUMANO — Trabajo en equipo y sus indicadores completos.']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def setup(width=360,n=1,extra=None):
  page=browser.new_page(viewport={'width':width,'height':1000},has_touch=True);page.route('**/*',lambda route:route.abort());page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.clock.install(time=datetime(2026,10,30,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,10,30,tzinfo=timezone.utc));page.evaluate('([n,x,c])=>openFixture(n,Object.assign({criterios:c},x))',[n,extra or {},criteria]);return page,errors
 def index(page):return page.locator('.pps-step-dialog').get_attribute('data-pps-index')
 def choose(page,v):
  label=page.locator('label.pps-step-option').filter(has=page.locator('input[value="'+v+'"]'))
  label.scroll_into_view_if_needed();label.tap()
 def next_(page):page.locator('[data-n]').scroll_into_view_if_needed();page.locator('[data-n]').tap()
 for width in [320,360,768,1024]:
  page,errors=setup(width);page.evaluate('mockLatency=10000;window.savedNext=document.querySelector("[data-n]");window.savedRadio=document.querySelector("input[name=step]")')
  next_(page);assert index(page)=='0';assert page.locator('[data-pps-validation]').inner_text()=='Seleccione una opción para continuar.';assert page.evaluate('calls.length')==0
  choose(page,'0');assert not page.locator('[data-pps-validation]').inner_text();assert page.evaluate('savedNext===document.querySelector("[data-n]")&&savedRadio===document.querySelector("input[name=step]")')
  page.clock.fast_forward(8001);assert page.evaluate('calls.length')==1
  next_(page);assert index(page)=='1';assert page.locator('.pps-step-card h3').inner_text()==criteria[1]
  choose(page,'NA');next_(page);assert index(page)=='2';choose(page,'2')
  page.clock.fast_forward(10001);assert index(page)=='2';assert 'pendientes' in page.locator('#ppsSaveFeedback').inner_text()
  assert page.evaluate('savedNext===document.querySelector("[data-n]")');page.clock.fast_forward(8001);page.clock.fast_forward(10001)
  assert page.evaluate('records["ASG-SYNTHETIC:1"].respuestas')=={'0':'0','1':'NA','2':'2'}
  page.locator('[data-p]').tap();assert index(page)=='1';assert page.locator('input[value="NA"]').is_checked();next_(page);assert index(page)=='2'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors;page.close()
  print('PASS:',width,'px: toques reales, validación breve, controles estables, servidor lento sin retroceder, textos completos, 0 y N/A')
 page,errors=setup(n=2);choose(page,'2');next_(page);choose(page,'1');next_(page);choose(page,'0')
 page.locator('.v11-signer').fill('Profesor ficticio');canvas=page.locator('canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();page.mouse.move(box['x']+10,box['y']+10);page.mouse.down();page.mouse.move(box['x']+85,box['y']+45,steps=4);page.mouse.up()
 page.locator('[data-p]').tap();assert index(page)=='1';assert page.locator('#v11FirmaHost').is_hidden();next_(page);assert page.locator('.v11-signer').input_value()=='Profesor ficticio'
 page.get_by_role('button',name='Firmar y enviar',exact=True).click();assert page.locator('input[name=step]').first.is_disabled();page.clock.fast_forward(11);assert page.evaluate('records["ASG-SYNTHETIC:2"].estado')=='Finalizada';assert not errors;page.close();print('PASS: firma estable al retroceder, envío definitivo y bloqueo de finalizada')
 page,errors=setup(extra={'respuestas':{'0':'2','2':'NA'}});page.evaluate('ppsEvalGuardar(true)');page.get_by_role('button',name='Ir al criterio pendiente').click();assert index(page)=='1';assert page.locator('.pps-step-card h3').inner_text()==criteria[1];page.close();print('PASS: salto directo a la pregunta pendiente sin perder respuestas')
 for extra in [{'demo':True,'puedeGuardar':False},{'estado':'Finalizada','puedeGuardar':False}]:
  page,errors=setup(extra=extra);next_(page);assert index(page)=='1';assert page.locator('input[name=step]').first.is_disabled();page.clock.fast_forward(60000);assert page.evaluate('calls.length')==0;page.close()
 print('PASS: DEMO y finalizada permiten leer preguntas sin escribir ni exigir respuestas')
 page,errors=setup();page.evaluate('mode="error";mockLatency=10000');choose(page,'0');page.clock.fast_forward(8001);next_(page);choose(page,'NA');page.clock.fast_forward(10001)
 assert index(page)=='1';assert 'Error simulado' in page.locator('#ppsSaveFeedback').inner_text();page.clock.fast_forward(30000);assert page.evaluate('calls.length')==1
 page.evaluate('mode="ok";mockLatency=10');page.get_by_role('button',name='Guardar borrador',exact=True).click();page.clock.fast_forward(11);assert page.evaluate('records["ASG-SYNTHETIC:1"].respuestas')=={'0':'0','1':'NA'};page.close();print('PASS: error de guardado no cambia la pregunta ni pierde respuestas; reintento sin duplicados')
 page,errors=setup();page.context.set_offline(True);choose(page,'1');next_(page);choose(page,'0');page.clock.fast_forward(20000);assert index(page)=='1';assert page.evaluate('calls.length')==0
 page.context.set_offline(False);page.wait_for_function('navigator.onLine');page.evaluate('window.dispatchEvent(new Event("online"))');page.clock.fast_forward(8001);page.clock.fast_forward(11);assert page.evaluate('records["ASG-SYNTHETIC:1"].respuestas')=={'0':'1','1':'0'};assert index(page)=='1';page.close();print('PASS: navegación sin conexión y recuperación al reconectar sin mover la pregunta')
 fixture=Path(sys.argv[1]).parent
 module=(fixture/'Modulo_Docentes_PPS_2026.js').read_text(encoding='utf-8-sig')+'\n'+(fixture/'Untitled.js').read_text(encoding='utf-8-sig')
 runner="const vm=require('node:vm');let c={};vm.createContext(c);vm.runInContext("+json.dumps(module)+",c);process.stdout.write(vm.runInContext("+json.dumps("JSON.stringify(Object.fromEntries(Object.keys(PPS_EVAL_CATALOGO).map(k=>[k,ppsEvalCriterios_(k)])))")+",c));"
 catalogs=json.loads(subprocess.check_output(['node','-e',runner],text=True))
 page,errors=setup();total=0
 for code,texts in catalogs.items():
  assert page.evaluate('texts=>{openFixture(1,{criterios:texts});const title=document.querySelector(".pps-step-card h3");return texts.every((text,i)=>{ppsEvalPanel().ppsStepGoTo(i);return title.textContent===text;});}',texts),code
  total+=len(texts)
 assert not errors;page.close();print('PASS:',len(catalogs),'especialidades,',total,'criterios completos, sin abreviar ni sustituir textos del backend')
 browser.close()
