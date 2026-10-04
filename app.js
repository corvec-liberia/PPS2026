'use strict';

const PORTAL_URL='https://script.google.com/macros/s/AKfycbwQ9x6TxoBpIgh1u15-5anOOsLEGmP2mypSJp3SU8qNYkFaG5KsOE639YhoZzcRNWz_XA/exec';
const $=id=>document.getElementById(id);

let installPrompt=null;
let frameStarted=false;
let portalReady=false;
let progressTimer=null;
let longWaitTimer=null;
let progressIndex=0;

const progressStages=[
  [8,'Iniciando aplicación…','Preparando la interfaz de PPS 2026.'],
  [22,'Conectando con Google…','Abriendo el portal institucional.'],
  [42,'Validando sesión…','Estableciendo la conexión segura con Apps Script.'],
  [62,'Cargando acceso…','Preparando el formulario y los servicios del portal.'],
  [78,'Sincronizando información…','La primera apertura puede tardar un poco más.'],
  [90,'Casi listo…','Esperando la respuesta final del portal.'],
  [94,'Todavía trabajando…','Google está tardando más de lo normal, pero la aplicación sigue conectando.']
];

const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

function setMode(){
  const badge=$('modeBadge');
  if(standalone()){
    if(badge){badge.textContent='Aplicación instalada';badge.classList.add('installed');}
    $('install').hidden=true;
    $('installStatus').textContent='PPS 2026 está funcionando en modo aplicación.';
  }else{
    if(badge){badge.textContent='Modo navegador';badge.classList.remove('installed');}
    $('installStatus').textContent='Para abrir sin barra del navegador, instale PPS 2026 en su dispositivo.';
  }
}

function setProgress(stage){
  const [pct,step,detail]=stage;
  $('appProgressBar').style.width=pct+'%';
  $('appProgressPct').textContent=pct+'%';
  $('appProgressStep').textContent=step;
  $('loadingDetail').textContent=detail;
}

function startProgress(){
  clearInterval(progressTimer);
  clearTimeout(longWaitTimer);
  progressIndex=0;
  setProgress(progressStages[0]);
  progressTimer=setInterval(()=>{
    if(progressIndex<progressStages.length-1){
      progressIndex++;
      setProgress(progressStages[progressIndex]);
    }
  },1500);
  longWaitTimer=setTimeout(()=>{
    $('directLink').hidden=false;
    $('loadingTitle').textContent='La conexión está tardando';
    $('loadingDetail').textContent='Puede seguir esperando. Si lo necesita, también puede abrir el portal directamente.';
  },18000);
}

function stopProgress(){
  clearInterval(progressTimer);
  clearTimeout(longWaitTimer);
  $('appProgressBar').style.width='100%';
  $('appProgressPct').textContent='100%';
  $('appProgressStep').textContent='Portal listo';
  $('loadingDetail').textContent='Abriendo su sesión…';
  setTimeout(()=>{
    $('frameLoading').classList.add('ready');
    setTimeout(()=>{$('frameLoading').hidden=true;},260);
  },180);
}

function warmPortal(){
  if(frameStarted||!navigator.onLine)return;
  frameStarted=true;
  $('appFrame').src=PORTAL_URL;
}

function openPortal(){
  if(!navigator.onLine){
    $('offline').hidden=false;
    return;
  }
  $('welcome').hidden=true;
  $('portal').hidden=false;
  $('frameLoading').hidden=false;
  $('frameLoading').classList.remove('ready');
  if(portalReady){
    stopProgress();
  }else{
    startProgress();
    warmPortal();
  }
  $('backHome').focus();
}

function backHome(){
  if(standalone())return;
  $('portal').hidden=true;
  $('welcome').hidden=false;
  $('openApp').focus();
}

async function requestInstall(){
  if(installPrompt){
    const pending=installPrompt;
    installPrompt=null;
    $('install').disabled=true;
    try{
      await pending.prompt();
      const outcome=await pending.userChoice;
      $('installStatus').textContent=outcome.outcome==='accepted'
        ?'Instalación aceptada. Cuando aparezca el ícono, ábralo desde la pantalla de inicio.'
        :'Puede instalar PPS 2026 cuando lo desee.';
    }catch(e){
      showInstallHelp();
    }finally{
      $('install').disabled=false;
    }
    return;
  }
  showInstallHelp();
}

function showInstallHelp(){
  const ua=navigator.userAgent||'';
  const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const edge=/EdgA|EdgiOS|Edg\//.test(ua);
  if(ios){
    $('helpText').textContent='En Safari, pulse Compartir → Agregar a pantalla de inicio → Agregar.';
  }else if(edge){
    $('helpText').textContent='Está usando Microsoft Edge. Puede instalar la PWA desde el menú de Edge. Si prefiere que quede asociada a Chrome, abra primero este mismo enlace manualmente en Chrome y elija Instalar aplicación.';
  }else{
    $('helpText').textContent='En Chrome, abra el menú ⋮ y elija Instalar aplicación o Agregar a pantalla de inicio. Después ábrala desde el nuevo ícono.';
  }
  $('installHelp').showModal();
}

function connectionState(){
  const online=navigator.onLine;
  $('offline').hidden=online;
  $('connectionDot').classList.toggle('offline',!online);
  if(online&&!frameStarted) warmPortal();
}

$('openApp').addEventListener('click',openPortal);
$('backHome').addEventListener('click',backHome);
$('install').addEventListener('click',requestInstall);
$('retry').addEventListener('click',()=>{connectionState();if(navigator.onLine)openPortal();});
for(const id of ['closeHelp','doneHelp'])$(id).addEventListener('click',()=>$('installHelp').close());

$('appFrame').addEventListener('load',()=>{
  if(!frameStarted)return;
  portalReady=true;
  if(!$('portal').hidden) stopProgress();
});

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  $('installStatus').textContent='Su dispositivo permite instalar PPS 2026 como aplicación. Pulse «Instalar aplicación».';
});

window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  $('install').hidden=true;
  $('installStatus').textContent='PPS 2026 se instaló correctamente. Ábrala desde su ícono.';
});

window.addEventListener('online',connectionState);
window.addEventListener('offline',connectionState);
window.matchMedia('(display-mode: standalone)').addEventListener('change',()=>{
  setMode();
  if(standalone()) openPortal();
});

setMode();
connectionState();

// Precalentar Apps Script en segundo plano reduce notablemente la espera al tocar «Abrir».
if('requestIdleCallback' in window){
  requestIdleCallback(()=>warmPortal(),{timeout:1200});
}else{
  setTimeout(warmPortal,450);
}

// Una PWA instalada entra directamente al portal manteniendo el origen GitHub y display: standalone.
if(standalone()) openPortal();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js?v=8',{scope:'./'}).then(reg=>{
    reg.update().catch(()=>{});
  }).catch(()=>{
    $('installStatus').textContent='El portal funciona, pero no se pudo preparar la instalación. Recargue con conexión estable.';
  });
}
