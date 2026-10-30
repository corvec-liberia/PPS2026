from pathlib import Path
import sys
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).parent))
from guardado_evaluaciones_test import harness
r=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).read_text()
source=source.replace('if(ppsV11Busy||trazos.length','if((ppsV11Busy&&ppsMobileFinalizing())||trazos.length').replace('if(ppsV11Busy||!actual','if((ppsV11Busy&&ppsMobileFinalizing())||!actual')
html=harness(source)
old=(r/'integracion/guardado-sin-redisenar.js').read_text();new=(r/'herramientas-autoguardado/guardado-segundo-plano.js').read_text()
assert old in html
html=html.replace(old,new).replace('},10);','},window.mockLatency||10);')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def setup(width=360,number=1,extra=None):
  page=b.new_page(viewport={'width':width,'height':850},has_touch=True);page.route('**/*',lambda route:route.abort());page.set_content(html);page.clock.install(time=datetime(2026,10,30,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,10,30,tzinfo=timezone.utc));page.evaluate('([n,x])=>openFixture(n,x)',[number,extra or {}]);return page
 def choose(page,v):page.locator('input[name=step][value="'+v+'"]').evaluate("el=>{if(el.disabled)throw new Error('Disabled input');el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));}")
 def next_(page):page.locator('[data-n]').evaluate("el=>{if(el.disabled)throw new Error('Disabled next');el.click();}")
 for width in [320,360,1024]:
  page=setup(width);page.evaluate('mockLatency=10000');choose(page,'2');page.clock.fast_forward(8001)
  assert page.evaluate('calls.length')==1
  assert page.locator('input[name=step]').first.is_enabled();assert page.locator('[data-n]').is_enabled()
  next_(page);choose(page,'0');next_(page);choose(page,'NA')
  assert page.evaluate('calls.length')==1
  page.clock.fast_forward(10001)
  assert 'pendientes' in page.locator('#ppsSaveFeedback').inner_text()
  assert page.locator('input[value="NA"]').is_checked()
  page.clock.fast_forward(8001);assert page.evaluate('calls.length')==2
  assert page.evaluate('calls[1].args[4]')=={'0':'2','1':'0','2':'NA'}
  page.clock.fast_forward(10001)
  assert 'confirmado' in page.locator('#ppsSaveFeedback').inner_text()
  assert page.evaluate('records["ASG-SYNTHETIC:1"].respuestas')=={'0':'2','1':'0','2':'NA'}
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.close();print('PASS:',width,'px: continuar durante respuesta lenta, una petición activa y nuevos cambios confirmados después')
 page=setup();choose(page,'0');page.clock.fast_forward(4000);choose(page,'1');page.clock.fast_forward(4000);choose(page,'2');page.clock.fast_forward(4000);choose(page,'0');page.clock.fast_forward(3001)
 assert page.evaluate('calls.length')==1;assert page.evaluate('calls[0].args[4]')=={'0':'0'};page.close();print('PASS: máximo de 15 segundos para agrupar cambios continuos sin peticiones por pregunta')
 page=setup();page.evaluate('mode="error";mockLatency=10000');choose(page,'2');page.clock.fast_forward(8001);next_(page);choose(page,'0');page.clock.fast_forward(10001)
 assert 'Error simulado' in page.locator('#ppsSaveFeedback').inner_text();page.clock.fast_forward(30000);assert page.evaluate('calls.length')==1
 page.evaluate('mode="ok";mockLatency=10');page.get_by_role('button',name='Guardar borrador',exact=True).click();page.clock.fast_forward(11)
 assert page.evaluate('records["ASG-SYNTHETIC:1"].respuestas')=={'0':'2','1':'0'};page.close();print('PASS: errores retienen cambios nuevos, no reintentan en bucle y admiten reintento manual')
 page=setup(extra={'respuestas':{'0':'2','1':'0','2':'NA'}});next_(page);next_(page);page.evaluate('mockLatency=10000');page.get_by_role('button',name='Finalizar evaluación',exact=True).click()
 assert page.locator('input[name=step]').first.is_disabled();assert page.locator('[data-p]').is_disabled()
 page.clock.fast_forward(10001);assert page.evaluate('records["ASG-SYNTHETIC:1"].estado')=='Finalizada';page.close();print('PASS: el envío definitivo conserva bloqueo y confirmación')
 page=setup(number=2);page.evaluate('mockLatency=10000');choose(page,'0');page.clock.fast_forward(8001);next_(page);choose(page,'NA');next_(page);choose(page,'2')
 page.locator('.v11-signer').fill('Firma ficticia');canvas=page.locator('#v11FirmaHost canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();page.mouse.move(box['x']+10,box['y']+10);page.mouse.down();page.mouse.move(box['x']+80,box['y']+40,steps=5);page.mouse.up()
 page.clock.fast_forward(10001);page.clock.fast_forward(8001);assert page.evaluate('calls[1].args[6].trazos.length')>0
 page.clock.fast_forward(10001);page.close();print('PASS: firma y respuestas nuevas durante guardado quedan incluidas en el siguiente borrador')
 b.close()
