# Asistente de pruebas de guardado PPS2026

Este paquete se entrega en una rama de revisión porque falló la descarga de artefactos del chat. No cambia el portal publicado ni modifica main.

## Uso

1. Descargue PPS2026-pruebas.zip y extraiga TODO en una carpeta nueva de Windows.
2. Abra EJECUTAR-PRUEBAS.cmd. Requiere Node y la autenticación local de clasp que ya configuró el propietario.
3. El asistente respalda y verifica el proyecto de PRUEBAS antes de actualizarlo y crear una implementación privada nueva. No modifica el proyecto de producción.
4. Abra el enlace que muestre con cordiempresactpl@gmail.com. Google puede solicitar autorización para el proyecto de pruebas.
5. Pulse Ingresar como profesor DEMO de pruebas y después Ejecutar pruebas automáticas con Google.

## Destino y efectos

- Proyecto de pruebas existente: `1nGQjNeAKJMtTBizaYU2u0C09SkS_pVEynW0dIcLJlcT6rroZfXNg80fu`.
- Base de pruebas existente: `13BR0o0yOOazet5sui4I7vpmMkaNUYLt8Lj8YJNi3YFA`.
- Escritura limitada a casos ficticios en la pestaña `PPS_AUTOGUARDADO_PRUEBAS_2026`. No crea otro proyecto ni otro archivo de Google Sheets.
- Actualiza el HEAD del proyecto de pruebas tras respaldarlo. Los despliegues anteriores de ese proyecto mantienen sus versiones previas; se crea otro enlace privado.
- Conserva el renderizador móvil actual. No cambia criterios o ponderaciones. El control de acceso del ensayo se limita a un caso ficticio; no habilita escritura del profesor demo en producción.
- La ejecución real en Google está pendiente. Las pruebas locales del código y del asistente usaron servicios simulados.

No contiene credenciales. No comparta tokens, PIN ni .clasprc.json. Lea LEER-ANTES.txt dentro del ZIP antes de ejecutarlo.

SHA-256 del ZIP: `557dea646685b2ed0730225d31ff81bd90dcb23d02554c8641c332000c2b4d8d`.

## Corrección del asistente en Windows

La revisión inicial pasaba `--project .`; clasp 3.4.1 rechazó esa ruta relativa durante su validación de seguridad. El asistente corregido pasa `--project` con la ruta absoluta del directorio de trabajo. Mantiene intactas todas las comprobaciones de destino, respaldo, integridad y acceso privado.

Para una carpeta ya extraída, basta descargar el archivo `preparar-pruebas.cjs` de esta revisión con otro nombre dentro de esa misma carpeta y ejecutarlo con Node. No es necesario copiar otra vez el proyecto ni borrar el respaldo generado.

## Reparación de nombres de Apps Script

El servidor ahora se llama `ServidorPruebaGuardado.js` y el HTML conserva `PruebaGuardado.html`. Apps Script no admite dos archivos con el mismo nombre base aunque tengan tipos distintos. El asistente migra automáticamente la carpeta inicial tras verificar sus hashes, sin cambiar el contenido del servidor. También verifica nombres base duplicados antes de subir.

La invocación de npx usa Node directamente con argumentos separados, sin `shell:true`. Se mantienen las rutas absolutas y todas las comprobaciones del proyecto aislado. Se probaron el paquete corregido, la migración del paquete inicial y los bloqueos por destino incorrecto o cambios remotos, con clasp simulado.
