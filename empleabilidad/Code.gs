/*
 * Encuesta de Empleabilidad 2026 — CTP Liberia
 * Backend independiente de Google Apps Script. No modifica las tablas base de PPS.
 * Los únicos destinos de escritura son las pestañas EMPLEABILIDAD_2026,
 * HISTORIAL_EMPLEABILIDAD_2026, DASHBOARD_EMPLEABILIDAD_2026 y
 * ACCESOS_EMPLEABILIDAD_2026 y EXCLUSIONES_EMPLEABILIDAD_2026.
 */

const CFG = Object.freeze({
  TIME_ZONE: 'America/Costa_Rica',
  SURVEY_URL: 'https://corvec-liberia.github.io/PPS2026/empleabilidad/pwa/',
  CURRENT: 'EMPLEABILIDAD_2026',
  HISTORY: 'HISTORIAL_EMPLEABILIDAD_2026',
  DASHBOARD: 'DASHBOARD_EMPLEABILIDAD_2026',
  ACCESS: 'ACCESOS_EMPLEABILIDAD_2026',
  EXCLUSIONS: 'EXCLUSIONES_EMPLEABILIDAD_2026',
  TOKENS_TTL: 1800,
  CURRENT_HEADERS: [
    'ID_RESPUESTA', 'ID_ESTUDIANTE', 'NOMBRE_COMPLETO', 'ESPECIALIDAD',
    'EMPRESA', 'ID_EMPRESA', 'SITUACION_LABORAL', 'MOTIVO_RECHAZO',
    'FECHA_HORA_CR', 'IDEMPOTENCY_KEY'
  ],
  HISTORY_HEADERS: [
    'ID_RESPUESTA', 'ID_ESTUDIANTE', 'NOMBRE_COMPLETO', 'ESPECIALIDAD',
    'EMPRESA', 'ID_EMPRESA', 'SITUACION_LABORAL', 'MOTIVO_RECHAZO',
    'FECHA_HORA_CR', 'IDEMPOTENCY_KEY', 'TIPO_MOVIMIENTO'
  ],
  ACCESS_HEADERS: [
    'TOKEN_OPACO', 'ID_ESTUDIANTE', 'NOMBRE_COMPLETO', 'ESPECIALIDAD',
    'EMPRESA', 'ID_EMPRESA', 'ESTADO_ACCESO', 'ACTUALIZADO_CR'
  ],
  EXCLUSION_HEADERS: ['ID_ESTUDIANTE', 'MOTIVO', 'ESTADO', 'ACTUALIZADO_CR'],
  DASH_HEADERS: [
    'SECCION', 'CATEGORIA', 'ELEGIBLES', 'RESPONDIERON', 'PENDIENTES',
    'OFERTAS', 'ACEPTADAS', 'RECHAZADAS', 'DECISION_PENDIENTE',
    'FUTURAS', 'SIN_OFERTA', 'TASA_CONTRATACION_RESPONDIERON',
    'TASA_CONTRATACION_ELEGIBLES', 'TASA_OFERTAS_RESPONDIERON',
    'TASA_OFERTAS_ELEGIBLES'
  ],
  STATES: Object.freeze({
    accepted: 'La empresa me ofreció un contrato laboral y acepté.',
    declined: 'La empresa me ofreció un contrato laboral, pero no acepté.',
    future: 'La empresa no me ha ofrecido un contrato laboral, pero me indicó que me tomará en cuenta para futuras contrataciones.',
    none: 'La empresa no me ha ofrecido un contrato laboral.',
    undecided: 'Recibí una oferta laboral y todavía no he tomado una decisión.'
  }),
  REASONS: [
    'Continuación de estudios', 'Otra oportunidad laboral', 'Motivos personales',
    'Condiciones laborales', 'Otro motivo'
  ]
});

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || 'health');
  let data;
  if (action === 'health') {
    data = { ok: true, service: 'Encuesta Empleabilidad 2026', timezone: CFG.TIME_ZONE };
  } else if (action === 'specialties') {
    data = { ok: true, specialties: getSpecialties_() };
  } else {
    data = { ok: false, message: 'Acción no disponible.' };
  }
  return output_(data, p.callback);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || '');
  const rid = safeKey_(p.rid);
  let result;
  try {
    if (!rid) throw new Error('Solicitud inválida.');
    if (action === 'identify') {
      result = identify_(p.code, p.specialtyCode);
    } else if (action === 'submit') {
      result = submit_(p);
    } else if (action === 'adminLogin') {
      result = adminLogin_(p.adminCode);
    } else if (action === 'adminData') {
      result = adminData_(p.session);
    } else {
      throw new Error('Acción no disponible.');
    }
  } catch (err) {
    result = { ok: false, message: publicError_(err) };
  }
  // El recibo se devuelve solo a la ventana que inició este POST. No se expone
  // por JSONP/GET, porque la respuesta contiene datos personales.
  return postMessageOutput_(rid, result);
}

function setupEmpleabilidad2026() {
  const book = book_();
  book.setSpreadsheetTimeZone(CFG.TIME_ZONE);
  ensureSheet_(book, CFG.CURRENT, CFG.CURRENT_HEADERS, false);
  ensureSheet_(book, CFG.HISTORY, CFG.HISTORY_HEADERS, false);
  ensureSheet_(book, CFG.DASHBOARD, CFG.DASH_HEADERS, false);
  ensureSheet_(book, CFG.ACCESS, CFG.ACCESS_HEADERS, true);
  ensureSheet_(book, CFG.EXCLUSIONS, CFG.EXCLUSION_HEADERS, true);
  const roster = getEligibleRoster_();
  syncAccessTokens_(book, roster);
  refreshDashboard_(book, roster);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SURVEY_URL')) props.setProperty('SURVEY_URL', CFG.SURVEY_URL);
  let generated = false;
  if (!props.getProperty('ADMIN_KEY')) {
    props.setProperty('ADMIN_KEY', randomSecret_());
    generated = true;
  }
  if (generated) {
    Logger.log('Se creó el código de administración. Cópielo del registro privado de esta ejecución y guárdelo en un lugar seguro.');
    Logger.log('ADMIN_KEY=' + props.getProperty('ADMIN_KEY'));
  }
  Logger.log(JSON.stringify({
    estado: 'Inicialización completada',
    elegibles: roster.length,
    zonaHoraria: CFG.TIME_ZONE,
    hojas: [CFG.CURRENT, CFG.HISTORY, CFG.DASHBOARD, CFG.ACCESS, CFG.EXCLUSIONS],
    codigoAdministradorNuevo: generated
  }));
  return { ok: true, elegibles: roster.length, codigoAdministradorNuevo: generated };
}

function rotateAdminCode2026() {
  const key = randomSecret_();
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  Logger.log('ADMIN_KEY=' + key);
  return { ok: true, message: 'Código rotado; conserve el nuevo código del registro de ejecución.' };
}

function auditEmpleabilidad2026() {
  const book = book_();
  const roster = getEligibleRoster_();
  const current = readObjects_(book.getSheetByName(CFG.CURRENT));
  const history = readObjects_(book.getSheetByName(CFG.HISTORY));
  const test = runPureTests_();
  const result = {
    ok: true,
    fechaHoraCR: Utilities.formatDate(new Date(), CFG.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    elegibles: roster.length,
    respuestasVigentes: current.length,
    movimientosEnHistorial: history.length,
    testUnitarios: test,
    hojasBaseSoloLectura: ['ESTUDIANTES', 'ESPECIALIDADES', 'ASIGNACIONES', 'EMPRESAS']
  };
  Logger.log(JSON.stringify(result));
  return result;
}

function runIsolatedIntegrationTests2026(testSpreadsheetId) {
  const testId = String(testSpreadsheetId || PropertiesService.getScriptProperties().getProperty('TEST_BOOK_ID') || '');
  if (!testId) throw new Error('Indique el ID de la hoja temporal de pruebas, nunca el ID de la base PPS.');
  const tempBook = SpreadsheetApp.openById(testId);
  if (tempBook.getName() !== 'TEMP PRUEBAS PPS EMPLEABILIDAD 2026') throw new Error('La prueba solo corre en la hoja temporal nombrada para este fin.');
  tempBook.setSpreadsheetTimeZone(CFG.TIME_ZONE);
  const report = [];
  const current = tempBook.getSheetByName(CFG.CURRENT) || tempBook.getSheets()[0];
  current.setName(CFG.CURRENT);
  current.clearContents();
  current.getRange(1, 1, 1, CFG.CURRENT_HEADERS.length).setValues([CFG.CURRENT_HEADERS]);
  const history = tempBook.getSheetByName(CFG.HISTORY) || tempBook.insertSheet(CFG.HISTORY);
  history.clearContents();
  history.getRange(1, 1, 1, CFG.HISTORY_HEADERS.length).setValues([CFG.HISTORY_HEADERS]);
  const dashboard = tempBook.getSheetByName(CFG.DASHBOARD) || tempBook.insertSheet(CFG.DASHBOARD);
  dashboard.clearContents();
  dashboard.getRange(1, 1, 1, CFG.DASH_HEADERS.length).setValues([CFG.DASH_HEADERS]);
  const access = tempBook.getSheetByName(CFG.ACCESS) || tempBook.insertSheet(CFG.ACCESS);
  access.clearContents();
  access.getRange(1, 1, 1, CFG.ACCESS_HEADERS.length).setValues([CFG.ACCESS_HEADERS]);
  setupTestRoster_(tempBook);
  const fakeRoster = getEligibleRoster_(tempBook);
  const testTokens = fakeRoster.map((student, i) => ({
    token: String(i + 1).padStart(64, 'a'), id: student.id, name: student.name,
    specialty: student.specialty, company: student.company, companyId: student.companyId
  }));
  access.getRange(2, 1, testTokens.length, CFG.ACCESS_HEADERS.length).setValues(testTokens.map(x => [x.token, x.id, x.name, x.specialty, x.company, x.companyId, 'ACTIVO', new Date()]));
  const identities = testTokens.map(x => identify_(x.token, '', tempBook));
  const wrongSpecialtyRejected = (() => { try { identify_(testTokens[0].token, 'WRONG', tempBook); return false; } catch (_) { return true; } })();
  const choices = [
    { status: 'accepted', reason: '' },
    { status: 'declined', reason: CFG.REASONS[0] },
    { status: 'future', reason: '' },
    { status: 'none', reason: '' },
    { status: 'undecided', reason: '' }
  ];
  const makePayload = (i, choice, idem) => ({ session: identities[i].session, state: choice.status, reason: choice.reason, idem });
  const first = submit_(makePayload(0, choices[0], 'TEST-IDEMPOTENCY-0001'), tempBook);
  const afterFirst = { current: readObjects_(current).length, history: readObjects_(history).length };
  const duplicate = submit_(makePayload(0, choices[0], 'TEST-IDEMPOTENCY-0001'), tempBook);
  const afterDuplicate = { current: readObjects_(current).length, history: readObjects_(history).length };
  const records = choices.slice(1).map((choice, i) => submit_(makePayload(i + 1, choice, 'TEST-IDEMPOTENCY-000' + (i + 2)), tempBook));
  const invalidReasonRejected = (() => { try { submit_(makePayload(0, { status: 'declined', reason: '' }, 'TEST-IDEMPOTENCY-0007'), tempBook); return false; } catch (_) { return true; } })();
  const updateTargetId = testTokens[4].id;
  const update = submit_(makePayload(4, { status: 'accepted', reason: '' }, 'TEST-IDEMPOTENCY-0006'), tempBook);
  const lateDuplicate = submit_(makePayload(4, choices[4], 'TEST-IDEMPOTENCY-0005'), tempBook);
    SpreadsheetApp.flush();
    const cur = readObjects_(current);
    const hist = readObjects_(history);
    const dash = dashboardSnapshot_(fakeRoster, cur);
    report.push({ test: 'código opaco devuelve una sola identidad y valida especialidad', ok: identities.every((x, i) => x.student.name === fakeRoster[i].name && x.student.code === fakeRoster[i].specialtyCode && Object.keys(x.student).sort().join(',') === 'code,name,specialty') && wrongSpecialtyRejected });
  report.push({ test: 'idempotencia, LockService y recibo almacenado', ok: first.stored && !first.duplicate && duplicate.duplicate && duplicate.receipt === first.receipt && afterFirst.current === 1 && afterFirst.history === 1 && afterDuplicate.current === 1 && afterDuplicate.history === 1 });
    report.push({ test: 'servidor rechaza el rechazo sin motivo obligatorio', ok: invalidReasonRejected && cur.length === 5 && hist.length === 6 });
  report.push({ test: 'actualización e historial conservan el dato más reciente ante reintento tardío', ok: update.ok && lateDuplicate.duplicate && cur.length === 5 && hist.length === 6 && cur.find(x => x.ID_ESTUDIANTE === updateTargetId).SITUACION_LABORAL === CFG.STATES.accepted });
    report.push({ test: 'fecha y hora con zona Costa Rica', ok: cur.every(x => x.FECHA_HORA_CR instanceof Date) && tempBook.getSpreadsheetTimeZone() === CFG.TIME_ZONE });
    report.push({ test: 'cinco opciones laborales registradas y actualizadas', ok: records.every(x => x.ok) && cur.length === 5 && cur.some(x => x.SITUACION_LABORAL === CFG.STATES.future) && cur.some(x => x.SITUACION_LABORAL === CFG.STATES.none) && cur.filter(x => x.SITUACION_LABORAL === CFG.STATES.accepted).length === 2 });
    report.push({ test: 'indicadores con denominadores correctos', ok: dash.stats.totalEligible === 5 && dash.stats.responded === 5 && dash.stats.offers === 3 && dash.stats.accepted === 2 && dash.stats.declined === 1 && dash.stats.undecided === 0 && dash.stats.future === 1 && dash.stats.none === 1 });
    report.push({ test: 'aislamiento de pruebas', ok: cur.every(x => /^TEST-/.test(String(x.ID_ESTUDIANTE))) && hist.every(x => /^TEST-/.test(String(x.ID_ESTUDIANTE))) });
  const failed = report.filter(x => !x.ok);
  const result = { ok: failed.length === 0, tests: report, temporarySpreadsheetId: tempBook.getId(), cleanup: 'Envíe a la papelera este archivo TEMP después de revisar el informe.' };
  Logger.log(JSON.stringify(result));
  return result;
}

function runTemporaryIntegrationTests2026() {
  return runIsolatedIntegrationTests2026();
}

function runPureTests_() {
  const students = [
    { ID_ESTUDIANTE: 'FIX-A', NOMBRE_COMPLETO: 'Prueba A', ESPECIALIDAD: 'GPC', CODIGO_ESPECIALIDAD: 'GPC', ESTADO_ESTUDIANTE: 'Asignado' },
    { ID_ESTUDIANTE: 'FIX-B', NOMBRE_COMPLETO: 'Prueba B', ESPECIALIDAD: 'CCI', CODIGO_ESPECIALIDAD: 'CCI', ESTADO_ESTUDIANTE: 'Asignado' },
    { ID_ESTUDIANTE: 'FIX-C', NOMBRE_COMPLETO: 'Prueba C', ESPECIALIDAD: 'CCI', CODIGO_ESPECIALIDAD: 'CCI', ESTADO_ESTUDIANTE: 'No aplica' },
    { ID_ESTUDIANTE: 'FIX-D', NOMBRE_COMPLETO: 'Prueba D', ESPECIALIDAD: 'GPC', CODIGO_ESPECIALIDAD: 'GPC', ESTADO_ESTUDIANTE: 'Asignado' },
    { ID_ESTUDIANTE: 'FIX-E', NOMBRE_COMPLETO: 'Prueba E', ESPECIALIDAD: 'GPC', CODIGO_ESPECIALIDAD: 'GPC', ESTADO_ESTUDIANTE: 'Asignado' },
    { ID_ESTUDIANTE: 'FIX-F', NOMBRE_COMPLETO: 'Prueba F', ESPECIALIDAD: 'CCI', CODIGO_ESPECIALIDAD: 'CCI', ESTADO_ESTUDIANTE: 'Asignado' },
    { ID_ESTUDIANTE: 'FIX-G', NOMBRE_COMPLETO: 'Prueba G', ESPECIALIDAD: 'CCI', CODIGO_ESPECIALIDAD: 'CCI', ESTADO_ESTUDIANTE: 'Cumplido' },
    { ID_ESTUDIANTE: 'FIX-H', NOMBRE_COMPLETO: 'Prueba H', ESPECIALIDAD: 'GPC', CODIGO_ESPECIALIDAD: 'GPC', ESTADO_ESTUDIANTE: 'Asignado' }
  ];
  const assignments = [
    { ID_ESTUDIANTE: 'FIX-A', ESTADO_ASIGNACION: 'Cancelada', EMPRESA: 'Antigua', ID_EMPRESA: 'X', FECHA_INICIO: '01/10/2026', ID_ASIGNACION: 'ASIG-001' },
    { ID_ESTUDIANTE: 'FIX-B', ESTADO_ASIGNACION: 'Asignada', EMPRESA: 'Empresa B', ID_EMPRESA: 'B', FECHA_INICIO: '05/10/2026', ID_ASIGNACION: 'ASIG-002' },
    { ID_ESTUDIANTE: 'FIX-C', ESTADO_ASIGNACION: 'Asignada', EMPRESA: 'Empresa C', ID_EMPRESA: 'C', FECHA_INICIO: '05/10/2026', ID_ASIGNACION: 'ASIG-003' },
    { ID_ESTUDIANTE: 'FIX-D', ESTADO_ASIGNACION: 'Cancelada', EMPRESA: 'Antigua', ID_EMPRESA: 'OLD', FECHA_INICIO: '01/10/2026', ID_ASIGNACION: 'ASIG-004' },
    { ID_ESTUDIANTE: 'FIX-D', ESTADO_ASIGNACION: 'Asignada', EMPRESA: 'Reubicación válida', ID_EMPRESA: 'NEW', FECHA_INICIO: '12/10/2026', ID_ASIGNACION: 'ASIG-005' },
    { ID_ESTUDIANTE: 'FIX-E', ESTADO_ASIGNACION: 'Asignada', EMPRESA: 'Empresa E', ID_EMPRESA: 'E', FECHA_INICIO: '05/10/2026', ID_ASIGNACION: 'ASIG-006', OBSERVACIONES: 'Desertó y no se reincorporó' },
    { ID_ESTUDIANTE: 'FIX-F', ESTADO_ASIGNACION: 'Asignada', EMPRESA: 'Empresa F', ID_EMPRESA: 'F', FECHA_INICIO: '05/10/2026', ID_ASIGNACION: 'ASIG-007' },
    { ID_ESTUDIANTE: 'FIX-G', ESTADO_ASIGNACION: 'Cumplido', EMPRESA: 'No aplica', ID_EMPRESA: 'G', FECHA_INICIO: '05/10/2026', ID_ASIGNACION: 'ASIG-008' },
    { ID_ESTUDIANTE: 'FIX-H', ESTADO_ASIGNACION: 'Asignada', EMPRESA: 'Empresa antigua', ID_EMPRESA: 'H1', FECHA_INICIO: '05/10/2026', ID_ASIGNACION: 'ASIG-009' },
    { ID_ESTUDIANTE: 'FIX-H', ESTADO_ASIGNACION: 'Cancelada', EMPRESA: 'Empresa nueva cancelada', ID_EMPRESA: 'H2', FECHA_INICIO: '15/10/2026', ID_ASIGNACION: 'ASIG-010' }
  ];
  const r = buildRoster_(students, assignments, [], [], [{ ID_ESTUDIANTE: 'FIX-F', ESTADO: 'ACTIVA' }]);
  const rows = [
    { ID_ESTUDIANTE: 'FIX-B', SITUACION_LABORAL: 'accepted' },
    { ID_ESTUDIANTE: 'FIX-D', SITUACION_LABORAL: 'future' }
  ];
  const dash = dashboardSnapshot_(r, rows);
  const phones = phoneLookup_(
    [{ ID_ESTUDIANTE: 'FIX-A', CEDULA: '1-2345-6789' }, { ID_ESTUDIANTE: 'FIX-B', CEDULA: '2-3456-7890' }],
    [{ CEDULA: '123456789', TELEFONO_PERSONAL: '+506 8888-1234' }, { CEDULA: '234567890', TELEFONO_PERSONAL: '1234' }],
    ['FIX-A', 'FIX-B']
  );
  return [
    { test: 'catálogo de especialidades con datos oficiales', ok: getSpecialties_().length > 0 },
    { test: 'exclusión de asignación cancelada', ok: !r.some(x => x.id === 'FIX-A') },
    { test: 'exclusión de estado no aplica', ok: !r.some(x => x.id === 'FIX-C') },
    { test: 'reubicación: usa la asignación válida y su empresa', ok: r.find(x => x.id === 'FIX-D')?.company === 'Reubicación válida' && r.find(x => x.id === 'FIX-D')?.companyId === 'NEW' },
    { test: 'exclusión por abandono documentado', ok: !r.some(x => x.id === 'FIX-E') },
    { test: 'exclusión administrativa privada de casos no elegibles', ok: !r.some(x => x.id === 'FIX-F') },
    { test: 'exclusión de asignación sin empresa de práctica', ok: !r.some(x => x.id === 'FIX-G') },
    { test: 'cancelación más reciente no revive asignación empresarial antigua', ok: !r.some(x => x.id === 'FIX-H') },
    { test: 'tasa de contratación sobre respuestas', ok: dash.stats.contractRateRespondents === 0.5 },
    { test: 'tasa de contratación sobre elegibles', ok: dash.stats.contractRateEligible === 0.5 },
    { test: 'pregunta condicional: motivo obligatorio solo al rechazar', ok: CFG.REASONS.every(reason => validateChoice_('declined', reason).reason === reason) && (() => { try { validateChoice_('declined', ''); return false; } catch (_) { return true; } })() && (() => { try { validateChoice_('accepted', CFG.REASONS[0]); return false; } catch (_) { return true; } })() },
    { test: 'validación de las cinco situaciones permitidas', ok: Object.keys(CFG.STATES).every(state => { try { validateChoice_(state, state === 'declined' ? CFG.REASONS[0] : ''); return true; } catch (_) { return false; } }) },
    { test: 'contacto de WhatsApp unido por cédula solo para IDs elegibles', ok: phones.size === 1 && phones.get('FIX-A') === '50688881234' && !phones.has('FIX-B') && normalizeWhatsAppPhone_('+506 1234') === '' },
    { test: 'no hay cédulas, teléfonos ni correos en el padrón servido', ok: r.every(x => !('CEDULA' in x) && !('TELEFONO' in x) && !('CORREO' in x)) }
  ];
}

function setupTestRoster_(book) {
  const specs = [
    ['CODIGO_ESPECIALIDAD', 'NOMBRE_ESPECIALIDAD', 'ESTADO'],
    ['GPC', 'Especialidad prueba GPC', 'Activa'], ['CCI', 'Especialidad prueba CCI', 'Activa'],
    ['ALD', 'Especialidad prueba ALD', 'Activa'], ['PAP', 'Especialidad prueba PAP', 'Activa'],
    ['ECSC', 'Especialidad prueba ECSC', 'Activa']
  ];
  const students = [['ID_ESTUDIANTE', 'NOMBRE_COMPLETO', 'ESPECIALIDAD', 'CODIGO_ESPECIALIDAD', 'ESTADO_ESTUDIANTE']];
  const assignments = [['ID_ASIGNACION', 'ID_ESTUDIANTE', 'CODIGO_ESPECIALIDAD', 'EMPRESA', 'ID_EMPRESA', 'FECHA_INICIO', 'ESTADO_ASIGNACION', 'OBSERVACIONES']];
  const companies = [['ID_EMPRESA', 'NOMBRE_EMPRESA']];
  ['GPC', 'CCI', 'ALD', 'PAP', 'ECSC'].forEach((code, i) => {
    const id = 'TEST-00' + (i + 1), companyId = 'TEST-EMP-' + (i + 1), companyName = 'Empresa Ficticia ' + (i + 1);
    students.push([id, 'Estudiante Prueba ' + (i + 1), 'Especialidad prueba ' + code, code, 'Cumplido']);
    assignments.push(['TEST-ASIG-' + (i + 1), id, code, companyName, companyId, '05/10/2026', 'Cumplido', '']);
    companies.push([companyId, companyName]);
  });
  [["ESTUDIANTES", students], ["ASIGNACIONES", assignments], ["ESPECIALIDADES", specs], ["EMPRESAS", companies]].forEach(([name, rows]) => {
    const sheet = book.getSheetByName(name) || book.insertSheet(name);
    sheet.clearContents(); sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  });
  book.setSpreadsheetTimeZone(CFG.TIME_ZONE);
}

function submit_(p, targetBook) {
  const session = readSession_(p.session, 'student');
  const idem = safeKey_(p.idem);
  const state = String(p.state || '');
  const reason = String(p.reason || '').trim();
  if (!idem) throw new Error('Respuesta inválida.');
  const choice = validateChoice_(state, reason);
  const book = targetBook || book_();
  const currentIdentity = getEligibleRoster_(book).find(x => x.id === session.id);
  if (!currentIdentity) throw new Error('El acceso dejó de estar habilitado para este registro.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const historySheet = book.getSheetByName(CFG.HISTORY);
    const previous = readObjects_(historySheet).find(x => x.IDEMPOTENCY_KEY === idem && x.ID_ESTUDIANTE === currentIdentity.id);
    if (previous) {
      const currentSheet = book.getSheetByName(CFG.CURRENT);
      const currentForStudent = readObjects_(currentSheet).find(x => x.ID_ESTUDIANTE === currentIdentity.id);
      const latestForStudent = readObjects_(historySheet).filter(x => x.ID_ESTUDIANTE === currentIdentity.id).slice(-1)[0];
      if (latestForStudent && (!currentForStudent || currentForStudent.ID_RESPUESTA !== latestForStudent.ID_RESPUESTA)) {
        upsertCurrent_(currentSheet, CFG.CURRENT_HEADERS, latestForStudent);
      }
      SpreadsheetApp.flush();
      verifyStored_(book, previous.ID_RESPUESTA, currentIdentity.id, idem);
      refreshDashboard_(book, getEligibleRoster_(book));
      return { ok: true, stored: true, duplicate: true, receipt: previous.ID_RESPUESTA };
    }
    const currentSheet = book.getSheetByName(CFG.CURRENT);
    const existing = readObjects_(currentSheet).find(x => x.ID_ESTUDIANTE === currentIdentity.id);
    const now = new Date();
    const responseId = Utilities.getUuid();
    const record = {
      ID_RESPUESTA: responseId,
      ID_ESTUDIANTE: currentIdentity.id,
      NOMBRE_COMPLETO: currentIdentity.name,
      ESPECIALIDAD: currentIdentity.specialty,
      EMPRESA: currentIdentity.company,
      ID_EMPRESA: currentIdentity.companyId,
      SITUACION_LABORAL: CFG.STATES[choice.status],
      MOTIVO_RECHAZO: choice.reason,
      FECHA_HORA_CR: now,
      IDEMPOTENCY_KEY: idem,
      TIPO_MOVIMIENTO: existing ? 'ACTUALIZACION' : 'NUEVA'
    };
    historySheet.appendRow(CFG.HISTORY_HEADERS.map(h => record[h]));
    SpreadsheetApp.flush();
    verifyStored_(book, responseId, currentIdentity.id, idem);
    upsertCurrent_(currentSheet, CFG.CURRENT_HEADERS, record);
    SpreadsheetApp.flush();
    verifyCurrent_(currentSheet, responseId, currentIdentity.id, idem);
    try { refreshDashboard_(book, getEligibleRoster_(book)); } catch (dashboardError) { console.error('No se pudo refrescar el dashboard:', dashboardError); }
    return { ok: true, stored: true, duplicate: false, receipt: responseId };
  } finally {
    lock.releaseLock();
  }
}

function identify_(code, specialtyCode, sourceBook) {
  const token = String(code || '').trim();
  if (!/^[a-f0-9-]{32,80}$/i.test(token)) throw new Error('Código inválido.');
  const book = sourceBook || book_();
  const access = readObjects_(book.getSheetByName(CFG.ACCESS)).find(x => x.TOKEN_OPACO === token && x.ESTADO_ACCESO === 'ACTIVO');
  if (!access) throw new Error('Código inválido o desactivado. Solicite ayuda a la coordinación.');
  const identity = getEligibleRoster_(book).find(x => x.id === access.ID_ESTUDIANTE);
  if (!identity) throw new Error('El acceso no está habilitado para una práctica elegible.');
  if (specialtyCode && String(specialtyCode) !== identity.specialtyCode) throw new Error('La especialidad seleccionada no coincide con el código personal.');
  const session = randomSecret_();
  CacheService.getScriptCache().put('student:' + session, JSON.stringify(identity), CFG.TOKENS_TTL);
  const latest = readObjects_(book.getSheetByName(CFG.CURRENT)).find(x => x.ID_ESTUDIANTE === identity.id);
  return {
    ok: true,
    session,
    student: { name: identity.name, specialty: identity.specialty, code: identity.specialtyCode },
    previous: latest ? { state: stateKey_(latest.SITUACION_LABORAL), reason: latest.MOTIVO_RECHAZO || '' } : null
  };
}

function adminLogin_(adminCode) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expected || String(adminCode || '') !== expected) throw new Error('Código de administración incorrecto.');
  const session = randomSecret_();
  CacheService.getScriptCache().put('admin:' + session, '1', CFG.TOKENS_TTL);
  return { ok: true, session, expiresInSeconds: CFG.TOKENS_TTL };
}

function adminData_(session) {
  readSession_(session, 'admin');
  const book = book_();
  const roster = getEligibleRoster_();
  const latest = readObjects_(book.getSheetByName(CFG.CURRENT));
  const metrics = dashboardSnapshot_(roster, latest, getSpecialties_(book));
  const eligibleIds = new Set(roster.map(x => x.id));
  const eligibleLatest = latest.filter(x => eligibleIds.has(String(x.ID_ESTUDIANTE)));
  const activeTokens = readObjects_(book.getSheetByName(CFG.ACCESS)).filter(x => x.ESTADO_ACCESO === 'ACTIVO' && eligibleIds.has(String(x.ID_ESTUDIANTE)));
  const respondedIds = new Set(eligibleLatest.map(x => x.ID_ESTUDIANTE));
  const surveyLinkBase = String(PropertiesService.getScriptProperties().getProperty('SURVEY_URL') || '');
  const phoneByStudent = eligiblePhoneMap_(book, roster);
  return {
    ok: true,
    generatedAt: Utilities.formatDate(new Date(), CFG.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    stats: metrics.stats,
    whatsappContactsReady: true,
    bySpecialty: metrics.bySpecialty,
    byCompany: metrics.byCompany,
    reasons: metrics.reasons,
    responses: eligibleLatest.map(x => ({
      name: x.NOMBRE_COMPLETO, specialty: x.ESPECIALIDAD, company: x.EMPRESA,
      state: stateKey_(x.SITUACION_LABORAL), reason: x.MOTIVO_RECHAZO || '',
      date: x.FECHA_HORA_CR instanceof Date ? Utilities.formatDate(x.FECHA_HORA_CR, CFG.TIME_ZONE, 'dd/MM/yyyy HH:mm:ss') : String(x.FECHA_HORA_CR || '')
    })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    pending: roster.filter(x => !respondedIds.has(x.id)).map(x => ({ name: x.name, specialty: x.specialty, company: x.company })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    accessLinks: activeTokens.map(x => ({
      name: x.NOMBRE_COMPLETO, specialty: x.ESPECIALIDAD, company: x.EMPRESA,
      phone: phoneByStudent.get(String(x.ID_ESTUDIANTE)) || '',
      responded: respondedIds.has(String(x.ID_ESTUDIANTE)),
      url: (surveyLinkBase || CFG.SURVEY_URL).replace(/#.*$/, '') + '#c=' + encodeURIComponent(x.TOKEN_OPACO)
    })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  };
}

function eligiblePhoneMap_(book, roster) {
  const students = readObjectsDisplayed_(book.getSheetByName('ESTUDIANTES'));
  const contacts = readObjectsDisplayed_(book.getSheetByName('DATOS_CONTACTO_ESTUDIANTES'));
  return phoneLookup_(students, contacts, roster.map(x => x.id));
}

function phoneLookup_(students, contacts, eligibleIds) {
  const eligible = new Set((eligibleIds || []).map(String));
  const cedulaById = new Map((students || []).map(x => [String(x.ID_ESTUDIANTE || '').trim(), normalizeCedula_(x.CEDULA)]));
  const phoneByCedula = new Map();
  (contacts || []).forEach(x => {
    const cedula = normalizeCedula_(x.CEDULA);
    const phone = normalizeWhatsAppPhone_(x.TELEFONO_PERSONAL);
    if (cedula && phone) phoneByCedula.set(cedula, phone);
  });
  const result = new Map();
  cedulaById.forEach((cedula, id) => {
    const phone = phoneByCedula.get(cedula);
    if (eligible.has(id) && phone) result.set(id, phone);
  });
  return result;
}

function readObjectsDisplayed_(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = typeof range.getDisplayValues === 'function' ? range.getDisplayValues() : range.getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(x => String(x || '').trim());
  return values.slice(1).filter(row => row.some(x => x !== '' && x !== null)).map(row => {
    const obj = {};
    headers.forEach((key, i) => { if (key) obj[key] = row[i]; });
    return obj;
  });
}

function normalizeCedula_(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

function normalizeWhatsAppPhone_(value) {
  let digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('506') && digits.length === 11) digits = digits.slice(3);
  if (!/^\d{8}$/.test(digits) || !/^[2-8]/.test(digits)) return '';
  return '506' + digits;
}

function dashboardSnapshot_(roster, currentRows, specialties) {
  const eligibleIds = new Set(roster.map(x => x.id));
  const latestMap = new Map();
  currentRows.forEach(row => {
    if (eligibleIds.has(row.ID_ESTUDIANTE)) latestMap.set(row.ID_ESTUDIANTE, row);
  });
  const answers = [...latestMap.values()];
  const stats = countStates_(roster.length, answers);
  const specialtyGroups = groupResults_(roster, answers, 'specialty', specialties || []);
  const companyGroups = groupResults_(roster, answers, 'company');
  const reasons = CFG.REASONS.map(reason => ({ reason, count: answers.filter(x => stateKey_(x.SITUACION_LABORAL) === 'declined' && x.MOTIVO_RECHAZO === reason).length }));
  return { stats, bySpecialty: specialtyGroups, byCompany: companyGroups, reasons };
}

function countStates_(eligible, answers) {
  const byState = { accepted: 0, declined: 0, undecided: 0, future: 0, none: 0 };
  answers.forEach(x => { const key = stateKey_(x.SITUACION_LABORAL); if (Object.prototype.hasOwnProperty.call(byState, key)) byState[key]++; });
  const responded = answers.length;
  const offers = byState.accepted + byState.declined + byState.undecided;
  const pending = Math.max(eligible - responded, 0);
  return {
    totalEligible: eligible, responded, pending,
    participationRate: rate_(responded, eligible),
    offers, accepted: byState.accepted, declined: byState.declined,
    undecided: byState.undecided, future: byState.future, none: byState.none,
    contractRateRespondents: rate_(byState.accepted, responded),
    contractRateEligible: rate_(byState.accepted, eligible),
    offerRateRespondents: rate_(offers, responded),
    offerRateEligible: rate_(offers, eligible)
  };
}

function groupResults_(roster, answers, dimension, specialties) {
  const answerMap = new Map(answers.map(x => [x.ID_ESTUDIANTE, x]));
  const groups = new Map();
  if (dimension === 'specialty') (specialties || []).forEach(item => {
    const label = typeof item === 'string' ? item : item.name;
    if (label && !groups.has(label)) groups.set(label, { name: label, eligible: 0, responded: 0, accepted: 0, declined: 0, undecided: 0, future: 0, none: 0, offers: 0 });
  });
  roster.forEach(student => {
    const label = dimension === 'specialty' ? student.specialty : student.company;
    const key = label || '(Sin dato)';
    if (!groups.has(key)) groups.set(key, { name: key, eligible: 0, responded: 0, accepted: 0, declined: 0, undecided: 0, future: 0, none: 0, offers: 0 });
    const item = groups.get(key);
    item.eligible++;
    const answer = answerMap.get(student.id);
    if (!answer) return;
    item.responded++;
    const state = stateKey_(answer.SITUACION_LABORAL);
    if (Object.prototype.hasOwnProperty.call(item, state)) item[state]++;
    if (['accepted', 'declined', 'undecided'].indexOf(state) >= 0) item.offers++;
  });
  return [...groups.values()].map(x => ({ ...x, pending: x.eligible - x.responded, contractRateRespondents: rate_(x.accepted, x.responded), contractRateEligible: rate_(x.accepted, x.eligible), offerRateRespondents: rate_(x.offers, x.responded), offerRateEligible: rate_(x.offers, x.eligible) })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function refreshDashboard_(book, roster) {
  const sheet = book.getSheetByName(CFG.DASHBOARD);
  if (!sheet) throw new Error('No existe la hoja del dashboard.');
  const current = readObjects_(book.getSheetByName(CFG.CURRENT));
  const model = dashboardSnapshot_(roster, current, getSpecialties_(book));
  const rows = [CFG.DASH_HEADERS];
  const add = (section, label, eligible, responded, values) => {
    const s = countStates_(eligible, values);
    rows.push([section, label, eligible, responded, s.pending, s.offers, s.accepted, s.declined, s.undecided, s.future, s.none, s.contractRateRespondents, s.contractRateEligible, s.offerRateRespondents, s.offerRateEligible]);
  };
  const allAnswers = current.filter(x => roster.some(s => s.id === x.ID_ESTUDIANTE));
  add('GENERAL', 'Total', roster.length, model.stats.responded, allAnswers);
  model.bySpecialty.forEach(x => add('ESPECIALIDAD', x.name, x.eligible, x.responded, allAnswers.filter(a => a.ESPECIALIDAD === x.name)));
  model.byCompany.forEach(x => add('EMPRESA', x.name, x.eligible, x.responded, allAnswers.filter(a => a.EMPRESA === x.name)));
  model.reasons.forEach(x => rows.push(['MOTIVO_RECHAZO', x.reason, '', '', '', '', '', x.count, '', '', '', '', '', '', '']));
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, CFG.DASH_HEADERS.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CFG.DASH_HEADERS.length).setFontWeight('bold').setBackground('#e8edf3');
  if (rows.length > 1) sheet.getRange(2, 12, rows.length - 1, 4).setNumberFormat('0.0%');
  return model;
}

function getEligibleRoster_(sourceBook) {
  const book = sourceBook || book_();
  const students = readObjects_(book.getSheetByName('ESTUDIANTES'));
  const assignments = readObjects_(book.getSheetByName('ASIGNACIONES'));
  const specializations = readObjects_(book.getSheetByName('ESPECIALIDADES'));
  const companies = readObjects_(book.getSheetByName('EMPRESAS'));
  const exclusions = readObjects_(book.getSheetByName(CFG.EXCLUSIONS));
  return buildRoster_(students, assignments, specializations, companies, exclusions);
}

function buildRoster_(students, assignments, specializations, companies, exclusions) {
  const eligibleStudentStates = new Set(['asignado', 'activo', 'cumplido']);
  const eligibleAssignmentStates = new Set(['asignada', 'activo', 'activa', 'cumplido', 'realizada', 'finalizado', 'finalizada', 'aprobado', 'aprobada', 'vigente']);
  const specialtyByCode = new Map(specializations.map(x => [String(x.CODIGO_ESPECIALIDAD || '').trim(), x]));
  const companyById = new Map(companies.map(x => [String(x.ID_EMPRESA || '').trim(), x]));
  const studentById = new Map(students.filter(x => x.ID_ESTUDIANTE).map(x => [String(x.ID_ESTUDIANTE).trim(), x]));
  const excludedIds = new Set((exclusions || []).filter(x => normalize_(x.ESTADO) === 'activa').map(x => String(x.ID_ESTUDIANTE || '').trim()));
  const grouped = new Map();
  assignments.forEach(a => {
    const id = String(a.ID_ESTUDIANTE || '').trim();
    if (!id) return;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(a);
  });
  const roster = [];
  studentById.forEach((student, id) => {
    if (excludedIds.has(id)) return;
    const state = normalize_(student.ESTADO_ESTUDIANTE);
    if (!eligibleStudentStates.has(state)) return;
    const rows = (grouped.get(id) || []).slice();
    if (!rows.length) return;
    rows.sort((a, b) => compareAssignment_(b, a));
    const selected = rows[0];
    // La fila más reciente decide la asignación vigente. No se permite volver
    // silenciosamente a una empresa antigua si la última quedó cancelada.
    if (!eligibleAssignmentStates.has(normalize_(selected.ESTADO_ASIGNACION))) return;
    if (isExplicitNonParticipation_(selected.OBSERVACIONES)) return;
    const specialtyCode = String(student.CODIGO_ESPECIALIDAD || selected.CODIGO_ESPECIALIDAD || '').trim();
    if (/^(DEMO|TEST|PRUEBA)$/i.test(specialtyCode)) return;
    const specialty = specialtyByCode.get(specialtyCode);
    const companyId = String(selected.ID_EMPRESA || '').trim();
    const company = companyById.get(companyId);
    const name = String(student.NOMBRE_COMPLETO || '').trim();
    const companyName = String(selected.EMPRESA || (company && company.NOMBRE_EMPRESA) || '').trim();
    if (!name || !companyName || normalize_(companyName) === 'no aplica' || !companyId || !specialtyCode) return;
    roster.push({
      id,
      name,
      specialty: String((specialty && specialty.NOMBRE_ESPECIALIDAD) || student.ESPECIALIDAD || selected.ESPECIALIDAD || '').trim(),
      specialtyCode,
      company: companyName,
      companyId,
      assignmentId: String(selected.ID_ASIGNACION || '')
    });
  });
  return roster.sort((a, b) => a.specialty.localeCompare(b.specialty, 'es') || a.name.localeCompare(b.name, 'es'));
}

function compareAssignment_(a, b) {
  const da = parseSheetDate_(a.FECHA_INICIO);
  const db = parseSheetDate_(b.FECHA_INICIO);
  if (da !== db) return da - db;
  return assignmentSequence_(a.ID_ASIGNACION) - assignmentSequence_(b.ID_ASIGNACION);
}

function parseSheetDate_(value) {
  if (value instanceof Date) return value.getTime();
  const raw = String(value || '').trim();
  let m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  const parsed = Date.parse(raw);
  return isNaN(parsed) ? 0 : parsed;
}

function assignmentSequence_(id) {
  const m = String(id || '').match(/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function isExplicitNonParticipation_(text) {
  return /(desert|deserc|abandono|abandona|no se present[oó]|no asist[ií]|inasist|cancelad[oa]|anulad[oa]|no realiz[oó].{0,28}pr[aá]ctica|no efectu[oó]|reprobad[oa]|renunci[oó]|no complet[oó].{0,24}pr[aá]ctica)/i.test(String(text || ''));
}

function getSpecialties_(sourceBook) {
  const rows = readObjects_((sourceBook || book_()).getSheetByName('ESPECIALIDADES'));
  return rows.filter(x => normalize_(x.ESTADO) === 'activa' && x.NOMBRE_ESPECIALIDAD).map(x => ({
    code: String(x.CODIGO_ESPECIALIDAD || ''), name: String(x.NOMBRE_ESPECIALIDAD || '')
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function syncAccessTokens_(book, roster) {
  const sheet = book.getSheetByName(CFG.ACCESS);
  const existing = readObjects_(sheet);
  const byStudent = new Map(existing.map(x => [String(x.ID_ESTUDIANTE), x]));
  const activeIds = new Set();
  const now = new Date();
  const updates = [];
  roster.forEach(s => {
    activeIds.add(s.id);
    const old = byStudent.get(s.id);
    updates.push({
      TOKEN_OPACO: old && old.TOKEN_OPACO ? old.TOKEN_OPACO : randomSecret_(),
      ID_ESTUDIANTE: s.id, NOMBRE_COMPLETO: s.name, ESPECIALIDAD: s.specialty,
      EMPRESA: s.company, ID_EMPRESA: s.companyId, ESTADO_ACCESO: 'ACTIVO', ACTUALIZADO_CR: now
    });
  });
  existing.forEach(old => {
    if (!activeIds.has(String(old.ID_ESTUDIANTE))) updates.push({
      TOKEN_OPACO: old.TOKEN_OPACO, ID_ESTUDIANTE: old.ID_ESTUDIANTE,
      NOMBRE_COMPLETO: old.NOMBRE_COMPLETO, ESPECIALIDAD: old.ESPECIALIDAD,
      EMPRESA: old.EMPRESA, ID_EMPRESA: old.ID_EMPRESA, ESTADO_ACCESO: 'INACTIVO',
      ACTUALIZADO_CR: now
    });
  });
  const data = [CFG.ACCESS_HEADERS].concat(updates.map(x => CFG.ACCESS_HEADERS.map(h => x[h])));
  sheet.clearContents();
  sheet.getRange(1, 1, data.length, CFG.ACCESS_HEADERS.length).setValues(data);
  sheet.setFrozenRows(1);
  sheet.hideSheet();
}

function upsertCurrent_(sheet, headers, record) {
  const values = sheet.getDataRange().getValues();
  const header = values[0] || headers;
  const idCol = header.indexOf('ID_ESTUDIANTE');
  if (idCol < 0) throw new Error('La estructura de almacenamiento no coincide.');
  const rowValues = headers.map(h => record[h] === undefined ? '' : record[h]);
  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(record.ID_ESTUDIANTE)) { targetRow = i + 1; break; }
  }
  if (targetRow > 0) sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  else { sheet.appendRow(rowValues); targetRow = sheet.getLastRow(); }
  sheet.getRange(targetRow, 9).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function verifyStored_(book, responseId, studentId, idem) {
  const record = readObjects_(book.getSheetByName(CFG.HISTORY)).find(x => x.ID_RESPUESTA === responseId && x.ID_ESTUDIANTE === studentId && x.IDEMPOTENCY_KEY === idem);
  if (!record) throw new Error('No se pudo verificar el almacenamiento de la respuesta.');
  return record;
}

function verifyCurrent_(sheet, responseId, studentId, idem) {
  const record = readObjects_(sheet).find(x => x.ID_RESPUESTA === responseId && x.ID_ESTUDIANTE === studentId && x.IDEMPOTENCY_KEY === idem);
  if (!record) throw new Error('No se pudo verificar la respuesta vigente.');
  return record;
}

function ensureSheet_(book, name, headers, hidden) {
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  const values = sheet.getDataRange().getValues();
  if (!values.length || values.every(row => row.every(cell => cell === '' || cell === null))) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const actual = values[0].slice(0, headers.length).map(String);
    if (headers.some((value, i) => actual[i] !== value)) throw new Error('La hoja ' + name + ' tiene encabezados distintos; no se sobrescribió.');
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8edf3');
  if (name === CFG.CURRENT || name === CFG.HISTORY) sheet.getRange('I:I').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if (name === CFG.ACCESS) {
    sheet.getRange('H:H').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (hidden) sheet.hideSheet();
  }
  return sheet;
}

function readObjects_(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(x => String(x || '').trim());
  return values.slice(1).filter(row => row.some(x => x !== '' && x !== null)).map(row => {
    const obj = {};
    headers.forEach((key, i) => { if (key) obj[key] = row[i]; });
    return obj;
  });
}

function book_() {
  const id = String(PropertiesService.getScriptProperties().getProperty('BOOK_ID') || '');
  if (!/^[A-Za-z0-9_-]{25,}$/.test(id)) throw new Error('Falta la propiedad privada BOOK_ID del libro institucional.');
  return SpreadsheetApp.openById(id);
}

function readSession_(value, kind) {
  const token = safeKey_(value);
  if (!token) throw new Error('La sesión venció. Ingrese de nuevo su código.');
  const cache = CacheService.getScriptCache();
  const stored = cache.get(kind + ':' + token);
  if (!stored) throw new Error('La sesión venció. Ingrese de nuevo su código.');
  return kind === 'student' ? JSON.parse(stored) : true;
}

function output_(value, callback) {
  const json = JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$\.]{0,80}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function postMessageOutput_(rid, data) {
  const origin = 'https://corvec-liberia.github.io';
  const envelope = JSON.stringify({ source: 'pps-empleabilidad-2026', rid: String(rid || ''), result: data })
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    '(function(){var message=' + envelope + ';var target=' + JSON.stringify(origin) + ';var current=window;' +
    'for(var i=0;i<8;i++){var parent;try{parent=current.parent;}catch(e){break;}if(!parent||parent===current)break;' +
    'try{parent.postMessage(message,target);}catch(e){}current=parent;}' +
    '})();' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function safeKey_(value) {
  const key = String(value || '');
  return /^[A-Za-z0-9_-]{20,100}$/.test(key) ? key : '';
}

function validateChoice_(state, reason) {
  const choice = String(state || '');
  const why = String(reason || '').trim();
  if (!Object.prototype.hasOwnProperty.call(CFG.STATES, choice)) throw new Error('Respuesta inválida.');
  if (choice === 'declined' && CFG.REASONS.indexOf(why) < 0) throw new Error('Seleccione el motivo de rechazo.');
  if (choice !== 'declined' && why) throw new Error('El motivo solo corresponde a una oferta rechazada.');
  return { status: choice, reason: choice === 'declined' ? why : '' };
}

function randomSecret_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function normalize_(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function rate_(n, d) { return d ? n / d : 0; }

function stateKey_(value) {
  const raw = String(value || '');
  if (Object.prototype.hasOwnProperty.call(CFG.STATES, raw)) return raw;
  return Object.keys(CFG.STATES).find(key => CFG.STATES[key] === raw) || '';
}

function publicError_(err) {
  const msg = String(err && err.message || 'No se pudo completar la solicitud.');
  if (/código|respuesta inválida|seleccione|sesión|acceso|almacenamiento|verificar/i.test(msg)) return msg;
  console.error(err);
  return 'No se pudo completar la solicitud. Intente nuevamente.';
}
