# Matriz de pruebas — Encuesta de Empleabilidad 2026

Las pruebas de lógica local usan datos inventados `FIX-*` y no escriben en Google Sheets. Las pruebas de persistencia se ejecutan en un libro temporal separado con el nombre exacto `TEMP PRUEBAS PPS EMPLEABILIDAD 2026`; nunca se usan filas ficticias en el libro PPS.

| N.º | Requisito | Método de verificación | Estado previo al despliegue |
|---:|---|---|---|
| 1 | Carga de especialidades reales | JSONP `action=specialties`, cotejo con `ESPECIALIDADES` activa | Pendiente endpoint real |
| 2 | Filtrado de estudiantes | Identificación personal coteja especialidad y devuelve solo ese estudiante | Revisado en código; pendiente endpoint real |
| 3 | Empresa automática | Resolver empresa e ID desde la asignación vigente | Prueba de lógica local aprobada |
| 4 | Reubicaciones | Fixture con asignación cancelada, reubicación válida y cancelación más reciente | Prueba de lógica local aprobada |
| 5 | Fecha y hora de Costa Rica | Zona del proyecto/libro y valor `Date` en libro temporal | Pendiente Apps Script |
| 6 | Cinco opciones laborales | Validación de estado con lista cerrada y persistencia de las cinco opciones | Validación local aprobada; persistencia pendiente |
| 7 | Motivo condicional | Rechazo requiere uno de cinco motivos permitidos; otras opciones lo prohíben | Validación local aprobada; integración pendiente |
| 8 | Actualización de respuesta | Upsert en actual y nueva fila de historial | Pendiente Apps Script |
| 9 | Prevención de duplicados | Mismo idempotency key reutilizado con LockService | Pendiente Apps Script |
| 10 | Conservación de historial | Actualización posterior conserva eventos previos | Pendiente Apps Script |
| 11 | Almacenamiento en Google Sheets | Leer recibo desde actual e historial tras `flush()` | Pendiente Apps Script |
| 12 | Pérdida de conexión | PWA conserva el estado en memoria y no confirma; reintento usa idempotency | Comprobación estática aprobada; simulación de red pendiente |
| 13 | Privacidad | Solo código opaco; ningún catálogo de nombres en archivos públicos | Revisión local aprobada |
| 14 | Vista móvil | Ventana estrecha y controles táctiles | Navegador móvil pendiente |
| 15 | Sesión no autenticada | Ruta pública del Web App sin sesión de Google y código válido requerido | Pendiente despliegue |
| 16 | Instalación PWA | Manifest, íconos 192/512, SW y prompt del navegador | Pendiente GitHub Pages |
| 17 | Indicadores administrativos | Fixture con las cinco situaciones y actualización; tasas por respuesta y por elegible | Prueba de lógica local aprobada; integración pendiente |
| 18 | PPS sin perjuicio | Verificar que las tablas base siguen iguales y que los cambios se limitaron a pestañas nuevas | Pestaña privada nueva verificada; comparación final pendiente |

No se deben marcar como aprobadas las pruebas marcadas pendientes hasta ejecutarlas contra la implementación real.
