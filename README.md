# Fitness & Health Tracker

Aplicación orientada al móvil para centralizar el seguimiento personal de la nutrición, los hábitos y la evolución física.

El proyecto nace de una hoja de cálculo de Google Sheets utilizada para registrar estos datos manualmente. La idea es trasladar esa forma de organizar la información a una interfaz propia, cómoda de usar desde el teléfono y preparada para incorporar nuevas funciones con el tiempo.

## Estado del proyecto

En fase de definición. Este README recoge la visión y el alcance propuesto; las funcionalidades descritas todavía no están implementadas. La tecnología y las instrucciones de instalación se definirán cuando comience el desarrollo.

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

- Elegir el formato de la aplicación: web adaptable al móvil, PWA o aplicación nativa.
- Definir las tecnologías y el almacenamiento, incluido el posible uso sin conexión.
- Documentar las fórmulas, unidades y reglas de cálculo de la hoja actual.
- Diseñar las primeras pantallas y el flujo de registro diario.
- Concretar cómo trasladar el histórico y cuándo incorporar autenticación e integraciones.

El primer hito propuesto es poder registrar y consultar los datos personales desde el móvil, con persistencia y objetivos editables, como base para ir sustituyendo el uso cotidiano de la hoja de cálculo.
