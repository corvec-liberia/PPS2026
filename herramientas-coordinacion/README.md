# Evaluaciones desde Coordinación

Extensión de la versión 29: una sesión ADMIN vigente abre el circuito docente existente seleccionando una especialidad cada vez. No cambia el rol ni crea cuentas, PIN, filas DOCENTES o copias de estudiantes. Reutiliza un ID docente solo cuando cédula/correo del usuario autenticado coincide inequívocamente con un registro activo; en otro caso usa un identificador estable derivado del ID de la cuenta administrativa. No se vinculan seguimientos por similitud de nombre.

El coordinador utiliza «Evaluar como coordinador», elige especialidad y asume explícitamente los estudiantes disponibles que le correspondan. Cambia de especialidad con el botón correspondiente y vuelve a su panel sin perder su identidad administrativa. No se trasladan seguimientos ajenos: si ya existen con otro identificador, se requiere revisar esa vinculación antes de evaluar. El módulo comprueba propiedad al guardar y conserva los bloqueos de finalización y el DEMO de lectura.

La identidad se valida en el servidor; el correo o los roles enviados por el navegador no conceden acceso. Cada uso de la sesión derivada revalida la sesión ADMIN de origen. No se guardan credenciales en localStorage ni en el repositorio. Los nombres y criterios del selector proceden del catálogo original.

Cambios: Index.html recibe un script aditivo; Modulo_Docentes_PPS_2026.js recibe funciones nuevas y una validación adicional en contextoDocPPS_. Los otros 17 archivos y el renderizador/guardado de V29 se conservan. No cambia la base, criterios, ponderaciones ni registros históricos.

Pruebas automatizadas: coordinacion_test.cjs (datos sintéticos en memoria, autorización, revocación, identidad estable, duplicados, especialidad, propietario y DEMO); coordinacion_ui_test.py (Chromium: 320/360/1024 px, selección/cambio/retorno/cierre y errores). Se mantiene la batería de regresión del guardado.

El publicador respalda V29 y HEAD, exige coincidencia con la fuente conocida y aborta ante trabajo no publicado o versión diferente; verifica la versión inmutable antes de actualizar el despliegue existente. --comprobar no escribe; --publicar aplica el cambio autorizado; --verificar consulta; --revertir devuelve la implementación a V29 sin tocar datos ni HEAD. No ejecuta funciones de Apps Script ni llama a Sheets. La verificación por API no sustituye la prueba real de inicio de sesión/seguimiento en Google.
