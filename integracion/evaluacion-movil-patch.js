/* PPS 2026 - Vista móvil de evaluaciones.
 * Incluir DESPUÉS del script que define ppsEvalDibujar y ppsEvalGuardar.
 * Conserva la API y el mecanismo de guardado existentes.
 */
(function(){
const css=document.createElement('style');css.textContent=`
#ppsEvalPanel .pps-eval-dialog{width:min(100%,560px);max-height:96dvh;overflow:auto;border-radius:20px}
#ppsEvalPanel .pps-eval-mobile-card{background:#fff;border:1px solid #d8e6dc;border-radius:18px;padding:18px;margin:12px 0}
#ppsEvalPanel .pps-eval-mobile-progress{height:9px;background:#dfe9e1;border-radius:12px;overflow:hidden}
#ppsEvalPanel .pps-eval-mobile-progress span{display:block;height:100%;background:#43835d}
#ppsEvalPanel .pps-eval-mobile-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#ppsEvalPanel .pps-eval-mobile-options button{padding:15px 8px;min-height:64px;border:2px solid #d7e4da;border-radius:14px;background:white;font:600 16px system-ui;color:#244637}
#ppsEvalPanel .pps-eval-mobile-options button[aria-pressed=true]{background:#d6efdf;border-color:#39825a}
#ppsEvalPanel .pps-eval-mobile-actions{display:flex;gap:10px;margin:12px 0}
#ppsEvalPanel .pps-eval-mobile-actions button{flex:1;min-height:48px}
#ppsEvalPanel .pps-eval-items{display:none}
`;document.head.appendChild(css);
const original=window.ppsEvalDibujar;if(typeof original!=='function')return;
let current=0;
window.ppsEvalDibujar=function(d){
 original(d);
 current=0;
 const panel=ppsEvalPanel(),dialog=panel.querySelector('.pps-eval-dialog');
 if(!dialog||!Array.isArray(d.criterios))return;
 const holder=document.createElement('div');holder.className='pps-eval-mobile-card';
 const progress=document.createElement('p'),track=document.createElement('div'),fill=document.createElement('span'),title=document.createElement('h3'),options=document.createElement('div'),nav=document.createElement('div');
 track.className='pps-eval-mobile-progress';track.append(fill);options.className='pps-eval-mobile-options';nav.className='pps-eval-mobile-actions';
 const back=document.createElement('button'),next=document.createElement('button');back.type=next.type='button';back.className=next.className='btn secondary';back.textContent='Anterior';next.textContent='Siguiente';nav.append(back,next);
 holder.append(progress,track,title,options,nav);
 const items=dialog.querySelector('.pps-eval-items');items.before(holder);
 const selects=[...items.querySelectorAll('select[data-criterio]')];
 const labels=[['2','2 · Logrado'],['1','1 · Por mejorar'],['0','0 · No logrado'],['NA','No aplica']];
 function render(){
  progress.textContent='Criterio '+(current+1)+' de '+selects.length;
  fill.style.width=((current+1)/selects.length*100)+'%';
  title.textContent=d.criterios[current];options.replaceChildren();
  const sel=selects[current];
  for(const [value,label] of labels){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(sel.value===value));b.disabled=sel.disabled;
   b.onclick=()=>{sel.value=value;sel.dispatchEvent(new Event('change',{bubbles:true}));render()};options.append(b);
  }
  back.disabled=current===0;next.textContent=current===selects.length-1?'Revisar respuestas':'Siguiente';
 }
 back.onclick=()=>{if(current>0){current--;render()}};
 next.onclick=()=>{
  if(current<selects.length-1){current++;render();return}
  const pending=selects.filter(s=>!s.value).length;
  const text='Revisión: '+(selects.length-pending)+' de '+selects.length+' criterios respondidos. '+pending+' pendientes.';
  alert(text+'\nUse Guardar borrador o Finalizar evaluación en la parte inferior.');
 };
 if(selects.length)render();else holder.remove();
};
})();