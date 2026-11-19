# Marsito App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una maqueta local interactiva de Marsito App que permita validar todos los flujos aprobados.

**Architecture:** Web Components con módulos ES y CSS compartido. Un almacén local versionado encapsula datos y acciones; las vistas consumen esa interfaz sin acceder directamente a localStorage. Navegación hash y acceso de demostración sin contraseñas.

**Tech Stack:** HTML5, CSS, JavaScript vanilla, localStorage, Node.js test runner y Playwright para pruebas de navegador. Sin dependencias de producción.

**Spec:** `docs/superpowers/specs/2026-07-17-marsito-maqueta-design.md`

## Global Constraints
- HTML5, CSS, JavaScript vanilla y Web Components, sin framework.
- Interfaz en español, móvil primero, fondo crema, tarjetas claras y acentos coral y verde.
- No pedir ni guardar contraseñas reales.
- Los datos son compartidos entre perfiles en el mismo navegador.
- No necesita credenciales, Firebase ni servicios de pago.
- Cálculos en céntimos y liquidación deshabilitada sin gastos.
- Los enlaces externos solo aceptan HTTP/HTTPS.
- No se empaquetará Android en esta fase.

## Review Focus
- Datos locales corruptos o almacenamiento no disponible: recuperación controlada y aviso visible, sin pantalla vacía.
- Texto malicioso y URLs javascript: mostrar texto literal y rechazar enlaces inseguros.
- Importes con coma, cero, negativos y decimales de más: aceptar céntimos válidos y rechazar el resto.
- Fechas en límites de mes, semana y año: no desplazar días por conversiones UTC.
- Móvil y teclado: navegación, formularios y confirmaciones utilizables sin desbordamiento ni pérdida del foco.

---

### Task 1: Almacén local y reglas de negocio
**Files:** Crear `package.json`, `src/data/seed.js`, `src/data/store.js`, `src/lib/date.js`, `src/lib/money.js`, `tests/store.test.js`, `tests/date.test.js`, `tests/money.test.js`.
**Interfaces:** `createStore(storage) -> Store`, con `getState()`, `subscribe(listener) -> unsubscribe`, `dispatch(type, payload) -> void`; estado `{version, profiles, activeProfileId, events, tasks, recipes, menu, expenses, settlements}`. Acciones: `login`, `register`, `logout`, `event/add`, `event/attendance`, `event/comment`, `task/add`, `task/toggle`, `recipe/add`, `menu/set`, `expense/add`, `expense/settle`, `reset`. Exportar `parseCents(text) -> integer`, `getBalance(expenses, profiles) -> {total, shares, transfer}` y `dateKey(date) -> YYYY-MM-DD`, `weekDays(date) -> string[7]`. Eventos contienen asistencia por perfil y comentarios con autor; menú se indexa por fecha y comida/cena. Gastos liquidados se archivan con el resumen del ciclo.
- [ ] Escribir pruebas: persistencia tras crear una nueva instancia, cambio de perfil, registro sin contraseñas, validación de campos obligatorios, creación de evento/comentario/asistencia, tareas, recetas y menú. Probar almacenamiento corrupto y fallos de escritura con adaptadores falsos.
- [ ] Escribir pruebas de importes: `12,50 -> 1250`, rechazar `0`, `-1`, `1.234`, `NaN`; gastos de 3000 y 1000 generan transferencia de 1000 del segundo al primero; liquidar conserva historial y vacía el ciclo. Verificar reparto determinista del céntimo impar y total conservado.
- [ ] Escribir pruebas de fechas locales para fin de diciembre y febrero bisiesto, con semanas de lunes a domingo.
- [ ] Ejecutar `npm test`; comprobar fallo por módulos todavía inexistentes.
- [ ] Implementar las interfaces, datos ficticios relativos al día actual, validación y almacenamiento versionado. Permitir exactamente dos perfiles; registrar configura un perfil de demostración, sin crear un tercer participante. Exponer aviso de persistencia a la UI.
- [ ] Ejecutar `npm test`; todos los casos deben pasar.
- [ ] Commit de almacén y pruebas.

### Task 2: Acceso, estructura visual y navegación
**Files:** Crear `index.html`, `src/app.js`, `src/styles.css`, `src/components/app-shell.js`, `src/components/demo-access.js`, `src/views/dashboard.js`, `src/lib/dom.js`, `scripts/serve.js`, `playwright.config.js`, `tests/e2e/shell.spec.js`.
**Interfaces:** Componentes `marsito-app`, `demo-access`, `app-dashboard`; las vistas reciben `.store`. `src/lib/dom.js` exporta `escapeHTML(value) -> string` y `safeURL(value) -> string|null`. Rutas hash `inicio`, `calendario`, `tareas`, `recetas`, `cuentas`. `npm start` sirve estáticos solo desde el proyecto; `npm run test:e2e` ejecuta Playwright.
- [ ] Escribir pruebas de navegador para acceso claramente simulado, registro, cambio de perfil, salida, navegación, resumen inicial, recarga y restablecimiento con confirmación.
- [ ] Ejecutar las pruebas de shell y comprobar fallo porque aún no existe la aplicación.
- [ ] Implementar shell responsive, formularios etiquetados, resumen con datos del almacén, navegación inferior/lateral y mensajes de estado accesibles. Añadir configuración de desarrollo y servidor local sin dependencias de producción; bloquear traversal del servidor.
- [ ] Probar pantalla de 390 px y escritorio: sin desbordamiento horizontal; acceso y navegación por teclado; restablecer conserva foco lógico. Añadir aserciones a `shell.spec.js`.
- [ ] Ejecutar `npm test` y `npm run test:e2e -- tests/e2e/shell.spec.js`; comprobar éxito.
- [ ] Commit de estructura y acceso.

### Task 3: Calendario y tareas compartidas
**Files:** Crear `src/views/calendar.js`, `src/views/tasks.js`, `tests/e2e/calendar-tasks.spec.js`; modificar registro de vistas en `src/app.js`.
**Interfaces:** `app-calendar` y `app-tasks` reciben `.store` y despachan las acciones de Task 1; sin persistencia directa. Calendario mantiene fecha seleccionada localmente en la vista.
- [ ] Escribir pruebas para crear evento con todos los campos, rechazar campos obligatorios vacíos, navegar meses, abrir detalle, cambiar asistencia y comentar como cada perfil; crear y completar tarea y comprobar persistencia.
- [ ] Añadir pruebas con `<img onerror=...>` como título/comentario y URL `javascript:`: contenido literal, ninguna ejecución ni enlace inseguro. Probar estado sin eventos y sin tareas.
- [ ] Ejecutar la prueba específica y comprobar fallo por vistas inexistentes.
- [ ] Implementar calendario mensual con día seleccionado, lista y detalle; formularios de creación, asistencia por perfil y comentarios. Implementar tareas pendientes/completadas con título y descripción. Mantener los formularios accesibles y la validación visible.
- [ ] Ejecutar pruebas unitarias y `npm run test:e2e -- tests/e2e/calendar-tasks.spec.js`; comprobar éxito.
- [ ] Commit de calendario y tareas.

### Task 4: Recetas y menú semanal
**Files:** Crear `src/views/recipes.js`, `tests/e2e/recipes.spec.js`; modificar registro en `src/app.js`.
**Interfaces:** `app-recipes` recibe `.store`. Ingredientes se introducen uno por línea; menú usa claves fecha local y slots `lunch`/`dinner`.
- [ ] Escribir pruebas para crear receta con ingredientes e instrucciones, abrir detalle, asignarla a comida/cena, cambiar semana, retirar asignación y recargar. Probar enlaces seguros, receta sin imagen y estado sin recetas.
- [ ] Ejecutar la prueba específica y comprobar fallo antes de implementar.
- [ ] Implementar pestañas Recetas/Menú semanal, detalle, formulario y selector de recetas existentes; semana lunes-domingo y fecha visible en cada día.
- [ ] Ejecutar `npm test` y `npm run test:e2e -- tests/e2e/recipes.spec.js`; comprobar éxito.
- [ ] Commit de recetas y menú.

### Task 5: Cuentas y entrega verificable
**Files:** Crear `src/views/accounts.js`, `tests/e2e/accounts.spec.js`; modificar `src/app.js`, `README.md`.
**Interfaces:** `app-accounts` recibe `.store`; usa `parseCents` y `getBalance`. Perfil activo determina autor del gasto. Historial muestra fecha, gastos y transferencia de cada ciclo.
- [ ] Escribir pruebas para gastos de ambos perfiles, validación de importe/concepto, transferencia, cancelar liquidación, confirmar liquidación, historial, nuevo ciclo vacío y persistencia tras recarga. Botón deshabilitado sin gastos.
- [ ] Ejecutar la prueba específica y comprobar fallo antes de implementar.
- [ ] Implementar resumen del ciclo, lista con autor, formulario, confirmación e historial. Advertir que la liquidación registra un acuerdo pero no realiza pagos reales.
- [ ] Documentar `npm install`, instalación de Chromium de Playwright, `npm start`, URL local, comandos de pruebas y limitaciones de la demostración en README.
- [ ] Ejecutar `npm test` y `npm run test:e2e` con proyectos móvil y escritorio. Comprobar todos los flujos, ausencia de errores de consola y desbordamiento en las cinco vistas. Resolver cualquier fallo antes de declarar terminado.
- [ ] Revisar diff completo contra el diseño, comprobar que no se añadieron credenciales ni dependencias de producción, y hacer commit.

## Ejecución y revisión
No hay herramienta de subagentes disponible en esta sesión. Recomendación: ejecución directa en esta sesión, tarea por tarea, con pruebas y revisión final propia; no presentar esa revisión como independiente. Mantener estas casillas actualizadas. Antes de implementar, usar `using-git-worktrees` para decidir y preparar el aislamiento sin perder el diseño y este plan.
