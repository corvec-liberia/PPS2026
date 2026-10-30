/* Numeración visual por bloque. No cambia las claves globales de RESPUESTAS_JSON. */
(function(){
  function block(text){
    if(/^COMPETENCIAS GENERICAS\s*-\s*/.test(text))return {id:'genericas',nombre:'Competencias genéricas',prefijo:/^COMPETENCIAS GENERICAS\s*-\s*/};
    if(/^COMPETENCIAS PARA EL DESARROLLO HUMANO\s*-\s*/.test(text))return {id:'desarrollo-humano',nombre:'Competencias para el desarrollo humano',prefijo:/^COMPETENCIAS PARA EL DESARROLLO HUMANO\s*-\s*/};
    return {id:'especificas',nombre:'Competencias específicas',prefijo:null};
  }
  window.ppsEvalReferenciaBloque=function(criteria,index){
    const raw=String(criteria[index]||''),current=block(raw);let ordinal=0,total=0;
    criteria.forEach((text,i)=>{if(block(String(text)).id===current.id){total++;if(i<=index)ordinal++;}});
    return {bloque:current.id,nombre:current.nombre,numero:ordinal,total:total,
      texto:current.prefijo?raw.replace(current.prefijo,''):raw,indiceGlobal:index};
  };
})();
