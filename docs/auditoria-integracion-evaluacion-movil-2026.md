# Auditoría e integración de evaluaciones móviles — PPS 2026

Fecha: 23 de noviembre de 2026  
Alcance: revisión de GitHub, PWA, exportaciones de Apps Script y metadatos de las hojas. No se modificó producción ni se escribieron notas.

## Hallazgos principales

### GitHub y PWA

- El repositorio corvec-liberia/PPS2026 usa main como rama principal. La rama feature/evaluacion-movil-2026 contiene el trabajo de evaluación móvil previo; prototipo-evaluacion-movil no incorpora cambios sobre main.
- La PWA de GitHub Pages es una carcasa de instalación y carga el portal de Apps Script en un iframe. La pantalla y las operaciones de evaluación viven en Apps Script; GitHub Pages por sí sola no puede leer ni guardar evaluaciones.
- El parche de interfaz que existe en la rama de evaluación móvil busca las funciones antiguas ppsEvalDibujar y ppsEvalGuardar. El backend exportado ahora utiliza el flujo v11 ppsV11...; no se debe instalar el parche antiguo tal como está.
- La exportación de Index.html fue modificada el 9 de noviembre; los archivos de servidor revisados son exportaciones de noviembre. El código que está desplegado actualmente en Apps Script y su versión publicada no se pudieron confirmar.

### Backend y hojas

- En la exportación revisada ya existe una segunda evaluación externa con token aleatorio de 64 caracteres hexadecimales, hash SHA-256 almacenado, vencimiento de 7 días, revocación del enlace anterior, validación de la asignación/docente y bloqueo de evaluaciones finalizadas.
- Las funciones servidor existentes son apiCrearEnlaceEvaluacion2PPS, apiRevocarEnlaceEvaluacion2PPS, apiAbrirEvaluacionEnlacePPS y apiEnviarEvaluacionEnlacePPS. El catálogo de criterios está en Apps Script y el instrumento se devuelve desde el servidor; la interfaz debe seguir usando esa fuente.
- La fórmula en la exportación v11 asigna 2 puntos posibles por criterio, acepta 2, 1, 0 o NA, excluye NA del máximo y redondea el porcentaje a dos decimales. El promedio final usa 50/50 entre las dos evaluaciones y requiere ambas finalizadas. La evaluación 2 se guarda en una fila separada de la evaluación 1.
- La exportación de servidor abre explícitamente la hoja RESPALDO Sistema de Gestion PPS2026. La hoja oficial visible se llama Sistema de Gestion PPS2026; la copia de código, por tanto, no demuestra que el despliegue activo escriba en la hoja oficial. La hoja aislada PPS2026 BASE PRUEBAS AISLADAS no tiene las pestañas de evaluaciones v11 y no está enlazada a un despliegue de Apps Script de prueba.
- Las hojas disponibles distinguen EVALUACIONES_EMPRESA de EVALUACIONES_DOCENTES_2026. El módulo v11 utiliza esta última en la hoja a la que apunta ssDocPPS_(). Antes de habilitar nuevas evaluaciones se debe confirmar cuál es la tabla institucional vigente y migrar/adaptar el destino solo en un entorno de pruebas.

### Interfaz, persistencia y documentos

- La exportación v11 ya muestra un criterio por pantalla, botones táctiles para 2/1/0/No aplica, progreso, navegación, revisión básica, firma manuscrita y nombre de la persona firmante. El guardado progresivo requiere confirmación del servidor y presenta estados de conexión; los cambios pendientes viven en memoria y la pantalla advierte antes de cerrarse. No se encontró recuperación local durable después de recargar o cerrar el navegador.
- La firma final de la segunda evaluación exige nombre y trazo. No se encontró un campo persistido para el cargo de la persona evaluadora.
- El guardado usa bloqueo de concurrencia, reutiliza el borrador de la misma asignación/evaluación y rechaza sobrescribir una fila finalizada. Si el guardado final tiene éxito y se pierde la respuesta, el enlace pasa a Utilizado; no se encontró una consulta de recibo idempotente para que la persona evaluadora confirme ese resultado con el mismo enlace.
- El enlace existente lleva el token en el parámetro de consulta. No incluye nombre ni identificación del estudiante, pero el token funciona como credencial de acceso y puede quedar en historial/registros técnicos. Conviene migrarlo a un flujo que evite exponer el portador en la consulta, con lectura del fragmento o intercambio controlado del token.
- El acta ambulatoria puede imprimirse/guardarse como PDF. No se pudo verificar un PDF individual completado del instrumento con respuestas y firma.

## Integración propuesta

1. Conservar el inicio de sesión, la selección de estudiantes, las asignaciones, el catálogo de criterios, el cálculo y el guardado v11 del servidor.
2. Reutilizar el selector institucional existente y añadir el campo de teléfono y el botón de WhatsApp después de que Apps Script confirme la creación del enlace. WhatsApp solo debe abrir un mensaje preparado; la persona usuaria revisa y pulsa Enviar.
3. Mantener el flujo del evaluador externo con los criterios servidos por Apps Script, sin copiar las rúbricas a archivos públicos de GitHub.
4. Antes de desplegar, fijar el destino de prueba en una copia aislada, crear allí las pestañas v11 necesarias y añadir recibo idempotente/auditoría de borradores. Probar primero criterios, cálculo, reintentos y separación entre evaluación 1 y evaluación 2.
5. Confirmar si el instrumento oficial requiere guardar el cargo y si requiere un PDF individual. Solo entonces adaptar columnas y formato.

El archivo integracion/pps-v11-whatsapp.js prepara el control de WhatsApp para integrarlo después del módulo v11 en Index.html. Valida el dominio/ruta del enlace y el formato del token, normaliza números locales de Costa Rica y no persiste el teléfono. Está desacoplado del backend porque la exportación revisada apunta a la hoja de respaldo.

## Casos prioritarios y límites de esta rama

- La base oficial muestra que los dos casos prioritarios de PriceSmart ya tienen primera evaluación registrada; la segunda evaluación es el paso pendiente. También existe el grupo AATP asignado a la docente indicada. No se generaron enlaces: aún falta comprobar el destino activo del backend y validar cada instrumento desde un despliegue aislado.
- La rama nueva se creó a partir de feature/evaluacion-movil-2026. No cambia main, GitHub Pages, Apps Script ni Google Sheets.
- Se puede leer la hoja oficial mediante Drive. Lo que falta es acceso al proyecto de Apps Script como editor o mediante Apps Script API/clasp y una versión de pruebas vinculada a una copia aislada con las pestañas de evaluación v11. Las exportaciones de Drive son fotografías de archivos, no acceso al proyecto ni prueba de la versión desplegada.

## Verificación realizada

- La batería integrada ppsV11Pruebas se ejecutó localmente sobre la exportación del servidor con una sustitución aislada para el hash de Utilities; pasó 10 de 10 comprobaciones. Cubre N/A, valores faltantes, todo N/A, nota cero, promedio 50/50, corte de aprobación, borrador pendiente y validación de firma. No abrió ni modificó hojas.
- La revisión de código confirmó el cálculo 2/1/0/NA, el promedio 50/50, el bloqueo de sobrescritura final y el ciclo de token en la exportación.
- Las comprobaciones locales del adaptador de WhatsApp verifican números de teléfono, validación de enlace opaco, rechazo de URL con datos adicionales y composición del enlace wa.me.
- No se ejecutaron guardados, pruebas de enlaces ni despliegues contra Apps Script o la hoja oficial. No se modificaron calificaciones reales.

## Despliegue seguro pendiente

1. Abrir el proyecto de Apps Script de prueba y apuntarlo a la hoja aislada correcta.
2. Confirmar el build/deploy y sus permisos con una cuenta de prueba.
3. Incorporar el adaptador, probar interfaz móvil y fallos de conexión con registros de prueba.
4. Añadir recuperación del comprobante tras pérdida de respuesta, auditoría de cambios y validar el PDF individual.
5. Revisar que la evaluación 1 permanezca intacta y que cada enlace solo permita su asignación.
6. Solicitar revisión institucional del resultado antes de cualquier publicación en producción.
