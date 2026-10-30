# Retroalimentación y criterios pendientes

Actualización exclusiva del ensayo aislado. Solo cambia el HTML de la prueba; servidor, hojas, cálculos y datos permanecen iguales. Conserva el código original de tarjetas y navegación.

El estado de guardado se muestra también junto al botón. La confirmación incluye el número de respuestas guardadas. Al bloquear la finalización, muestra los números pendientes y permite abrir el primer criterio faltante sin borrar las respuestas. La barra aclara que su porcentaje representa posición en el instrumento.

El actualizador verificará hashes del estado previo del proyecto de pruebas, respaldará antes de subir y actualizará únicamente la implementación privada de pruebas indicada por el usuario. La producción no es destino. Los casos ficticios anteriores no se borran. Al recargar el ensayo e iniciar sesión se crea un caso ficticio nuevo; para probar recuperación del mismo caso, cerrar y reabrir el formulario sin recargar la pestaña.

## Validaciones adicionales

Se reprodujeron casos con 50/51 respuestas (pregunta 51 pendiente), una pregunta intermedia (17) y múltiples pendientes (2 y 17). El mensaje junto a Guardar muestra los números, permite saltar al primero y conserva el resto. La confirmación de borrador incluye la cantidad de respuestas confirmadas por el servidor. Las 13 comprobaciones del guardado sin rediseño pasaron con datos sintéticos.

`actualizar-retroalimentacion.cjs` se ejecuta dentro de la carpeta Windows ya extraída. Respalda y verifica el estado remoto previo, descarga el HTML con SHA-256 conocido y actualiza únicamente la misma implementación privada de pruebas. Si detecta cambios ajenos en el servidor o la carpeta local, se detiene. Se probaron instalación, actualización ya aplicada y bloqueos por destino/código remoto, sin conexión a Google. La actualización real sigue pendiente de ejecución en Windows.
