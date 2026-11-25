(function () {
  'use strict';

  const config = window.PPS_EMPLOYABILITY_CONFIG || {};
  const apiUrl = String(config.apiUrl || '');
  const apiReady = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(apiUrl);
  const $ = id => document.getElementById(id);
  const verifiedSpecialty = $('verifiedSpecialty');
  const verifiedStudent = $('verifiedStudent');
  const identityCard = $('identityCard');
  const form = $('surveyForm');
  const retryIdentityButton = $('retryIdentityButton');
  const submitButton = $('submitButton');
  const reasonBox = $('reasonBox');
  const reasonSelect = $('reason');
  const connectionNotice = $('connectionNotice');
  let identity = null;
  let personalCode = '';
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

  function postAndVerify(payload) {
    if (!apiReady) return Promise.reject(new Error('El servicio institucional todavía no está configurado.'));
    if (!navigator.onLine) return Promise.reject(new Error('Sin conexión. La respuesta no se registró; vuelva a intentarlo cuando recupere Internet.'));
    const rid = newKey();
    const frameName = 'pps_' + rid.replace(/-/g, '');
    const frame = document.createElement('iframe');
    frame.name = frameName;
    frame.title = 'Transmisión de respuesta';
    frame.hidden = true;
    // A public endpoint should not inherit Chrome's signed-in Google account
    // selection. Credentialless frames avoid the wrong /u/<account>/ route.
    if ('credentialless' in frame) frame.credentialless = true;
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
    return new Promise((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        frame.removeEventListener('load', onFrameLoad);
        postForm.remove(); frame.remove();
      };
      const finish = (error, value) => {
        if (finished) return;
        finished = true;
        cleanup();
        if (error) reject(error); else resolve(value);
      };
      const timer = window.setTimeout(() => {
        finish(new Error(navigator.onLine
          ? 'Apps Script no confirmó la respuesta. No se mostrará como guardada; vuelva a intentarlo.'
          : 'Se perdió la conexión. La respuesta no se confirmó; revise Internet y vuelva a enviar.'));
      }, 45000);
      const acceptEnvelope = message => {
        if (!message || message.source !== 'pps-empleabilidad-2026' || message.rid !== rid) return false;
        if (!message.result || !message.result.ok) {
          finish(new Error((message.result && message.result.message) || 'No se pudo completar la solicitud.'));
          return true;
        }
        finish(null, message.result);
        return true;
      };
      const onFrameLoad = () => {
        if (finished) return;
        try {
          const returned = frame.contentWindow;
          if (returned.location.origin !== window.location.origin || !returned.location.hash) return;
          const message = JSON.parse(decodeURIComponent(returned.location.hash.slice(1)));
          returned.history.replaceState(null, document.title, returned.location.pathname + returned.location.search);
          acceptEnvelope(message);
        } catch (_) { /* Before the same-origin receipt loads, the iframe is cross-origin. */ }
      };
      const onMessage = event => {
        // Apps Script serves HtmlService from hosts such as n-…-script.googleusercontent.com.
        // An opaque sandbox may also report "null". The receipt still has to match this POST's rid.
        const trustedOrigin = event.origin === 'https://script.google.com' ||
          event.origin === 'null' ||
          /^https:\/\/(?:[a-z0-9-]+\.)*script\.googleusercontent\.com$/.test(event.origin) ||
          /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(event.origin);
        if (!trustedOrigin) return;
        acceptEnvelope(event.data);
      };
      window.addEventListener('message', onMessage);
      frame.addEventListener('load', onFrameLoad);
      document.body.append(frame, postForm);
      try { postForm.submit(); } catch (err) { finish(err); }
    });
  }

  function getShareCode() {
    if (!window.location.hash) return '';
    const params = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get('c') || '';
    if (code) history.replaceState(null, document.title, window.location.pathname + window.location.search);
    return code;
  }

  function verifyCode(code) {
    if (!code) {
      setMessage($('identityMessage'), 'Abra el enlace personal que recibió para identificar su registro.', 'error');
      return Promise.resolve(false);
    }
    personalCode = code.trim();
    retryIdentityButton.hidden = true;
    retryIdentityButton.disabled = true;
    setMessage($('identityMessage'), 'Validando su enlace personal…', '');
    return postAndVerify({ action: 'identify', code: personalCode, specialtyCode: '' })
      .then(data => {
        if (!data.student || !data.session) throw new Error('No se pudo validar su identidad.');
        identity = data;
        verifiedSpecialty.value = data.student.specialty;
        verifiedStudent.value = data.student.name;
        $('studentField').hidden = false;
        $('identityHelp').hidden = true;
        identityCard.classList.add('verified-card');
        form.hidden = false;
        personalCode = '';
        setMessage($('identityMessage'), 'Identidad verificada.', 'success');
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
        retryIdentityButton.hidden = false;
        return false;
      })
      .finally(() => {
        retryIdentityButton.disabled = !navigator.onLine;
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
      setMessage($('saveMessage'), 'Abra su enlace personal para identificar el registro.', 'error');
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
    retryIdentityButton.disabled = !online;
    if (identity) submitButton.disabled = !online;
    if (!online) setNotice('Está sin conexión. No se enviarán respuestas hasta recuperar Internet.', 'notice-info');
    else setNotice('', 'notice-info');
  }

  retryIdentityButton.addEventListener('click', () => verifyCode(personalCode));

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

  personalCode = getShareCode();
  if (personalCode) verifyCode(personalCode);
  updateNetworkStatus();
})();
