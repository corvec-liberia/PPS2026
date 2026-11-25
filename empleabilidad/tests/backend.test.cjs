const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const specialtySheet = {
  getDataRange() {
    return { getValues: () => [
      ['CODIGO_ESPECIALIDAD', 'NOMBRE_ESPECIALIDAD', 'DOCENTE_ENCARGADA', 'ESTADO'],
      ['GPC', 'Gerencia y Producción en Cocina', '', 'Activa'],
      ['CCI', 'Contabilidad y Control Interno', '', 'Activa']
    ] };
  }
};
const workbook = { getSheetByName: name => name === 'ESPECIALIDADES' ? specialtySheet : null };
const context = {
  console,
  SpreadsheetApp: { openById: () => workbook },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'LOCAL-TEST-SPREADSHEET-ID-000000000000' }) },
  HtmlService: {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createHtmlOutput: html => ({ html, setXFrameOptionsMode(mode) { this.mode = mode; return this; } })
  },
  Logger: { log: () => {} }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '..', 'Code.gs'), 'utf8'), context);
const results = context.runPureTests_();
for (const result of results) {
  console.log((result.ok ? 'PASS' : 'FAIL') + ' ' + result.test);
  assert.equal(result.ok, true, result.test);
}
const bridge = context.postMessageOutput_('TEST-RID-1234567890', { ok: true, marker: '</script><img>' });
assert.equal(bridge.mode, 'ALLOWALL');
assert.ok(bridge.html.includes('parent.postMessage'));
assert.ok(bridge.html.includes('for(var i=0;i<8;i++)'));
assert.ok(bridge.html.includes('window.location.replace'));
assert.ok(bridge.html.includes('bridge-return.html#'));
assert.ok(bridge.html.includes('TEST-RID-1234567890'));
assert.ok(!bridge.html.includes('</script><img>'));
assert.ok(bridge.html.includes('https://corvec-liberia.github.io'));
console.log('PASS respuesta HTML segura para confirmar el POST por postMessage.');
console.log(`Passed ${results.length} backend logic tests.`);
