/** PPS2026 · Evaluaciones docentes seguras sobre el respaldo de pruebas. */
const EVAL_PPS = {
  HOJA: 'EVALUACIONES_DOCENTES_2026',
  HEADERS: ['ID_EVALUACION','ID_ASIGNACION','ID_ESTUDIANTE','CODIGO_ESPECIALIDAD','INSTRUMENTO','NUMERO_EVALUACION','ID_DOCENTE','NOMBRE_DOCENTE','ESTADO','RESPUESTAS_JSON','PUNTOS_OBTENIDOS','PUNTOS_POSIBLES','PORCENTAJE_REFERENCIAL','FECHA_GUARDADO']
};

function obtenerHojaEvaluacionesPPS_() {
  const ss = SpreadsheetApp.openById(PPS2026_ID_RESPALDO_USUARIOS_);
  let hoja = ss.getSheetByName(EVAL_PPS.HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(EVAL_PPS.HOJA);
    hoja.getRange(1, 1, 1, EVAL_PPS.HEADERS.length).setValues([EVAL_PPS.HEADERS]);
    hoja.setFrozenRows(1);
  } else {
    asegurarHeadersLogin_(hoja, EVAL_PPS.HEADERS);
  }
  return hoja;
}

function listarEvaluacionesDocentesPPS_(usuarioSeguridad, asignacionesPermitidas) {
  if (!esAdminLogin_(usuarioSeguridad) && !esDocenteLogin_(usuarioSeguridad)) return [];
  const permitidas = {};
  (asignacionesPermitidas || []).forEach(function(a) { permitidas[String(a.ID_ASIGNACION || '').trim()] = true; });
  const rows = leerObjetosConFilaLogin_(obtenerHojaEvaluacionesPPS_()).map(function(r) { return r.obj; });
  return rows.filter(function(e) {
    return esAdminLogin_(usuarioSeguridad) || permitidas[String(e.ID_ASIGNACION || '').trim()];
  });
}

function apiGuardarEvaluacionDocentePPS(payload, token) {
  const usuario = validarSesionLogin_(token);
  if (!usuario) throw new Error('Sesión no válida o expirada.');
  const seguridad = convertirUsuarioLoginASeguridad_(usuario);
  if (!esAdminLogin_(seguridad) && !esDocenteLogin_(seguridad)) throw new Error('No tiene permiso para guardar evaluaciones docentes.');

  payload = payload || {};
  const idAsignacion = String(payload.ID_ASIGNACION || '').trim();
  const instrumento = String(payload.INSTRUMENTO || '').trim();
  const numero = String(payload.NUMERO_EVALUACION || '').trim();
  const estado = String(payload.ESTADO || 'Borrador').trim();
  if (!idAsignacion || !instrumento || !numero) throw new Error('Asignación, instrumento y número de evaluación son obligatorios.');
  if (['Borrador','Finalizada'].indexOf(estado) === -1) throw new Error('Estado de evaluación no válido.');

  const asignacion = buscarAsignacionPorIdLogin_(idAsignacion);
  if (!asignacion || !puedeVerAsignacionLogin_(seguridad, asignacion.obj)) throw new Error('No tiene permiso para evaluar esta asignación.');
  const puntos = Number(payload.PUNTOS_OBTENIDOS || 0);
  const posibles = Number(payload.PUNTOS_POSIBLES || 0);
  if (!isFinite(puntos) || !isFinite(posibles) || puntos < 0 || posibles < 0 || (posibles && puntos > posibles)) throw new Error('Los puntajes indicados no son válidos.');

  const respuestas = payload.RESPUESTAS && typeof payload.RESPUESTAS === 'object' ? payload.RESPUESTAS : {};
  const hoja = obtenerHojaEvaluacionesPPS_();
  const headers = asegurarHeadersLogin_(hoja, EVAL_PPS.HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const rows = leerObjetosConFilaLogin_(hoja);
    const idDocente = String(seguridad.idUsuario || seguridad.correo || seguridad.nombre || '').trim();
    const existentes = rows.filter(function(r) {
      return String(r.obj.ID_ASIGNACION || '').trim() === idAsignacion &&
        String(r.obj.INSTRUMENTO || '').trim() === instrumento &&
        String(r.obj.NUMERO_EVALUACION || '').trim() === numero &&
        (esAdminLogin_(seguridad) || String(r.obj.ID_DOCENTE || '').trim() === idDocente);
    });
    if (existentes.length > 1) throw new Error('Existen evaluaciones duplicadas; coordinación debe revisarlas antes de continuar.');
    if (existentes.length === 1 && String(existentes[0].obj.ESTADO || '').toLowerCase() === 'finalizada' && !esAdminLogin_(seguridad)) {
      throw new Error('La evaluación está finalizada y bloqueada para edición.');
    }
    const previo = existentes[0];
    const obj = Object.assign({}, previo ? previo.obj : {}, {
      ID_EVALUACION: previo ? previo.obj.ID_EVALUACION : 'EVD-' + Utilities.getUuid(),
      ID_ASIGNACION: idAsignacion,
      ID_ESTUDIANTE: asignacion.obj.ID_ESTUDIANTE || '',
      CODIGO_ESPECIALIDAD: asignacion.obj.CODIGO_ESPECIALIDAD || '',
      INSTRUMENTO: instrumento,
      NUMERO_EVALUACION: numero,
      ID_DOCENTE: idDocente,
      NOMBRE_DOCENTE: seguridad.nombre || '',
      ESTADO: estado,
      RESPUESTAS_JSON: JSON.stringify(respuestas),
      PUNTOS_OBTENIDOS: puntos,
      PUNTOS_POSIBLES: posibles,
      PORCENTAJE_REFERENCIAL: posibles ? Math.round(puntos * 10000 / posibles) / 100 : 0,
      FECHA_GUARDADO: new Date()
    });
    if (previo) escribirObjetoEnFilaLogin_(hoja, previo.rowIndex, obj);
    else appendObjetoLogin_(hoja, headers, obj);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return sanitizarParaCliente_(apiBootstrapSistemaLogin(token));
}

