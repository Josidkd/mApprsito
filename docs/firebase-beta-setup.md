# Preparar y publicar Marsito beta_0.2

## Qué protege esta beta
La página de login y los archivos del frontend son públicos. Solo dos cuentas con correo verificado, membresía activa y UID incluido en la configuración del espacio pueden leer o escribir datos compartidos. Registrarse no concede acceso. No se usa la lista de «Usuarios y permisos» del proyecto para invitar a la app: esa lista concede administración sobre Firebase.

Proyecto previsto: **marsito-beta**. Plan: **Spark**. No se necesita tarjeta, dominio propio, Storage ni Cloud Functions. El despliegue no activa facturación. Si algún servicio solicita Blaze, detenerse y revisar en vez de aceptarlo.

## 1. Iniciar sesión en Firebase CLI
Desde PowerShell, en `E:\proyectos\mApprsito`:

```powershell
npx firebase login
npx firebase login:list
npx firebase projects:list
npx firebase firestore:databases:list --project marsito-beta
```

Completa el login en el navegador con una cuenta administradora del proyecto. No compartas contraseñas ni tokens por chat. Confirma el ID exacto `marsito-beta`, que Firestore ya existe y que su ubicación es la elegida. No recrees ni borres una base existente.

## 2. Revisar la consola
- Authentication → Proveedores: activar **Correo electrónico/contraseña**, sin SMS.
- Authentication → Configuración → Dominios autorizados: comprobar `marsito-beta.firebaseapp.com` y `marsito-beta.web.app`. Para pruebas en el PC, añadir `localhost` si no figura y utilizar ese host.
- Firestore: base `(default)` en modo de producción; nunca reglas abiertas de prueba.
- Facturación: mantener Spark, sin vincular cuenta de cobro.
- Se ignorará `databaseURL`: esta app no usa Realtime Database. El campo `storageBucket` de la configuración no inicializa Storage ni implica que se haya activado.

## 3. Obtener los dos UIDs
Hay dos opciones, sin enviar contraseñas al desarrollador:

**Antes de publicar:** ejecutar `npm run start:beta` y abrir `http://localhost:4173` (detener primero cualquier servidor que ocupe ese puerto, o usar otro puerto). Es la versión real: registrarse crea cuentas reales en `marsito-beta`, no en el emulador. Cada participante usa su propio correo y contraseña, verifica su correo mediante el enlace recibido y pulsa «Ya he verificado». La pantalla «Acceso pendiente» muestra su UID.

**Después de una publicación inicial del login:** hacer esos mismos pasos en `https://marsito-beta.web.app`. Con las reglas de esta rama, la falta de membresía/configuración impide el acceso a los datos. Publicar el login por sí solo no significa que el espacio ya esté listo.

También se pueden consultar los UIDs desde Authentication → Usuarios. No confundir UID con correo, ID de proyecto o número de proyecto. No versionar los correos, UIDs o nombres reales en el repositorio público.

## 4. Aprobar los dos miembros
Desde Firestore Console, crear estos documentos como administrador. No hacerlo desde el cliente web ni cambiar temporalmente las reglas.

### Colección `betaMembers`
Crear un documento por cada UID:

| Campo | Tipo | Valor |
|---|---|---|
| `spaceId` | string | `marsito` |
| `enabled` | boolean | `true` |

El ID del documento es el UID real de ese participante. Solo habrá dos miembros admitidos y ambos deben figurar en el siguiente documento.

### Documento `spaces/marsito`
Crear:
- `activeCycleId`: string `initial`.
- `profiles`: array de exactamente dos mapas, en este orden estable:
  - índice 0: `id` (string, primer UID), `name` (string, nombre visible), `color` (string, `coral`).
  - índice 1: `id` (string, segundo UID), `name` (string, nombre visible), `color` (string, `sage`).

El orden determina quién asume el céntimo adicional cuando el total es impar. No intercambiar posiciones ni sustituir UIDs una vez que haya gastos: los ciclos guardan aportaciones por esa posición. Cambiar participantes requerirá una migración futura deliberada.

### Documento `spaces/marsito/cycles/initial`
Dentro de `spaces/marsito`, crear subcolección `cycles`, documento `initial`:

| Campo | Tipo | Valor |
|---|---|---|
| `status` | string | `open` |
| `paidA` | number | `0` (entero) |
| `paidB` | number | `0` (entero) |
| `count` | number | `0` (entero) |
| `lastExpenseId` | null | null |
| `createdAt` | timestamp | fecha/hora de preparación |
| `closedAt` | null | null |
| `settledBy` | null | null |
| `nextCycleId` | null | null |

No añadir eventos, recetas o gastos ficticios. La beta real arranca vacía y nunca importa automáticamente localStorage.

## 5. Comprobar y desplegar

```powershell
npm test
npm run test:firebase
npm run test:e2e
npm run test:e2e:firebase
npm run deploy:beta
```

Las pruebas Firebase solo usan `demo-marsito-beta` en emuladores locales. Java 21 debe estar disponible; en Windows, el runner detecta también Temurin 21 instalado por winget. Los emuladores no se exponen por Wi-Fi.

`deploy:beta` genera el build real y verifica proyecto, modo, lista de archivos públicos y sus hashes antes de ejecutar Firebase CLI. Publica **solo Hosting, reglas e índices de Firestore**. El dominio previsto es `https://marsito-beta.web.app`; no afirmar que está publicado hasta que CLI y la comprobación HTTPS lo confirmen. Los índices pueden tardar en estar disponibles.

No hay despliegue automático al subir commits. Antes de sobrescribir reglas de un proyecto con datos, revisar el diff y las pruebas. No utilizar el comando para otros proyectos.

## 6. Verificación real posterior
- Navegador privado sin sesión: solo login, sin datos.
- Cuenta registrada pero no aprobada: «Acceso pendiente» tras verificar correo.
- Las dos cuentas aprobadas: acceso al mismo espacio y cambios visibles entre PC/móvil.
- Cada una crea un evento/tarea/receta de prueba controlado; comprobar autor, asistencia, comentarios y menú. Estos registros serán datos reales: no ejecutar pruebas automatizadas contra producción.
- Registrar importes conocidos y comprobar el reparto. Liquidar no paga dinero, solo cierra el ciclo de datos.
- Comprobar recepción real de verificación y recuperación de contraseña, incluyendo spam.
- Cerrar sesión y verificar que no queda contenido compartido visible.
- Para revocar, poner `enabled:false` en el documento de membresía. El cliente conectado debe cerrar las vistas privadas; las reglas deniegan las operaciones posteriores.

## 7. Límites y cuidado de datos
- Las contraseñas las gestiona Firebase Auth; no se guardan en almacenamiento propio ni en código.
- Auth puede conservar la sesión mediante su SDK. Los datos compartidos usan caché Firestore en memoria, no persistencia en disco del demo.
- Se necesita conexión para guardar; no se mantienen escrituras offline para reproducirlas después. Un error no debe interpretarse como un guardado confirmado.
- Firebase Storage, Realtime Database, Analytics, Functions y SMS no se utilizan.
- Los ingredientes se representan como lista en la interfaz; Firestore los serializa como líneas en `ingredientsText` para validar cada entrada con reglas.
- El historial se pagina de 20 en 20 y los gastos archivados se cargan al abrir un ciclo.
- Las cuotas de Spark pueden agotarse y bloquear operaciones. No se promete uso ilimitado ni se activa facturación automáticamente.
- Las imágenes y enlaces opcionales HTTP/HTTPS contactan con terceros. No introducir URLs privadas con tokens sensibles.
- No generar ni descargar cuentas de servicio para este frontend.

## Estado de entrega
La existencia de código y pruebas con emuladores no acredita por sí sola un despliegue. Si faltan login de CLI, documentos de los dos miembros, verificación de correos o comprobación HTTPS, deben permanecer expresamente pendientes en el informe de entrega.
