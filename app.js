'use strict';
const PORTAL_URL='https://script.google.com/macros/s/AKfycbwQ9x6TxoBpIgh1u15-5anOOsLEGmP2mypSJp3SU8qNYkFaG5KsOE639YhoZzcRNWz_XA/exec';
const $=id=>document.getElementById(id);
let installPrompt=null;
let frameHasStarted=false;
let slowTimer;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function openPortal(){
  if(!navigator.onLine){
    $('offline').hidden=false;
    return;
  }
  // Abrir Apps Script como navegación principal evita que google.script.run
  // quede atrapado dentro de un iframe de GitHub Pages en algunos móviles.
  window.location.assign(PORTAL_URL);
}
function loadPortal(){
  clearTimeout(slowTimer);
  $('frameLoading').hidden=false;
  $('frameHelp').hidden=true;
  frameHasStarted=true;
  $('appFrame').src=PORTAL_URL;
  slowTimer=setTimeout(()=>{$('frameLoading').hidden=true;$('frameHelp').hidden=false;},20000);
}
function installState(){
  if(standalone()){
    $('install').hidden=true;
    $('installStatus').textContent='PPS 2026 está abierta como aplicación.';
  }
}
async function requestInstall(){
  if(installPrompt){
    const pending=installPrompt;
    installPrompt=null;
    $('install').disabled=true;
    try{
      await pending.prompt();
      const outcome=await pending.userChoice;
      $('installStatus').textContent=outcome.outcome==='accepted'?'Solicitud de instalación aceptada. Espere la confirmación de su dispositivo.':'Puede instalar PPS 2026 cuando lo desee.';
    }catch{
      $('installStatus').textContent='Abra el menú de su navegador y busque la opción de instalación.';
    }finally{$('install').disabled=false;}
    return;
  }
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  $('helpText').textContent=ios?'En Safari, abra el menú Compartir, seleccione «Agregar a pantalla de inicio» y confirme con «Agregar».':'En Chrome o Edge, abra el menú del navegador y busque «Instalar aplicación» o «Agregar a pantalla de inicio». Confirme la instalación cuando aparezca.';
  $('installHelp').showModal();
}
function connectionState(){
  $('offline').hidden=navigator.onLine;
  if(navigator.onLine&&!$('portal').hidden&&!frameHasStarted)loadPortal();
}
$('openApp').addEventListener('click',openPortal);
$('backHome').addEventListener('click',()=>{$('portal').hidden=true;$('welcome').hidden=false;$('openApp').focus();});
$('install').addEventListener('click',requestInstall);
for(const id of ['closeHelp','doneHelp'])$(id).addEventListener('click',()=>$('installHelp').close());
$('retry').addEventListener('click',()=>{connectionState();if(navigator.onLine&&!$('portal').hidden)loadPortal();});
$('appFrame').addEventListener('load',()=>{
  if(!frameHasStarted)return;
  clearTimeout(slowTimer);
  $('frameLoading').hidden=true;
  $('frameHelp').hidden=true;
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('installStatus').textContent='Su navegador permite instalar PPS 2026. Pulse «Instalar en mi dispositivo».';});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('install').hidden=true;$('installStatus').textContent='PPS 2026 se instaló en su dispositivo.';});
window.addEventListener('online',connectionState);
window.addEventListener('offline',connectionState);
window.matchMedia('(display-mode: standalone)').addEventListener('change',installState);
installState();
connectionState();
if(standalone()){
  // En modo instalado entramos directamente al portal real para mantener
  // la comunicación nativa de Google Apps Script.
  openPortal();
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{
    $('installStatus').textContent='Puede entrar al portal. La preparación de la instalación no se completó; recargue cuando tenga conexión.';
  });
}
