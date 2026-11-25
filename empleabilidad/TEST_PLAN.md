# Matriz de pruebas — Encuesta de Empleabilidad 2026

Las pruebas de lógica local usan datos ficticios FIX-* y no escriben en Google Sheets. Las pruebas de persistencia se ejecutaron en un libro temporal separado llamado TEMP PRUEBAS PPS EMPLEABILIDAD 2026; no se usaron filas ficticias en el libro PPS.

| N.º | Requisito | Método de verificación | Resultado observado |
|---:|---|---|---|
| 1 | Especialidad real y nombre del estudiante | Validación de enlace personal opaco; el servidor devuelve solo el registro correspondiente | APROBADA en integración aislada; pendiente probar un enlace personal real en navegador. La especialidad y el nombre se muestran en campos de solo lectura |
| 2 | Filtrado de estudiantes | Pruebas aisladas de código opaco y validación de especialidad; rechazo de código inválido | APROBADA en integración; no se probó ni expuso un código real de estudiante |
| 3 | Empresa automática | Asignación vigente/final válida más reciente en el padrón | APROBADA: lectura del padrón real y pruebas con reubicación |
| 4 | Reubicaciones | Asignación cancelada, válida posterior y cancelación final | APROBADA: pruebas unitarias |
| 5 | Fecha y hora de Costa Rica | Zona del libro/proyecto y valor Date del libro temporal | APROBADA: America/Costa_Rica |
| 6 | Cinco opciones laborales | Persistencia de cada estado permitido | APROBADA: integración aislada |
| 7 | Motivo condicional | Motivo obligatorio al rechazar y prohibido en otros estados | APROBADA: integración y validación del servidor |
| 8 | Actualización de respuesta | Reemplazo de respuesta vigente y nuevo evento | APROBADA: integración aislada |
| 9 | Prevención de duplicados | Reintento con la misma clave e invocaciones concurrentes bajo LockService | APROBADA: integración aislada, sin fila ni evento duplicados |
| 10 | Conservación del historial | Actualización y reintento tardío | APROBADA: integración aislada |
| 11 | Almacenamiento en Sheets | Escritura, lectura de vuelta y flush en libro temporal; revisión del libro oficial | APROBADA en libro temporal; las celdas A2 de respuesta e historial oficiales siguen vacías |
| 12 | Pérdida de conexión | Estados sin conexión, reintento e idempotencia | Parcial: comprobación estática aprobada; falta simular pérdida real de red |
| 13 | Privacidad | Archivos públicos sin PII; identificación con token opaco | APROBADA: revisión de archivos y pruebas unitarias; el código inválido no mostró nombres |
| 14 | Vista móvil | Ventana de 390 px y controles táctiles | APROBADA en emulación: no hubo desplazamiento horizontal y el botón de verificación mide 52 px |
| 15 | Sesión no autenticada | PWA pública sin sesión Google | PARCIAL: la página pública abre, pero el usuario reportó error de conexión con Apps Script. Pendiente comprobar catálogo/identidad con enlace personal válido en su navegador |
| 16 | Instalación PWA | Manifest, íconos, service worker y estado de instalación del navegador | APROBADA estáticamente; el navegador mostró la opción de agregar a inicio. No se instaló en un teléfono real |
| 17 | Indicadores administrativos | Estados, participación, tasas con denominadores separados | APROBADA: integración aislada |
| 18 | PPS sin perjuicio | Comparación de la publicación raíz y el commit aislado | APROBADA: PPS 2026 continúa cargando; solo se modificó empleabilidad/pwa/** |
| 19 | Código no editable | Inspección de HTML y lógica de inicio | APROBADA estáticamente: se quitó el campo manual; enlace personal identifica automáticamente y nombre/especialidad son solo lectura |
| 20 | WhatsApp individual | Pruebas locales de normalización y unión por cédula, filtros y URL de WhatsApp Web | APROBADA en código y pruebas locales. Falta publicar el nuevo Code.gs en Apps Script para que el panel autenticado reciba los teléfonos |

## Resultados ejecutados — 24/11/2026

- 14/14 pruebas unitarias de backend aprobadas después de añadir el enlace privado de teléfonos de WhatsApp.
- La prueba de teléfonos usa datos ficticios: valida formato `+506`, asociación por cédula y exclusión de números inválidos; no imprime teléfonos reales en los resultados.
- La PWA estática comprueba filtros, mensaje por estudiante, apertura de WhatsApp Web, ausencia de `localStorage` y que los números/códigos no estén en archivos públicos.
- 8/8 pruebas de integración Apps Script aprobadas con cinco estudiantes ficticios en un libro temporal aislado.
- La integración comprobó escritura real, lectura posterior, clave idempotente, actualización, historial, fecha CR, motivos de rechazo e indicadores.
- El usuario reportó que su navegador mostraba un error de conexión con Apps Script. La PWA fue actualizada para validar directamente el enlace personal, sin descargar el catálogo antes, y para retirar el campo manual del código.
- El libro oficial conserva 144 elegibles, 0 respuestas y 0 movimientos de historial; las celdas A2 de respuestas e historial siguen vacías.
- GitHub Pages muestra PPS 2026 en la raíz y la encuesta en su ruta independiente.
- Pendiente: probar un enlace personal válido en el navegador del usuario, simulación real de desconexión y prueba de instalación en teléfono. No se registró una respuesta ficticia en el libro oficial.
