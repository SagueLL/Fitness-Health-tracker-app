# Base de la calculadora nutricional

Estado: primera versión implementada, autorizada por el propietario, a partir del PDF «Arquitectura científica y fórmulas para una app de nutrición y fitness adaptativa», aportado por el propietario el 8 de noviembre de 2026. La calculadora está disponible en Dieta. Las funciones avanzadas del PDF siguen fuera de este desarrollo.

## Fuente y revisión

El PDF se utiliza como material de referencia. Sus recomendaciones de implementación no son por sí mismas decisiones de producto aprobadas. Sus citas aparecen como identificadores internos (`turn…search…`, `turn…view…`) sin bibliografía enlazada que permita comprobarlas directamente. El propietario confirma que las fuentes son fiables y autoriza implementar el núcleo descrito. No se ha realizado una comprobación bibliográfica independiente; la app identifica la ecuación y presenta estimaciones, sin inventar citas ni márgenes de confianza.

Fuentes mencionadas que deben localizarse: publicación original de Mifflin–St Jeor, Cunningham, Hall/NIDDK, posicionamiento sobre nutrición deportiva de ACSM/Academy/Dietitians of Canada e ISSN. No inventar enlaces, intervalos de confianza ni puntuaciones de fiabilidad.

## 1. Primer motor propuesto

La primera calculadora será manual y reproducible: estimación inicial, vista previa y guardado explícito. No cambiará objetivos al introducir un nuevo peso ni simulará adaptación automática.

### Entradas

- Peso de cálculo en kg, altura en cm y edad en años cumplidos. Guardar la edad usada en la instantánea; no es necesario recopilar fecha de nacimiento para este cálculo.
- Variante masculina o femenina de la ecuación de Mifflin; explicar que corresponde al coeficiente utilizado por esa ecuación, no a una clasificación de identidad.
- Factor de actividad PAL, editable y con explicación de que incluye la actividad y el entrenamiento habituales.
- Fase: mantenimiento, definición o volumen.
- Ajuste explícito en porcentaje o kcal/día, con una sola modalidad activa. Magnitud no negativa: la fase determina el signo. Mantenimiento aplica ajuste cero.
- Coeficientes de proteína y grasa en g/kg/día y peso de referencia de cada uno. En el primer desarrollo, usar el peso de cálculo como referencia explícita; no sustituirlo silenciosamente por peso objetivo o masa libre de grasa.

Los rangos operativos de entrada propuestos por el PDF son peso 30–300 kg, altura 120–230 cm y edad 18–100 años. Son límites de producto, no una demostración de validación científica en todo ese intervalo. El PDF sitúa la muestra de Mifflin en 19–78 años: distinguir población estudiada de límites del formulario y comunicar las extrapolaciones. No aplicar esta ruta general a menores ni presentarla como ruta para embarazo, lactancia o situaciones clínicas que requieren evaluación específica.

### Reposo: Mifflin–St Jeor

Con W en kg, H en cm y A en años:

- Variante masculina: `RMR = 10W + 6.25H - 5A + 5`.
- Variante femenina: `RMR = 10W + 6.25H - 5A - 161`.

Salida: kcal/día de gasto en reposo estimado. No confundir RMR y BMR medidos bajo condiciones experimentales diferentes.

### Mantenimiento: una sola vía

`TDEE = RMR × PAL`.

En esta vía no añadir después calorías de pasos, ejercicio, NEAT ni TEF. El factor ya representa el gasto total relativo al reposo. Los pasos registrados en la app no modificarán automáticamente las calorías.

Rangos orientativos del PDF, pendientes de verificación como guía de interfaz: 1.20–1.35 muy sedentario; 1.35–1.50 sedentario con movilidad; 1.50–1.65 moderadamente activo; 1.65–1.85 muy activo; 1.85–2.20 actividad elevada. No asignar automáticamente un factor a partir de los pasos ni tratar estos intervalos como constantes individuales.

### Calorías objetivo

- Mantenimiento: `E = TDEE`.
- Definición, ajuste absoluto: `E = TDEE - D`.
- Volumen, ajuste absoluto: `E = TDEE + S`.
- Definición, ajuste porcentual: `E = TDEE × (1 - d/100)`.
- Volumen, ajuste porcentual: `E = TDEE × (1 + s/100)`.

El ajuste es un parámetro elegido, no un déficit o superávit universal recomendado. Rechazar resultados no finitos o no positivos y configuraciones incoherentes. No predecir una fecha de llegada al peso objetivo usando una equivalencia fija de 7700 kcal/kg.

### Macronutrientes

Con coeficientes p y f elegidos explícitamente:

1. `P = W × p` gramos de proteína/día.
2. `F = W × f` gramos de grasa/día.
3. `C = (E - 4P - 9F) / 4` gramos de hidratos/día.
4. Comprobación: `E_macros = 4P + 9F + 4C`.

Los factores energéticos operativos son 4 kcal/g para proteína e hidratos y 9 kcal/g para grasa. No se modelan alcohol, fibra ni componentes de alimentos en esta calculadora de objetivos.

El PDF menciona proteína de 1.4–2.0 g/kg de peso en personas activas y grasa de 0.6–0.8 g/kg como regla operativa, además de comprobar el porcentaje energético. No trasladar estos rangos a límites universales ni aplicar las bandas de proteína por masa libre de grasa a kg de peso total.

Rechazar coeficientes no positivos y resultados de hidratos negativos. Si no caben las restricciones seleccionadas, explicar el conflicto y pedir cambiar los parámetros; no ajustar calorías o macros silenciosamente ni convertir un resultado negativo en cero. Cero hidratos es matemáticamente posible, pero no debe presentarse como una recomendación equilibrada automática. Los avisos fisiológicos y sus umbrales deben apoyarse en fuentes verificadas; consistencia aritmética no equivale a idoneidad clínica.

## 2. Presentación, persistencia y pruebas

- Mostrar por separado reposo, PAL, mantenimiento, ajuste y resultado de macros, con las unidades de cada entrada.
- Identificar el resultado como estimación. No añadir una banda porcentual de incertidumbre sin justificación.
- Mantener precisión completa en cálculos y almacenamiento. Mostrar calorías aproximadas redondeadas a 10 kcal y macros a 1 g. Los valores visibles redondeados pueden no sumar exactamente; explicarlo sin alterar las cifras internas.
- Verificar consistencia interna con tolerancia de coma flotante, por ejemplo `abs(E_macros - E) <= 1e-8 × max(1, abs(E))`. Esta tolerancia es numérica, no una medida de incertidumbre fisiológica.
- Guardar versiones independientes del objetivo nutricional: fecha de inicio, fecha de cálculo, método y versión de fórmula, entradas completas, pesos de referencia, resultados sin redondear y avisos. No mezclar esta entidad con los objetivos básicos de agua/pasos/sueño/peso existentes.
- No alterar registros ni objetivos anteriores al recalcular. Para la misma fecha se crea una revisión adicional tras confirmación, conservando la instantánea anterior; la revisión mayor es la vigente. La fase de dieta futura podrá referenciar una instantánea nutricional.

Casos de referencia para pruebas independientes:

| Caso | Operación | Resultado sin redondear |
| --- | --- | --- |
| Variante masculina; 100 kg, 175 cm, 40 años | `1000 + 1093.75 - 200 + 5` | RMR 1898.75 kcal/día |
| Caso anterior; PAL 1.30 | `1898.75 × 1.30` | TDEE 2468.375 kcal/día |
| Caso anterior; déficit 15 % | `2468.375 × 0.85` | Objetivo 2098.11875 kcal/día |
| Caso anterior; proteína 1.8 g/kg de peso y grasa 0.8 g/kg de peso | `P=180; F=80; C=(2098.11875-720-720)/4` | P 180 g; F 80 g; C 164.5296875 g |
| Variante femenina; 65 kg, 170 cm, 30 años | `650 + 1062.5 - 150 - 161` | RMR 1401.5 kcal/día |

El primer ejemplo del PDF usa proteína sobre **70 kg de masa libre de grasa**, dando 126 g, no sobre los 100 kg de peso. Si se reproduce ese caso avanzado: grasa 80 g y objetivo sin redondear 2098.11875 kcal producen 218.5296875 g de hidratos. El resultado distinto de la tabla anterior se debe al peso de referencia, no a una discrepancia de Mifflin.

Probar también las dos variantes, mantenimiento y ambos tipos de ajuste, reparto inviable, ceros/no finitos, coma decimal, precisión de redondeo, persistencia y conservación de objetivos previos.

## 3. Funciones del PDF aplazadas

- Cunningham/Katch–McArdle y composición corporal: requieren definir la procedencia de las mediciones y distinguir masa magra (LBM) de masa libre de grasa (FFM); no son términos intercambiables sin matices.
- Gasto por sesiones, MET, VO2, frecuencia cardiaca y wearables: necesitan un modelo de entrenamiento que la aplicación no tiene todavía.
- Separación explícita RMR/NEAT/EAT/TEF y adaptación metabólica: vía alternativa al PAL, no una suma adicional sobre el TDEE del primer motor.
- Recalibración de mantenimiento y modelo dinámico de Hall: todavía no se registra ingesta real. Un plan de dieta no equivale a lo consumido; el peso por sí solo no basta para inferir mantenimiento observado.
- Periodización de hidratos por entrenamiento, disponibilidad energética, optimización de comidas y predicción de peso.
- Micronutrientes, suplementos, hidratación por sudor y antropometría avanzada.

Estas funciones no son necesarias para entregar la calculadora inicial y no se incorporan al MVP por el solo hecho de figurar en el PDF.

## 4. Precisiones para futuros motores

- `MET × 3.5 × W / 200 × minutos` equivale a `1.05 × MET × W × horas`. La aproximación `MET × W × horas` del PDF difiere un 5 %. Son convenciones distintas: elegir y versionar una, sin probarlas como equivalentes exactas.
- Si se usa la conversión basada en oxígeno, el neto convencional coherente sería `(MET - 1) × 3.5 × W / 200 × minutos`. Restar 1 MET convencional tampoco garantiza restar exactamente el RMR individual.
- La regla `TEF ≈ 0.10 × ingesta` depende de la ingesta, no es automáticamente el 10 % de cualquier subtotal de gasto. La separación avanzada requiere definir cómo se resuelve esa dependencia.
- Las recomendaciones de líquidos totales de una guía no se pueden convertir sin más en un objetivo de agua bebida: los alimentos también aportan agua.
- No implementar un `confidence_score` clínico o un diagnóstico a partir de una jerarquía cualitativa de mediciones.

## 5. Siguiente implementación

Implementado: funciones puras de energía/macros, formulario móvil con vista previa y desglose, persistencia versionada y migración local v3 a v4. Coeficientes iniciales editables: proteína 1.6 g/kg, grasa 0.8 g/kg y PAL 1.55. Peso, altura, edad y variante se solicitan al usuario; no se inventan datos personales. Se conservan revisiones de una misma fecha y se pueden reutilizar parámetros del histórico. Validación: 22 pruebas de dominio/persistencia, ocho recorridos de navegador, lint y compilación. El siguiente hito son las fases y comidas; no hay adaptación automática ni diario de ingesta.
