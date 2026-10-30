"""Reproduce la interferencia de radios en V32 y prueba el HTML completo corregido."""
from pathlib import Path
import sys
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
from guardado_evaluaciones_test import MOCK
before=Path(sys.argv[1]).read_text();after=Path(sys.argv[2]).read_text()
mock=MOCK[MOCK.index('window.calls='):MOCK.index('window.openFixture=')].replace('},10);','},window.mockLatency||10);')
def html(source):return source.replace('<?= PPS_V11_PUBLICO ?>','').replace('<head>','<head><script>'+mock+'</script>',1)
def open_case(page,number=1,missing=None):
 page.evaluate('''([number,missing])=>{
  document.getElementById('loginScreen').style.display='none';
  const criteria=Array.from({length:51},(_,i)=>i%2?'Criterio breve '+(i+1):'COMPETENCIAS PARA EL DESARROLLO HUMANO - '+('Aplica procedimientos técnicos según las normas. '.repeat(4)));
  const answers=Object.fromEntries(criteria.map((_,i)=>[i,'2']));if(missing!==null)delete answers[missing];
  const data={numero:number,idAsignacion:'ASG-SYNTHETIC',codigo:'ECSC',estudiante:'Prueba aislada',empresa:'Empresa ficticia',instrumento:'IEPP-01',criterios:criteria,respuestas:answers,estado:'Borrador',puedeGuardar:true,demo:false};
  PPS_EVAL_ACTUAL=data;ppsEvalDibujar(data);ppsEvalPanel().ppsStepGoTo(15);
 }''',[number,missing])
def index(page):return int(page.locator('.pps-step-dialog').get_attribute('data-pps-index'))
def center(page):
 r=page.locator('[data-n]').bounding_box();return r['x']+r['width']/2,r['y']+r['height']/2
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1365,'height':768});page.route('**/*',lambda r:r.abort());page.set_content(html(before));open_case(page);page.locator('[data-n]').scroll_into_view_if_needed();x,y=center(page)
 page.mouse.click(x,y);page.wait_for_timeout(120)
 target=page.evaluate('([x,y])=>{const e=document.elementFromPoint(x,y);return {tag:e.tagName,value:e.value}}',[x,y])
 assert target=={'tag':'INPUT','value':'NA'},target
 page.mouse.click(x,y);assert index(page)==16;assert page.locator('input[name=step]:checked').get_attribute('value')=='NA';page.close()
 print('REPRODUCIDO V32: segundo clic en la posición previa de Siguiente activa No aplica invisible y permanece en la pregunta 17')
 for width,height in [(320,640),(360,800),(768,1024),(900,800),(1365,768),(1920,1080)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=True);page.route('**/*',lambda r:r.abort());page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html(after));open_case(page);page.clock.install(time=datetime(2026,10,30,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,10,30,tzinfo=timezone.utc));page.evaluate('mockLatency=10000;ppsEvalGuardar(false)')
  assert page.evaluate('calls.length')==1
  x,y=center(page);changed=None
  for attempt in range(10):
   if attempt==4:
    changed=index(page)
    label=page.locator('label.pps-step-option').filter(has=page.locator('input[value="0"]'));label.scroll_into_view_if_needed();label.tap();assert page.locator('input[value="0"]').is_checked()
   newx,newy=center(page);assert abs(newx-x)<=2 and abs(newy-y)<=2,(width,attempt,(x,y),(newx,newy))
   assert page.evaluate('([x,y])=>document.elementFromPoint(x,y)?.closest("button")===document.querySelector("[data-n]")',[x,y])
   page.touchscreen.tap(x,y);assert index(page)==16+attempt,(width,attempt,index(page))
  assert page.evaluate('calls.length')==1
  page.clock.fast_forward(10001);assert index(page)==25
  page.clock.fast_forward(8001);page.clock.fast_forward(10001);assert index(page)==25
  records=page.evaluate('records["ASG-SYNTHETIC:1"].respuestas');assert records[str(changed)]=='0';assert all(v=='2' for k,v in records.items() if int(k)!=changed)
  assert page.evaluate('''()=>[...document.querySelectorAll('input[name=step]')].every(el=>{let r=el.getBoundingClientRect();return r.width<=1&&r.height<=1&&getComputedStyle(el).pointerEvents==='none';})''')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  # El texto de un criterio largo sigue íntegro y desplazable dentro de su tarjeta.
  page.evaluate('ppsEvalPanel().ppsStepGoTo(16)');assert page.locator('.pps-step-card h3').text_content()==page.evaluate('PPS_EVAL_ACTUAL.criterios[16]')
  assert page.locator('.pps-step-card').evaluate('e=>e.clientHeight>0&&e.scrollHeight>=e.clientHeight')
  page.close();print('PASS:',width,height,'HTML completo: 10 toques en la misma posición, pregunta 17, guardado lento, nota nueva, sin cambios involuntarios')
 page=browser.new_page(viewport={'width':360,'height':800});page.route('**/*',lambda r:r.abort());page.set_content(html(after));open_case(page,missing=16);page.evaluate('ppsEvalPanel().ppsStepGoTo(16)');x,y=center(page);page.mouse.click(x,y);assert index(page)==16;assert page.locator('[data-pps-validation]').inner_text()=='Seleccione una opción para continuar.';assert page.evaluate('calls.length')==0
 label=page.locator('label.pps-step-option').filter(has=page.locator('input[value="NA"]'));label.scroll_into_view_if_needed();label.click();x,y=center(page);page.mouse.click(x,y);assert index(page)==17;page.close();print('PASS: validación breve sin servidor; seleccionar N/A permite continuar')
 page=browser.new_page(viewport={'width':360,'height':800});page.route('**/*',lambda r:r.abort());page.set_content(html(after));open_case(page,number=2);page.evaluate('ppsEvalPanel().ppsStepGoTo(50)');assert page.locator('#v11FirmaHost').evaluate('e=>e.parentElement.classList.contains("pps-step-card")')
 page.locator('.v11-signer').fill('Profesor sintético');canvas=page.locator('#v11FirmaHost canvas');canvas.scroll_into_view_if_needed();r=canvas.bounding_box();page.mouse.move(r['x']+10,r['y']+10);page.mouse.down();page.mouse.move(r['x']+80,r['y']+40,steps=4);page.mouse.up();page.get_by_role('button',name='Firmar y enviar',exact=True).click();page.wait_for_function('records["ASG-SYNTHETIC:2"]?.estado==="Finalizada"');assert page.evaluate('records["ASG-SYNTHETIC:2"].firma.trazos.length')>0;page.close();print('PASS: firma dentro del área desplazable y envío definitivo independiente del borrador')
 browser.close()
