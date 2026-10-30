/* Impresión de revisión: misma referencia por bloque y mismas claves de respuesta. */
(function(){
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.ppsEvalContenidoImpresion=function(data,answers){
    let rows='',last='';
    (data.criterios||[]).forEach((_,i)=>{
      const ref=ppsEvalReferenciaBloque(data.criterios,i,data.instrumento);
      if(ref.bloque!==last){last=ref.bloque;rows+='<tr class="block"><th colspan="6">'+escape(ref.nombre)+'</th></tr>';}
      rows+='<tr><td>'+ref.numero+'</td><td><strong>'+escape(ref.texto)+'</strong>'+(ref.descripcion?'<p>'+escape(ref.descripcion)+'</p>':'')+'</td>'+['2','1','0','NA'].map(value=>'<td class="score">'+(String(answers[i])===value?'X':'')+'</td>').join('')+'</tr>';
    });
    const provenance=data.instrumento==='IEPP-01-EC'?'<p>Textos comunes: referencia IEPP-01-EC 2025. Equivalencia con 2026 pendiente de validar.</p>':'';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Revisión de evaluación '+Number(data.numero)+'</title><style>@page{size:A4;margin:14mm}body{font:11px/1.4 Arial;color:#183c2c}table{width:100%;border-collapse:collapse}td,th{border:1px solid #9caea3;padding:6px;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid}.block{background:#eaf3ed}.score{width:22px;text-align:center}td p{white-space:pre-wrap;margin:4px 0}h1{font-size:18px}</style></head><body><h1>Evaluación '+Number(data.numero)+' · '+escape(data.instrumento)+'</h1><p>'+escape(data.estudiante)+' · '+escape(data.empresa||'')+'</p><p>Vista de revisión · Estado: '+escape(data.estado||'Sin iniciar')+'</p>'+provenance+'<table><thead><tr><th>N.º</th><th>Criterio / indicador</th><th>2</th><th>1</th><th>0</th><th>N/A</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>';
  };
  window.ppsEvalImprimirBloques=function(data){
    const panel=ppsEvalPanel(),answers={};if(panel.ppsMobileRefresh)panel.ppsMobileRefresh();
    panel.querySelectorAll('[data-criterio]').forEach(el=>{if(el.value!=='')answers[el.dataset.criterio]=el.value;});
    const popup=window.open('','_blank');
    if(!popup){panel.querySelector('[data-pps-validation]').textContent='Permita abrir la vista de impresión en su navegador.';return;}
    popup.opener=null;popup.document.open();popup.document.write(ppsEvalContenidoImpresion(data,answers));popup.document.close();
    popup.addEventListener('load',()=>{popup.focus();popup.print();},{once:true});
  };
})();
