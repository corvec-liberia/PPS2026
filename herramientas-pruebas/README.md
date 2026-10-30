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

SHA-256 del ZIP: `591e83aaa9d33d9cfedb520768479f55810659607c3d2d8586a857057d3f8cdf`.

## Corrección del asistente en Windows

La revisión inicial pasaba `--project .`; clasp 3.4.1 rechazó esa ruta relativa durante su validación de seguridad. El asistente corregido pasa `--project` con la ruta absoluta del directorio de trabajo. Mantiene intactas todas las comprobaciones de destino, respaldo, integridad y acceso privado.

Para una carpeta ya extraída, basta descargar el archivo `preparar-pruebas.cjs` de esta revisión con otro nombre dentro de esa misma carpeta y ejecutarlo con Node. No es necesario copiar otra vez el proyecto ni borrar el respaldo generado.
