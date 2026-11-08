# Fitness & Health Tracker

Aplicación orientada al móvil para centralizar el seguimiento personal de la nutrición, los hábitos y la evolución física.

El proyecto nace de una hoja de cálculo de Google Sheets utilizada para registrar estos datos manualmente. La idea es trasladar esa forma de organizar la información a una interfaz propia, cómoda de usar desde el teléfono y preparada para incorporar nuevas funciones con el tiempo.

## Estado del proyecto

Base técnica inicial en desarrollo: React, TypeScript y Vite, navegación móvil y preferencias locales en IndexedDB con Dexie. El registro diario ya permite guardar y corregir agua, sueño, pasos y peso por fecha. Los objetivos básicos y el histórico con gráficas ya están implementados. La primera calculadora de calorías/macros está disponible en Dieta. Las fases manuales de dieta ya permiten crear y editar comidas en texto libre. El alcance y el orden de construcción están documentados en [PLAN_MVP.md](PLAN_MVP.md).

El MVP será de uso personal desde un único teléfono, con almacenamiento local y sin cuentas ni sincronización.

## Objetivo

Sustituir el registro manual en la hoja de cálculo por una aplicación que permita:

- Guardar, consultar y modificar la información desde el móvil.
- Conservar el histórico y observar la evolución a lo largo del tiempo.
- Ajustar objetivos y fases de dieta según las necesidades de cada momento.
- Añadir nuevas métricas y funcionalidades a medida que evolucione el proyecto.
- Conectar en el futuro con otras fuentes, como Garmin y hojas de cálculo.
- Ampliar el uso personal a otros usuarios, como amigos, si se decide hacerlo.

## Punto de partida: la hoja de cálculo actual

La organización actual sirve como referencia funcional para la aplicación y se divide en seis apartados:

| Apartado | Información y funcionamiento actuales |
| --- | --- |
| Calculadora de macros | Peso, factor de actividad, calorías de mantenimiento, ajustes para definición o volumen y reparto de proteínas, carbohidratos y grasas. Incluye peso objetivo y ajustes según el peso de seguimiento. |
| Dieta | Fases modificables con comidas, cantidades, calorías, cambios entre fases y anotaciones sobre extras. |
| Agua | Registro diario de litros ingeridos mediante marcas de progreso y seguimiento de días con el objetivo cumplido. |
| Sueño | Horas de sueño y puntuación diaria procedentes del reloj Garmin, con medias del periodo. |
| Pasos | Registro de pasos diarios, objetivo y media del periodo. |
| Peso | Registro de peso por fecha, variación entre registros y objetivo de evolución semanal. |

Los valores, objetivos y fases de la hoja son personales y variables. La aplicación debe permitir configurarlos en lugar de fijarlos como reglas universales. Las fórmulas de la calculadora deberán revisarse y documentarse al trasladarlas.

## Alcance inicial propuesto

La primera versión se centrará en reproducir el uso personal de la hoja desde el móvil, con introducción manual de datos.

### Nutrición

- Calcular las calorías y los macronutrientes a partir de los parámetros personales.
- Configurar objetivos de mantenimiento, definición o volumen.
- Crear y editar fases de dieta, comidas, cantidades y anotaciones.
- Consultar las fases anteriores y los cambios realizados.

### Seguimiento diario

- Registrar y corregir el agua ingerida, las horas y la puntuación de sueño, los pasos y el peso por fecha.
- Consultar el histórico de cada métrica.
- Mostrar el progreso respecto a objetivos configurables.
- Consultar medias y tendencias para facilitar el seguimiento.

### Experiencia de uso

- Priorizar una interfaz sencilla y cómoda en la pantalla del teléfono.
- Facilitar el registro cotidiano y la consulta de datos anteriores.
- Mantener los datos guardados entre sesiones.

## Evolución prevista

Estas ampliaciones quedan fuera del alcance inicial y se abordarán según las necesidades y la viabilidad técnica:

- **Migración de datos:** importar el histórico de Google Sheets, Excel o archivos CSV, definiendo antes el formato y la correspondencia de los campos.
- **Exportación:** permitir obtener una copia de los registros para utilizarlos en otras herramientas.
- **Integración con Garmin:** estudiar las opciones de acceso y sincronización de métricas del reloj, especialmente el sueño y los pasos.
- **Conexión con hojas de cálculo:** valorar el intercambio de datos con Google Sheets u otros archivos.
- **Varios usuarios:** incorporar cuentas independientes para que cada persona gestione sus propios datos y objetivos.
- **Nuevas funciones:** ampliar las métricas y el seguimiento relacionado con el entrenamiento cuando se concrete su alcance.

Las integraciones dependerán de las APIs, permisos y condiciones de acceso de cada servicio. Su inclusión en esta lista no implica que ya estén disponibles.

## Principios del proyecto

- **Personalización:** objetivos, dietas y parámetros editables.
- **Continuidad:** conservar la información histórica al cambiar de fase u objetivo.
- **Evolución gradual:** empezar por el registro personal y ampliar la aplicación según el uso real.
- **Privacidad:** tratar los registros de salud como información privada y prever la separación de datos si se añaden usuarios.
- **Control de los datos:** facilitar su consulta, corrección y, en futuras versiones, exportación.

## Decisiones pendientes

- Completar la instalación como PWA y el funcionamiento sin conexión; todavía no están disponibles en esta base técnica.
- Documentar las fórmulas, unidades y reglas de cálculo de la hoja actual.
- Diseñar las primeras pantallas y el flujo de registro diario.
- Concretar cómo trasladar el histórico y cuándo incorporar autenticación e integraciones.

El primer hito propuesto es poder registrar y consultar los datos personales desde el móvil, con persistencia y objetivos editables, como base para ir sustituyendo el uso cotidiano de la hoja de cálculo.


## Desarrollo local

Requisitos: Node.js 24 y npm.

```sh
npm ci
npm run dev
```

Abrir la URL indicada por Vite. Para acceder desde el teléfono en la misma red, usar `npm run dev -- --host 0.0.0.0` y la dirección de red indicada. El acceso depende de la red y el cortafuegos del equipo.

```sh
npm run lint       # Análisis estático
npm test           # Persistencia y validaciones
npm run build      # Comprobación de tipos y compilación
npx playwright install chromium
npm run test:e2e    # Recorridos en Chromium con tamaño móvil
npm run preview    # Servir la compilación localmente
```

### Qué se puede probar ahora

- En Hoy, seleccionar hoy o una fecha anterior y registrar agua (ml), sueño (duración en minutos y puntuación de 0 a 100), pasos y peso (kg).
- Editar los valores, borrar cada métrica con confirmación y comprobar su persistencia al recargar. Los campos vacíos son datos ausentes; cero es un valor registrado.
- Usar coma o punto decimal, sin separadores de miles. Los pasos y la duración del sueño se introducen como enteros.
- Añadir agua rápidamente a la fecha seleccionada. En Ajustes se configura la cantidad por pulsación.
- En Ajustes, configurar objetivos opcionales de agua, pasos, duración del sueño y peso de referencia. Cada versión empieza hoy o en una fecha futura; sustituir una versión con la misma fecha requiere confirmación. Dejar un objetivo vacío lo desactiva desde esa fecha.
- En Hoy, consultar los objetivos correspondientes a la fecha seleccionada.
- En Evolución, seleccionar métrica, periodos de 7/30/90 días y fecha final; navegar por periodos anteriores y siguientes.
- Consultar gráficas interactivas, medias, cobertura, rango y tabla de registros con enlaces para editar cada fecha. Para peso se muestran el cambio entre primer y último registro y una media móvil de siete días naturales.
- Comparar con los objetivos vigentes cada día. Agua, pasos y sueño tienen comparación de cumplimiento; el peso solo tiene una referencia visual. La puntuación del sueño no tiene objetivo.
- En Dieta → Mi dieta, crear fases con nombre, comidas y notas; escribir alimentos y cantidades en texto libre, editar y consultar fases independientes. El plan se presenta en tarjetas y no calcula nutrientes de los alimentos.
- En Dieta → Calculadora, calcular reposo con Mifflin–St Jeor, mantenimiento mediante PAL y calorías para mantenimiento, definición o volumen. El ajuste puede ser porcentual o en kcal.
- Elegir proteína y grasa en g/kg del peso de cálculo; los hidratos se calculan con las calorías restantes. Ver el desglose y avisos antes de guardar.
- Guardar objetivos nutricionales con fecha de inicio hoy o futura, consultar las revisiones y reutilizar parámetros. Las revisiones anteriores no se borran.
- La calculadora no añade calorías de pasos/ejercicio sobre PAL ni recalcula objetivos al registrar peso. El plan manual de comidas es independiente de los objetivos nutricionales.
- Consultar las fórmulas, ejemplos y límites en [docs/FORMULAS_NUTRICION.md](docs/FORMULAS_NUTRICION.md).
- Ver mensajes de error cuando falla el almacenamiento.

Los datos pertenecen al navegador y al origen (protocolo, dominio y puerto) usados. Abrir otra URL o borrar los datos del sitio no conserva la misma información. No hay copia de seguridad automática. Las gráficas no conectan los días sin registros; las medias excluyen los datos ausentes e incluyen los ceros. La media móvil del peso utiliza solo los registros de los últimos siete días naturales, incluidos los anteriores al periodo visible cuando corresponde. El cambio de peso del periodo no se presenta como una tasa semanal.

Los recursos de la aplicación aún necesitan conexión; el soporte sin conexión corresponde al hito H6.

### Organización

- `src/App.tsx`: estructura de navegación y primeras pantallas.
- `src/data/`: esquema versionado y repositorios de IndexedDB, con migración v1 a v2 que conserva las preferencias.
- `src/domain/`: reglas de fechas, valores y validación.
- `src/features/`: registro diario, objetivos básicos e histórico con gráficas SVG y tabla accesible.
- El esquema local v5 añade fases manuales con comidas y notas, conservando registros, objetivos y calculadora de versiones anteriores.
- `e2e/`: comprobaciones de navegación, persistencia y errores de escritura.
- `.github/workflows/ci.yml`: lint, pruebas, compilación y recorridos de navegador.


### Fases manuales de dieta

En la pestaña Dieta hay dos apartados: **Mi dieta** (`/#/dieta`) y **Calculadora** (`/#/dieta/calculadora`). Cada fase guarda un nombre, una lista de comidas y notas opcionales. Cada comida tiene un nombre y un texto libre para alimentos, cantidades y alternativas. Se conserva el orden de introducción y los saltos de línea.

La edición actualiza la fase seleccionada, sin crear un historial de revisiones de comidas. Se pueden quitar comidas del formulario y eliminar fases con confirmación. Duplicar fase crea una copia independiente con nombre y comidas propios, conservando el plan de origen. Los cambios solo se aplican al guardar; Cancelar permite descartarlos. No hay activación por fecha, catálogo de alimentos, cálculo nutricional, registro de consumo. Este alcance simplificado sustituye para esta entrega al editor avanzado inicialmente propuesto.


### Duplicar y comparar fases

- En Mi dieta, **Duplicar fase** guarda una copia y la selecciona. Usa **Editar fase** para preparar la nueva versión conservando la anterior. Cada copia tiene identificadores propios y conserva la correspondencia entre comidas para compararlas aunque se renombren.
- **Comparar fases** permite elegir referencia y comparada, intercambiarlas y mostrar solo comidas con cambios o todas. Muestra texto anterior y nuevo, comidas añadidas/eliminadas/modificadas, posición y cambios de notas. No interpreta cantidades ni calcula diferencias nutricionales.
- Entre fases independientes se emparejan comidas por nombre (ignorando mayúsculas y espacios exteriores); nombres repetidos se emparejan por aparición. Se comparan los contenidos actualmente guardados, no revisiones automáticas de cada edición. Las fases siguen siendo editables y eliminables de forma explícita.
- Las fases anteriores ya guardadas continúan funcionando. No se requiere cambiar el esquema v5: las referencias de copia son campos opcionales.
- Duplicar y comparar funciona sobre IndexedDB. Esto conserva planes, pero no instala la app ni habilita todavía su carga sin conexión: el service worker y el manifiesto PWA siguen pendientes.
