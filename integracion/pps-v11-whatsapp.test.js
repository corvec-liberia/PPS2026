'use strict';

const assert = require('node:assert/strict');
const {
  normalizeCostaRicaPhone,
  validateEvaluationLink,
  buildWhatsAppUrl
} = require('./pps-v11-whatsapp.js');

const token = 'a'.repeat(64);
const evaluationLink = 'https://script.google.com/macros/s/DEPLOYMENT/exec?evaluacion2=' + token;

assert.equal(normalizeCostaRicaPhone('8888 7777'), '50688887777');
assert.equal(normalizeCostaRicaPhone('+506 8888-7777'), '50688887777');
assert.equal(normalizeCostaRicaPhone('+1 (415) 555-2671'), '14155552671');
assert.equal(normalizeCostaRicaPhone('1234567'), '');
assert.equal(normalizeCostaRicaPhone('1234567890123456'), '');

assert.equal(validateEvaluationLink(evaluationLink), evaluationLink);
assert.throws(() => validateEvaluationLink('https://example.com/?evaluacion2=' + token));
assert.throws(() => validateEvaluationLink('https://script.google.com/macros/s/DEPLOYMENT/exec?evaluacion2=student-name'));
assert.throws(() => validateEvaluationLink(evaluationLink + '&student=private'));

const share = new URL(buildWhatsAppUrl('88887777', evaluationLink));
assert.equal(share.origin, 'https://wa.me');
assert.equal(share.pathname, '/50688887777');
assert.match(share.searchParams.get('text'), /Finalizar y guardar/);
assert.match(share.searchParams.get('text'), new RegExp(token));

console.log('PPS v11 WhatsApp checks passed.');
