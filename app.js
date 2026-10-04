'use strict';
const PORTAL_URL='https://script.google.com/macros/s/AKfycbwQ9x6TxoBpIgh1u15-5anOOsLEGmP2mypSJp3SU8qNYkFaG5KsOE639YhoZzcRNWz_XA/exec';
const APP_URL='https://corvec-liberia.github.io/PPS2026/';
const $=id=>document.getElementById(id);

let deferredInstall=null;
let frameStarted=false;
let portalReady=false;
let progressTimer=null;
let longWaitTimer=null;
let progressIndex=0;
const INSTALLED_KEY='pps2026-installed';
const wasInstalled=()=>localStorage.getItem(INSTALLED_KEY)==='1';
const markInstalled=()=>localStorage.setItem(INSTALLED_KEY,'1');

const stages=[
 [8,'Iniciando aplicación…','Preparando la interfaz de PPS 2026.'],
 [22,'Conectando con Google…','Abriendo el portal institucional.'],
 [42,'Validando sesión…','Estableciendo la conexión segura con Apps Script.'],
 [62,'Cargando acceso…','Preparando el formulario y los servicios del portal.'],
 [78,'Sincronizando información…','La primera apertura puede tardar un poco más.'],
 [90,'Casi listo…','Esperando la respuesta final del portal.'],
 [94,'Todavía trabajando…','Google está tardando más de lo normal, pero la aplicación sigue conectando.']
];

const ua=navigator.userAgent||'';
const isAndroid=/Android/i.test(ua);
const isIOS=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isChrome=/Chrome\//i.test(ua)&&!/EdgA|EdgiOS|Edg\//i.test(ua)&&!/OPR\//i.test(ua);
const isEdge=/EdgA|EdgiOS|Edg\//i.test(ua);
const isInApp=/FBAN|FBAV|Instagram|Line\/|WhatsApp|wv\)/i.test(ua);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

function chromeIntent(){
  const path='corvec-liberia.github.io/PPS2026/?install=1';
  return 'intent://'+path+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(APP_URL+'?install=1')+';end';
}

function feedback(text,type=''){
  $('feedbackText').textContent=text;
  $('feedbackDot').className='feedback-dot'+(type?' '+type:'');
}

function configureInstaller(){
  if(standalone()){
    openPortal();
    return;
  }

  if(wasInstalled()){
    $('installPrimaryTitle').textContent='Abrir PPS 2026';
    $('installPrimarySub').textContent='La aplicación ya está instalada';
    $('installPrimaryIcon').textContent='↗';
    feedback('PPS 2026 ya está instalada en este dispositivo.','ok');
    return;
  }

  if(isAndroid && !isChrome){
    $('installPrimaryTitle').textContent='Abrir en Chrome para instalar';
    $('installPrimarySub').textContent=isEdge?'Ahora está abierto en Edge':'Chrome permite la instalación directa';
    $('installPrimaryIcon').textContent='↗';
    feedback('Para una instalación más sencilla, abriremos esta página directamente en Chrome.');
    return;
  }

  if(isIOS){
    $('installPrimaryTitle').textContent='Cómo instalar en iPhone';
    $('installPrimarySub').textContent='Safari → Compartir → Agregar a inicio';
    $('installPrimaryIcon').textContent='+';
    feedback('En iPhone la confirmación final se realiza desde Safari.');
    return;
  }

  if(deferredInstall){
    $('installPrimaryTitle').textContent='Instalar PPS 2026';
    $('installPrimarySub').textContent='Toque una vez y confirme';
    feedback('Lista para instalarse en este dispositivo.','ok');
    return;
  }

  if(isChrome){
    $('installPrimaryTitle').textContent='Instalar PPS 2026';
    $('installPrimarySub').textContent='Preparando instalador…';
    feedback('Chrome está preparando la opción de instalación.');
    return;
  }

  $('installPrimaryTitle').textContent='Instalar PPS 2026';
  $('installPrimarySub').textContent='Ver instrucciones de este dispositivo';
  feedback('Le guiaremos según el navegador que esté utilizando.');
}

async function installPrimary(){
  if(standalone()){ openPortal(); return; }

  if(wasInstalled()){
    // Evita volver a mostrar instrucciones de instalación. En navegador,
    // entra directamente al portal; desde el ícono instalado se abre en modo app.
    openPortal();
    return;
  }

  if(isAndroid && !isChrome){
    window.location.href=chromeIntent();
    return;
  }

  if(isIOS){
    showManual();
    return;
  }

  if(deferredInstall){
    const prompt=deferredInstall;
    deferredInstall=null;
    feedback('Confirme la instalación en la ventana del sistema.');
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice.outcome==='accepted'){
      markInstalled();
      if($('manualHelp').open) $('manualHelp').close();
      feedback('Instalación completada. Abriendo PPS 2026…','ok');
      $('installPrimaryTitle').textContent='Abrir PPS 2026';
      $('installPrimarySub').textContent='La aplicación ya está instalada';
      $('installPrimaryIcon').textContent='↗';
      setTimeout(()=>openPortal(),350);
    }else{
      feedback('La instalación fue cancelada. Puede intentarlo nuevamente.');
    }
    configureInstaller();
    return;
  }

  showManual();
}

function showManual(){
  const dialog=$('manualHelp');
  const action=$('manualAction');
  action.hidden=true;
  if(isIOS){
    $('manualText').textContent='Abra esta página en Safari. Pulse el botón Compartir, seleccione «Agregar a pantalla de inicio» y después «Agregar».';
  }else if(isAndroid && !isChrome){
    $('manualText').textContent='Para que la instalación sea más sencilla, abra esta misma página en Google Chrome y vuelva a tocar «Instalar PPS 2026».';
    action.hidden=false;
  }else if(isChrome){
    $('manualText').textContent='Chrome todavía no ha habilitado el instalador automático. Espere unos segundos y vuelva a tocar el botón. Si aparece el menú de Chrome, use «Instalar aplicación».';
  }else{
    $('manualText').textContent='Use la opción «Instalar aplicación» o «Agregar a pantalla de inicio» de su navegador.';
  }
  dialog.showModal();
}

function setProgress(stage){
  const [pct,step,detail]=stage;
  $('appProgressBar').style.width=pct+'%';
  $('appProgressPct').textContent=pct+'%';
  $('appProgressStep').textContent=step;
  $('loadingDetail').textContent=detail;
}
function startProgress(){
  clearInterval(progressTimer);clearTimeout(longWaitTimer);
  progressIndex=0;setProgress(stages[0]);
  progressTimer=setInterval(()=>{if(progressIndex<stages.length-1){progressIndex++;setProgress(stages[progressIndex]);}},1500);
  longWaitTimer=setTimeout(()=>{
    $('directLink').hidden=false;
    $('loadingTitle').textContent='La conexión está tardando';
    $('loadingDetail').textContent='Puede seguir esperando; el portal continúa intentando conectar.';
  },18000);
}
function stopProgress(){
  clearInterval(progressTimer);clearTimeout(longWaitTimer);
  $('appProgressBar').style.width='100%';$('appProgressPct').textContent='100%';
  $('appProgressStep').textContent='Portal listo';$('loadingDetail').textContent='Abriendo su sesión…';
  setTimeout(()=>{$('frameLoading').classList.add('ready');setTimeout(()=>{$('frameLoading').hidden=true;},260);},180);
}
function warmPortal(){
  if(frameStarted||!navigator.onLine)return;
  frameStarted=true;$('appFrame').src=PORTAL_URL;
}
function openPortal(){
  if(!navigator.onLine){$('offline').hidden=false;return;}
  $('installer').hidden=true;$('portal').hidden=false;
  $('frameLoading').hidden=false;$('frameLoading').classList.remove('ready');
  if(portalReady) stopProgress(); else {startProgress();warmPortal();}
}
function connectionState(){
  const online=navigator.onLine;
  $('offline').hidden=online;
  $('connectionDot').classList.toggle('offline',!online);
}
$('installPrimary').addEventListener('click',installPrimary);
$('browserFallback').addEventListener('click',openPortal);
$('manualClose').addEventListener('click',()=>$('manualHelp').close());
$('manualDone').addEventListener('click',()=>$('manualHelp').close());
$('manualAction').addEventListener('click',()=>{window.location.href=chromeIntent();});
$('retry').addEventListener('click',()=>{connectionState();if(navigator.onLine)openPortal();});

$('appFrame').addEventListener('load',()=>{
  if(!frameStarted)return;
  portalReady=true;
  if(!$('portal').hidden)stopProgress();
});

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstall=event;
  configureInstaller();
});

window.addEventListener('appinstalled',()=>{
  deferredInstall=null;
  markInstalled();
  if($('manualHelp').open) $('manualHelp').close();
  feedback('PPS 2026 se instaló correctamente. Abriendo la aplicación…','ok');
  $('installPrimaryTitle').textContent='Abrir PPS 2026';
  $('installPrimarySub').textContent='La aplicación ya está instalada';
  $('installPrimaryIcon').textContent='↗';
  setTimeout(()=>openPortal(),350);
});

window.addEventListener('online',connectionState);
window.addEventListener('offline',connectionState);
window.matchMedia('(display-mode: standalone)').addEventListener('change',()=>{if(standalone())openPortal();});

connectionState();
configureInstaller();

// Precarga suave del portal para reducir la espera sin bloquear el instalador.
if('requestIdleCallback' in window)requestIdleCallback(()=>warmPortal(),{timeout:1800});
else setTimeout(warmPortal,900);

if(standalone())openPortal();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js?v=9',{scope:'./'}).then(reg=>reg.update().catch(()=>{})).catch(()=>feedback('No se pudo preparar la instalación. Verifique la conexión e intente nuevamente.','warn'));
}
