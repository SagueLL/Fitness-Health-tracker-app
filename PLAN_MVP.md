# Plan de construcción del MVP

Estado: plan basado en el README actual. H1 implementado: base React/TypeScript/Vite, navegación móvil, esquema local v1 de preferencias y CI configurado. Verificado con lint, compilación, dos pruebas de persistencia y dos recorridos en Chromium móvil. El registro diario y el resto de funciones siguen pendientes. Confirmado el 8 de noviembre de 2026: uso personal desde un único teléfono y almacenamiento local. El resto de decisiones técnicas se mantiene como propuesta.

## 1. Resultado que buscamos

Una persona puede abrir la aplicación desde el móvil, configurar sus objetivos, registrar sus métricas, organizar su dieta y consultar su evolución sin depender de la hoja para el uso cotidiano.

El MVP estará completo cuando se pueda realizar este recorrido con datos persistentes:

1. Configurar unidades, parámetros personales y objetivos.
2. Introducir agua, sueño, pasos y peso de hoy o de una fecha anterior.
3. Corregir un dato y comprobar que el resumen y el histórico se actualizan.
4. Calcular un objetivo nutricional y guardarlo como una versión con fecha de inicio.
5. Crear una fase de dieta con comidas, cantidades y notas; duplicarla para preparar la siguiente.
6. Consultar registros y fases anteriores conservando los objetivos que correspondían a cada fecha.
7. Cerrar, reabrir y usar las funciones principales sin conexión después de la primera carga.

## 2. Alcance y límites

| Área | Incluido en el MVP | Después del MVP |
| --- | --- | --- |
| Uso | Una persona, un navegador/dispositivo, interfaz móvil en español | Cuentas, varios usuarios y sincronización entre dispositivos |
| Métricas | Registro manual, edición, eliminación e histórico de agua, sueño, pasos y peso | Garmin, sensores y nuevas métricas |
| Objetivos | Valores editables con vigencia temporal | Ajustes automáticos y recomendaciones |
| Nutrición | Calculadora documentada, objetivos y fases con comidas y alimentos escritos manualmente | Catálogo nutricional externo, escáner y diario de alimentos consumidos |
| Evolución | Gráficas sencillas, medias y comparación con objetivos | Informes avanzados y predicciones |
| Datos | Persistencia local y funcionamiento sin conexión | Importación del histórico, exportación de uso general y conexión con Sheets |

La dieta representa un plan de comidas, no un registro de lo que realmente se ha comido. El seguimiento del cumplimiento de la dieta queda fuera salvo que se acuerde expresamente.

## 3. Propuesta técnica

- **Formato:** web adaptable al móvil e instalable como PWA. Permite distribuir una primera versión mediante URL sin desarrollar aplicaciones nativas.
- **Interfaz:** React, TypeScript y Vite; navegación con React Router. CSS con variables de diseño y componentes pequeños reutilizables.
- **Persistencia:** IndexedDB con Dexie, esquema versionado y migraciones. `localStorage` solo para preferencias no críticas si hace falta.
- **Sin conexión:** service worker para los recursos de la aplicación; los datos personales permanecen en IndexedDB y no entran en la caché de recursos.
- **Cálculos:** funciones de dominio independientes de la interfaz y de la base de datos.
- **Gráficas:** biblioteca ligera elegida al implementar la pantalla de evolución, con alternativa textual accesible.
- **Validación:** Vitest para reglas y cálculos; Playwright para recorridos principales.
- **Publicación:** alojamiento estático con HTTPS, comprobación de compilación en CI y entorno de prueba antes de publicar.

No se necesita servidor para esta propuesta. Los datos quedan asociados al navegador y al origen de la aplicación: no aparecen automáticamente en otro dispositivo y se pueden perder si se borran los datos del sitio. Debe explicarse en la configuración. La PWA no garantiza almacenamiento permanente ni cifrado propio.

**Decisión confirmada:** el MVP será de uso personal desde el teléfono del propietario, con almacenamiento local. No incluye cuentas, servidor de datos, sincronización ni gestión de otros usuarios; estas ampliaciones quedan para mucho más adelante. La elección de almacenamiento ya no bloquea la base técnica. IndexedDB con Dexie se mantiene como propuesta concreta para implementarla. Una copia de seguridad con restauración sería una mejora posterior; todavía no se incluye en este MVP según el alcance del README.

## 4. Pantallas y recorridos

| Pantalla | Qué debe permitir |
| --- | --- |
| Configuración inicial | Explicar dónde se guardan los datos, elegir objetivos iniciales y completar solo los parámetros necesarios. Permitir comenzar el registro sin completar la calculadora. |
| Hoy | Ver la fecha seleccionada, tarjetas de métricas, objetivos y fase activa; añadir agua rápidamente y abrir la edición del resto de métricas. |
| Registro diario | Elegir fecha, crear/corregir valores, dejar métricas vacías y borrar un valor sin eliminar los demás. |
| Evolución | Elegir métrica y periodo; consultar gráfica, registros, media y progreso cuando exista objetivo. |
| Nutrición | Introducir parámetros, consultar cálculo desglosado y guardar una nueva versión del objetivo nutricional. |
| Dieta | Consultar fase activa, listar fases, crear/duplicar/editar una fase y ordenar comidas e ingredientes. |
| Ajustes | Cambiar preferencias y objetivos con fecha de vigencia; consultar la explicación del almacenamiento local. |

Navegación principal propuesta: Hoy, Evolución, Dieta y Ajustes; calculadora accesible desde Dieta. Formularios con etiquetas, errores junto al campo, teclado numérico adecuado y confirmación visible de guardado o fallo. Las acciones destructivas requieren confirmación.

## 5. Reglas funcionales que deben quedar explícitas

### Registro y objetivos

- Una entrada diaria por fecha local; cada métrica es opcional. Vacío significa «sin registrar» y nunca se convierte automáticamente en cero.
- Unidades del MVP: agua en ml (visualización opcional en litros), peso en kg, sueño en minutos (edición en horas/minutos), pasos enteros y energía en kcal; macros en gramos.
- Aceptar coma decimal en la entrada en español. Rechazar valores negativos, valores no finitos y pasos fraccionarios. Peso registrado debe ser mayor que cero; puntuación de sueño entre 0 y 100; duración diaria de sueño hasta 24 horas.
- Agua, pasos o sueño pueden ser cero. Guardar internamente cantidades sin redondeos acumulativos; redondear al presentar resultados.
- El botón de agua incrementa el total de la fecha seleccionada; una edición permite corregirlo. No es necesario guardar cada toma individual en el MVP.
- Las fechas de registro no pueden ser futuras. Objetivos y fases sí pueden programarse para una fecha futura.
- La fecha de registro es un día de calendario `YYYY-MM-DD`, sin convertirlo a UTC; las marcas de creación y edición son instantes UTC.
- Los objetivos tienen fecha de inicio. Para una fecha se utiliza la última versión cuyo inicio sea anterior o igual a ese día; sin versión aplicable se muestra «sin objetivo».
- Un cambio de objetivo crea una versión y conserva las anteriores. No admitir versiones duplicadas para la misma fecha sin una sustitución explícita. No ofrecer edición retroactiva silenciosa.

### Resúmenes

- Periodos iniciales: últimos 7 y 30 días, incluidos hoy; mostrar también los registros por fecha.
- Las medias solo incluyen días registrados y muestran su cobertura, por ejemplo, «6 de 7 días». Un cero registrado sí participa.
- Agua y pasos: porcentaje respecto al objetivo de cada día y días cumplidos sobre días registrados con objetivo. Mostrar aparte días pendientes, sin contarlos como cumplidos.
- Sueño: media de duración y media de puntuación calculadas por separado, porque pueden tener distinta cobertura.
- Peso: diferencia entre registros consecutivos; media móvil de los últimos 7 días con registros y comparación con los 7 días anteriores cuando ambos periodos tengan datos. No presentar esa comparación como una tasa semanal si faltan días.
- Si no hay suficientes datos, explicar qué falta y evitar porcentajes, medias o tendencias inventadas. Los valores atípicos se pueden confirmar; no deben generar diagnósticos.

### Calculadora nutricional

- Antes de programarla, documentar las fórmulas de la hoja, sus entradas, unidades, límites y ejemplos de referencia. No elegir otra fórmula y presentarla como equivalente sin validación.
- Precisar qué representa el factor de actividad, cómo se obtiene el mantenimiento, cómo se aplica definición/volumen y cómo se reparte cada macro.
- Decidir si cada ajuste es absoluto o porcentual y cómo se trata el peso objetivo y el peso de seguimiento. Para el MVP, recalcular a petición del usuario, sin modificar objetivos automáticamente al registrar peso.
- Comprobar que el reparto es válido; si se emplean factores energéticos 4/4/9, documentarlos y fijar una tolerancia explícita de redondeo para la suma de macros frente a las calorías.
- Guardar entradas, resultados y versión de fórmula junto al objetivo nutricional. Mostrar el desglose antes de aplicarlo.
- Mientras se valida la fórmula puede desarrollarse el registro con objetivos nutricionales introducidos manualmente. La calculadora validada sigue siendo necesaria para declarar terminado el alcance completo.

### Fases de dieta

- Una fase contiene nombre, fecha de inicio, comidas ordenadas, ingredientes con cantidad/unidad y notas. La siguiente fase determina el final de la anterior; no hay dos fases activas el mismo día.
- No exigir catálogo de alimentos. El usuario puede introducir nutrientes por ingrediente y por una cantidad base explícita, por ejemplo 100 g; el total se obtiene proporcionalmente a la cantidad planificada.
- Ingredientes sin información nutricional se permiten, pero los totales deben indicarse como incompletos, no como cero.
- Duplicar una fase crea una copia independiente. Una fase usada se conserva: para cambios de dieta se crea una nueva fase. Las correcciones históricas deben avisar de su efecto y registrar la modificación.
- Comparación mínima entre fases consecutivas: cambios en comidas, cantidades y totales nutricionales disponibles. No hace falta un sistema genérico de auditoría.
- Eliminar directamente solo borradores/fases futuras no utilizadas; conservar las fases históricas para mantener continuidad.

## 6. Modelo de datos inicial

| Entidad | Campos principales y restricciones |
| --- | --- |
| Preferencias | Idioma, unidades de visualización y cantidades de los botones rápidos de agua |
| Perfil | Parámetros personales necesarios según la fórmula elegida; no recopilar campos sin uso |
| RegistroDiario | Fecha única; aguaMl, suenoMinutos, puntuacionSueno, pasos y pesoKg opcionales; createdAt, updatedAt |
| Objetivos | ID, effectiveFrom, aguaMl, pasos, suenoMinutos, pesoObjetivoKg y variación semanal deseada opcionales; versión con valores completos, no parches |
| ObjetivoNutricional | ID, effectiveFrom, modalidad, entradas, calorías, macros, origen manual/calculado y formulaVersion |
| FaseDieta | ID, nombre, fechaInicio, notas, referencia a objetivo nutricional, createdAt, updatedAt |
| Comida | ID, faseId, nombre y orden |
| IngredientePlanificado | ID, comidaId, nombre, cantidad, unidad, cantidad/unidad base nutricional y nutrientes opcionales; orden |

Los nombres son orientativos. Encapsular lecturas/escrituras en repositorios y usar transacciones para guardar una fase con sus comidas e ingredientes. No introducir un servidor o abstracciones de sincronización mientras no se necesiten. Los datos nutricionales guardados son una instantánea: cambiar un objetivo no altera una fase anterior.

## 7. Backlog ordenado y criterios de aceptación

Cada hito debe dejar una parte utilizable; todos son necesarios para cerrar el MVP descrito en el README.

| Hito | Trabajo | Se acepta cuando… | Dependencias |
| --- | --- | --- | --- |
| H0. Cerrar reglas | Almacenamiento local confirmado; documentar fórmulas con ejemplos, acordar entradas de dieta y dibujar pantallas | Hay decisiones escritas y casos de cálculo verificables; las dudas pendientes están identificadas | Ninguna |
| H1. Base técnica | Crear proyecto, navegación, diseño móvil, capa de datos local, migración inicial, errores de almacenamiento y CI | Compila, se abre en móvil y un dato de prueba se conserva al recargar; un fallo de guardado se comunica | Almacenamiento decidido; puede avanzar mientras se completan las reglas nutricionales de H0 |
| H2. Registro diario | Configuración mínima, Hoy, selector de fecha y CRUD de las cinco métricas | Registrar, corregir y borrar valores funciona sin duplicar días ni convertir vacíos en cero; se conserva tras cerrar | H1 |
| H3. Objetivos e histórico | Versiones de objetivos, listas, gráficas y resúmenes | Cambiar un objetivo no modifica el progreso anterior; medias y cobertura coinciden con un conjunto de datos conocido | H2 |
| H4. Nutrición | Calculadora, validaciones, desglose y versiones de objetivos nutricionales | Los ejemplos validados de la hoja producen el resultado esperado dentro de la tolerancia documentada | H1 + fórmulas de H0 |
| H5. Dieta | Editor de fases/comidas/ingredientes, duplicación, totales y comparación | Se pueden usar dos fases sucesivas; ambas conservan cantidades y objetivos propios; los totales incompletos se señalan | H4 para vincular objetivos; editor puede avanzar desde H1 |
| H6. PWA y entrega | Instalación, caché, actualización, accesibilidad, pruebas móviles y publicación | Tras una primera carga se registra sin conexión; actualizar la app conserva datos; el recorrido completo funciona en la URL HTTPS | H2–H5 |

No se fija una fecha de entrega sin conocer la disponibilidad y haber resuelto las reglas pendientes de H0. Con el almacenamiento local confirmado, H1 ya puede comenzar mientras se concretan las fórmulas y la dieta; el primer incremento útil para uso cotidiano es H2.

## 8. Verificación necesaria

- **Dominio:** fórmulas con ejemplos independientes de la implementación, reparto de macros, fechas de vigencia, medias con datos ausentes/cero y límites temporales de fases.
- **Persistencia:** unicidad por día, transacciones, recuperación ante fallos de escritura y migraciones sin pérdida de datos.
- **Recorridos:** primera configuración → registro → recarga → edición de una fecha pasada → cambio de objetivo → consulta histórica; crear fase → duplicar → cambiar cantidades → comprobar que la anterior no cambia.
- **Móvil/PWA:** Chrome Android y Safari iOS, formulario con teclado abierto, ausencia de desplazamiento horizontal a 360 px, navegación por teclado, etiquetas y contraste; primera carga, modo avión y actualización con datos previos.
- **Entrega:** comprobación de tipos, pruebas pertinentes y build en CI; prueba manual del recorrido completo en el alojamiento de prueba. No publicar datos personales en repositorio, logs ni datos de demostración.

## 9. Decisiones confirmadas y pendientes

1. **Persistencia — confirmada:** uso personal desde un único teléfono y almacenamiento local. Las cuentas, otros usuarios y la sincronización quedan fuera del MVP y para mucho más adelante. No es necesario volver a decidir entre almacenamiento local y remoto para comenzar.
2. **Fórmulas:** disponer de las expresiones y de ejemplos de entrada/salida de la hoja. Es el bloqueo específico de la calculadora, no del registro diario.
3. **Dieta:** confirmar que el MVP necesita un plan de comidas con nutrientes introducidos manualmente, sin catálogo ni diario de consumo. Recomendación: sí.
4. **Copia de seguridad:** sigue fuera del alcance inicial según el README. La aceptación del almacenamiento local no implica que exista recuperación automática; copia/restauración se puede priorizar como mejora posterior sin cambiar la arquitectura local.

Estas decisiones no autorizan publicación ni conexión con servicios externos; concretan el trabajo que debe construirse y revisarse antes de entregar la aplicación.
