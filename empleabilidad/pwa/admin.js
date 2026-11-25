(function () {
  'use strict';
  const config = window.PPS_EMPLOYABILITY_CONFIG || {};
  const apiUrl = String(config.apiUrl || '');
  const surveyUrl = String(config.surveyUrl || './index.html');
  const apiReady = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(apiUrl);
  const $ = id => document.getElementById(id);
  let session = '';
  let dashboardData = null;
  let adminLockTimer = 0;

  function key() {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, x => x.toString(16).padStart(2, '0')).join('');
  }
  function message(id, text, kind) { const n = $(id); n.textContent = text || ''; n.className = 'message' + (kind ? ' ' + kind : ''); }
  function jsonp(action, params) {
    if (!apiReady) return Promise.reject(new Error('El servicio institucional todavía no está configurado.'));
    return new Promise((resolve, reject) => {
      const callback = '__ppsAdmin' + key().replace(/-/g, '');
      const script = document.createElement('script');
      const query = new URLSearchParams(Object.assign({ action, callback }, params || {}));
      const timer = setTimeout(() => done(new Error('El servicio no respondió.')), 20000);
      function done(error, value) { clearTimeout(timer); try { delete window[callback]; } catch (_) {} script.remove(); error ? reject(error) : resolve(value); }
      window[callback] = value => done(null, value);
      script.onerror = () => done(new Error('No fue posible conectar con Apps Script.'));
      script.src = apiUrl + '?' + query.toString();
      document.head.appendChild(script);
    });
  }
  function post(payload) {
    if (!apiReady) return Promise.reject(new Error('El servicio institucional todavía no está configurado.'));
    if (!navigator.onLine) return Promise.reject(new Error('No hay conexión a Internet.'));
    const rid = key(), frameName = 'admin_' + rid.replace(/-/g, '');
    const frame = document.createElement('iframe'); frame.name = frameName; frame.hidden = true;
    const form = document.createElement('form'); form.method = 'POST'; form.action = apiUrl; form.target = frameName;
    const values = Object.assign({}, payload, { rid });
    Object.keys(values).forEach(name => { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = String(values[name] == null ? '' : values[name]); form.appendChild(input); });
    document.body.append(frame, form); form.submit();
    const deadline = Date.now() + 60000;
    return new Promise((resolve, reject) => {
      const cleanup = () => { form.remove(); frame.remove(); };
      const poll = () => jsonp('result', { rid }).then(result => {
        if (result && result.pending) {
          if (Date.now() >= deadline) { cleanup(); reject(new Error('La solicitud venció. Vuelva a iniciar sesión.')); }
          else setTimeout(poll, 1200);
        } else { cleanup(); result && result.ok ? resolve(result) : reject(new Error((result && result.message) || 'No se pudo validar el acceso.')); }
      }).catch(error => { if (Date.now() < deadline && navigator.onLine) setTimeout(poll, 1600); else { cleanup(); reject(error); } });
      setTimeout(poll, 350);
    });
  }
  function cell(row, text, className) { const td = document.createElement('td'); td.textContent = text == null ? '' : String(text); if (className) td.className = className; row.appendChild(td); return td; }
  function showTable(container, headers, rows) {
    const host = $(container); host.replaceChildren();
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No hay datos para mostrar.'; host.appendChild(empty); return; }
    const table = document.createElement('table'), thead = document.createElement('thead'), headRow = document.createElement('tr');
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; headRow.appendChild(th); });
    thead.appendChild(headRow); table.appendChild(thead);
    const body = document.createElement('tbody');
    rows.forEach(values => { const tr = document.createElement('tr'); values.forEach((value, i) => cell(tr, value, i > 0 && typeof value === 'number' ? 'numeric' : '')); body.appendChild(tr); });
    table.appendChild(body); host.appendChild(table);
  }
  function percent(value) { return ((Number(value || 0) * 100).toLocaleString('es-CR', { maximumFractionDigits: 1 })) + '%'; }
  function renderParticipationChart(containerId, rows) {
    const host = $(containerId); host.replaceChildren();
    if (!rows.length) { host.textContent = 'No hay datos para mostrar.'; return; }
    rows.forEach(item => {
      const row = document.createElement('div'); row.className = 'bar-item'; row.setAttribute('role', 'listitem');
      const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = item.name;
      const track = document.createElement('span'); track.className = 'bar-track'; track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span'); fill.className = 'bar-fill';
      const rate = item.eligible ? Number(item.responded || 0) / Number(item.eligible) : 0;
      fill.style.width = (Math.max(0, Math.min(1, rate)) * 100) + '%'; track.appendChild(fill);
      const count = document.createElement('span'); count.className = 'bar-count'; count.textContent = item.responded + '/' + item.eligible;
      row.setAttribute('aria-label', item.name + ': ' + item.responded + ' de ' + item.eligible + ' respondieron, ' + percent(rate));
      row.append(label, track, count); host.appendChild(row);
    });
  }
  function statusText(value) {
    return ({ accepted: 'Oferta aceptada', declined: 'Oferta rechazada', future: 'Posible contratación futura', none: 'Sin oferta', undecided: 'Decisión pendiente' })[value] || value || '';
  }
  function renderMetrics(stats) {
    const items = [
      ['Practicantes elegibles', stats.totalEligible, 'Base de cálculo'],
      ['Respondieron', stats.responded, percent(stats.participationRate) + ' de participación'],
      ['Pendientes', stats.pending, 'Sin respuesta vigente'],
      ['Ofertas laborales', stats.offers, percent(stats.offerRateRespondents) + ' de quienes respondieron'],
      ['Ofertas aceptadas', stats.accepted, percent(stats.contractRateRespondents) + ' de quienes respondieron'],
      ['Ofertas rechazadas', stats.declined, 'Motivos registrados abajo'],
      ['Por decidir', stats.undecided, 'Oferta recibida'],
      ['Posibles contrataciones futuras', stats.future, 'La empresa indicó que los tomará en cuenta'],
      ['Sin oferta', stats.none, 'La empresa no ha ofrecido contrato'],
      ['Contratación / elegibles', percent(stats.contractRateEligible), stats.accepted + ' de ' + stats.totalEligible],
      ['Ofertas / elegibles', percent(stats.offerRateEligible), stats.offers + ' de ' + stats.totalEligible]
    ];
    const host = $('metricCards'); host.replaceChildren();
    items.forEach(item => { const card = document.createElement('article'); card.className = 'metric-card'; const label = document.createElement('span'); label.textContent = item[0]; const value = document.createElement('strong'); value.textContent = item[1]; const note = document.createElement('small'); note.textContent = item[2]; card.append(label, value, note); host.appendChild(card); });
  }
  function renderBreakdown() {
    if (!dashboardData) return;
    const specialtyFilter = $('filterSpecialty').value, companyFilter = $('filterCompany').value;
    const specs = dashboardData.bySpecialty.filter(x => !specialtyFilter || x.name === specialtyFilter);
    const companies = dashboardData.byCompany.filter(x => !companyFilter || x.name === companyFilter);
    renderParticipationChart('specialtyChart', specs);
    renderParticipationChart('companyChart', companies);
    showTable('specialtyResults', ['Especialidad', 'Elegibles', 'Respondieron', 'Pendientes', 'Ofertas', 'Aceptadas', 'Contratación / respuestas', 'Contratación / elegibles'], specs.map(x => [x.name, x.eligible, x.responded, x.pending, x.offers, x.accepted, percent(x.contractRateRespondents), percent(x.contractRateEligible)]));
    showTable('companyResults', ['Empresa', 'Elegibles', 'Respondieron', 'Pendientes', 'Ofertas', 'Aceptadas', 'Ofertas / respuestas', 'Ofertas / elegibles'], companies.map(x => [x.name, x.eligible, x.responded, x.pending, x.offers, x.accepted, percent(x.offerRateRespondents), percent(x.offerRateEligible)]));
    const max = Math.max(1, ...dashboardData.reasons.map(x => Number(x.count || 0)));
    const bars = $('reasonResults'); bars.replaceChildren();
    dashboardData.reasons.forEach(item => { const row = document.createElement('div'); row.className = 'bar-item'; const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = item.reason; const track = document.createElement('span'); track.className = 'bar-track'; const fill = document.createElement('span'); fill.className = 'bar-fill'; fill.style.width = (Number(item.count || 0) / max * 100) + '%'; track.appendChild(fill); const count = document.createElement('span'); count.className = 'bar-count'; count.textContent = item.count; row.append(label, track, count); bars.appendChild(row); });
    const responseRows = dashboardData.responses.filter(x => (!specialtyFilter || x.specialty === specialtyFilter) && (!companyFilter || x.company === companyFilter)).map(x => [x.name, x.specialty, x.company, statusText(x.state), x.reason || '—', x.date]);
    showTable('responseResults', ['Estudiante', 'Especialidad', 'Empresa', 'Situación', 'Motivo', 'Actualización'], responseRows);
    const pendingRows = dashboardData.pending.filter(x => (!specialtyFilter || x.specialty === specialtyFilter) && (!companyFilter || x.company === companyFilter)).map(x => [x.name, x.specialty, x.company]);
    showTable('pendingResults', ['Estudiante', 'Especialidad', 'Empresa'], pendingRows);
    renderLinks();
  }
  function populateFilters() {
    const specs = [...new Set(dashboardData.bySpecialty.map(x => x.name))].sort((a, b) => a.localeCompare(b, 'es'));
    const companies = [...new Set(dashboardData.byCompany.map(x => x.name))].sort((a, b) => a.localeCompare(b, 'es'));
    const s = $('filterSpecialty'), c = $('filterCompany'); s.replaceChildren(new Option('Todas', '')); c.replaceChildren(new Option('Todas', ''));
    specs.forEach(name => s.add(new Option(name, name))); companies.forEach(name => c.add(new Option(name, name)));
    const linkSpecialty = $('linkSpecialty'); linkSpecialty.replaceChildren(new Option('Todas', ''));
    specs.forEach(name => linkSpecialty.add(new Option(name, name)));
  }
  function whatsappMessage(item) {
    return 'Buenos días, ' + item.name + '. Le comparto su enlace personal para completar la Encuesta de Empleabilidad 2026 sobre su Práctica Profesional Supervisada en el CTP Liberia:\n\n' + item.url + '\n\nAl abrirlo, su nombre y especialidad aparecerán automáticamente; no debe escribir código ni cédula. Seleccione su situación laboral y envíe la respuesta. Si ya completó la encuesta, puede usar este mismo enlace para actualizarla.\n\nMuchas gracias.\nMáster Óscar Campos Rodríguez\nCoordinador con la Empresa';
  }
  function whatsappReady(phone) { return /^506[2-8]\d{7}$/.test(String(phone || '')); }
  async function copyText(text, button, successLabel) {
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent; button.textContent = successLabel;
      setTimeout(() => { button.textContent = original; }, 1800);
    } catch (_) {
      window.prompt('Copie el mensaje personal:', text);
    }
  }
  function renderLinks() {
    const host = $('linkResults'), query = $('linkSearch').value.trim().toLocaleLowerCase('es'); host.replaceChildren();
    if (!dashboardData.whatsappContactsReady) {
      const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'Falta actualizar Apps Script para cargar teléfonos institucionales de forma privada. Cuando se publique esa versión, aparecerán aquí los chats listos para WhatsApp.'; host.appendChild(p); $('linkSummary').textContent = ''; return;
    }
    const selectedSpecialty = $('linkSpecialty').value, selectedStatus = $('linkStatus').value;
    const links = dashboardData.accessLinks.filter(x => (!selectedSpecialty || x.specialty === selectedSpecialty) && (selectedStatus === 'all' || (selectedStatus === 'responded') === Boolean(x.responded)) && (!query || (x.name + ' ' + x.specialty + ' ' + x.company).toLocaleLowerCase('es').includes(query))).sort((a, b) => a.specialty.localeCompare(b.specialty, 'es') || a.name.localeCompare(b.name, 'es'));
    const ready = links.filter(x => whatsappReady(x.phone)).length;
    $('linkSummary').textContent = links.length + ' estudiantes en la lista · ' + ready + ' números listos para WhatsApp · ' + (links.length - ready) + ' requieren revisar el teléfono.';
    if (!links.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No hay estudiantes para esos filtros.'; host.appendChild(p); return; }
    const groups = new Map();
    links.forEach(item => { if (!groups.has(item.specialty)) groups.set(item.specialty, []); groups.get(item.specialty).push(item); });
    groups.forEach((students, specialty) => {
      const group = document.createElement('section'); group.className = 'link-group';
      const heading = document.createElement('h3'); heading.textContent = specialty + ' · ' + students.length; group.appendChild(heading);
      const wrap = document.createElement('div'); wrap.className = 'table-scroll';
      const table = document.createElement('table'), thead = document.createElement('thead'), head = document.createElement('tr');
      ['Estudiante', 'Empresa', 'WhatsApp', 'Encuesta', 'Acción'].forEach(label => { const th = document.createElement('th'); th.textContent = label; head.appendChild(th); });
      thead.appendChild(head); table.appendChild(thead);
      const body = document.createElement('tbody');
      students.forEach(item => {
        const tr = document.createElement('tr');
        cell(tr, item.name); cell(tr, item.company);
        const phoneCell = document.createElement('td');
        if (whatsappReady(item.phone)) { const suffix = document.createElement('span'); suffix.className = 'phone-mask'; suffix.textContent = '+506 •••• ' + item.phone.slice(-4); phoneCell.appendChild(suffix); }
        else { const missing = document.createElement('span'); missing.className = 'missing-phone'; missing.textContent = 'Sin número válido'; phoneCell.appendChild(missing); }
        tr.appendChild(phoneCell);
        const status = document.createElement('td'), badge = document.createElement('span'); badge.className = 'state-badge'; badge.textContent = item.responded ? 'Respondió' : 'Pendiente'; status.appendChild(badge); tr.appendChild(status);
        const action = document.createElement('td'), buttons = document.createElement('div'); buttons.className = 'link-actions';
        if (whatsappReady(item.phone)) {
          const chat = document.createElement('button'); chat.type = 'button'; chat.className = 'copy-button whatsapp-button'; chat.textContent = 'Abrir chat con mensaje';
          chat.addEventListener('click', () => { const target = 'https://web.whatsapp.com/send?phone=' + encodeURIComponent(item.phone) + '&text=' + encodeURIComponent(whatsappMessage(item)); window.open(target, '_blank', 'noopener,noreferrer'); });
          buttons.appendChild(chat);
        } else {
          const unavailable = document.createElement('button'); unavailable.type = 'button'; unavailable.className = 'copy-button'; unavailable.textContent = 'Falta teléfono'; unavailable.disabled = true; buttons.appendChild(unavailable);
        }
        const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'copy-button'; copy.textContent = 'Copiar mensaje';
        copy.addEventListener('click', () => copyText(whatsappMessage(item), copy, 'Mensaje copiado'));
        buttons.appendChild(copy); action.appendChild(buttons); tr.appendChild(action); body.appendChild(tr);
      });
      table.appendChild(body); wrap.appendChild(table); group.appendChild(wrap); host.appendChild(group);
    });
  }
  function displayData(data) {
    dashboardData = data;
    $('loginCard').hidden = true; $('dashboard').hidden = false;
    $('updatedAt').textContent = 'Datos actualizados: ' + data.generatedAt;
    renderMetrics(data.stats); populateFilters(); renderBreakdown();
  }
  function lockAdminPanel(messageText) {
    if (adminLockTimer) clearTimeout(adminLockTimer);
    adminLockTimer = 0; session = ''; dashboardData = null;
    $('dashboard').hidden = true; $('loginCard').hidden = false; $('adminCode').value = '';
    ['metricCards', 'specialtyChart', 'specialtyResults', 'companyChart', 'companyResults', 'reasonResults', 'responseResults', 'pendingResults', 'linkResults'].forEach(id => $(id).replaceChildren());
    $('linkSummary').textContent = '';
    $('updatedAt').textContent = '';
    message('loginMessage', messageText || 'La sesión administrativa se cerró.', '');
  }
  async function loadAdminData() {
    const refresh = $('refreshButton'); if (refresh) refresh.disabled = true;
    message('dashboardMessage', 'Cargando los indicadores privados…');
    try {
      const result = await post({ action: 'adminData', session });
      displayData(result);
      message('dashboardMessage', result.whatsappContactsReady ? 'Panel actualizado desde Google Sheets.' : 'Indicadores actualizados. Falta publicar la versión de Apps Script que entrega teléfonos solo al panel autorizado.', result.whatsappContactsReady ? 'success' : '');
    } finally { if (refresh) refresh.disabled = false; }
  }
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!navigator.onLine) { message('loginMessage', 'Se requiere conexión a Internet.', 'error'); return; }
    if (!apiReady) { message('loginMessage', 'El servicio institucional todavía no está configurado.', 'error'); return; }
    const button = $('loginButton'); button.disabled = true; button.textContent = 'Validando…';
    try {
      const result = await post({ action: 'adminLogin', adminCode: $('adminCode').value });
      session = result.session;
      adminLockTimer = setTimeout(() => lockAdminPanel('Sesión cerrada por seguridad. Ingrese de nuevo para consultar los datos.'), 25 * 60 * 1000);
      $('adminCode').value = '';
      await loadAdminData();
    } catch (error) { message('loginMessage', error.message, 'error'); }
    finally { button.disabled = false; button.textContent = 'Entrar al panel'; }
  });
  $('logoutButton').addEventListener('click', () => lockAdminPanel('Sesión cerrada.'));
  $('refreshButton').addEventListener('click', () => loadAdminData().catch(error => message('dashboardMessage', error.message, 'error')));
  $('filterSpecialty').addEventListener('change', renderBreakdown);
  $('filterCompany').addEventListener('change', renderBreakdown);
  $('linkSearch').addEventListener('input', renderLinks);
  $('linkSpecialty').addEventListener('change', renderLinks);
  $('linkStatus').addEventListener('change', renderLinks);
  if (!apiReady) message('loginMessage', 'El panel está preparado, pero espera la URL definitiva de Apps Script.', 'error');
})();
