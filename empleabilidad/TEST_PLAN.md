# Matriz de pruebas — Encuesta de Empleabilidad 2026

Las pruebas de lógica local usan datos inventados `FIX-*` y no escriben en Google Sheets. Las pruebas de persistencia se ejecutan en un libro temporal separado con el nombre exacto `TEMP PRUEBAS PPS EMPLEABILIDAD 2026`; nunca se usan filas ficticias en el libro PPS.

| N.º | Requisito | Método de verificación | Resultado observado |
|---:|---|---|---|
| 1 | Carga de especialidades reales | Catálogo activo leído del libro PPS; cotejo con auditoría | Prueba local y Apps Script aprobadas; endpoint público pendiente de despliegue |
| 2 | Filtrado de estudiantes | Código opaco devuelve solo el estudiante asociado y valida especialidad | Integración temporal aprobada; endpoint público pendiente de despliegue |
| 3 | Empresa automática | Empresa e ID proceden de la asignación elegible más reciente | Apps Script leyó el padrón real; lógica aprobada |
| 4 | Reubicaciones | Asignación cancelada, reubicación válida y cancelación más reciente | Prueba unitaria aprobada |
| 5 | Fecha y hora de Costa Rica | Zona del libro/proyecto y valor `Date` en libro temporal | Integración aprobada; libro oficial en `America/Costa_Rica` |
| 6 | Cinco opciones laborales | Persistencia de cada estado permitido | Integración aprobada |
| 7 | Motivo condicional | Rechazo requiere uno de cinco motivos; otras opciones los prohíben | Integración y validación del servidor aprobadas |
| 8 | Actualización de respuesta | Actualiza la pestaña vigente y agrega un movimiento al historial | Integración aprobada |
| 9 | Prevención de duplicados | Reintento con la misma clave idempotente y `LockService` | Integración aprobada; una sola fila vigente y un solo movimiento por reintento |
| 10 | Conservación de historial | Actualización posterior conserva el evento anterior y resiste un reintento tardío | Integración aprobada |
| 11 | Almacenamiento en Google Sheets | Lectura de vuelta de recibo, respuesta vigente e historial tras `flush()` | Integración aprobada en libro temporal; libro oficial verificado con cero respuestas ficticias |
| 12 | Pérdida de conexión | La PWA no confirma sin recibo; reintento conserva idempotencia | Comprobación estática aprobada; simulación de red en navegador pendiente |
| 13 | Privacidad | Identidad con código opaco; sin cédulas, teléfonos ni correos en salida pública | Prueba unitaria aprobada; revisión de archivos públicos aprobada |
| 14 | Vista móvil | Ventana estrecha y controles táctiles | Pendiente prueba visual en navegador móvil |
| 15 | Sesión no autenticada | Web App público sin sesión de Google; consulta individual requiere código | Pendiente despliegue público |
| 16 | Instalación PWA | Manifest, íconos, service worker e instalación del navegador | Verificación estática aprobada; GitHub Pages pendiente |
| 17 | Indicadores administrativos | Cinco estados, actualización y tasas con denominadores distintos | Integración aprobada en libro temporal |
| 18 | PPS sin perjuicio | Auditoría de filas y destinos de escritura | Auditoría Apps Script: 144 elegibles, 0 respuestas vigentes, 0 movimientos; tablas base solo lectura |

## Resultados ejecutados — 24/11/2026

- 13/13 pruebas unitarias aprobadas; incluyen reubicaciones, exclusiones, validación de las cinco situaciones, denominadores separados y ausencia de PII.
- 8/8 pruebas de integración Apps Script aprobadas con cinco estudiantes ficticios en un libro temporal aislado; una primera corrida detectó dos expectativas erróneas del test, se corrigieron y la repetición pasó completa.
- La integración comprobó escritura real, lectura posterior, clave idempotente, actualización, historial, fechas CR, razones de rechazo e indicadores.
- El libro oficial conserva 144 elegibles, 0 respuestas vigentes y 0 movimientos de historial. El libro temporal ficticio fue enviado a la papelera.
- Pendientes: despliegue anónimo de Apps Script, configuración final de GitHub Pages, prueba de navegador sin autenticar, modo sin conexión y validación visual móvil/instalable.

No se deben marcar como aprobadas las pruebas marcadas pendientes hasta ejecutarlas contra la implementación real.
