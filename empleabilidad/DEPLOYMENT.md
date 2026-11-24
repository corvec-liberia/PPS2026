# Implementación de Encuesta de Empleabilidad 2026

## Arquitectura

- `Code.gs` es un proyecto independiente de Google Apps Script y recibe formularios `POST` de la PWA. Los datos de cada respuesta viajan en el cuerpo del formulario, no en la URL.
- Las lecturas de especialidades y los recibos se devuelven por JSONP para evitar los preflight y las restricciones CORS de Apps Script.
- `pwa/` contiene el sitio estático instalable de GitHub Pages. No incorpora padrones, cédulas, contactos, respuestas ni claves.
- El libro PPS oficial conserva sin cambios sus cuatro tablas base. El script escribe únicamente en las pestañas nuevas de empleabilidad.
- `ACCESOS_EMPLEABILIDAD_2026` conserva códigos opacos individuales y `EXCLUSIONES_EMPLEABILIDAD_2026` aplica depuraciones administrativas privadas; ambas pestañas permanecen ocultas en el libro. La consulta pública devuelve únicamente los datos del código utilizado.

## Despliegue del backend

1. Proyecto independiente creado en Apps Script con la cuenta institucional. Código y manifiesto cargados en ese proyecto.
2. `BOOK_ID`, `SURVEY_URL`, `ADMIN_KEY` y la referencia del libro de prueba están en Propiedades del script; ninguna aparece en el repositorio. El libro oficial conserva sus cuatro tablas base sin modificaciones. El libro ficticio ya fue enviado a la papelera.
3. `setupEmpleabilidad2026` ejecutado y verificado: creó las cinco pestañas de empleabilidad, generó los accesos opacos y actualizó el dashboard. El proyecto/libro usan `America/Costa_Rica`.
4. Apps Script fue autorizado por la cuenta institucional. La autorización de Google mostró la advertencia estándar para proyectos no verificados; el propietario aprobó el acceso solicitado.
5. Pruebas temporales y auditoría de solo lectura aprobadas; el libro de prueba ficticio fue enviado a la papelera.
6. La implementación Web App versión 1 ya fue creada para ejecutarse como la cuenta institucional con acceso `Anyone` (incluye usuarios sin sesión). Sin embargo, la URL devuelve la página genérica de Drive 404 en el navegador institucional con varias cuentas iniciadas, antes de que se ejecute `doGet`. Se está comprobando desde incógnito según la recomendación oficial de Apps Script; mantener el lanzamiento bloqueado hasta verificar.
7. Cuando el endpoint responda correctamente fuera de la sesión múltiple, copiar el URL terminado en `/exec` a `pwa/config.js`. No usar el URL de prueba `/dev` ni publicar claves.
8. `setupEmpleabilidad2026` fijó `SURVEY_URL` al URL previsto de GitHub Pages; ajustar esta propiedad solo si cambia la ruta.
9. Pendiente: confirmar endpoint anónimo y salud/especialidades; luego completar smoke tests móviles/offline/PWA y confirmar las métricas en producción sin insertar respuestas ficticias.

## Publicación estática

La PWA está aislada bajo `empleabilidad/pwa/` en la rama `feature/empleabilidad-2026`. El repositorio principal continúa con su aplicación PPS existente. **Pendiente:** actualizar `pwa/config.js` con el URL real de Apps Script y fusionar únicamente esa carpeta a `main` para publicarla en GitHub Pages. El repositorio nunca recibe ni almacena la lista de estudiantes.

## Protección de datos

- No poner códigos individuales, enlaces con `#c=`, registros del padrón ni credenciales en GitHub.
- El enlace individual es un secreto de acceso tipo portador: entregarlo solo al estudiante correspondiente. El token viaja en el fragmento de URL y el navegador lo envía al backend en el cuerpo de un POST.
- El ID de la base y el código administrador se guardan en Propiedades del script; el código no se publica en GitHub. No publicarlo, enviarlo a grupos ni almacenarlo en `config.js`.
- Si un estudiante deja de ser elegible, el siguiente `setupEmpleabilidad2026` desactiva su código; el backend también vuelve a comprobar la asignación vigente al autenticar y guardar.
- Un guardado solo se confirma después de verificar el recibo y la respuesta en las pestañas de respuestas e historial.

## Pruebas aisladas

`runPureTests_` revisa el catálogo, asignaciones canceladas, reubicaciones, estados no aplicables, abandono documentado, denominadores de contratación y exclusión de campos confidenciales. `runIsolatedIntegrationTests2026(testSpreadsheetId)` prueba idempotencia, actualizaciones, historial, fecha/hora y dashboard en un libro separado llamado exactamente `TEMP PRUEBAS PPS EMPLEABILIDAD 2026`. Crear ese libro separado antes de ejecutarla y enviarlo a la papelera al terminar. Nunca pasar el ID del libro PPS oficial.

## Limitación antes de activar

La PWA está en la rama aislada y no se ha publicado en Pages porque `config.js` aún contiene el marcador del endpoint. El despliegue de Apps Script está creado y autorizado; el bloqueo observado es la respuesta 404 genérica en la sesión de Chrome con múltiples cuentas. Google indica que el multi-login no está soportado por Apps Script; confirmar en una ventana de incógnito antes de activar el enlace para estudiantes.
