# Publicación autorizada de guardado de evaluaciones

El usuario confirmó la prueba real en el proyecto aislado y autorizó expresamente actualizar producción el 30 de octubre de 2026.

## Destino

- Proyecto: `1Le02XMtS4UigkTG6HW1jHDHccba9DNiclVYYBH0rLwq9nNyFjWZh5vqC`.
- Implementación existente: `AKfycbwQ9x6TxoBpIgh1u15-5anOOsLEGmP2mypSJp3SU8qNYkFaG5KsOE639YhoZzcRNWz_XA`.
- Versión publicada esperada antes de actualizar: 28.
- Cuenta autorizada de Google: coordinación con la empresa. El asistente exige la identidad confirmada, sin extraer ni imprimir tokens.

## Cambio

Solo `Index.html`: puente correcto de respuestas, borrador automático, firma de borrador recuperable, mensajes junto al guardado y navegación al criterio pendiente. Conserva literalmente el renderizador móvil V28 y sus tarjetas, calificaciones y navegación. No cambia backend, permisos, archivos de datos, catálogos, instrumentos ni ponderación. La revisión documental de Agroecología evaluación 2 continúa separada.

El usuario demo de producción permanece de solo lectura. Las pruebas de escritura en el ensayo aislado no autorizan escribir con ese perfil en datos reales. El profesor real conserva sus permisos y sus asignaciones.

## Protección de datos

No se ejecutan funciones de Apps Script ni se consulta el portal `/exec` desde el asistente, porque `doGet` contiene inicializadores. No se crean estudiantes de prueba ni se migran, recalculan o sobrescriben registros. Los respaldos que crea este asistente son de CÓDIGO, no de filas de Google Sheets. La protección de datos aquí consiste en no cambiar el servidor ni ejecutar sus funciones de escritura durante la publicación. Los profesores guardarán mediante la lógica existente después de actualizar.

## Verificación y respaldo

- Autenticación, ID de proyecto, ID de implementación y versión 28 verificados antes de escribir.
- Copias locales de la versión publicada y del HEAD actual, antes de modificar archivos.
- Baseline de 19 archivos; rechazo de cambios ajenos, incluyendo cambios no publicados en HEAD.
- Reconstrucción de la candidata local usando solo el código propio del adaptador y parches literales comprobados. No se descarga ni publica el código privado del servidor desde GitHub.
- Verificación de que solo Index cambia y de que el manifiesto público permanece igual.
- Push del proyecto COMPLETO, creación de versión inmutable y lectura de esa versión para verificar sus 19 archivos antes de apuntar producción a ella.
- Nueva comprobación de la implementación original y actualización de su versión conservando el URL. Se comprueba la versión resultante mediante la API de despliegues.
- Registro local con versión anterior/nueva y metadatos del respaldo. Opción `--revertir` vuelve a apuntar la implementación a V28 solo si continúa publicada la versión de esta operación. No revierte datos ni sobrescribe cambios posteriores de otros desarrolladores.

Si una operación falla después del push, puede haber cambiado el HEAD del editor. El asistente registra la fase; no restaura ni reintenta a ciegas. `--verificar` solo consulta el estado y código publicados. Producción no se considera actualizada hasta confirmar el resultado de la ejecución local.

## PWA y dispositivos

La PWA mantiene su URL y el mismo portal en el iframe. Su service worker no almacena las respuestas de Apps Script de otro origen. Los profesores con la aplicación ya abierta deben actualizar o cerrar/reabrir la página para cargar el nuevo HTML. No se requiere reinstalar la PWA. Las pruebas locales incluyeron 320/360 px y escritorio; la prueba real aislada fue confirmada por el usuario. No se afirma validación en todos los dispositivos físicos.

## Estado

Material preparado en una rama de revisión. No equivale a un despliegue ejecutado. La autenticación de Google sigue en el Windows del usuario; el entorno cloud no la posee.

## Pruebas del publicador

`tests/publicacion_produccion_test.cjs` se ejecutó con clasp/API simulados y copias locales de los archivos V28. Pasaron los escenarios: publicación correcta, solo comprobación, cuenta incorrecta, HEAD con trabajo posterior, versión publicada cambiada, proyecto equivocado, versión inmutable distinta, recurso corrupto y reanudación tras HEAD candidato. Se comprobaron además la verificación sin escrituras y la reversión de la versión sin tocar HEAD.

El parche generado por JavaScript coincide byte a byte con el generado por la herramienta Python probada. La prueba de publicación exige 19 archivos y comprueba que los 18 distintos de Index no cambian. No se invocó ninguna función de Apps Script ni se hizo un despliegue real en estas pruebas.

Para ejecutar, descargue únicamente el asistente en una carpeta local, con Node y la autenticación de clasp existente. Sin argumentos publica el cambio autorizado; `--comprobar` solo prepara y verifica; `--verificar` consulta la publicación registrada; `--revertir` cambia la implementación a V28 si sigue en la versión de esta operación. El archivo `RESULTADO-PRODUCCION.json` y las carpetas `publicacion-pps2026-*` deben conservarse localmente para trazabilidad y reversión. No compartir sus respaldos completos por contener código de configuración privado.
