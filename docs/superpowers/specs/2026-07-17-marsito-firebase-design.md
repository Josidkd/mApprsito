# Marsito App beta_0.2 — Firebase y beta por invitación

Estado: diseño aprobado por el usuario. Rama local `beta_0.2`, creada desde `beta_0.1` en el commit `c508458`, incluyendo el modo de vista previa por Wi-Fi.

## Objetivo
Convertir la maqueta local en una beta web compartida por dos personas, con identidades reales, datos sincronizados entre móvil y PC y despliegue HTTPS. Mantener HTML5, CSS, JavaScript vanilla y Web Components; conservar las cuatro secciones y su diseño.

## Decisiones ya tomadas por el usuario
- Proyecto Firebase: `marsito-beta`; configuración de la app web recibida.
- Firestore para persistencia, Firebase Auth para acceso y Firebase Hosting para despliegue.
- Opción de privacidad 1: cualquiera puede descargar la web y ver el login, pero solo las cuentas autorizadas pueden acceder a los datos.
- Sin facturación activada: plan Spark, sin funciones de servidor, SMS ni subida de imágenes.
- Trabajo en `beta_0.2`, conservando `beta_0.1`.

El usuario indica haber preparado Firestore. El campo `databaseURL` de la configuración identifica una instancia adicional de Realtime Database; no confirma ni descarta que exista Firestore. Se omitirá porque esta implementación no usa Realtime Database.

## Enfoques considerados
1. **Firebase Hosting + Auth + reglas Firestore (elegido):** hosting estático HTTPS con una pantalla pública de acceso y datos privados para miembros aprobados. Compatible con el plan gratuito dentro de cuotas. Requiere reglas comprobadas, no solo ocultar botones.
2. **Web completa protegida por una puerta de acceso adicional:** impediría incluso descargar la interfaz sin autenticación, pero añade infraestructura y no es la opción escogida.

## Propuestas del implementador
Estas decisiones concretan los detalles que el usuario aún no ha fijado:
- Un único espacio compartido por dos participantes; no construir grupos, invitaciones automáticas ni panel de administración en esta fase.
- Registro con correo/contraseña, verificación del correo, inicio/cierre de sesión y recuperación de contraseña. Registrarse no concede acceso al espacio.
- Aprobación manual por UID de Firebase Auth, mediante documentos de membresía administrados en consola. El UID no es una contraseña. No guardar correos de invitados ni una lista de autorización en el repositorio público.
- El propietario del proyecto autoriza exactamente dos UIDs, con nombres de perfil visibles para esos miembros. Los clientes no pueden aprobarse ni alterar las membresías.
- Arrancar el espacio real vacío. No subir ni migrar automáticamente los ejemplos ni los datos locales de la maqueta.
- Mantener la demostración local como modo explícito para desarrollo y pruebas, pero el despliegue real no ofrece un botón de demo, cambio libre de identidad ni restablecimiento global. Un fallo de Firebase nunca debe convertirse silenciosamente en una sesión demo.

## Acceso y privacidad
Flujo: login/registro → verificar correo cuando corresponda → comprobar autorización → Inicio. Mostrar estados diferenciados de cargando, correo pendiente de verificación, cuenta pendiente/no autorizada, error de conexión y sesión autorizada.

Un usuario no autorizado no puede consultar eventos, tareas, recetas, menú, perfiles compartidos, gastos ni historial; tampoco escribirlos aunque invoque el SDK fuera de la interfaz. Puede comprobar su propia situación de membresía, pero no enumerar a otros miembros.

Las reglas exigen identidad autenticada, correo verificado y membresía activa para el espacio concreto; además, el UID debe figurar entre los dos perfiles de su configuración protegida. Se niega por defecto cualquier ruta no prevista. Las membresías y la configuración de los dos perfiles se provisionan manualmente desde consola o con herramientas administrativas autenticadas; nunca mediante el cliente.

En la beta real, el perfil activo viene exclusivamente de Auth. No se acepta un autor suministrado libremente por un formulario. Al salir, revocar membresía o cambiar de cuenta, cancelar suscripciones y borrar inmediatamente el estado compartido de la interfaz. No persistir datos compartidos reales en el localStorage de la demo. La sesión de Auth la gestiona el SDK; las contraseñas no se guardan en código, logs ni almacenamiento propio.

## Datos y arquitectura
Separar el modo demo del adaptador Firebase; compartir utilidades de fechas, importes y validación cuando resulte seguro. Las acciones reales son asíncronas, muestran progreso, evitan envíos repetidos y solo informan de éxito tras confirmación del servidor. Adaptar los formularios y las acciones actuales, que hoy son síncronos.

Usar documentos por entidad en un espacio identificado, no un único documento con toda la aplicación:
- membresías administradas por UID;
- configuración protegida con los dos perfiles y referencia al ciclo activo;
- eventos y respuestas de asistencia por UID; comentarios con autor y fecha;
- tareas compartidas;
- recetas;
- asignaciones de menú por fecha local y comida/cena;
- ciclos de gastos, gastos individuales y resumen de liquidación.

Escuchar los datos necesarios con suscripciones Firestore y cancelar las anteriores cuando cambia la sesión. La UI distingue un error de permisos de un listado vacío. En esta fase, exigir conexión para escribir; no prometer cambios offline ni sincronización posterior de acciones pendientes. Usar caché en memoria en lugar de persistencia Firestore en disco para datos privados.

Validar tipos, campos permitidos, campos obligatorios, límites de texto, fechas, importes enteros en céntimos y relaciones entre documentos tanto en el cliente como en las reglas. Los miembros pueden completar tareas compartidas y asignar recetas existentes al menú. Cada uno solo puede cambiar su propia asistencia o escribir comentarios/gastos como sí mismo. No introducir edición o borrado de entidades que la maqueta no ofrecía.

## Liquidaciones y concurrencia
Mantener el reparto entre dos personas, con céntimos enteros y el mismo criterio determinista para el céntimo impar. Una liquidación conserva los gastos originales y el resumen del ciclo, marca el ciclo cerrado y crea uno vacío como nueva referencia activa, de forma atómica.

Dos liquidaciones simultáneas no deben archivar dos veces el mismo ciclo. Un gasto que compita con una liquidación no puede perderse ni agregarse a un ciclo ya cerrado. Utilizar transacciones y una referencia única al ciclo activo; no basar la operación en el estado posiblemente anticuado del navegador.

Las aportaciones acumuladas del ciclo deben mantenerse junto con cada gasto de forma atómica y verificable por reglas. Las reglas no deben aceptar totales o transferencias arbitrarios solo porque el cliente los envía. Los ciclos cerrados y sus gastos son inmutables para clientes. No hay pagos ni transferencias bancarias reales.

## Configuración, costes y despliegue
- Usar Firebase Hosting clásico, no App Hosting. Dominio gratuito HTTPS del proyecto, sin comprar dominio.
- Mantener Spark; no vincular tarjeta ni activar Blaze. Las cuotas gratuitas no equivalen a capacidad ilimitada. Informar de errores de cuota y limitar listeners a la sesión/pantalla necesarias.
- No usar Storage, Cloud Functions, login por teléfono ni servicios externos de pago. Las imágenes siguen siendo URLs opcionales HTTP/HTTPS; los enlaces externos pueden contactar con terceros.
- La configuración web de Firebase y su API key cliente no son credenciales administrativas. No incluir cuentas de servicio, secretos de CLI ni contraseñas. La seguridad no depende de esconder la configuración web.
- Separar emuladores y proyecto real de forma explícita; las pruebas automatizadas nunca deben escribir en `marsito-beta`.
- Documentar Auth correo/contraseña, Firestore en producción, región elegida, dominios autorizados y creación de las dos membresías/perfiles. Verificar en consola los servicios existentes antes de desplegar, sin recrear ni borrar la base actual.
- Añadir configuración de Hosting, reglas e índices necesarios. Desplegar únicamente artefactos públicos, sin `.git`, pruebas, documentos internos ni archivos administrativos.
- El despliegue requiere que el usuario autentique Firebase CLI en su PC. No pedir contraseñas por chat. Antes de publicar, verificar proyecto destino y permisos; no desplegar reglas abiertas temporalmente.
- No modificar el rol de editor que se haya concedido a otra persona en la consola: permisos de administración del proyecto y acceso a la app son independientes. Advertir de esa diferencia.

## Criterios de aceptación y pruebas
1. El usuario puede registrarse, verificar correo, iniciar sesión, recuperar contraseña y salir; cuentas sin autorización no ven datos del espacio.
2. Ambos miembros autorizados ven los cambios entre sesiones independientes: eventos, asistencia y comentarios, tareas, recetas/menú y gastos.
3. No existe suplantación por selector de perfiles, autor de formulario o llamada directa al SDK.
4. Pruebas de reglas con emulador: anónimo, no miembro, correo no verificado, miembro revocado, miembro válido, autoaprobación, modificación de configuración, acceso a otro espacio y campos/importe inválidos.
5. Pruebas de concurrencia de liquidaciones y altas de gastos con emulador; ningún gasto perdido, duplicado o modificable tras cierre.
6. Pruebas de navegador en escritorio y móvil, usando emuladores, que cubran estados de sesión, errores y limpieza de datos al salir. Mantener pruebas de lógica y de demo existentes.
7. Configuración de Hosting comprobada y despliegue real verificado por HTTPS. La verificación de correo y los correos de recuperación requieren una comprobación final controlada en el proyecto real, además de las pruebas con emulador.
8. Si faltan autenticación de CLI, membresías o configuración de consola, identificar claramente el bloqueo y no afirmar que la beta está publicada o protegida sin verificarlo.

## Fuera de alcance
APK Android, notificaciones, pagos, archivos subidos, importación automática de demo, múltiples hogares, gestión visual de invitaciones y protección de la descarga de la web. La protección de esta fase es de los datos y del uso de la aplicación por miembros autorizados.
