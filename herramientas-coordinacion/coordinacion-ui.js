/* PPS2026: coordinación conserva su acceso; el docente usa el circuito original. */
(function () {
  let adminToken = '', busy = false;
  const originalSecurity = aplicarSeguridadUI;
  function button(id, text, action, host) {
    let b = document.getElementById(id);
    if (!b) {
      b = document.createElement('button'); b.id = id; b.type = 'button';
      b.className = 'btn secondary'; b.textContent = text;
      b.addEventListener('click', action); host.appendChild(b);
    }
    return b;
  }
  aplicarSeguridadUI = function () {
    originalSecurity.apply(this, arguments);
    const host = document.getElementById('securityBanner');
    if (!host) return;
    const b = button('ppsCoordEvaluar', 'Evaluar como coordinador', selectSpecialty, host.parentElement);
    b.style.display = String(ROL_SESION).toUpperCase() === 'ADMIN' ? '' : 'none';
  };
  function selectSpecialty() {
    if (busy || document.querySelector('.pps-step-dialog')) return;
    const token = adminToken || TOKEN_SESION;
    busy = true;
    google.script.run.withSuccessHandler(r => {
      busy = false;
      if (!r || !r.ok || !Array.isArray(r.especialidades)) { alert('No se pudieron cargar las especialidades.'); return; }
      const dialog = document.createElement('dialog');
      dialog.style.cssText = 'width:min(90vw,520px);box-sizing:border-box;border:1px solid #bbb;border-radius:16px;padding:20px;';
      const label = document.createElement('label'); label.textContent = 'Especialidad que va a evaluar';
      const select = document.createElement('select'); select.id = 'ppsCoordEspecialidad';
      select.style.cssText = 'display:block;width:100%;min-height:48px;margin:12px 0;';
      label.htmlFor = select.id;
      r.especialidades.forEach(x => { const o=document.createElement('option');o.value=x.codigo;o.textContent=x.nombre;select.appendChild(o); });
      const status=document.createElement('p');status.setAttribute('role','status');
      const enter=document.createElement('button');enter.type='button';enter.className='btn primary';enter.textContent='Abrir estudiantes';
      const cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary';cancel.textContent='Cancelar';
      cancel.onclick=()=>dialog.close();
      enter.onclick=()=>{
        enter.disabled=true;cancel.disabled=true;status.textContent='Verificando acceso…';
        google.script.run.withSuccessHandler(data=>{
          if(!data || !data.ok){enter.disabled=false;cancel.disabled=false;status.textContent='No se pudo abrir el módulo.';return;}
          adminToken=token;DOCENTE_DEMO=false;abrirPortalDocentePPS(data);dialog.close();
          const header=document.getElementById('securityBanner');
          document.getElementById('ppsCoordEvaluar')?.style.setProperty('display','none');
          header.textContent='Coordinación · Evaluaciones · '+data.nombre+' · '+data.codigoEspecialidad;
          const host=header.parentElement;
          button('ppsCoordCambiar','Cambiar especialidad',selectSpecialty,host).style.display='';
          button('ppsCoordVolver','Volver a coordinación',()=>{
            if(document.querySelector('.pps-step-dialog')){alert('Cierre la evaluación después de confirmar su guardado.');return;}
            TOKEN_SESION=adminToken;ROL_SESION='ADMIN';DOCENTE_DEMO=false;adminToken='';
            document.getElementById('ppsCoordCambiar').style.display='none';
            document.getElementById('ppsCoordVolver').style.display='none';cargarSistema();
          },host).style.display='';
        }).withFailureHandler(e=>{enter.disabled=false;cancel.disabled=false;status.textContent=e.message||'No se pudo verificar el acceso.';})
          .apiEntrarEvaluacionesCoordinacionPPS(token,select.value);
      };
      dialog.append(label,select,status,enter,cancel);dialog.addEventListener('close',()=>dialog.remove());
      document.body.appendChild(dialog);dialog.showModal();select.focus();
    }).withFailureHandler(e=>{busy=false;alert(e.message||'No se pudieron consultar las especialidades.');})
      .apiEspecialidadesEvaluacionCoordinacionPPS(token);
  }
  const originalLogout=cerrarSesionInterna;
  cerrarSesionInterna=function(){
    if(adminToken){TOKEN_SESION=adminToken;adminToken='';}
    for(const id of ['ppsCoordEvaluar','ppsCoordCambiar','ppsCoordVolver'])document.getElementById(id)?.remove();
    return originalLogout.apply(this,arguments);
  };
})();
