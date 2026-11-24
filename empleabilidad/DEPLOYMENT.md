# Implementación de Encuesta de Empleabilidad 2026

## Arquitectura y aislamiento

- Backend independiente en Google Apps Script. Recibe los formularios por POST; las respuestas viajan en el cuerpo, no en la URL.
- Las lecturas de especialidades y los recibos usan JSONP para trabajar desde GitHub Pages sin depender de CORS.
- La PWA está en empleabilidad/pwa/. No contiene padrones, cédulas, contactos, respuestas, códigos de estudiante ni claves.
- El script escribe únicamente en las cinco pestañas de empleabilidad. Las cuatro tablas base de PPS son solo lectura.
- El panel administrativo valida ADMIN_KEY en el servidor; la clave permanece en las propiedades del proyecto.
- La carpeta pública de encuesta se agregó a main como ruta aislada. El commit 2632439596425aac1a95bf36487fe42d5083db84 añadió únicamente empleabilidad/pwa/**; no cambió los archivos PPS de la raíz.

## Enlaces y estado actual — 24/11/2026

- Encuesta pública: https://corvec-liberia.github.io/PPS2026/empleabilidad/pwa/
- Panel administrativo: https://corvec-liberia.github.io/PPS2026/empleabilidad/pwa/admin.html
- Web App activa de Apps Script (versión 2): https://script.google.com/macros/s/AKfycbxlWdGtSR-nXDK6s5Bc-NghaErFb2AZx8DcVDIrW7z48Bq65SrQQgmW0gh9xYzE15Kk/exec
- El URL de Web App termina en /exec; no usar el URL de biblioteca /macros/library/... ni el URL de prueba /dev.
- La implementación ejecuta como cordiempresactpl@gmail.com y permite acceso anónimo (Anyone). La configuración de la PWA apunta al URL activo.
- En un navegador limpio, sin sesión Google, la PWA cargó las 10 especialidades reales por el endpoint público. Un código ficticio inválido fue rechazado sin revelar nombres. En la hoja oficial, la fila 2 de respuestas e historial sigue vacía.
- La comprobación de salud de Apps Script devuelve JSON. En un perfil con varias cuentas Google, Apps Script puede redirigir a una ruta /macros/u/2/ que presenta el 404 genérico de Drive. La prueba limpia sin iniciar sesión sí cargó la encuesta; para compartir, usar siempre el enlace de GitHub Pages, no el endpoint del backend.
- La página PPS en la raíz de GitHub Pages sigue mostrando “PPS 2026 · CTP Liberia”. La prueba confirmó que PPS continúa disponible después de agregar la ruta aislada.

## Inicialización y datos

1. setupEmpleabilidad2026() creó las pestañas de respuestas, historial, dashboard, accesos y exclusiones.
2. La auditoría de solo lectura encontró 144 estudiantes elegibles, 0 respuestas y 0 eventos de historial.
3. Las pruebas de escritura usaron cinco estudiantes ficticios en el libro temporal TEMP PRUEBAS PPS EMPLEABILIDAD 2026; las 8 pruebas pasaron y el libro temporal fue enviado a la papelera.
4. El catálogo público actual contiene 10 especialidades; los tokens opacos individuales no se publicaron en GitHub.
5. SURVEY_URL apunta a la página pública de la PWA. BOOK_ID, ADMIN_KEY y los accesos individuales se mantienen solo en Apps Script/Sheets.

## Privacidad

- Los estudiantes ingresan mediante código opaco individual. El servidor confirma elegibilidad y resuelve su empresa desde la asignación válida más reciente.
- No se publica ningún catálogo de nombres ni información de contacto.
- Un guardado solo se confirma después de verificar el recibo, la respuesta vigente y el historial.
- El enlace personal contiene un código de acceso en el fragmento #c=; compartirlo únicamente con el estudiante correspondiente.
- No se usaron respuestas ficticias en el libro oficial. No se envió una respuesta válida de producción para evitar alterar las estadísticas reales.

## Pendiente

- Completar una prueba visual en un teléfono Android/iPhone real y una simulación de pérdida de conexión.
- No se creó una respuesta válida de estudiante en el libro oficial; la persistencia, idempotencia, actualización e historial ya pasaron en el libro de pruebas aislado.
