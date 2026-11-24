# Implementación de Encuesta de Empleabilidad 2026

## Arquitectura

- `Code.gs` es un proyecto independiente de Google Apps Script y recibe formularios `POST` de la PWA. Los datos de cada respuesta viajan en el cuerpo del formulario, no en la URL.
- Las lecturas de especialidades y los recibos se devuelven por JSONP para evitar los preflight y las restricciones CORS de Apps Script.
- `pwa/` contiene el sitio estático instalable de GitHub Pages. No incorpora padrones, cédulas, contactos, respuestas ni claves.
- El libro PPS oficial conserva sin cambios sus cuatro tablas base. El script escribe únicamente en las pestañas nuevas de empleabilidad.
- `ACCESOS_EMPLEABILIDAD_2026` conserva códigos opacos individuales y `EXCLUSIONES_EMPLEABILIDAD_2026` aplica depuraciones administrativas privadas; ambas pestañas permanecen ocultas en el libro. La consulta pública devuelve únicamente los datos del código utilizado.

## Despliegue del backend

1. Crear un proyecto independiente desde Apps Script con la cuenta institucional `cordiempresactpl@gmail.com`.
2. Copiar `Code.gs` y `appsscript.json` a ese proyecto. El identificador del libro no está en el repositorio; guardar el ID institucional únicamente como propiedad de secuencia de comandos `BOOK_ID`.
3. Ejecutar `setupEmpleabilidad2026`. Autorizar únicamente las operaciones de Hojas de cálculo solicitadas por Google. La función crea las pestañas requeridas, genera códigos individuales en una pestaña privada, aplica exclusiones aprobadas sin modificar las tablas base, actualiza el resumen y crea el código de administración en Propiedades del script. Si es la primera ejecución, `ADMIN_KEY` se muestra una vez en el registro privado de esa ejecución.
4. Crear una implementación nueva como Aplicación web, ejecutar como la cuenta que implementa y permitir acceso anónimo. El acceso anónimo solo permite usar un código personal; no permite leer el padrón o las respuestas.
5. Copiar el URL de implementación terminado en `/exec` a `pwa/config.js`, en `apiUrl`. No incluir el URL de ensayo `/dev`.
6. `setupEmpleabilidad2026` fija automáticamente `SURVEY_URL` al URL previsto de GitHub Pages; si la ruta publicada cambia, actualizar la propiedad desde Apps Script para que el panel genere enlaces individuales completos.
7. Ejecutar `auditEmpleabilidad2026` y revisar el registro. Después, abrir la URL desde una sesión no autenticada, verificar salud y carga de especialidades, y probar con un código ficticio aislado antes de compartir códigos reales.

## Publicación estática

Publicar `pwa/` desde una fuente de GitHub Pages aislada, o servirla bajo la ruta `empleabilidad/pwa/` del repositorio. El URL de `pwa/config.js` debe ser el Web App de Apps Script real. GitHub Pages y el repositorio no reciben ni almacenan la lista de estudiantes.

## Protección de datos

- No poner códigos individuales, enlaces con `#c=`, registros del padrón ni credenciales en GitHub.
- El enlace individual es un secreto de acceso tipo portador: entregarlo solo al estudiante correspondiente. El token viaja en el fragmento de URL y el navegador lo envía al backend en el cuerpo de un POST.
- El ID de la base y el código administrador se guardan en Propiedades del script; el código no se publica en GitHub. No publicarlo, enviarlo a grupos ni almacenarlo en `config.js`.
- Si un estudiante deja de ser elegible, el siguiente `setupEmpleabilidad2026` desactiva su código; el backend también vuelve a comprobar la asignación vigente al autenticar y guardar.
- Un guardado solo se confirma después de verificar el recibo y la respuesta en las pestañas de respuestas e historial.

## Pruebas aisladas

`runPureTests_` revisa el catálogo, asignaciones canceladas, reubicaciones, estados no aplicables, abandono documentado, denominadores de contratación y exclusión de campos confidenciales. `runIsolatedIntegrationTests2026(testSpreadsheetId)` prueba idempotencia, actualizaciones, historial, fecha/hora y dashboard en un libro separado llamado exactamente `TEMP PRUEBAS PPS EMPLEABILIDAD 2026`. Crear ese libro separado antes de ejecutarla y enviarlo a la papelera al terminar. Nunca pasar el ID del libro PPS oficial.

## Limitación antes de activar

La rama de desarrollo no tiene permiso de publicación de GitHub Pages por sí sola. El sitio público requiere habilitar GitHub Pages para la carpeta indicada o incorporar la ruta a la fuente de Pages configurada. Apps Script también requiere terminar la autenticación y aprobar la implementación pública como Web App.
