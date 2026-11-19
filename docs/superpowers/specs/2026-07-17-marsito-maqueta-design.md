# Marsito App — diseño de maqueta local

## Intención
Validar las pantallas y los flujos de una aplicación compartida antes de desarrollar la versión conectada a Firebase. La maqueta debe poder probarse en navegador, especialmente desde móvil.

## Enfoques considerados
- **Maqueta local interactiva (elegido por el usuario):** datos de ejemplo y persistencia en localStorage; permite validar la experiencia sin configuración externa. No sincroniza dispositivos ni proporciona autenticación real.
- **Prototipo Firebase:** autenticación y datos reales, pero requiere configuración y reglas de seguridad antes de poder probarlo. Aplazado.

## Tecnología y límites
HTML5, CSS, JavaScript vanilla y Web Components, sin framework. Servida por HTTP local. Navegación entre vistas sin recargas. Separar el acceso a datos de las vistas para facilitar una futura implementación Firebase, sin construir todavía esa integración.
No se empaquetará Android en esta fase; se evitarán dependencias de escritorio para facilitar el empaquetado futuro. No es una aplicación de producción.

## Propuesta visual del implementador
Interfaz en español, móvil primero, fondo crema, tarjetas claras y acentos coral y verde. Navegación inferior en móvil y lateral en escritorio. Iconos acompañados de texto, formularios con etiquetas y estados vacíos explícitos. Estos detalles visuales son propuestas, no requisitos expresos del usuario.

## Pantallas y flujos
### Acceso de demostración
Login y registro simulados, identificados como demostración. Dos perfiles de ejemplo y posibilidad de cambiar entre ellos para comprobar asistencia, comentarios y reparto de gastos. No pedir ni guardar contraseñas reales. Los datos son compartidos entre perfiles en el mismo navegador.

### Inicio
Saludo, resumen de próximo evento, tareas pendientes, menú del día y gastos del ciclo actual. Acceso a las cuatro secciones.

### Calendario
Calendario mensual y listado de eventos de la fecha seleccionada. Crear evento con título, fecha, hora y descripción obligatorios; URL de imagen y de información opcionales. Detalle con asistencia sí/no por perfil y comentarios con autor. Las fechas se interpretan en hora local.

### Tareas
Lista compartida con pendientes y completadas. Crear con título y descripción de la tarea, ambos obligatorios. Cualquier perfil puede crear y alternar el estado de completado.

### Recetas y menú semanal
Dos pestañas. Recetas: listado, detalle y creación con título, lista de ingredientes e instrucciones obligatorios; URL de imagen y enlace opcionales. Para la maqueta se propone usar URL de imagen, sin subida de archivos.
Menú: semana navegable, lunes a domingo, con comida y cena; asignar o retirar recetas existentes. Comida y cena son una propuesta del implementador.

### Cuentas
Añadir concepto e importe positivo en euros, atribuidos al perfil activo. Mostrar gastos del ciclo, total, aportación de cada perfil y transferencia necesaria para repartir a partes iguales.
Liquidar requiere confirmación: conserva los gastos como liquidados en el historial y comienza un ciclo vacío. Si A pagó más que B, B debe a A la mitad de la diferencia; no la mitad del total. La maqueta no realiza pagos reales. Cálculos en céntimos y liquidación deshabilitada sin gastos.

## Datos y estados
Datos iniciales ficticios para recorrer todas las vistas. Persistencia local versionada. Opción de restablecer datos de demostración con confirmación. Validación de campos y URLs; presentar el contenido introducido como texto, no como HTML. Estados vacíos y mensajes de error comprensibles. Los enlaces externos solo aceptan HTTP/HTTPS.

## Criterios de aceptación
- Se puede acceder, cambiar de perfil y salir de la demostración.
- Se recorren Inicio, Calendario, Tareas, Recetas/Menú y Cuentas en móvil y escritorio.
- Crear y consultar eventos; registrar asistencia y comentarios.
- Crear y completar tareas.
- Crear recetas y asignarlas al menú semanal.
- Registrar gastos con ambos perfiles; comprobar el reparto; liquidar y consultar el historial.
- Recargar conserva los datos; restablecer recupera la demostración inicial.
- No necesita credenciales, Firebase ni servicios de pago.

## Fuera de alcance
Autenticación real, sincronización, reglas Firebase, notificaciones, pagos, subida de imágenes y generación de APK. La maqueta no valida esos aspectos de la aplicación final.
