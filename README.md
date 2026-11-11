# Alpha · α

Aplicación personal con interfaz oscura, orientada al móvil para centralizar el seguimiento personal de la nutrición, los hábitos y la evolución física.

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

- En Registros, seleccionar hoy o una fecha anterior y registrar agua (ml), sueño (duración en minutos y puntuación de 0 a 100), pasos y peso (kg).
- Editar los valores, borrar cada métrica con confirmación y comprobar su persistencia al recargar. Los campos vacíos son datos ausentes; cero es un valor registrado.
- Usar coma o punto decimal, sin separadores de miles. Los pasos y la duración del sueño se introducen como enteros.
- Añadir agua rápidamente a la fecha seleccionada. En Registros → Objetivos y registro rápido se configura la cantidad por pulsación.
- En Registros → Objetivos y registro rápido, configurar objetivos opcionales de agua, pasos, duración del sueño y peso de referencia. Cada versión empieza hoy o en una fecha futura; sustituir una versión con la misma fecha requiere confirmación. Dejar un objetivo vacío lo desactiva desde esa fecha.
- En Registros, consultar los objetivos correspondientes a la fecha seleccionada.
- En Resumen, deslizar entre las cinco gráficas y elegir periodos de 7/30/90 días hasta hoy.
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


### Interfaz Alpha y navegación

Alpha utiliza un tema oscuro principal (negros y grises), acentos dorados y el símbolo griego α como marca e icono del navegador. No hay selector de tema por ahora.

1. **Resumen** (`/#/`): pantalla inicial con gráficas, medias, cobertura y consulta del histórico. Gráficas deslizables por métrica y selector compartido de 7/30/90 días, seguido de medias, rangos y registros.
2. **Registros** (`/#/registros`): agua, duración/calidad del sueño, pasos y peso por fecha. Al final, «Objetivos y registro rápido» agrupa los objetivos básicos y la cantidad del botón de agua.
3. **Dieta** (`/#/dieta`): Mi dieta y Calculadora, con edición, duplicación y comparación de fases.
4. **Ajustes** (`/#/ajustes`): espacio reservado para configuración futura, sin formularios ni información personal.

La antigua ruta `/#/evolucion` redirige al Resumen y los enlaces antiguos `/#/?date=…` abren el registro correspondiente. El nombre interno de IndexedDB se conserva para seguir accediendo a todos los datos existentes; el cambio de marca no requiere migración. Instalación PWA y carga sin conexión siguen pendientes.


### Resumen visual y paleta dorada

La paleta principal combina negro, gris y dorado tenue, incluido el icono α. Las cabeceras principales se limitan al nombre de cada pestaña.

Resumen abre directamente el carrusel de las cinco métricas: peso, puntuación del sueño, duración del sueño, pasos y agua. Se puede cambiar de gráfica deslizando horizontalmente, con flechas, indicadores o las flechas del teclado al enfocar el carrusel. El periodo de 7/30/90 días es común y siempre termina en el día actual al abrir la pantalla. Se han retirado los selectores de métrica y fecha y la navegación por periodos anteriores.

Bajo la gráfica se mantienen media, rango, días registrados/sin registrar y tabla del periodo, con enlace para editar cada fecha. El peso conserva su media móvil y el cambio entre extremos. Los controles del carrusel son accesibles y las diapositivas inactivas no capturan el foco.


### Tablas compactas y escala visual

Las tablas del Resumen muestran hasta cinco registros completos, con cabecera fija y desplazamiento vertical para acceder a los restantes. La altura se ajusta a las filas reales y al ancho de pantalla; no se recortan ni se eliminan registros.

Escala visual de puntuación del sueño: 90–100 rosa/fucsia, 80–<90 verde claro, 70–<80 verde oscuro, 60–<70 amarillo, 50–<60 marrón y 0–<50 rojo. El límite 90 pertenece al tramo rosa y el 80 al verde claro. Para agua y pasos se aplica la misma escala al porcentaje del objetivo vigente en cada fecha. La duración del sueño utiliza la puntuación de sueño de esa misma fecha, no su porcentaje de objetivo. Sin objetivo se usa color neutro; el peso también se mantiene neutro. Superar el 100 % no aumenta el nivel de color ni implica una recomendación de aumentar la cantidad. Cada tabla incluye una leyenda y conserva los valores numéricos.

Los acentos principales usan ahora amarillo brillante sobre negros y grises. El nombre Alpha se presenta más grande, en negrita y cursiva, con fuentes locales y sin descargas externas.


### Duración y calidad del sueño

La gráfica de puntuación tiene eje fijo de 0 a 100 (marcas 0/25/50/75/100). En la tabla de duración, la columna Calidad muestra la puntuación de la misma fecha y determina el color de la fila. Una duración sin puntuación queda neutra, aunque tenga objetivo.

La tarjeta de duración media conserva la media de todas las duraciones registradas del periodo, pero su color corresponde a la puntuación media de las noches del periodo con duración positiva y puntuación válidas. Se indica la puntuación y el número de noches emparejadas para no confundir la cobertura de ambos cálculos.

El rango personal es **observacional y exploratorio**, no una estimación clínica validada de las horas óptimas. Usa todo el histórico hasta hoy, requiere al menos 14 noches con ambos datos y una amplitud de puntuación de al menos 10 puntos. Selecciona el 25 % de noches mejor puntuadas (mínimo cinco, incluyendo todos los empates en el corte) y muestra los percentiles 25–75 de sus duraciones. Así se reduce el efecto de extremos sin asumir que dormir más siempre mejora la calidad. Si faltan datos o las puntuaciones son muy similares, no se propone un rango. Estos umbrales son decisiones de producto, no límites fisiológicos. El objetivo configurado no se modifica.


### Agua circular y medias coloreadas

El orden del Resumen es Peso → Puntuación del sueño → Duración del sueño → Pasos → Agua. Agua muestra un anillo de progreso acumulado con meta fija de 3000 ml por día: 21/90/270 litros para 7/30/90 días. El total incluye únicamente los registros existentes; los días sin registrar no reducen la meta. El círculo se limita al 100 %, conserva el total real y muestra la cobertura. Esta meta visual no sobrescribe los objetivos históricos configurados que aparecen en la tabla.

La media de puntuación del sueño utiliza su escala de puntos. La media de agua utiliza tramos absolutos: desde 3000 ml rosa/«Excelente», desde 2500 verde claro, desde 2000 verde oscuro, desde 1500 amarillo, desde 1000 marrón y por debajo rojo. La media continúa calculándose sobre los días registrados, con su cobertura visible; no se rellenan los días ausentes con ceros.

Se han retirado las notas de huecos y el texto «Eje ajustado» de las gráficas. El eje del peso conserva su escala adaptada, sin esa etiqueta.
