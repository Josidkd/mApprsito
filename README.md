# Marsito App · maqueta local

Maqueta funcional en **HTML5, CSS, JavaScript vanilla y Web Components**, sin framework ni dependencias de producción. Diseño móvil y escritorio, datos ficticios y guardado en `localStorage`.

## Probarla

Requiere Node.js 20 o posterior.

```sh
npm install
npm start
```

Abre **http://127.0.0.1:4173**. No hace falta compilar. No abras `index.html` directamente con `file://`: los módulos necesitan HTTP.

1. Entra como **Álex** o **Sam**, o personaliza uno de los dos perfiles con «Crear perfil demo».
2. Cambia el perfil desde la barra superior para probar las acciones compartidas.
3. Recorre **Inicio, Calendario, Tareas, Recetas y Cuentas**.
4. «Restablecer demo», al pie de cada pantalla, recupera los ejemplos previa confirmación.

## Qué puedes hacer

- **Calendario:** crear eventos con título, fecha, hora y descripción; imagen/enlace opcionales; asistencia sí/no y comentarios por perfil.
- **Tareas:** añadir pendientes compartidos y marcarlos como hechos.
- **Recetas:** ingredientes, instrucciones, imagen/enlace por URL y detalle de receta.
- **Menú semanal:** asignar recetas existentes a comida/cena, recorrer semanas y retirar asignaciones.
- **Cuentas:** registrar gastos pagados por el perfil activo, ver el reparto a partes iguales, confirmar una liquidación y conservar los ciclos anteriores.

Los importes se calculan en céntimos. Si Álex paga 30 € y Sam 10 €, Sam debe a Álex **10 €**. Cuando el total tiene un céntimo impar, el primer perfil asume ese céntimo adicional. Liquidar archiva el ciclo y empieza uno vacío: **no hace pagos reales**.

## Pruebas

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

El primer comando prueba el almacén, fechas y cuentas. Playwright recorre la interfaz en Chromium de escritorio y móvil (emulación Pixel 7). También comprueba validación, persistencia, texto malicioso, URLs inseguras, estados vacíos y navegación sin desbordamiento horizontal.

## Estructura

- `src/data/`: ejemplos y almacén versionado; única capa que persiste datos.
- `src/lib/`: fechas locales, importes y utilidades de interfaz.
- `src/components/`: acceso de demostración y estructura de navegación.
- `src/views/`: pantallas de las secciones, como Web Components.
- `scripts/serve.js`: servidor HTTP de desarrollo, limitado a archivos públicos de la maqueta.
- `tests/`: pruebas unitarias y de navegador.
- `docs/superpowers/`: diseño y plan aprobados.

## Límites importantes

Es una **demostración**, no una aplicación de producción. No introduzcas información personal o sensible.

- El acceso y el registro son simulados; no hay contraseñas, cuentas reales ni seguridad multiusuario.
- Los dos perfiles comparten los datos **solo en este navegador y origen**. No hay sincronización entre dispositivos o pestañas en tiempo real. Cambiar de puerto u origen crea otro almacenamiento.
- Borrar los datos del navegador elimina la maqueta guardada. Si el navegador bloquea el almacenamiento, se avisa y los cambios duran solo la sesión.
- Firebase Auth, Firestore, reglas de seguridad, notificaciones y APK Android quedan para la siguiente fase.
- Las imágenes opcionales se cargan desde las URLs que introduzcas; requieren conexión y contactan con ese servidor externo. La maqueta no sube archivos.
- El servidor escucha solo en `127.0.0.1` y no está pensado para publicar en producción.

Los Web Components y los módulos ES son compatibles con un futuro empaquetado en un WebView Android moderno, pero todavía no se ha generado ni probado un APK.
