# Alpha como PWA

## Qué incluye

- Manifiesto con nombre Alpha, inicio en Resumen y ventana independiente (`standalone`).
- Iconos PNG de 192/512 px, icono maskable con margen seguro y Apple Touch Icon de 180 px.
- Service worker generado con Vite PWA/Workbox en cada compilación.
- Precaché de HTML, JavaScript, CSS, iconos y plantilla CSV. Los registros personales permanecen en IndexedDB; no se suben ni se copian a la caché de red.
- Primera carga con conexión; después se puede abrir, recargar, navegar y guardar datos sin red.
- Instalación desde Ajustes cuando el navegador ofrece el aviso nativo; instrucciones para Safari/iOS y otros navegadores.
- Detección de conexión y de ventana instalada. Aviso de nueva versión y aplicación explícita con confirmación antes de recargar.
- Comprobación de actualizaciones al volver a la app o recuperar conexión (limitada a una por minuto) y botón manual en Ajustes.

## Prueba local de la versión real

```sh
npm ci
npm run build
npm run preview
```

Abrir la URL **localhost** indicada por Vite, entrar en Ajustes y esperar a «Alpha está preparada para abrirse sin conexión». La instalación depende del navegador y de sus criterios de disponibilidad. La primera vez necesita cargar todos los recursos antes de desconectar.

`npm run dev` mantiene el service worker desactivado para evitar que una caché de producción interfiera en el desarrollo. No es la vía para verificar la PWA.

```sh
npx playwright install chromium
npm run build
npm run test:pwa
```

Las pruebas PWA usan la compilación en el puerto 4174, separado de los recorridos de desarrollo del puerto 4173. Verifican manifiesto/iconos, disponibilidad offline, cierre y reapertura de pestaña sin red, escritura de registros y dietas, importación CSV y acceso a su plantilla sin conexión, edición del sueño en HH:mm, instalación por acción explícita y una actualización de service worker con IndexedDB conservado. El caso de actualización cambia temporalmente el archivo generado `dist/sw.js` y lo restaura al terminar; no modifica fuentes.

## Instalar en el teléfono

La app debe servirse desde una **URL HTTPS estable**. `http://localhost` es una excepción para pruebas en el propio ordenador; abrir `http://IP-del-ordenador:puerto` desde el teléfono no equivale a localhost y normalmente no permite service workers ni instalación.

- Android/Chrome: abrir la URL con conexión; en Ajustes pulsar Instalar Alpha cuando aparezca. También puede estar disponible en el menú del navegador.
- iPhone/iPad: abrir en Safari → Compartir → Añadir a pantalla de inicio → Añadir. La instalación no usa `beforeinstallprompt` en iOS.
- Chrome/Edge de escritorio: botón de Ajustes, icono de la barra de direcciones o menú de instalación.

No es una publicación en App Store/Google Play. La confirmación de instalación depende de la interfaz del sistema y debe comprobarse en el teléfono real; las pruebas automatizadas no sustituyen esa verificación.

## Alojamiento HTTPS

Esta entrega prepara y verifica la PWA; no configura ni publica un alojamiento externo. Publicar el contenido completo de `dist/` en un alojamiento estático con HTTPS, manteniendo sus rutas y archivos. El proyecto compila por defecto para la raíz de un dominio.

Si se publica en un subdirectorio (por ejemplo un repositorio de GitHub Pages), compilar con el prefijo correcto de Vite y comprobar el manifiesto y el alcance del service worker en ese destino:

```sh
npm run build -- --base=/Fitness-Health-tracker-app/
```

En el servidor, `sw.js`, `index.html` y `manifest.webmanifest` deben poder revalidarse (por ejemplo `Cache-Control: no-cache`). Los archivos con hash en `assets/` pueden tener caché larga. Publicar todos los archivos de la compilación juntos y conservar los assets previos durante una transición si el alojamiento permite una publicación atómica.

Mantener protocolo, dominio y puerto estables: los datos pertenecen al origen del navegador. Cambiar de localhost a un dominio HTTPS no traslada automáticamente los registros existentes. En iOS también puede variar el contenedor de almacenamiento entre Safari y la aplicación instalada; hay que comprobarlo en el dispositivo. No hay sincronización ni copia de seguridad automática.

## Actualizaciones

1. Publicar una compilación nueva en la misma URL.
2. La app la detecta al abrirse, recuperar conexión, volver al primer plano o buscar actualizaciones en Ajustes.
3. La nueva versión queda esperando; no reinicia automáticamente un formulario abierto. «Más tarde» permite ocultar el aviso y actualizar después desde Ajustes.
4. Guardar los cambios y pulsar Actualizar Alpha. La confirmación explica que habrá una recarga.
5. Se activa el nuevo service worker y se recarga la pestaña que aceptó la actualización. Las otras pestañas no se fuerzan a recargar.

La limpieza de cachés afecta a los recursos estáticos gestionados por Workbox. No borra IndexedDB. La caché y los datos locales siguen sujetos al almacenamiento del navegador y a su eliminación por el usuario.

## Comprobación manual antes de dar la instalación por cerrada

- Instalar desde la URL HTTPS en el teléfono personal y comprobar el icono α, nombre Alpha y apertura sin barra del navegador.
- Tras la preparación inicial, activar modo avión, cerrar y reabrir la app; guardar y corregir un registro, consultar Resumen, calcular macros y editar una dieta.
- Recuperar la conexión y probar una actualización real sin pérdida de registros, objetivos ni fases.
- En iOS, verificar si los datos previos de Safari se comparten con la app instalada antes de depender de ese traslado.
