# Marsito App · beta_0.2

Aplicación compartida para dos personas en **HTML5, CSS, JavaScript vanilla y Web Components**. Incluye calendario, tareas, recetas/menú semanal y cuentas con liquidaciones. La rama `beta_0.1` conserva la maqueta; `beta_0.2` añade Firebase Auth, Firestore y configuración de Hosting.

## Tres modos separados

| Modo | Comando | Datos |
|---|---|---|
| Demo local | `npm start` | Perfiles ficticios y localStorage, sin Firebase |
| Demo por Wi-Fi | `npm run start:lan` | Misma demo; accesible desde la red local de confianza |
| Firebase real | `npm run start:beta` | Proyecto `marsito-beta`; cuentas y datos reales |
| Pruebas Firebase | `npm run test:e2e:firebase` | Emuladores locales, proyecto ficticio `demo-marsito-beta` |

Los modos se fijan al compilar. Cambiar parámetros de la URL no convierte la beta en demo ni conecta producción a emuladores. Un fallo de Firebase no abre un acceso demo.

## Instalar y abrir la maqueta

Requiere Node.js 20+; para las pruebas con emuladores, Java 21.

```sh
npm install
npm start
```

Abre **http://127.0.0.1:4173**. Elige Álex o Sam. El pie «Restablecer demo» recupera ejemplos previa confirmación. No abrir `index.html` por `file://`.

Para Android en la misma Wi-Fi, usa `npm run start:lan` y la dirección «Red local» impresa en consola. Mantén el PC encendido. Usa una red de confianza; no desactives el firewall ni abras puertos del router. Los datos de la demo del móvil y del PC son independientes.

## Beta Firebase privada

**Guía completa: [Preparar y publicar la beta](docs/firebase-beta-setup.md).**

- Login/registro por correo y contraseña, verificación y recuperación.
- Registrarse no autoriza: el propietario aprueba los dos UIDs mediante documentos protegidos.
- La identidad viene de Auth: no hay selector libre de perfiles ni restablecimiento de datos reales.
- La interfaz/login se puede descargar públicamente; los datos requieren membresía activa, correo verificado y UID en los dos perfiles del espacio. Las reglas, no solo la interfaz, hacen cumplir esto.
- Datos sincronizados entre dispositivos. Escrituras confirmadas por el servidor, sin cola offline.
- Transacciones para gastos y cierres; ciclos cerrados y gastos archivados inmutables para clientes.
- Sin migración automática de los ejemplos/localStorage.

```sh
npm run build        # dist: build real, NO publica
npm run build:demo   # dist-demo: maqueta
npm run build:emulator # dist-emulator: solo emuladores
npm run deploy:beta  # requiere login de CLI y revisión del destino; publica al proyecto real
```

El proyecto previsto es `marsito-beta`, con Spark, sin activar facturación, Storage, Functions ni SMS. Tener el dominio previsto `https://marsito-beta.web.app` no significa que ya se haya desplegado: hay que completar la guía y verificar HTTPS.

## Funciones

- **Calendario:** eventos con título, fecha, hora, descripción y URLs opcionales; asistencia propia sí/no y comentarios con autor.
- **Tareas:** pendientes compartidos y completadas.
- **Recetas:** ingredientes, instrucciones e imagen/enlace por URL.
- **Menú semanal:** comida/cena, recetas existentes y semanas navegables.
- **Cuentas:** gastos del usuario autenticado, reparto entre dos, confirmación de liquidación e historial paginado en Firebase.

Importes en céntimos: si A paga 30 € y B 10 €, B debe a A **10 €**. Si el total es impar en céntimos, el primer perfil asume el extra. Liquidar registra un cierre: **no realiza pagos reales**.

## Pruebas

```sh
npx playwright install chromium
npm test
npm run test:firebase
npm run test:e2e
npm run test:e2e:firebase
npm audit --omit=dev
```

Las pruebas con emuladores se niegan a usar un proyecto real. Cubren autorizaciones, suplantación, validación, cierre de sesión/revocación, sincronización, carreras de liquidación y gasto, formularios pendientes/errores y navegador móvil/escritorio. La recepción real de correos y el despliegue requieren verificación controlada adicional.

El SDK Firebase incluye una dependencia Node grpc antigua; se fija `@grpc/grpc-js` corregido para evitar sus avisos de seguridad. Revisar auditorías de herramientas de desarrollo por separado; no aplicar `npm audit fix --force` sin analizarlo, porque puede proponer degradaciones incompatibles.

## Estructura

- `src/components/`, `src/views/`: Web Components e interfaz.
- `src/data/store.js`, `src/data/seed.js`: demo local independiente.
- `src/data/firebase-store.js`, `src/firebase/`: sesión, listeners y operaciones reales.
- `src/config/`: configuración pública web y modos de compilación, sin credenciales administrativas.
- `src/lib/`: fechas civiles, dinero y utilidades de interfaz.
- `scripts/`: build con esbuild, servidor estático, emuladores y guard de despliegue.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: permisos y despliegue.
- `tests/`: lógica, artefactos, reglas y flujos de navegador.
- `docs/superpowers/`: diseños y planes aprobados; registros de revisión.

La configuración web y su API key son públicas por diseño; no deben confundirse con claves privadas o cuentas de servicio. El repositorio no incluye estas últimas. Sigue siendo una beta: no hay APK Android, notificaciones, pagos, grupos múltiples ni subida de archivos. El empaquetado en un WebView Android moderno queda para una fase posterior.
