(function () {
  'use strict';

  const config = window.PPS_EMPLOYABILITY_CONFIG || {};
  const apiUrl = String(config.apiUrl || '');
  const apiReady = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(apiUrl);
  const $ = id => document.getElementById(id);
  const specialty = $('specialty');
  const student = $('student');
  const identityCard = $('identityCard');
  const form = $('surveyForm');
  const codeInput = $('accessCode');
  const identifyButton = $('identifyButton');
  const submitButton = $('submitButton');
  const reasonBox = $('reasonBox');
  const reasonSelect = $('reason');
  const connectionNotice = $('connectionNotice');
  const gasFrame = $('gasTransport');
  let availableSpecialties = [];
  let identity = null;
  let installPrompt = null;
  let pendingIdempotency = '';

  function newKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  }

  function setMessage(node, text, kind) {
    node.textContent = text || '';
    node.className = 'message' + (kind ? ' ' + kind : '');
  }

  function setNotice(text, kind) {
    connectionNotice.textContent = text;
    connectionNotice.className = 'notice ' + (kind || 'notice-info');
    connectionNotice.hidden = !text;
  }

  function jsonp(action, params) {
    if (!apiReady) return Promise.reject(new Error('El servicio institucional todavía no está configurado.'));
    if (!navigator.onLine) return Promise.reject(new Error('Sin conexión a Internet.'));
    return new Promise((resolve, reject) => {
      const callback = '__ppsCallback' + newKey().replace(/-/g, '');
      const script = document.createElement('script');
      const query = new URLSearchParams(Object.assign({ action, callback }, params || {}));
      const timeout = window.setTimeout(() => finish(new Error('El servicio no respondió a tiempo.')), 18000);
      function finish(error, value) {
        window.clearTimeout(timeout);
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
        script.remove();
        if (error) reject(error); else resolve(value);
      }
      window[callback] = data => finish(null, data);
      script.onerror = () => finish(new Error('No fue posible conectar con el servicio institucional.'));
      script.src = apiUrl + '?' + query.toString();
      document.head.appendChild(script);
    });
  }

  function postAndVerify(payload) {
    if (!apiReady) return Promise.reject(new Error('El servicio institucional todavía no está configurado.'));
    if (!navigator.onLine) return Promise.reject(new Error('Sin conexión. La respuesta no se registró; vuelva a intentarlo cuando recupere Internet.'));
    const rid = newKey();
    const frameName = 'pps_' + rid.replace(/-/g, '');
    const frame = document.createElement('iframe');
    frame.name = frameName;
    frame.title = 'Transmisión de respuesta';
    frame.hidden = true;
    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = apiUrl;
    postForm.target = frameName;
    postForm.acceptCharset = 'UTF-8';
    const values = Object.assign({}, payload, { rid });
    Object.keys(values).forEach(key => {
      const field = document.createElement('input');
      field.type = 'hidden';
      field.name = key;
      field.value = String(values[key] == null ? '' : values[key]);
      postForm.appendChild(field);
    });
    document.body.append(frame, postForm);
    try { postForm.submit(); } catch (err) { postForm.remove(); frame.remove(); return Promise.reject(err); }
    const deadline = Date.now() + 55000;
    return new Promise((resolve, reject) => {
      const cleanup = () => { postForm.remove(); frame.remove(); };
      const poll = () => {
        if (!navigator.onLine) {
          cleanup();
          reject(new Error('Se perdió la conexión. No se mostró confirmación; revise Internet y vuelva a enviar.'));
          return;
        }
        jsonp('result', { rid }).then(result => {
          if (result && result.pending) {
            if (Date.now() >= deadline) {
              cleanup();
              reject(new Error('No se pudo verificar el guardado. Vuelva a intentarlo; el sistema evita duplicar reintentos.'));
              return;
            }
            window.setTimeout(poll, 1200);
            return;
          }
          cleanup();
          if (!result || !result.ok) {
            reject(new Error((result && result.message) || 'No se pudo completar la solicitud.'));
            return;
          }
          resolve(result);
        }).catch(error => {
          if (Date.now() < deadline && navigator.onLine) window.setTimeout(poll, 1600);
          else { cleanup(); reject(error); }
        });
      };
      window.setTimeout(poll, 350);
    });
  }

  function loadSpecialties() {
    if (!apiReady) {
      specialty.replaceChildren(new Option('Servicio pendiente de configuración', ''));
      specialty.disabled = true;
      identifyButton.disabled = true;
      setNotice('La encuesta aún no está conectada al servicio institucional de Apps Script.', 'notice-info');
      return Promise.resolve(false);
    }
    return jsonp('specialties').then(data => {
      if (!data || !data.ok || !Array.isArray(data.specialties)) throw new Error('No se pudo cargar el catálogo de especialidades.');
      availableSpecialties = data.specialties;
      specialty.replaceChildren(new Option('Seleccione su especialidad', ''));
      availableSpecialties.forEach(item => specialty.add(new Option(item.name, item.code)));
      specialty.disabled = false;
      identifyButton.disabled = false;
      setNotice('', 'notice-info');
      return true;
    }).catch(error => {
      specialty.replaceChildren(new Option('No disponible', ''));
      specialty.disabled = true;
      identifyButton.disabled = true;
      setNotice(error.message + ' Verifique su conexión y vuelva a cargar la página.', 'notice-info');
      return false;
    });
  }

  function getShareCode() {
    if (!window.location.hash) return '';
    const params = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get('c') || '';
    if (code) history.replaceState(null, document.title, window.location.pathname + window.location.search);
    return code;
  }

  function verifyCode(code, chosenSpecialty) {
    if (!code) {
      setMessage($('identityMessage'), 'Ingrese el código personal que recibió.', 'error');
      return Promise.resolve(false);
    }
    if (!chosenSpecialty && !availableSpecialties.length) {
      setMessage($('identityMessage'), 'Primero cargue el catálogo de especialidades.', 'error');
      return Promise.resolve(false);
    }
    identifyButton.disabled = true;
    identifyButton.textContent = 'Verificando…';
    setMessage($('identityMessage'), 'Verificando su código…', '');
    return postAndVerify({ action: 'identify', code: code.trim(), specialtyCode: chosenSpecialty || '' })
      .then(data => {
        if (!data.student || !data.session) throw new Error('No se pudo validar su identidad.');
        identity = data;
        specialty.value = data.student.code;
        specialty.disabled = true;
        student.replaceChildren(new Option(data.student.name, data.student.code));
        student.disabled = true;
        $('studentField').hidden = false;
        identityCard.classList.add('verified-card');
        form.hidden = false;
        codeInput.value = '';
        setMessage($('identityMessage'), 'Identidad verificada. Solo se consultó su registro.', 'success');
        if (data.previous && data.previous.state) {
          const previous = Array.from(form.querySelectorAll('input[name="status"]')).find(input => input.value === data.previous.state);
          if (previous) previous.checked = true;
          reasonSelect.value = data.previous.reason || '';
          toggleReason();
          $('saveMessage').textContent = 'Encontramos su respuesta anterior. Puede actualizarla.';
          $('saveMessage').className = 'message';
          submitButton.textContent = 'Actualizar respuesta';
        }
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      })
      .catch(error => {
        setMessage($('identityMessage'), error.message, 'error');
        return false;
      })
      .finally(() => {
        identifyButton.disabled = !navigator.onLine;
        identifyButton.textContent = 'Verificar';
      });
  }

  function toggleReason() {
    const selected = form.querySelector('input[name="status"]:checked');
    const declined = !!selected && selected.value === 'declined';
    reasonBox.hidden = !declined;
    reasonSelect.required = declined;
    if (!declined) reasonSelect.value = '';
  }

  function submitSurvey(event) {
    event.preventDefault();
    if (!identity || !identity.session) {
      setMessage($('saveMessage'), 'Verifique primero su código personal.', 'error');
      return;
    }
    if (!navigator.onLine) {
      setMessage($('saveMessage'), 'Sin conexión. La respuesta no se registró. Mantenga esta pantalla abierta y vuelva a enviar cuando recupere Internet.', 'error');
      return;
    }
    if (!pendingIdempotency) pendingIdempotency = newKey();
    const selected = form.querySelector('input[name="status"]:checked');
    if (!selected) return;
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando…';
    setMessage($('saveMessage'), 'Enviando y verificando el registro en la base institucional…', '');
    postAndVerify({
      action: 'submit', session: identity.session,
      state: selected.value, reason: selected.value === 'declined' ? reasonSelect.value : '',
      idem: pendingIdempotency
    }).then(result => {
      if (!result.stored || !result.receipt) throw new Error('La respuesta fue recibida, pero no se confirmó su almacenamiento.');
      pendingIdempotency = '';
      identity.previous = { state: selected.value, reason: selected.value === 'declined' ? reasonSelect.value : '' };
      setMessage($('saveMessage'), result.duplicate ? 'Su respuesta ya estaba guardada. No se creó un duplicado.' : 'Respuesta guardada y verificada correctamente. Muchas gracias.', 'success');
      submitButton.textContent = 'Actualizar respuesta';
    }).catch(error => {
      setMessage($('saveMessage'), error.message + ' Puede reintentar; el sistema controla los duplicados.', 'error');
      submitButton.textContent = 'Reintentar guardado';
    }).finally(() => {
      submitButton.disabled = !navigator.onLine;
    });
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    identifyButton.disabled = !online || !apiReady || !availableSpecialties.length;
    if (identity) submitButton.disabled = !online;
    if (!online) setNotice('Está sin conexión. No se enviarán respuestas hasta recuperar Internet.', 'notice-info');
    else if (apiReady && availableSpecialties.length) setNotice('', 'notice-info');
  }

  identifyButton.addEventListener('click', () => {
    const code = codeInput.value || getShareCode();
    verifyCode(code, specialty.value);
  });

  form.addEventListener('change', event => {
    if (event.target && event.target.name === 'status') { toggleReason(); pendingIdempotency = ''; }
    if (event.target === reasonSelect) pendingIdempotency = '';
  });
  form.addEventListener('submit', submitSurvey);
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    $('installButton').hidden = false;
  });
  $('installButton').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $('installButton').hidden = true;
  });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone) $('iosInstall').hidden = false;
  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  loadSpecialties().then(loaded => {
    if (!loaded) return;
    const code = getShareCode();
    if (code) verifyCode(code, '');
  });
  updateNetworkStatus();
})();
