# Marsito beta_0.2 — implementación, revisión y publicación pendiente

## Estado
Código implementado y probado en `beta_0.2`, derivada de `beta_0.1` en `c508458`. No se ha desplegado, fusionado ni subido esta rama durante esta ejecución. La preparación de publicación está lista; su ejecución y las verificaciones reales siguen bloqueadas por login de CLI y provisión de las dos identidades.

`npx firebase login:list` devuelve que no hay cuentas autorizadas en el PC. No se ha activado facturación ni modificado datos, reglas o servicios del proyecto real. La configuración pública web recibida se ha incorporado sin Realtime Database, Storage ni Analytics.

## Implementado
- Build con esbuild, sin framework; modos demo, Firebase real y emulador aislados.
- Firebase Auth: registro por correo/contraseña, verificación, recuperación, login y logout. Mensajes de error sin contraseñas ni credenciales administrativas.
- Autorización por membresía activa, correo verificado y UID incluido en exactamente dos perfiles administrados por el propietario.
- Reglas deny-by-default, validación de campos y autores, prohibición de autoaprobación/suplantación y cambios en datos cerrados.
- Adaptador Firestore con caché de datos en memoria y separación del localStorage de la demo; limpieza de datos y listeners al salir o revocar acceso.
- Sincronización de eventos, asistencia, comentarios, tareas, recetas, comida/cena y cuentas entre sesiones independientes.
- Operaciones asíncronas: los formularios esperan confirmación, evitan reenvíos, mantienen campos tras error y no anuncian éxitos anticipados.
- Gastos con contadores verificados en reglas, liquidación atómica y carreras entre gastos/cierres sin pérdidas ni doble liquidación.
- Historial paginado de 20 ciclos y detalle de gastos archivados bajo demanda.
- Configuración de Firebase Hosting clásico, guard de publicación por proyecto/modo/archivos/hashes y guía manual de puesta en marcha.
- Instalación autorizada de Temurin Java 21 para emuladores, Firebase CLI como dependencia de desarrollo y SDK Firebase fijado.

## Evidencia final
- `npm test`: **21/21** (lógica, servidor, builds y guard de despliegue).
- `npm run test:firebase`: **19/19** (reglas y SDK reales contra emuladores locales).
- `npm run test:e2e`: **30/30** (demo escritorio/móvil).
- `npm run test:e2e:firebase`: **14/14** (Firebase escritorio/móvil, dos contextos independientes, red restringida a localhost).
- **Total: 84 pruebas, cero fallos**.
- `npm run build`: correcto, artefactos de producción en `dist`.
- `npm audit --omit=dev`: **0 vulnerabilidades**.
- `git diff --check`: sin errores de whitespace.

Las diez carreras de gasto/cierre conservan 20 gastos y 1010 céntimos en exactamente 10 ciclos cerrados. La paginación recupera 23 ciclos sin duplicados. Las pruebas de escritura directa verifican que no basta con modificar el JavaScript del cliente para saltarse los permisos.

## Revisión final
**Revisión propia del autor, no independiente:** no hay herramienta de subagentes disponible. Paquetes revisados desde `c508458`, inspección separada de autorización, ciclo financiero, sesión y artefactos; comparación con el diseño y los cinco riesgos del plan.

Fortalezas: control de acceso efectivo en reglas, identidades no seleccionables, contadores atómicos verificables, datos y build demo separados de producción, cobertura con emuladores y navegadores reales.

Hallazgo importante corregido: una respuesta autorizada de la configuración, recibida antes de revocar membresía pero entregada después, podía restaurar brevemente el estado `ready`. Se añadió una generación de autorización independiente de la generación de sesión, invalidada al limpiar datos. Aplica a listeners, cargas de historial, comentarios y resultados de acciones en curso. Una prueba determinista con el SDK real y entrega retrasada del callback reprodujo el fallo y pasó después de la corrección. La dependencia de suscripción es inyectable; no se añadió ningún acceso alternativo en producción ni un método de prueba en la UI. Los comentarios se cancelan también al revocar, no solo al cambiar de cuenta.

La revisión también comprobó la distinción entre nueva entrada (lleva a Inicio) y restauración de sesión tras recarga (conserva la sección). Las pruebas de formularios y detalle en vivo cubren la conservación del borrador y los rechazos de operaciones asíncronas.

No hay hallazgos críticos/importantes de código conocidos pendientes tras esta pasada. Esto no equivale a una auditoría independiente ni a haber verificado el proyecto desplegado.

## Decisiones y desviaciones registradas, en orden
1. **No tocar producción desde pruebas.** Provisión/publicación esperan login y UIDs; protege el proyecto existente. Consecuencia: entrega de código no equivale a publicación.
2. **Override de grpc-js a 1.14.7 en la dependencia Node de Firestore.** Evita el aviso de validación de certificados sin degradar Firebase. Coste: conservar pruebas de compatibilidad; no afecta al transporte del frontend de navegador.
3. **Comprobar servidor antes de transacciones.** El SDK puede seguir usando transporte transaccional aunque `disableNetwork` haya apagado listeners. La lectura forzada permite negar operaciones offline sin dejarlas en cola. Coste: una lectura adicional por acción.
4. **Agrupar flujos UI compartidos en Task 7.** Las operaciones de Tasks 4–6 se verificaron primero con reglas/SDK, y después con interfaz async. Coste temporal: no se consideró funcional la UI real hasta esa integración; ya comprobada.
5. **Serializar ingredientes como `ingredientsText`.** La interfaz conserva listas; las reglas validan longitud y contenido de cada línea. Consecuencia: exportaciones de Firestore muestran texto multilínea, no un array.
6. **Reintento acotado ante conflicto de ciclo.** Si reglas rechazan un gasto por un estado obsoleto, volver a leer con permisos y reintentar solo cuando se demuestra cambio de ciclo/contadores, con el mismo ID y un máximo de cinco intentos. Coste: lecturas extra bajo contención; tras cinco conflictos se requiere reintento manual.
7. **Inyectar fallos UI en la frontera Store.** Reglas/SDK se prueban por separado sin mocks; el fallo de cuota en interfaz es representado, no se agota una cuota real. Límite: no acredita el comportamiento del servicio ante agotamiento real de Spark.

## Menores aplazados y auditoría de dependencias
Persisten **15 avisos moderados transitivos en herramientas de desarrollo de Firebase CLI** (glob/minimatch, uuid y OpenTelemetry). No están incluidos en el bundle web ni en la auditoría de producción. Se aplicaron actualizaciones compatibles sin force; el force sugería degradar a CLI 13.x. Aplazado el cambio mayor de herramientas y sus pruebas de compatibilidad. Ejecutar estas herramientas solo sobre este proyecto de confianza; mantenerlas actualizadas. No presentar esta auditoría como cero avisos globales.

## Pasos reales todavía pendientes
1. El usuario ejecuta `npx firebase login` con acceso administrativo a `marsito-beta`.
2. Comprobar proyecto, Firestore `(default)` existente, ubicación, proveedor email/password, dominios y plan Spark. No recrear/borrar bases ni vincular facturación.
3. Registrar/verificar las dos cuentas sin compartir contraseñas; obtener sus UIDs y configurar membresías, perfiles en orden estable y ciclo `initial`. Instrucciones en `docs/firebase-beta-setup.md`.
4. Publicar reglas/índices/Hosting al proyecto verificado y comprobar la URL HTTPS resultante, anónimo/no miembro rechazados y sincronización de ambos miembros.
5. Verificar recepción real de correos de verificación/recuperación. Los emuladores no prueban entrega de email real.

Las dos identidades reales no se incluyen en el repositorio público. El dominio previsto es `https://marsito-beta.web.app`, pero no se afirma que esta versión ya esté servida allí.
