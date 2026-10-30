# Numeración por bloque y textos completos — publicación autorizada, pendiente de ejecutar

Preferencia confirmada: numeración independiente de Específicas, Genéricas y Desarrollo humano. Específicas usa el número real del catálogo de cada especialidad (no se agregan indicadores para forzar 20); Genéricas tiene 16 y Desarrollo humano 15. Las claves globales de RESPUESTAS_JSON, su orden, las notas, ponderaciones, firmas, permisos y seguimiento permanecen iguales. Solo cambia Index.html.

## Evidencia recibida

Coordinación aportó `Auditoria_criterios_IEPP_01_EC_2025_PPS2026.xlsx`, con 16 indicadores genéricos y 15 encabezados/descripciones de desarrollo humano. Se extrajeron literalmente, incluidos espacios dobles/trailing y la grafía «estableciedo» de la transcripción. Las notas de la columna C de Genéricas NO se presentan como parte del criterio. El SHA256 del Excel, la fuente declarada y las referencias aproximadas están en textos-documentados-2025.json; el extractor es tools/extraer_auditoria_iepp.py.

La auditoría atribuye la transcripción a IEPP-01-EC 2025 y declara contraste coincidente con 2023. No acredita equivalencia con 2026: el instructivo menciona esa versión, pero no se recuperó la plantilla. Esta sesión verificó los textos contra el Excel aportado, no directamente contra el original de Drive. No debe presentarse como certificación de 2026.

## Alcance y salvaguardas

Los textos completos se muestran solo para instrumento IEPP-01-EC, cuando el bloque, su tamaño, el orden y el título previo coinciden con el registro de referencia. Se comprueban seis especialidades EC del catálogo. No se extienden a IEPP-01 (incluida Agroecología); allí solo cambia la numeración visual. Los criterios técnicos no se modifican. Ante cualquier discrepancia se conserva el texto del backend.

Genéricas muestra el indicador completo. Desarrollo humano muestra título más descripción. Se mantienen los controles estables, radios sin área invasora y el guardado de V33. El progreso se etiqueta como avance total, separado del número local del criterio. Los avisos de pendientes indican bloque y número local. Se retira el observador heredado que volvía a imponer «Pregunta 21 de 51».

Coordinación autorizó expresamente usar esta referencia y pidió omitir el año en la interfaz y en la impresión. La procedencia y el estado de equivalencia se conservan en la documentación técnica; la interfaz no afirma una certificación de equivalencia. «Imprimir instrumento» crea una vista local de revisión con numeración por bloque y los mismos textos/selecciones; no llama a Google ni altera la evaluación. La impresión usa las respuestas actuales del formulario, que pueden estar pendientes de confirmación. No certifica que se haya guardado ni sustituye el acta firmada. No genera pruebas con estudiantes reales.

## Pruebas

- bloques_evaluacion_test.py: 10 especialidades, 504 criterios, numeración, claves históricas de 0/N/A y pendientes.
- textos_documentados_test.py: cotejo independiente con las 31 filas del Excel, alcance EC/IEPP-01, ambas evaluaciones, impresión/PDF y controles estables con guardado lento en 320/360/768 px.
- interaccion_completa_test.py: se conserva la reproducción y salvaguarda frente a los clics que antes marcaban N/A sobre la posición previa de Siguiente.
- publicacion_bloques_test.cjs: simulación de cuenta/proyecto/versión/HEAD, integridad, verificación, reversión y rechazo de publicación sin aceptar explícitamente la referencia 2025.

No se ha actualizado Apps Script ni escrito en Sheets durante esta preparación. La versión publicada comunicada por coordinación sigue siendo V33. El publicador respalda V33 y HEAD, cambia únicamente el HTML y verifica la versión inmutable antes de actualizar el mismo despliegue. Sin --publicar solo comprueba. La publicación se realiza con --publicar, conforme a la autorización expresa recibida; no se amplía el alcance a IEPP-01. --verificar consulta; --revertir vuelve a V33 sin alterar filas ni HEAD. No ejecuta funciones de Apps Script. La autorización de coordinación ya fue recibida; la ejecución sigue pendiente de la sesión local autenticada.
