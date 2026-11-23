/*
 * PPS 2026 · Compartir por WhatsApp (adaptador para Apps Script).
 *
 * Cargar después del bloque v11 de Index.html. Reutiliza el enlace seguro que
 * ya devuelve apiCrearEnlaceEvaluacion2PPS; no inventa criterios ni llama al
 * backend por su cuenta. El teléfono se usa solo para abrir wa.me y no se
 * guarda en el navegador ni en Google Sheets.
 */
(function (root) {
  'use strict';

  const TOKEN_RE = /^[a-f0-9]{64}$/;

  function normalizeCostaRicaPhone(value) {
    let digits = String(value == null ? '' : value).replace(/\D/g, '');
    if (digits.length === 8) digits = '506' + digits;
    if (!/^\d{8,15}$/.test(digits) || digits.charAt(0) === '0') return '';
    return digits;
  }

  function validateEvaluationLink(value) {
    let url;
    try {
      url = new URL(String(value || ''));
    } catch (error) {
      throw new Error('El enlace de evaluación no es válido.');
    }
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' ||
        !url.pathname.startsWith('/macros/s/') || url.hash) {
      throw new Error('El enlace no pertenece al portal Apps Script institucional.');
    }
    const keys = Array.from(url.searchParams.keys());
    const tokens = url.searchParams.getAll('evaluacion2');
    if (keys.length !== 1 || keys[0] !== 'evaluacion2' ||
        tokens.length !== 1 || !TOKEN_RE.test(tokens[0])) {
      throw new Error('El enlace no contiene una referencia segura de evaluación.');
    }
    return url.href;
  }

  function buildWhatsAppUrl(phone, evaluationLink) {
    const recipient = normalizeCostaRicaPhone(phone);
    if (!recipient) throw new Error('Ingrese un número válido con código de país o un número local de 8 dígitos.');
    const link = validateEvaluationLink(evaluationLink);
    const message = [
      'Buenas tardes. Le comparto el enlace seguro para completar la segunda evaluación de PPS 2026 del CTP de Liberia:',
      link,
      '',
      'Abra el enlace en Chrome y, al terminar, pulse «Finalizar y guardar». WhatsApp solo prepara este mensaje; revise y pulse Enviar.'
    ].join('\n');
    return 'https://wa.me/' + recipient + '?text=' + encodeURIComponent(message);
  }

  function mountShareControl() {
    if (!root.document) return;
    const host = root.document.getElementById('v11LinkHost');
    if (!host) return;
    const linkInput = host.querySelector('input.v11-link');
    if (!linkInput || host.querySelector('[data-pps-whatsapp-share]')) return;

    const box = root.document.createElement('section');
    box.className = 'pps-wa-share';
    box.dataset.ppsWhatsappShare = '1';
    box.innerHTML =
      '<label for="ppsWhatsappNumber">Número de WhatsApp de la persona encargada</label>' +
      '<input id="ppsWhatsappNumber" type="tel" inputmode="tel" autocomplete="tel" ' +
      'placeholder="8888 8888 o +506 8888 8888" aria-describedby="ppsWhatsappHelp ppsWhatsappStatus">' +
      '<p id="ppsWhatsappHelp">El número se usa solo para abrir WhatsApp en este dispositivo.</p>' +
      '<button type="button" class="btn primary" data-pps-whatsapp-button disabled>Compartir por WhatsApp</button>' +
      '<p id="ppsWhatsappStatus" role="status" aria-live="polite">WhatsApp mostrará el mensaje para que usted lo revise y lo envíe.</p>';
    host.appendChild(box);

    const number = box.querySelector('#ppsWhatsappNumber');
    const button = box.querySelector('[data-pps-whatsapp-button]');
    const status = box.querySelector('#ppsWhatsappStatus');
    const link = () => host.querySelector('input.v11-link');
    const refresh = () => {
      button.disabled = !normalizeCostaRicaPhone(number.value) || !link();
    };
    number.addEventListener('input', refresh);
    button.addEventListener('click', () => {
      try {
        const target = buildWhatsAppUrl(number.value, link() && link().value);
        const opened = root.open(target, '_blank', 'noopener,noreferrer');
        if (!opened) {
          status.textContent = 'El navegador bloqueó la ventana. Permita abrir WhatsApp y vuelva a tocar el botón.';
          return;
        }
        status.textContent = 'WhatsApp está abierto. Revise el destinatario y el mensaje, y pulse Enviar.';
      } catch (error) {
        status.textContent = error.message || 'No se pudo preparar el mensaje.';
      }
    });

    const style = root.document.createElement('style');
    style.dataset.ppsWhatsappStyle = '1';
    style.textContent =
      '#v11LinkHost .pps-wa-share{display:grid;gap:10px;margin-top:16px;padding:14px;border:1px solid #d8e6dc;border-radius:14px;background:#f8fcf9}' +
      '#v11LinkHost .pps-wa-share label{font-weight:700;color:#244637}' +
      '#v11LinkHost .pps-wa-share input{box-sizing:border-box;width:100%;min-height:50px;padding:12px;border:1px solid #9db9a5;border-radius:10px;font:inherit}' +
      '#v11LinkHost .pps-wa-share button{min-height:50px;touch-action:manipulation}' +
      '#v11LinkHost .pps-wa-share p{margin:0;color:#526b5e;font-size:14px;line-height:1.45}' +
      '#v11LinkHost .pps-wa-share button:disabled{opacity:.55;cursor:not-allowed}';
    if (!root.document.querySelector('style[data-pps-whatsapp-style]')) root.document.head.appendChild(style);
  }

  const api = {
    normalizeCostaRicaPhone: normalizeCostaRicaPhone,
    validateEvaluationLink: validateEvaluationLink,
    buildWhatsAppUrl: buildWhatsAppUrl,
    mountShareControl: mountShareControl
  };

  root.PPSEvalWhatsApp = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (root.document) {
    const observe = () => {
      mountShareControl();
      if (!root.document.body || !root.MutationObserver) return;
      const observer = new root.MutationObserver(mountShareControl);
      observer.observe(root.document.body, { childList: true, subtree: true });
    };
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', observe, { once: true });
    } else {
      observe();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
