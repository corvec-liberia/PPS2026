# Matriz de pruebas — Encuesta de Empleabilidad 2026

Las pruebas de lógica local usan datos ficticios FIX-* y no escriben en Google Sheets. Las pruebas de persistencia se ejecutaron en un libro temporal separado llamado TEMP PRUEBAS PPS EMPLEABILIDAD 2026; no se usaron filas ficticias en el libro PPS.

| N.º | Requisito | Método de verificación | Resultado observado |
|---:|---|---|---|
| 1 | Carga de especialidades reales | Solicitud pública JSONP desde GitHub Pages | APROBADA: carga anónima de 10 especialidades reales |
| 2 | Filtrado de estudiantes | Pruebas aisladas de código opaco y validación de especialidad; rechazo público de código inválido | APROBADA en integración; el endpoint anónimo rechazó el código ficticio y no reveló nombres. No se probó un código real para no exponer datos |
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
| 15 | Sesión no autenticada | PWA/Apps Script en navegador limpio sin sesión Google | APROBADA: cargó el catálogo; código inválido fue rechazado. El perfil conectado con varias cuentas puede mostrar el 404 de Google |
| 16 | Instalación PWA | Manifest, íconos, service worker y estado de instalación del navegador | APROBADA estáticamente; el navegador mostró la opción de agregar a inicio. No se instaló en un teléfono real |
| 17 | Indicadores administrativos | Estados, participación, tasas con denominadores separados | APROBADA: integración aislada |
| 18 | PPS sin perjuicio | Comparación de la publicación raíz y el commit aislado | APROBADA: PPS 2026 continúa cargando; solo se agregó empleabilidad/pwa/** |

## Resultados ejecutados — 24/11/2026

- 13/13 pruebas unitarias de backend aprobadas.
- 8/8 pruebas de integración Apps Script aprobadas con cinco estudiantes ficticios en un libro temporal aislado.
- La integración comprobó escritura real, lectura posterior, clave idempotente, actualización, historial, fecha CR, motivos de rechazo e indicadores.
- La PWA pública abrió sin iniciar sesión y cargó 10 especialidades. El servidor rechazó un código ficticio inválido sin divulgar datos.
- El libro oficial conserva 144 elegibles, 0 respuestas y 0 movimientos de historial; las celdas A2 de respuestas e historial siguen vacías.
- GitHub Pages muestra PPS 2026 en la raíz y la encuesta en su ruta independiente.
- Pendiente: simulación real de desconexión y prueba de instalación en teléfono. No se registró una respuesta ficticia en el libro oficial.
