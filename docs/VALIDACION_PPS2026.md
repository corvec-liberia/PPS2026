# PPS 2026 — candidata integral de pruebas

Fecha: 2026-10-11 (America/Costa_Rica)

## Alcance verificado

- Base principal de pruebas: 168 estudiantes y 168 asignaciones.
- GPC: 33 expedientes/asignaciones con identificadores únicos.
- Respaldo de pruebas: 7 cuentas docentes activas.
- Inicio de sesión de coordinación: aprobado en el despliegue privado de pruebas.
- Evaluaciones docentes: lectura, guardado sintético e idempotencia aprobados.
- La PWA de esta rama apunta exclusivamente al despliegue privado del Apps Script de pruebas.
- Caché PWA incrementada a v11 para invalidar versiones anteriores.

## Hallazgos pendientes de validación humana

- No se probaron los PIN de docentes ni estudiantes porque no se restablecieron credenciales existentes.
- El despliegue de pruebas continúa con acceso “Only myself”; no se amplió el acceso ni se tocó producción.
- Los 34 registros de JEFES_INMEDIATOS contienen dos claves repetidas. El backend detecta la ambigüedad y evita sobrescrituras; la depuración de esos datos requiere revisión de coordinación.

## Prueba sintética

Se creó/actualizó una evaluación de borrador para ASG-DEMO-0001, instrumento IEPP-DEMO, con 5/10 puntos. Dos envíos conservaron una sola fila.
