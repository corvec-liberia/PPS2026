/* Numeración visual por bloque. No cambia las claves globales de RESPUESTAS_JSON. */
(function(){
  function block(text){
    if(/^COMPETENCIAS GENERICAS\s*-\s*/.test(text))return {id:'genericas',nombre:'Competencias genéricas',prefijo:/^COMPETENCIAS GENERICAS\s*-\s*/};
    if(/^COMPETENCIAS PARA EL DESARROLLO HUMANO\s*-\s*/.test(text))return {id:'desarrollo-humano',nombre:'Competencias para el desarrollo humano',prefijo:/^COMPETENCIAS PARA EL DESARROLLO HUMANO\s*-\s*/};
    return {id:'especificas',nombre:'Competencias específicas',prefijo:null};
  }
  window.ppsEvalReferenciaBloque=function(criteria,index,instrumento){
    const raw=String(criteria[index]||''),current=block(raw);let ordinal=0,total=0;
    criteria.forEach((text,i)=>{if(block(String(text)).id===current.id){total++;if(i<=index)ordinal++;}});
    const reference={bloque:current.id,nombre:current.nombre,numero:ordinal,total:total,
      texto:current.prefijo?raw.replace(current.prefijo,''):raw,indiceGlobal:index,descripcion:'',documentado:false};
    const source=window.PPS_EVAL_TEXTOS_DOCUMENTADOS;
    if(!source||instrumento!==source.instrumento)return reference;
    const rows=current.id==='genericas'?source.genericas:current.id==='desarrollo-humano'?source.desarrolloHumano:null;
    if(!rows||rows.length!==total)return reference;
    const row=rows[ordinal-1];
    const normalize=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
    if(!row||row.numero!==ordinal||normalize(reference.texto)!==normalize(row.tituloAnterior))return reference;
    reference.texto=current.id==='genericas'?row.indicador:row.encabezado;
    reference.descripcion=current.id==='desarrollo-humano'?row.descripcion:'';
    reference.documentado=true;
    return reference;
  };
})();
