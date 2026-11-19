# Marsito App beta_0.2 — Firebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar Marsito a Firebase con datos compartidos protegidos para dos usuarios y preparar/publicar una beta HTTPS en el proyecto `marsito-beta`.

**Architecture:** Conservar Web Components y vistas actuales; añadir un adaptador Firebase asíncrono, separado del almacén demo. Firebase Auth determina la identidad; Firestore proporciona sincronización y reglas de autorización/validación; Hosting sirve exclusivamente un directorio `dist` construido con esbuild. Probar con Auth y Firestore Emulator antes de cualquier operación real.

**Tech Stack:** JavaScript ES modules, HTML5, CSS, Firebase JS SDK `12.19.0`, esbuild `0.28.2`, Firebase CLI `15.37.0`, rules-unit-testing `5.0.1`, Node.js 20+, Java 21 y Playwright. Versiones compatibles con el Node `20.18.0` del PC; no instalar rules-unit-testing 6, que requiere Node 24.12+.

**Spec:** `docs/superpowers/specs/2026-07-17-marsito-firebase-design.md` (aprobado por el usuario).

## Global Constraints
- Mantener HTML5, CSS, JavaScript vanilla y Web Components; conservar las cuatro secciones y su diseño.
- Proyecto Firebase: `marsito-beta`; trabajo en `beta_0.2`, conservando `beta_0.1`.
- Sin facturación activada: plan Spark, sin funciones de servidor, SMS ni subida de imágenes.
- Cualquiera puede descargar la web y ver el login, pero solo las cuentas autorizadas pueden acceder a los datos.
- Registro con correo/contraseña, verificación del correo, inicio/cierre de sesión y recuperación de contraseña. Registrarse no concede acceso al espacio.
- Los clientes no pueden aprobarse ni alterar las membresías.
- Arrancar el espacio real vacío. No subir ni migrar automáticamente los ejemplos ni los datos locales de la maqueta.
- No persistir datos compartidos reales en el localStorage de la demo.
- En esta fase, exigir conexión para escribir; no prometer cambios offline ni sincronización posterior de acciones pendientes.
- Los ciclos cerrados y sus gastos son inmutables para clientes. No hay pagos ni transferencias bancarias reales.
- Las pruebas automatizadas nunca deben escribir en `marsito-beta`.
- No incluir cuentas de servicio, secretos de CLI ni contraseñas. La seguridad no depende de esconder la configuración web.

## Review Focus
1. Revocación, cierre de sesión y respuestas antiguas: borrar datos de la sesión anterior y no mostrarlos al siguiente usuario (Task 3).
2. Caída de red, cuotas y doble envío: ninguna falsa confirmación, duplicación por reintento automático ni escritura diferida sin avisar (Tasks 4–7).
3. Clientes manipulados: reglas rechazan autoaprobación, autores falsos, estructuras extra y cambios a ciclos cerrados (Tasks 2, 4–6).
4. Carreras gasto/liquidación: exactamente un cierre, todos los gastos conservados y contadores verificables (Task 6).
5. Despliegue equivocado o artefactos privados: bloquear emuladores en build real, comprobar proyecto y no publicar archivos del repositorio (Tasks 1, 8).

## Interfaces y modelo compartido
- Conservar `createStore(storage)` para demo, `getState()`, `subscribe(listener)` y las acciones actuales. La UI usará siempre `await Promise.resolve(store.dispatch(type, payload))` para soportar ambos adaptadores.
- `createFirebaseStore({auth, db, spaceId:'marsito', online}) -> Store`: añade `destroy()`, `watchComments(eventId) -> unsubscribe`, `loadHistoryPage() -> Promise<void>` y `loadCycleExpenses(cycleId) -> Promise<void>`. `online` comprueba conectividad para rechazar inmediatamente acciones offline; el adaptador también observa snapshots de servidor, sin considerar una caché como autorización actual.
- Estado remoto: mismos `profiles, activeProfileId, events, tasks, recipes, menu, expenses, settlements`; listas vacías al inicio y campos `mode:'firebase', authStatus, user, error, connected, pendingCount, historyHasMore`. `authStatus`: `loading|signed-out|unverified|pending|ready|error`. No montar vistas de datos antes de `ready` con exactamente dos perfiles válidos. En demo, inferir `mode:'demo'` sin reescribir su almacenamiento.
- Acciones de acceso: `auth/login({email,password})`, `auth/register({email,password})`, `auth/reset-password({email})`, `auth/resend-verification()`, `auth/refresh()`, `logout`. Mantener payloads de acciones de datos existentes; ignorar/rechazar cualquier autor recibido y usar el UID vigente.
- `/betaMembers/{uid}`: `{spaceId:'marsito', enabled:boolean}`. Solo lectura de documento propio para autenticados; listado y todas las escrituras denegados a clientes.
- `/spaces/marsito`: `{profiles:[{id:uidA,name,color},{id:uidB,name,color}], activeCycleId:string}`. Provisión administrativa; clientes solo cambian `activeCycleId` como parte del cierre atómico validado. La autorización exige UID en estos dos perfiles además de membresía activa y correo verificado.
- Subcolecciones del espacio: `events/{id}`, `tasks/{id}`, `recipes/{id}`, `menu/{YYYY-MM-DD}`, `cycles/{cycleId}`; comentarios en `events/{eventId}/comments/{id}`, gastos en `cycles/{cycleId}/expenses/{id}`. Ningún cliente crea/borrar el espacio o altera perfiles.
- Entidades remotas usan `profileId` para autor, `createdAt` timestamp de servidor y campos de negocio del demo. El adaptador agrega `id` desde el documento y convierte timestamps a ISO para las vistas existentes. Eventos guardan `attendance:{uid:'yes'|'no'}`; comentarios se cargan solo al abrir detalle. Menú contiene únicamente `lunch` y `dinner`, IDs de recetas o cadena vacía.
- Límites contractuales: título evento/receta 120, título tarea/concepto gasto 150, descripción evento 5000, tarea 3000, comentario 2000, instrucciones 8000 caracteres; ingredientes 1–100 entradas de 1–200 caracteres; URLs vacías o HTTP/HTTPS de máximo 2048. Fechas civiles `YYYY-MM-DD`, hora `HH:mm`; validar fecha civil en cliente y formato/rangos básicos en reglas. Importe 1–100000000 céntimos enteros. Fechas de creación deben igualar `request.time`.
- Ciclo: `{status:'open'|'closed', paidA:int, paidB:int, count:int, lastExpenseId:string|null, createdAt:timestamp, closedAt:timestamp|null, settledBy:uid|null, nextCycleId:string|null}`. Posiciones A/B son el orden de `profiles`. El total, partes y transferencia se derivan de aportaciones, no se aceptan como cifras arbitrarias.
- Añadir gasto en transacción: leer espacio/ciclo, crear gasto con UID actual y actualizar solo su contador, `count+1` y `lastExpenseId`. Reglas vinculan ambas escrituras con `getAfter`, verifican ID no existente y cantidades exactas; un incremento sin gasto o gasto sin incremento se deniega.
- Liquidar en transacción: leer ciclo activo, exigir `count>0`, cerrar conservando contadores, crear un único ciclo vacío y cambiar referencia del espacio. Reglas validan las tres escrituras relacionadas; campos del ciclo cerrado y sus gastos quedan inmutables. Si otra liquidación ya cambió el ciclo, no cerrar silenciosamente el nuevo: rechazar como operación obsoleta. Altas de gastos reintentan contra el ciclo activo con el mismo ID de operación, sin perderlos.
- Historial remoto: consultar ciclos cerrados de 20 en 20 con cursor; cargar gastos archivados bajo demanda. `loadHistoryPage()` añade resultados sin duplicar y la UI ofrece cargar anteriores, sin truncamiento silencioso. Utilizar listeners solo donde se necesitan; comentarios e historial no se escuchan globalmente. Los elementos de settlements incorporan `expensesLoaded`; `loadCycleExpenses` rellena `expenses` al abrir un ciclo. Hasta cargar comentarios de un evento, su tarjeta dice «Ver comentarios» sin inventar un contador cero.

---

### Task 1: Build seguro y entorno de pruebas aislado
**Files:** Crear `scripts/build.js`, `tests/build.test.js`, `tests/firebase/helpers.js`, `firebase.json`, `firestore.indexes.json`, `src/config/firebase.js`, `src/config/runtime.js`; modificar `index.html`, `scripts/serve.js`, `package.json`, `.gitignore`, `playwright.config.js`.
**Interfaces:** `build({mode:'demo'|'firebase'|'emulator',outdir}) -> Promise<void>`; salida `dist/index.html`, `dist/favicon.svg`, `dist/assets/app.js` y CSS; `getRuntimeConfig() -> {mode,firebase,spaceId,emulators}`. Modos fijados al construir, no activables en producción por query string. Comandos `build`, `build:demo`, `build:emulator`, `test:firebase`, `test:e2e:firebase`; emuladores exclusivamente `demo-marsito-beta`, Auth 9099, Firestore 8080, Hosting 5000; no aliases de producción usados en tests.
- [ ] Escribir tests `firebase_build_contains_no_demo_entry_or_emulator_switch`, `build_does_not_publish_repo_files`, `demo_mode_is_explicit`: comprobar archivos generados y ejecutar la app construida para verificar modo; peticiones a `.git`, fuentes internas y docs deben dar 404.
- [ ] Ejecutar `node --test tests/build.test.js`: RED por build inexistente.
- [ ] Instalar dependencias fijadas en el encabezado; añadir SDK npm y esbuild sin framework. Preparar scripts para copiar solo artefactos públicos, empaquetar CSS/JS, servir `dist` y seleccionar modos explícitos; `npm start` y tests existentes siguen usando demo por compatibilidad, `npm run build` produce Firebase real. Configuración web con los valores recibidos, omitiendo databaseURL y sin inicializar Storage/Analytics.
- [ ] Con autorización del usuario, instalar Java 21 si sigue ausente; verificar `java -version`. Configurar CLI local y emuladores sin abrirlos a la LAN; no iniciar login ni recursos reales desde scripts de test. Mantener builds de tests Firebase en `dist-emulator` y demo en `dist-demo`, con puertos diferenciados, para no sobrescribir el build real ni competir con la vista previa Wi-Fi. Añadir pretest para construir la demo que usa `tests/server.test.js`.
- [ ] Ejecutar `npm test`, `node --test tests/build.test.js`, `npm run build` y tests demo de navegador: GREEN. Commit de build/entorno.

### Task 2: Reglas de autorización y provisión del espacio
**Files:** Crear `firestore.rules`, `tests/firebase/access.test.js`, `tests/firebase/provision-fixture.js`; modificar helpers/índices/configuración de Task 1.
**Interfaces:** `seedSpace(testEnv,{uidA:'alice',uidB:'bob'}) -> Promise<void>` escribe fixtures únicamente con reglas desactivadas en emulador. Producción se provisiona manualmente con dos membresías, configuración y un ciclo vacío `initial`; ninguna utilidad de fixtures admite proyecto real.
- [ ] Escribir pruebas reales con rules-unit-testing: anónimo/no miembro/no verificado/miembro revocado/tercer UID aprobado fuera de perfiles/otro espacio obtienen `assertFails` al leer datos; Alice/Bob verificados y autorizados obtienen `assertSucceeds`. Autoaprobación, cambio de perfiles, listado de miembros y lectura de miembro ajeno se deniegan; documento propio se puede consultar sin exponer otros.
- [ ] Ejecutar `npm run test:firebase -- access`: RED por reglas ausentes o denegación del caso autorizado.
- [ ] Implementar helpers de reglas de membresía/perfiles, deny-all por defecto y lectura autorizada de entidades del modelo; mantener escrituras de datos cerradas hasta sus Tasks correspondientes.
- [ ] Ejecutar la suite de reglas: GREEN para la matriz y pruebas unitarias existentes. Commit de autorización.

### Task 3: Sesión real y limpieza de estado
**Files:** Crear `src/firebase/client.js`, `src/firebase/auth.js`, `src/data/firebase-store.js`, `src/components/firebase-access.js`, `tests/firebase/auth.test.js`, `tests/e2e-firebase/auth.spec.js`; modificar `src/app.js`, `src/components/app-shell.js`, `src/styles.css`, configuración Playwright Firebase.
**Interfaces:** `initializeFirebase(config) -> {auth,db}`; `createAuthController({auth,onSession})` gestiona operaciones de acceso y tokens; Store remoto del contrato compartido. Caché Firestore solo en memoria, listeners con generación de sesión para descartar callbacks antiguos.
- [ ] Escribir tests con Auth Emulator: registro no verificado, reenviar/comprobar verificación con enlaces del emulador, recuperación de contraseña, login fallido y cuenta sin membresía no montan datos. Dos sesiones verificadas alcanzan `ready`; cerrar sesión o revocar membresía vacía listas y cancela listeners incluso con un callback viejo pendiente.
- [ ] Escribir E2E `firebase_mode_has_no_demo_or_profile_switch`, `unapproved_account_cannot_see_data`, `logout_clears_private_content` y `wrong_credentials_do_not_expose_password`: usar emuladores y bloquear en el runner toda petición a APIs del proyecto real.
- [ ] Ejecutar suites de Task 3: RED por controlador/vista ausentes.
- [ ] Implementar inicialización, control de sesión, pantalla de acceso y shell por modo; traducir errores Auth sin volcar credenciales. Montar vistas vacías solo con `ready`; retirar selector/restablecimiento y texto demo en real. Mantener la demo local aislada y sus tests.
- [ ] Ejecutar reglas, unidades y E2E de Task 3 y demo: GREEN. Commit de sesión real.

### Task 4: Eventos, comentarios y tareas con reglas completas
**Files:** Crear `src/firebase/events.js`, `src/firebase/tasks.js`, `src/data/validation.js`, `tests/firebase/events-tasks.test.js`; modificar reglas, Store remoto y `tests/e2e-firebase/shared.spec.js`.
**Interfaces:** `createEvent({db,spaceId,uid},payload,operationId)`, `setAttendance(context,{id,answer})`, `addComment(context,{id,text},operationId)`, `createTask(context,payload,operationId)`, `toggleTask(context,{id})` devuelven Promise. Operaciones nuevas reciben un ID estable por envío; no generar nuevos documentos en reintentos internos. `watchComments(eventId)` mantiene el detalle actualizado y devuelve cleanup.
- [ ] Tests de emulador: Alice crea evento/tarea y Bob los recibe; cada uno cambia solo su respuesta; comentarios conservan UID; ambos alternan tareas. Intentos directos de suplantar autor, añadir campos, modificar evento al responder, editar/borrar comentarios o campos ajenos de tarea fallan. Campos vacíos, URL javascript, fecha/hora malformadas y texto fuera de límites se rechazan.
- [ ] Ejecutar tests específicos: RED para escrituras válidas aún cerradas.
- [ ] Implementar operaciones, validación compartida cliente y reglas por acción; comentarios en subcolección; tareas solo admiten creación y cambio del campo done. Store refleja snapshots del servidor, no falsea éxito al escribir. Todas las escrituras reales, incluidas creaciones, usan transacciones con lectura de servidor para no dejar operaciones setDoc en cola offline. Rechazos o respuestas de una generación de sesión antigua no actualizan ni notifican a la sesión nueva.
- [ ] Añadir test de desconexión con `disableNetwork`: la acción devuelve error y no aparece en otra sesión al reconectar sin nuevo envío. Test de permiso retirado deja la sesión sin contenido compartido. Ejecutar toda la suite Firebase/unidades: GREEN. Commit.

### Task 5: Recetas y menú semanal sincronizados
**Files:** Crear `src/firebase/recipes.js`, `tests/firebase/recipes.test.js`; modificar reglas, Store remoto y `tests/e2e-firebase/shared.spec.js`.
**Interfaces:** `createRecipe(context,payload,operationId)`, `setMenu(context,{date,slot,recipeId}) -> Promise<void>`. Las actualizaciones de un turno conservan el otro; receta existente requerida salvo cadena vacía.
- [ ] Tests: dos sesiones crean/consultan recetas y asignan o retiran menú; cambios concurrentes de lunch/dinner se conservan. Reglas rechazan receta inexistente, autor falso, slot no permitido, URL insegura e ingredientes vacíos/no string/fuera de límites. El texto malicioso sigue siendo literal.
- [ ] Ejecutar tests específicos: RED antes de habilitar escrituras.
- [ ] Implementar funciones y reglas, suscripciones de recetas/menú y adaptación al estado actual, manteniendo fechas locales y sin subida de imágenes.
- [ ] Ejecutar suite Firebase y unidades: GREEN. Commit.

### Task 6: Gastos y liquidaciones atómicas
**Files:** Crear `src/firebase/accounts.js`, `tests/firebase/accounts.test.js`; modificar reglas, Store remoto y `src/lib/money.js` si requiere derivar balance de contadores.
**Interfaces:** `addExpense(context,{concept,amount},operationId)`, `settleCycle(context,{expectedCycleId},operationId) -> Promise<void>` y `loadHistoryPage()`/`loadCycleExpenses(cycleId)` del Store. Añadir `getBalanceFromPaid({paidA,paidB},profiles)` a `src/lib/money.js`, manteniendo `getBalance(expenses,profiles)` del demo. `expectedCycleId` se captura al abrir confirmación, no al resolver la transacción. No escribir balances calculados libremente desde el navegador.
- [ ] Tests: Alice paga 3000, Bob 1000; ciclo deriva total 4000 y transferencia Bob→Alice 1000; céntimo impar conserva total. `Promise.allSettled` de dos cierres del mismo ID produce un único cierre y un ciclo vacío. Gasto compitiendo con cierre aparece exactamente una vez en el ciclo viejo o nuevo; suma de todos los ciclos conserva el importe.
- [ ] Tests de ataque directo: gasto sin actualizar contador, incremento sin gasto, contador de otro UID, gasto duplicado con mismo ID, autor falso, importe cero/negativo/fraccional/excesivo, cierre de ciclo vacío, sustitución de perfiles, cambio de puntero sin cierre y edición de ciclo/gastos cerrados obtienen `assertFails`.
- [ ] Ejecutar tests: RED para operaciones válidas aún denegadas.
- [ ] Implementar protocolo transaccional del modelo compartido y reglas `getAfter`; lecturas antes de escrituras y dentro del límite de accesos de reglas. Crear fixture de más de 20 ciclos para comprobar paginación sin pérdida ni duplicados; gastos archivados se consultan bajo demanda y no requieren listener global.
- [ ] Ejecutar suite Firebase, unidades y repetición de pruebas concurrentes 10 veces: GREEN sin pérdida/duplicado ni cierres nuevos por una confirmación antigua. Commit.

### Task 7: Integración asíncrona y flujos completos de la beta
**Files:** Modificar `src/lib/dom.js`, `src/views/calendar.js`, `src/views/tasks.js`, `src/views/recipes.js`, `src/views/accounts.js`, `src/views/dashboard.js`, CSS correspondientes; crear `tests/e2e-firebase/workflows.spec.js`, `tests/e2e-firebase/errors.spec.js`.
**Interfaces:** `showDialog` espera callbacks Promise, bloquea reenvíos y muestra error sin cerrar ni borrar campos. Helpers de acción para botones no-formulario capturan rechazos y restauran foco. Vistas consumen el contrato Store sin seleccionar identidades ni escribir localStorage real.
- [ ] Tests E2E con dos contextos independientes y emuladores: crear/recibir evento, asistencia/comentarios, completar tarea, crear receta/asignar menú, añadir gastos y liquidar. Confirmar autor real, historial, nueva sesión tras recarga y que no se importan ejemplos locales. Escritorio y móvil.
- [ ] Tests con retraso/rechazo de confirmación: botón guardar no produce dos entidades, diálogo permanece con datos tras error, no muestra toast de éxito antes de resolución. Desconexión, cuota simulada en frontera del SDK y denegación de permisos muestran estados distintos a vacío. Salir limpia también diálogos y callbacks en curso. Los tests de UI con doble de fallo no reemplazan las pruebas reales de reglas.
- [ ] Ejecutar E2E nuevos: RED por callbacks síncronos y estado de datos incompleto.
- [ ] Implementar manejo async en todas las acciones (incluidos asistencia, comentario, checkbox y selects), reconexión de listeners y detalles abiertos en tiempo real; UI de historial remoto paginado y gasto bloqueado durante operación. En modo Firebase, textos no anuncian cambio de perfil, restablecimiento ni funcionamiento offline.
- [ ] Ejecutar `npm test`, `npm run test:firebase`, `npm run test:e2e`, `npm run test:e2e:firebase`: GREEN; comprobar teclado, foco, validación, sin errores de consola ni desbordamiento. Commit.

### Task 8: Provisión, documentación y despliegue real controlado
**Files:** Crear `docs/firebase-beta-setup.md`, `tests/deployment.test.js`; modificar `README.md`, `firebase.json`, índices y scripts de build/deploy. No versionar credenciales de CLI ni identidades de miembros reales.
**Interfaces:** Documentar creación manual de membresías/configuración/ciclo del modelo, dominios autorizados, activación de email/password, prueba de emails y comandos con `--project marsito-beta`. `npm run deploy:beta` valida modo Firebase, proyecto exacto y artefactos antes de invocar CLI. Desplegar Hosting y reglas/índices; nunca Realtime Database, Storage ni Functions.
- [ ] Tests de despliegue en proceso controlado: proyecto equivocado, configuración de emulador y artefacto con claves privadas/cuentas de servicio o rutas internas impiden ejecutar CLI (la API key web pública de Firebase sí está permitida); build correcto genera directorio público y comando con destino explícito. Ejecutar: RED antes del guard de despliegue.
- [ ] Implementar guard y guía. No configurar automatismos que publiquen tras cada commit ni vincular facturación. Pruebas automatizadas de este paso sustituyen solo el lanzamiento de CLI; no afirman haber desplegado.
- [ ] Pedir al usuario iniciar sesión local con `npx firebase login`; verificar cuenta y acceso a `marsito-beta`, plan Spark, Firestore real existente/ubicación y proveedor Auth. Si falta algo, detener solo la publicación y dar la instrucción concreta; no recrear/borrar recursos.
- [ ] Guiar registro/verificación de las dos cuentas y provisión de sus UIDs/perfiles/membresías en consola. No pedir contraseñas. Verificar los documentos requeridos y reglas sin abrir la base temporalmente; una cuenta recién registrada sigue sin acceso hasta aprobación.
- [ ] Ejecutar suite completa, `npm run build`, `npm audit`, revisión de diff/reglas y test de deploy; comprobar ausencia de secretos. Commit. Revisión final propia si continúa sin haber subagentes; documentar que no es independiente.
- [ ] Con la autorización de despliegue solicitada por el usuario, publicar al proyecto verificado y probar HTTPS, acceso anónimo denegado a datos, cuenta no autorizada, dos cuentas aprobadas y recepción de correo de verificación/recuperación. No afirmar estos resultados si el usuario aún debe completarlos. Informar URL y verificaciones pendientes.

## Ejecución propuesta y requisitos pendientes
- Implementar directamente en `beta_0.2`, como la rama solicitada; sin worktree adicional si el usuario mantiene su preferencia de trabajo en el directorio actual.
- No hay herramienta de subagentes: ejecución directa, pruebas por tarea y revisión propia final, sin afirmar revisión independiente.
- Falta Java en PATH. Se necesita autorización para instalar **Java 21** (gratuito) y ejecutar los emuladores. Node y npm ya están disponibles; no requiere cuenta de pago.
- Firebase CLI se instalará como dependencia de desarrollo; el login es interactivo y necesitará al usuario antes de desplegar.
- El proyecto real y las dos identidades se verifican en Task 8; mientras tanto se trabaja únicamente con emuladores. La implementación no equivale por sí sola a una beta desplegada.
