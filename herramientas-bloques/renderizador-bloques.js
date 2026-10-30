(function(){window.ppsEvalDibujar=function(d){
  const panel=ppsEvalPanel(),criteria=d.criterios||[],answers=Object.assign({},d.respuestas||{});
  const options=[['2','2 · Logrado'],['1','1 · En proceso'],['0','0 · No logrado'],['NA','No aplica']];
  let index=0;
  panel.style.display='flex';
  // Crear los controles una sola vez: ni seleccionar ni confirmar un borrador los sustituye.
  panel.innerHTML='<section class="pps-step-dialog"><header class="pps-step-header"><div><div class="pps-step-kicker"></div><h2>Evaluación '+d.numero+' · '+esc(d.instrumento)+'</h2><p>'+esc(d.estudiante)+' · '+esc(d.empresa||d.codigo)+'</p></div><button class="btn secondary" data-x>Cerrar</button></header><div class="pps-step-progress"><div><span>Posición en el instrumento</span><b></b></div><i><em></em></i></div><main class="pps-step-card"><div class="pps-step-label">Competencias específicas</div><div class="pps-step-number" style="font-size:14px;font-weight:700;color:#28563f"></div><h3></h3><p class="pps-step-description" style="font-size:18px;line-height:1.5;white-space:pre-wrap;color:#244334" hidden></p><p>Seleccione un valor. «No aplica» se excluye del cálculo.</p><p data-pps-validation role="status" aria-live="polite" style="min-height:1.4em;margin:4px 0;color:#922727;font-size:14px"></p><div class="pps-step-options">'+options.map(x=>'<label class="pps-step-option"><input type="radio" name="step" value="'+x[0]+'"><span>'+x[1]+'</span></label>').join('')+'</div></main><footer class="pps-step-footer"><button class="btn secondary" data-p>← Anterior</button><span data-pps-count></span><button class="btn primary" data-n>Siguiente →</button></footer></section>';
  const dialog=panel.querySelector('.pps-step-dialog');
  const inputs=[...dialog.querySelectorAll('input[name=step]')];
  const next=dialog.querySelector('[data-n]'),back=dialog.querySelector('[data-p]');
  const validation=dialog.querySelector('[data-pps-validation]');
  const print=document.createElement('button');print.type='button';print.className='btn secondary';print.textContent='Imprimir instrumento';print.style.cssText='margin-top:16px;flex-shrink:0';
  print.onclick=()=>ppsEvalImprimirBloques(d);dialog.querySelector('.pps-step-card').append(print);
  if(d.instrumento==='IEPP-01-EC'){
    const note=document.createElement('p');note.className='pps-document-source';note.style.cssText='font-size:12px;line-height:1.35;margin-top:6px';
    note.textContent='Textos comunes: referencia IEPP-01-EC 2025. Equivalencia con 2026 pendiente de validar.';
    dialog.querySelector('.pps-step-header>div').append(note);
  }
  function paint(){
    dialog.dataset.ppsIndex=String(index);
    const reference=ppsEvalReferenciaBloque(criteria,index,d.instrumento);
    dialog.querySelector('.pps-step-kicker').textContent='Instrumento '+d.instrumento;
    dialog.querySelector('.pps-step-label').textContent=reference.nombre;
    dialog.querySelector('.pps-step-number').textContent='Criterio '+reference.numero+' de '+reference.total;
    // Se utiliza el texto íntegro recibido del instrumento; no se abrevia ni se trunca.
    dialog.querySelector('h3').textContent=reference.texto;
    const description=dialog.querySelector('.pps-step-description');
    description.textContent=reference.descripcion;description.hidden=!reference.descripcion;
    const value=String(answers[index]===undefined?'':answers[index]);
    inputs.forEach(input=>{input.checked=input.value===value;input.parentElement.classList.toggle('selected',input.checked);});
    const progress=criteria.length?Math.round((index+1)/criteria.length*100):0;
    dialog.querySelector('.pps-step-progress b').textContent=progress+'%';
    dialog.querySelector('.pps-step-progress em').style.width=progress+'%';
    dialog.querySelector('[data-pps-count]').textContent=Object.values(answers).filter(v=>['0','1','2','NA'].includes(String(v))).length+' de '+criteria.length+' respondidos';
    back.disabled=index===0;
    next.textContent=index===criteria.length-1?'Guardar borrador':'Siguiente →';
    validation.textContent='';
    dialog.querySelector('.pps-step-card').scrollTop=0;
    if(panel.ppsMobileRefresh)panel.ppsMobileRefresh();
  }
  inputs.forEach(input=>input.addEventListener('change',()=>{
    answers[index]=input.value;
    inputs.forEach(x=>x.parentElement.classList.toggle('selected',x.checked));
    validation.textContent='';
    dialog.querySelector('[data-pps-count]').textContent=Object.values(answers).filter(v=>['0','1','2','NA'].includes(String(v))).length+' de '+criteria.length+' respondidos';
  }));
  back.onclick=()=>{if(index>0){index--;paint();}};
  next.onclick=()=>{
    if(index===criteria.length-1){ppsEvalGuardar(false);return;}
    if(d.puedeGuardar&&!d.demo&&d.estado!=='Finalizada'&&!['0','1','2','NA'].includes(String(answers[index]))){
      validation.textContent='Seleccione una opción para continuar.';
      inputs[0].focus({preventScroll:true});return;
    }
    index++;paint();
  };
  panel.ppsStepGoTo=target=>{
    if(Number.isInteger(target)&&target>=0&&target<criteria.length){index=target;paint();}
  };
  dialog.querySelector('[data-x]').onclick=ppsEvalCerrar;
  paint();
}})();
