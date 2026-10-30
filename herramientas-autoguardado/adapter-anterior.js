/* PPS2026: guardado sin rediseño */
(function () {
  'use strict';
  let active = null;
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  window.ppsMobileFirmaValida = function (signature) {
    if (!signature || signature.nombre.length < 3 || signature.nombre.length > 160) return false;
    let points = 0, distance = 0;
    if (!Array.isArray(signature.trazos) || !signature.trazos.length || signature.trazos.length > 100) return false;
    for (const stroke of signature.trazos) {
      if (stroke.length < 2 || stroke.length > 2000) return false;
      points += stroke.length;
      stroke.forEach((point, i) => {
        if (i) distance += Math.hypot(point[0] - stroke[i - 1][0], point[1] - stroke[i - 1][1]);
      });
    }
    return points >= 3 && points <= 3000 && distance >= 0.02;
  };
  window.ppsMobileSaveStart = function (finalized) {
    if (!active) return;
    active.clearTimers();
    active.announce(finalized ? 'Enviando evaluación definitiva… Espere la confirmación del servidor.' : 'Guardando borrador… Espere la confirmación del servidor.');
    const owner = active;
    owner.watchdog = setTimeout(() => {
      if (active === owner && ppsV11Busy) owner.announce('El servidor está tardando. El guardado aún no está confirmado; no cierre ni reenvíe la evaluación.', true);
    }, 25000);
  };
  window.ppsMobileSaveResult = function (ok, responses, signature, finalized) {
    if (!active) return;
    active.clearTimers();
    if (!ok) {
      active.announce('No se confirmó el guardado. Las respuestas siguen en esta pantalla. Use Guardar borrador para reintentar.', true);
      return;
    }
    active.confirmed = { responses: responses, signature: signature || active.confirmed.signature };
    if (finalized) active.announce('Evaluación finalizada y confirmada por el servidor.');
    else if (active.dirty()) {
      active.announce('Notas guardadas. Quedan cambios pendientes en la firma; complete el nombre y la firma antes de salir.');
      active.schedule();
    } else {
      const count = Object.keys(responses).length, pending = active.data.criterios.length - count;
      active.announce('✓ Borrador guardado y confirmado · ' + count + ' de ' + active.data.criterios.length + ' respuestas · ' + new Date().toLocaleTimeString('es-CR') + (pending ? '. Faltan ' + pending + ' para finalizar.' : '. Listo para revisar y finalizar.'));
    }
  };
  window.addEventListener('beforeunload', event => {
    if (active && (ppsV11Busy || active.dirty())) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('online', () => { if (active) active.schedule(); });
  window.addEventListener('offline', () => {
    if (active && active.dirty()) active.announce('Sin conexión: hay cambios pendientes. Mantenga esta pantalla abierta; se intentará guardar al volver la conexión.', true);
  });
  const closeOriginal = window.ppsEvalCerrar;
  window.ppsEvalCerrar = function () {
    if (ppsV11Busy) return;
    if (active && active.dirty() && !confirm('Hay cambios sin guardar. ¿Desea cerrar y descartarlos?')) return;
    if (active) active.clearTimers();
    active = null;
    closeOriginal();
  };
  const original = window.ppsEvalDibujar;
  const guardarOriginal = window.ppsEvalGuardar;
  const estadoOriginal = window.ppsV11EstadoBotones;
  const mensajeOriginal = window.ppsV11Mensaje;
  window.ppsV11Mensaje = function (text, error) {
    if (active && error) {
      if (String(text).startsWith('Complete todos los criterios')) {
        const pending = active.data.criterios.map((_, i) => i).filter(i => !Object.hasOwn(active.answers, String(i)));
        active.pendingTarget = pending.length ? pending[0] : null;
        const saved = !active.dirty() && active.data.estado === 'Borrador';
        const shown = pending.slice(0, 10).map(i => i + 1).join(', ');
        const detail = pending.length === 1 ? ' Pregunta pendiente: ' + shown + '.' : ' Preguntas pendientes: ' + shown + (pending.length > 10 ? ' y ' + (pending.length - 10) + ' más.' : '.');
        active.announce('No se finalizó: ' + (pending.length === 1 ? 'falta 1 criterio por responder.' : 'faltan ' + pending.length + ' criterios por responder.') + detail + (saved ? ' El borrador está guardado.' : ' Revise el estado del borrador antes de cerrar.'), true);
      } else active.announce(String(text), true);
    }
    mensajeOriginal(text, error);
    // Mantener la vista en la tarjeta y en la confirmación próxima al botón.
    if (active && error) ppsEvalPanel().querySelector('#ppsSaveFeedback')?.scrollIntoView({block:'nearest'});
  };
  const css = document.createElement('style');
  css.textContent = '#ppsEvalPanel .pps-save-status{font-size:14px;line-height:1.4;margin:6px 0;overflow-wrap:anywhere}#ppsEvalPanel .pps-save-status[role=alert]{color:#922727;font-weight:700}#ppsEvalPanel .pps-save-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#ppsEvalPanel .pps-save-controls button{min-height:48px}#ppsEvalPanel .pps-save-feedback-footer{flex-wrap:wrap}#ppsEvalPanel #ppsSaveFeedback{flex:0 0 100%;order:-1;box-sizing:border-box;padding:10px 12px;border:1px solid #8cae98;border-radius:10px;background:#eaf5ee;color:#1c5131;font:600 14px/1.45 Arial;text-align:left;overflow-wrap:anywhere}#ppsEvalPanel #ppsSaveFeedback[role=alert]{background:#fff3dc;border-color:#b17e24;color:#6c4100}';
  document.head.append(css);
  let observer = null;
  window.ppsV11EstadoBotones = function (busy) {
    estadoOriginal(busy);
    if (active) active.sync();
  };
  window.ppsEvalGuardar = function (finalizar) {
    if (active) active.sync();
    return guardarOriginal(finalizar);
  };
  window.ppsEvalDibujar = function (data) {
    if (active) active.clearTimers();
    if (observer) observer.disconnect();
    if (ppsV11Signature) { ppsV11Signature.destruir(); ppsV11Signature = null; }
    active = null;
    const answers = {};
    Object.entries(data.respuestas || {}).forEach(([key, value]) => {
      if (['0', '1', '2', 'NA'].includes(String(value))) answers[key] = String(value);
    });
    const savedSignature = data.firma ? { nombre: data.firmante || '', trazos: data.firma.trazos } : null;
    const editable = data.estado !== 'Finalizada' && data.puedeGuardar && !data.demo;
    const panel = ppsEvalPanel();
    original(Object.assign({}, data, { respuestas: answers }));
    const state = {
      data, answers, timer: null, watchdog: null, signatureHost: null,
      message: editable ? 'Guardado automático activo. Los cambios se guardan como borrador.' : (data.demo ? 'Demostración: no se guardan datos reales.' : 'Evaluación finalizada: solo lectura.'),
      error: false, pendingTarget: null, confirmed: { responses: Object.assign({}, answers), signature: savedSignature },
      read() { return { responses: Object.assign({}, answers), signature: ppsV11Signature ? ppsV11Signature.leer() : savedSignature }; },
      clearTimers() { clearTimeout(this.timer); clearTimeout(this.watchdog); this.timer = this.watchdog = null; },
      dirty() { return editable && !same(this.read(), this.confirmed); },
      announce(text, error) { this.message = text; this.error = !!error; this.sync(); },
      changed() { this.pendingTarget = null; this.announce('Cambios pendientes de guardar…'); this.schedule(); },
      schedule() {
        clearTimeout(this.timer);
        if (!editable || !this.dirty() || ppsV11Busy || active !== this) return;
        if (!navigator.onLine) { this.announce('Sin conexión: cambios pendientes de guardar. No cierre esta pantalla.', true); return; }
        const now = this.read();
        if (same(now.responses, this.confirmed.responses) && !(ppsMobileFirmaValida(now.signature) && !same(now.signature, this.confirmed.signature))) return;
        this.timer = setTimeout(() => {
          if (active !== this || ppsV11Busy || !this.dirty()) return;
          panel.ppsMobileAutomatic = true;
          try { ppsEvalGuardar(false); }
          finally { panel.ppsMobileAutomatic = false; }
        }, 2000);
      },
      sync() {
        if (active !== this) return;
        const dialog = panel.querySelector('.pps-step-dialog');
        if (!dialog) return;
        // El renderizador móvil original permanece intacto. Solo se añade el puente de datos.
        let host = panel.querySelector('[data-pps-response-bridge]');
        if (!host) { host = document.createElement('div'); host.hidden = true; host.dataset.ppsResponseBridge = '1'; panel.append(host); }
        panel.querySelectorAll('select[data-criterio]').forEach(select => { if (!host.contains(select)) select.remove(); });
        if (!host.childElementCount) {
          data.criterios.forEach((_, i) => {
            const select = document.createElement('select'); select.dataset.criterio = String(i);
            ['', '2', '1', '0', 'NA'].forEach(value => { const option = document.createElement('option'); option.value = value; select.append(option); });
            host.append(select);
          });
        }
        host.querySelectorAll('select').forEach(select => { select.value = answers[select.dataset.criterio] || ''; select.disabled = ppsV11Busy || !editable; });
        const header = dialog.querySelector('.pps-step-header>div');
        for (const id of ['ppsAutosaveStatus', 'v11EvalStatus']) {
          if (!panel.querySelector('#' + id)) {
            const status = document.createElement('p'); status.id = id; status.className = 'pps-save-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); header.append(status);
          }
        }
        const status = panel.querySelector('#ppsAutosaveStatus');
        if (status.textContent !== this.message) status.textContent = this.message;
        if (status.getAttribute('role') !== (this.error ? 'alert' : 'status')) status.setAttribute('role', this.error ? 'alert' : 'status');
        const match = dialog.querySelector('.pps-step-kicker').textContent.match(/(\d+)\s+de\s+(\d+)/);
        const last = match && Number(match[1]) === data.criterios.length;
        const progressLabel = dialog.querySelector('.pps-step-progress div>span');
        if (progressLabel && progressLabel.textContent !== 'Posición en el instrumento') progressLabel.textContent = 'Posición en el instrumento';
        const footer = dialog.querySelector('footer');
        footer.classList.add('pps-save-feedback-footer');
        let feedback = footer.querySelector('#ppsSaveFeedback');
        if (!feedback) { feedback = document.createElement('div'); feedback.id = 'ppsSaveFeedback'; feedback.setAttribute('aria-live','polite'); footer.prepend(feedback); }
        if (feedback.textContent !== this.message) feedback.textContent = this.message;
        feedback.setAttribute('role',this.error?'alert':'status');
        dialog.querySelectorAll('input[name=step]').forEach(input => { input.disabled = ppsV11Busy || !editable; });
        const next = dialog.querySelector('[data-n]');
        if (next) next.disabled = ppsV11Busy || (last && !editable);
        const back = dialog.querySelector('[data-p]');
        if (back) back.disabled = ppsV11Busy || (match && Number(match[1]) === 1);
        if (last && Number(data.numero) === 2 && editable && !dialog.querySelector('#v11FirmaHost')) {
          const previous = ppsV11Signature ? ppsV11Signature.leer() : savedSignature;
          const name = this.signatureHost?.querySelector('input')?.value || previous?.nombre || data.firmante || '';
          if (ppsV11Signature) ppsV11Signature.destruir();
          const signature = document.createElement('div'); signature.id = 'v11FirmaHost';
          dialog.insertBefore(signature, dialog.querySelector('footer'));
          this.signatureHost = signature;
          ppsV11Signature = ppsV11FirmaControl(signature, name, previous);
          signature.addEventListener('input', () => this.changed());
          signature.addEventListener('pointerdown', () => clearTimeout(this.timer), true);
          signature.addEventListener('pointerup', () => setTimeout(() => this.changed(), 0));
          signature.addEventListener('pointercancel', () => setTimeout(() => this.changed(), 0));
          signature.querySelector('button').addEventListener('click', () => this.changed());
        }
        if (editable && !dialog.querySelector('.pps-save-controls')) {
          const controls = document.createElement('div'); controls.className = 'pps-save-controls';
          if (!last) {
            const save = document.createElement('button'); save.type = 'button'; save.className = 'btn secondary'; save.textContent = 'Guardar borrador'; save.onclick = () => ppsEvalGuardar(false); controls.append(save);
          }
          // Mantener las tarjetas y navegación existentes; el envío se ofrece al terminar el instrumento.
          if (last) {
            const final = document.createElement('button'); final.type = 'button'; final.className = 'btn primary'; final.textContent = Number(data.numero) === 2 ? 'Firmar y enviar' : 'Finalizar evaluación'; final.onclick = () => ppsEvalGuardar(true); controls.append(final);
          }
          dialog.append(controls);
        }
        dialog.querySelectorAll('.pps-save-controls button').forEach(button => { button.disabled = ppsV11Busy; });
        const pendingButton = dialog.querySelector('[data-pps-pending]');
        if (this.pendingTarget !== null && !pendingButton) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'btn secondary'; button.dataset.ppsPending='1'; button.textContent = 'Ir al criterio pendiente';
          button.onclick = () => {
            if (ppsV11Busy) return;
            const target = this.pendingTarget;
            for (let attempts = 0; attempts < data.criterios.length; attempts++) {
              const found = panel.querySelector('.pps-step-kicker').textContent.match(/(\d+)\s+de\s+(\d+)/);
              const index = Number(found[1]) - 1;
              if (index === target) break;
              panel.querySelector(index > target ? '[data-p]' : '[data-n]').click();
            }
            this.pendingTarget = null; this.sync();
            panel.querySelector('.pps-step-card h3').setAttribute('tabindex','-1'); panel.querySelector('.pps-step-card h3').focus();
          };
          dialog.querySelector('.pps-save-controls').append(button);
        } else if (this.pendingTarget === null && pendingButton) pendingButton.remove();
      }
    };
    active = state;
    const onChange = event => {
      const input = event.target;
      if (!input.matches('input[name=step]') || !panel.contains(input) || !editable || ppsV11Busy) return;
      const match = panel.querySelector('.pps-step-kicker')?.textContent.match(/(\d+)\s+de\s+(\d+)/);
      if (!match) return;
      answers[String(Number(match[1]) - 1)] = input.value;
      state.changed();
    };
    if (panel.ppsSaveCapture) panel.removeEventListener('change', panel.ppsSaveCapture, true);
    panel.ppsSaveCapture = onChange;
    panel.addEventListener('change', onChange, true);
    observer = new MutationObserver(() => state.sync());
    observer.observe(panel, { childList: true, subtree: true });
    panel.ppsMobileRefresh = () => state.sync();
    state.sync();
  };
})();
