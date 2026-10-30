/* PPS2026: acceso docente desde coordinación autenticada. Sin altas ni migraciones. */
function ppsCoordinacionUsuario_(token) {
  const u = validarSesionLogin_(String(token || ''));
  if (!u || String(u.ROL).toUpperCase() !== 'ADMIN')
    throw new Error('Ingrese con su sesión de Coordinación vigente.');
  if (!u.ID_USUARIO) throw new Error('La cuenta de Coordinación no tiene identificador.');
  return u;
}
function apiEspecialidadesEvaluacionCoordinacionPPS(token) {
  ppsCoordinacionUsuario_(token);
  return {ok:true, especialidades:Object.keys(PPS_EVAL_CATALOGO).map(codigo => ({
    codigo:codigo, nombre:PPS_EVAL_CATALOGO[codigo].especialidad_criterios || codigo
  }))};
}
function apiEntrarEvaluacionesCoordinacionPPS(token, codigo) {
  const u = ppsCoordinacionUsuario_(token);
  const cod = String(codigo || '').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(PPS_EVAL_CATALOGO, cod))
    throw new Error('Seleccione una especialidad con instrumento disponible.');
  // Reutiliza la identidad docente solo con coincidencia inequívoca; nunca por nombre.
  const cedula = normalizarCedulaDocPPS_(u.CEDULA);
  const correo = String(u.CORREO_LOGIN || '').trim().toLowerCase();
  const docentes = objsPPS_(PPS26_DOCENTE_CFG_V3.DOCENTES).filter(d =>
    (cedula && normalizarCedulaDocPPS_(d.CEDULA) === cedula) ||
    (correo && String(d.CORREO || '').trim().toLowerCase() === correo));
  if (docentes.length > 1) throw new Error('Hay registros docentes duplicados. Revise antes de continuar.');
  const d = docentes[0];
  if (d && (normPPS_(d.ESTADO) !== 'activa' || !d.ID_DOCENTE ||
            String(d.ID_DOCENTE) === PPS26_DOCENTE_CFG_V3.DEMO))
    throw new Error('El registro docente asociado no está habilitado.');
  const id = d ? String(d.ID_DOCENTE) : 'COORD-' + ppsV11Hash_(String(u.ID_USUARIO));
  const nombre = String(u.NOMBRE_COMPLETO || '').trim();
  if (!nombre) throw new Error('La cuenta no tiene nombre de responsable.');
  const t = 'DOC-COORD-' + Utilities.getUuid();
  CacheService.getScriptCache().put(t, JSON.stringify({
    idDocente:id, nombre:nombre, rol:'DOCENTE', codigoEspecialidad:cod, demo:false,
    coordinacionToken:String(token), coordinacionUsuario:String(u.ID_USUARIO)
  }), 21600);
  return {ok:true, token:t, rol:'DOCENTE', nombre:nombre, idDocente:id,
    codigoEspecialidad:cod, demo:false, coordinacion:true};
}
function ppsValidarContextoCoordinacion_(c) {
  if (c.coordinacionToken) {
    const u = ppsCoordinacionUsuario_(c.coordinacionToken);
    if (String(u.ID_USUARIO) !== String(c.coordinacionUsuario))
      throw new Error('La identidad de Coordinación cambió. Ingrese nuevamente.');
  }
  return c;
}
