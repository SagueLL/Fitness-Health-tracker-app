# Importar el histórico en Alpha

En **Ajustes → Importar CSV** puedes incorporar agua, duración y puntuación del sueño, pasos y peso. Funciona sin conexión una vez preparada la PWA. El archivo se lee y procesa en tu dispositivo; no se envía a ningún servidor.

## Preparar y revisar

1. Exporta tu hoja como **CSV UTF-8**, con una primera fila de nombres de columna únicos. Se detectan coma, punto y coma o tabulador. Se admiten campos entrecomillados y saltos de línea dentro de ellos.
2. Selecciona el archivo y asigna la columna de fecha y las métricas que quieras importar. Las demás columnas se ignoran. Cada campo debe usar una columna distinta.
3. Elige el formato de fecha y el separador decimal que utiliza el archivo. Configura las unidades del agua y el formato de duración del sueño.
4. Pulsa **Revisar importación**. Corrige cualquier error indicado por fila y columna; un error bloquea todo el archivo. Se muestran hasta 100 errores a la vez.
5. Revisa los recuentos, las primeras 20 fechas y las diferencias con datos existentes. Pulsa **Importar datos** para guardar. Antes de ese paso no se modifica ningún registro.

La [plantilla descargable](../public/plantilla-registros.csv) utiliza punto y coma, fechas `YYYY-MM-DD`, coma decimal, agua en ml y sueño en `HH:mm`. Sus filas son ejemplos: reemplázalas por tus datos. La plantilla también está disponible desde Ajustes sin conexión.

## Formatos y límites

| Campo | Formato |
| --- | --- |
| Fecha | `YYYY-MM-DD`, `DD/MM/YYYY` o `MM/DD/YYYY`, elegido explícitamente. No se admiten fechas imposibles ni futuras. |
| Agua | Mililitros o litros, sin unidades dentro de la celda. Valor no negativo. |
| Duración del sueño | Minutos enteros, horas decimales que equivalgan a minutos enteros, o `HH:mm`. Entre 0 y 1440 minutos. |
| Puntuación del sueño | Número entre 0 y 100. |
| Pasos | Entero no negativo. |
| Peso | Número positivo en kg. |

No uses separadores de miles ni notación científica. Por ejemplo, para dos mil quinientos escribe `2500`; para siete horas y media utiliza `07:30`, `450` o `7,5` según el formato elegido. `HH:mm` exige dos dígitos para cada parte; `24:00` es válido y `24:01` no.

Un vacío representa un dato ausente, mientras que `0` es un dato registrado cuando la métrica lo permite. Las filas sin valores en las métricas seleccionadas se omiten, pero sus fechas también deben ser válidas. Los límites son **10 MiB y 50.000 filas de datos**, excluyendo cabeceras y líneas vacías. No se importan dietas, objetivos, preferencias, archivos ZIP ni FIT.

## Duplicados y datos existentes

- Dentro del archivo, las filas de una misma fecha se combinan si son idénticas o aportan métricas complementarias. Dos valores distintos para la misma fecha y métrica bloquean la importación.
- En la base local, solo se completan valores ausentes. Los que ya existen se conservan, también los ceros. Las diferencias se muestran en la previsualización, con las filas de origen.
- Al confirmar, se vuelven a leer los datos dentro de una única transacción. Un cambio guardado desde otra pestaña después de revisar el archivo también se conserva. El resultado final puede diferir de la previsualización por este motivo.
- Si falla una escritura, se revierte toda la importación. Puedes volver a intentarlo. Repetir el mismo archivo no duplica registros ni modifica sus fechas de actualización si no añade valores.

La importación mantiene el esquema v5 y el nombre de IndexedDB. Los registros anteriores no necesitan migración. En Registros, el sueño se introduce y edita como `HH:mm`, pero sigue almacenándose en minutos; las gráficas mantienen la presentación de horas y minutos.

Los datos pertenecen al dispositivo y al origen de la web. Esta función incorpora información; no crea una copia de seguridad ni sincroniza dispositivos.
