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
  Logger: { log: () => {} }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '..', 'Code.gs'), 'utf8'), context);
const results = context.runPureTests_();
for (const result of results) {
  console.log((result.ok ? 'PASS' : 'FAIL') + ' ' + result.test);
  assert.equal(result.ok, true, result.test);
}
console.log(`Passed ${results.length} backend logic tests.`);
