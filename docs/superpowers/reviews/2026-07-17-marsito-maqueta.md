# Marsito App — ejecución y revisión final

## Entrega
Maqueta local implementada en la rama `beta_0.1`, en el directorio original por petición del usuario. Sin push, publicación ni integración en main.

## Tareas completadas
- [x] Almacén local versionado y reglas de negocio: `953cae7`.
- [x] Acceso de demostración, navegación y panel principal: `c678c7d`.
- [x] Calendario, asistencia, comentarios y tareas: `bb2adb6`.
- [x] Recetas y menú semanal: `700db4b`.
- [x] Gastos, liquidaciones, historial y documentación: `f0fa7b8`.
- [x] Revisión final y correcciones con pruebas de regresión.

## Decisiones del implementador
1. El registro personaliza uno de los dos perfiles de demostración; no crea un tercero. Motivo: el reparto aprobado es entre dos personas. Límite: no representa registro de grupos; se indica como simulación.
2. Si el total tiene un céntimo impar, la parte del primer perfil incluye ese céntimo. Motivo: conservar el total con importes enteros. Consecuencia: diferencia máxima de un céntimo entre partes.

## Revisión
Revisión propia del autor, sin herramienta disponible de subagentes ni revisor independiente. Se revisaron los límites entre persistencia, acciones y vistas, los cinco riesgos del plan y las capturas de Inicio a 1440 px y 390 px.

Fortalezas: acceso a datos separado de las vistas, importes enteros, fechas locales, contenido escapado y enlaces limitados a HTTP/HTTPS; pruebas reales del navegador en dos tamaños.

Hallazgos importantes corregidos en una pasada:
- El hash anterior sobrevivía a salir y volver a entrar: nueva entrada desde acceso ahora abre Inicio. Prueba observada fallando y pasando.
- Los diálogos no tenían nombre accesible ni recuperaban el foco cuando una acción recreaba el botón que los abrió. Ahora usan `aria-labelledby`, buscan el botón actualizado y tienen fallback al título principal. Ambas regresiones observadas fallando y pasando.
- La validación de historial aceptaba perfiles truncados y transferencias inválidas. Ahora valida los perfiles archivados y comprueba el balance contra sus gastos. Regresión observada fallando y pasando.

No quedan hallazgos críticos/importantes conocidos ni menores aplazados en esta revisión. No se consideró la autenticación simulada como un fallo de seguridad: está identificada como demostración, según el alcance aprobado; no sustituye autenticación real ni reglas Firebase.

## Evidencia final
- `npm test`: **12/12**.
- `npm run test:e2e -- --workers=4`: **30/30**, Chromium escritorio y emulación móvil.
- `npm audit --omit=dev`: **0 vulnerabilidades**; sin dependencias de producción.
- `git diff --check`: sin errores de whitespace.

Los escenarios cubren persistencia, cambio de perfil, registro simulado, eventos, asistencia, comentarios, tareas, recetas, menú, reparto de gastos, liquidación, historial, validación, estados vacíos, texto malicioso, almacenamiento bloqueado/corrupto, foco y ausencia de desbordamiento horizontal.

Esto no acredita compatibilidad de un APK Android, sincronización, seguridad Firebase, conformidad completa WCAG ni soporte en todos los navegadores. Esa validación pertenece al desarrollo posterior.
