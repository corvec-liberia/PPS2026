from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ui=(Path(__file__).resolve().parents[1]/'herramientas-coordinacion/coordinacion-ui.js').read_text()
html='''<meta name="viewport" content="width=device-width, initial-scale=1"><div id="header"><div id="securityBanner">Coordinación</div></div><div id="app"></div>
<script>
let TOKEN_SESION='ADMIN-TOKEN',ROL_SESION='ADMIN',DOCENTE_DEMO=false,calls=[],alerts=[],deny=false;
function aplicarSeguridadUI(){};function cerrarSesionInterna(){calls.push(['logout',TOKEN_SESION]);TOKEN_SESION='';ROL_SESION='';}
function cargarSistema(){calls.push(['bootstrap',TOKEN_SESION,ROL_SESION]);aplicarSeguridadUI();}
function abrirPortalDocentePPS(r){TOKEN_SESION=r.token;ROL_SESION='DOCENTE';calls.push(['open',r.codigoEspecialidad]);}
window.alert=m=>alerts.push(m);
const google={script:{get run(){let ok,fail;const x={withSuccessHandler(f){ok=f;return x},withFailureHandler(f){fail=f;return x},
apiEspecialidadesEvaluacionCoordinacionPPS(t){calls.push(['list',t]);if(deny){fail({message:'Sesión expirada'});return;}ok({ok:true,especialidades:[{codigo:'CCI',nombre:'Contabilidad y control interno'},{codigo:'ECSC',nombre:'Ejecutivo comercial y de servicio al cliente'}]});},
apiEntrarEvaluacionesCoordinacionPPS(t,c){calls.push(['enter',t,c]);ok({ok:true,token:'DOC-'+c,nombre:'Coordinación ficticia',codigoEspecialidad:c});}};return x;}}};
</script><script>'''+ui+'</script>'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in [320,360,1024]:
        page=b.new_page(viewport={'width':width,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html);page.evaluate('aplicarSeguridadUI()')
        page.get_by_role('button',name='Evaluar como coordinador',exact=True).click()
        page.get_by_label('Especialidad que va a evaluar').select_option('CCI')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.get_by_role('button',name='Abrir estudiantes').click()
        assert page.evaluate('TOKEN_SESION')=='DOC-CCI'
        page.get_by_role('button',name='Cambiar especialidad').click()
        page.get_by_label('Especialidad que va a evaluar').select_option('ECSC');page.get_by_role('button',name='Abrir estudiantes').click()
        assert page.evaluate('TOKEN_SESION')=='DOC-ECSC'
        assert page.evaluate('calls.filter(x=>x[0]==="enter").every(x=>x[1]==="ADMIN-TOKEN")')
        page.evaluate('document.body.insertAdjacentHTML("beforeend",\'<div class="pps-step-dialog"></div>\')')
        page.get_by_role('button',name='Volver a coordinación').click();assert page.evaluate('TOKEN_SESION')=='DOC-ECSC'
        page.evaluate('document.querySelector(".pps-step-dialog").remove()')
        page.get_by_role('button',name='Volver a coordinación').click();assert page.evaluate('TOKEN_SESION')=='ADMIN-TOKEN'
        page.evaluate('deny=true');page.get_by_role('button',name='Evaluar como coordinador',exact=True).click()
        assert page.evaluate('alerts.includes("Sesión expirada")')
        page.evaluate('deny=false');page.get_by_role('button',name='Evaluar como coordinador',exact=True).click();page.get_by_role('button',name='Abrir estudiantes').click()
        page.evaluate('cerrarSesionInterna()');assert page.evaluate('calls.at(-1)')==['logout','ADMIN-TOKEN'];assert page.locator('#ppsCoordVolver').count()==0
        assert not errors,errors
        print('PASS:',width,'px: acceso, cambio, retorno, errores, bloqueo con formulario abierto y cierre de sesión')
        page.close()
    b.close()
