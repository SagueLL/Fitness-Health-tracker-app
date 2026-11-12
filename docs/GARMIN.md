# Investigación de Garmin para Alpha

Verificación de documentación pública y prueba sin credenciales: **12 de noviembre de 2026**. Esta entrega no incorpora conexión activa ni pide claves. No se han consultado datos de ninguna cuenta.

## Vía oficial para el uso personal

Garmin ofrece una **Personal API** para acceder a los datos de la propia cuenta. Encaja con el uso personal de Alpha. Una aplicación comercial para varias personas necesita valorar el programa empresarial, con sus condiciones y autorización propias.

Según la [FAQ oficial](https://developer.garmin.com/gc-developer-program/personal/personal-faq/), el usuario genera su clave desde Garmin Connect Web y elige una caducidad de 30, 90, 180 días o un año. La clave se muestra una vez y puede revocarse. Se intercambia por un token de acceso válido hasta 24 horas, o hasta que caduque la clave si ocurre antes. No hay refresh token: se solicita otro token con la clave personal.

La [guía de autenticación](https://developer.garmin.com/gc-developer-program/personal/personal-api/) documenta este intercambio:

```http
POST https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token
Authorization: ApiKey <clave-personal>
```

Las peticiones posteriores emplean el token según el esquema de seguridad de la API. La clave y el token no deben incluirse en el repositorio, archivos CSV, registros de diagnóstico o pruebas. No hace falta compartirlos en el chat para continuar el estudio.

## Métricas y correspondencia prevista

Base documentada: `https://personal.connectapi.garmin.com`. Fuente: [Swagger oficial de Personal API](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/), incluido su esquema OpenAPI embebido en el componente de la página.

| Métrica de Alpha | Endpoint GET | Datos y límites publicados |
| --- | --- | --- |
| Duración del sueño | `/sleep-service/sleep/dailySleepSummariesByDate?startDate=…&endDate=…` | Hasta 31 días. `calendarDate` y `sleepTimeSeconds`, que excluye las siestas; estas tienen un campo separado. |
| Puntuación del sueño | El mismo endpoint; `/sleep-service/sleep/dailySleep?date=…` para detalle | `sleepScores` contiene componentes con `value` de 0–100. Confirmar con una respuesta real la clave que representa la puntuación global; no confundirla con una clasificación textual o un componente. |
| Pasos | `/usersummary-service/stats/steps/daily/{startDate}/{endDate}` | Hasta 28 días. `calendarDate` y `totalSteps`. El objetivo se entrega aparte. |
| Agua | `/usersummary-service/stats/hydration/daily/{startDate}/{endDate}` | Hasta 31 días. `calendarDate` y `valueInML`. No sumar de nuevo `activityIntakeInML` ni sustituir consumo por sudor u objetivo. |
| Peso | `/weight-service/weight/range/{startDate}/{endDate}?includeAll=false` | Resúmenes con el último peso diario. `DateWeightDTO.weight` está documentado en **kg**. No se publica un máximo de días en la descripción consultada. |

Debe usarse la fecha de calendario proporcionada por Garmin, evitando convertirla a otro día mediante UTC. Para el sueño habrá que definir y probar la conversión de segundos a los minutos enteros de Alpha antes de implementar. La ausencia de un dato debe continuar siendo ausencia, sin convertirla en cero. Peso, hidratación y puntuación dependen de que existan registros y de las capacidades del dispositivo: tener un reloj no garantiza las cinco métricas.

No se han verificado con una cuenta real las respuestas, los límites efectivos de solicitudes, el alcance histórico accesible, las condiciones económicas ni la disponibilidad concreta para el usuario. No se presupone que exista una cuota gratuita ilimitada. La exportación CSV tampoco presupone un formato universal para todo Garmin: sus exportaciones de bienestar pueden incluir ZIP/FIT, que Alpha no importa en esta versión.

## Viabilidad desde la PWA: CORS pendiente

Prueba reproducible, sin clave, token ni información personal:

```sh
curl -i --max-time 20 -X OPTIONS \
  'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token' \
  -H 'Origin: https://alpha.example' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization'
```

Resultado observado: **HTTP 403**, sin `Access-Control-Allow-Origin`. La investigación previa obtuvo el mismo resultado con los orígenes `https://developer.garmin.com` y `http://localhost:4173`.

El navegador necesita autorización CORS para enviar estas peticiones con `Authorization`. El resultado impide prometer acceso directo desde el origen probado. No demuestra una política universal para todos los dominios: habrá que repetir la prueba desde la URL HTTPS definitiva y comprobar los endpoints de datos. Que `curl` funcione con una clave no demostraría por sí solo que funcione desde el navegador. `mode: no-cors` no permite leer estas respuestas.

No se incluye un proxy público, inicio de sesión no oficial ni servidor nuevo para sortear esta limitación.

## Siguiente decisión y criterios de una futura integración

1. Validar con Garmin el acceso desde el dominio definitivo, sus condiciones y las métricas disponibles para la cuenta y el dispositivo.
2. Si CORS permite la conexión directa, diseñar la custodia y revocación de credenciales. Si requiere un servidor intermediario, decidir antes alojamiento, coste, autenticación y almacenamiento de secretos. Este último cambio amplía la arquitectura actual.
3. Confirmar los campos con respuestas reales, la precisión del sueño y cómo tratar días todavía incompletos o corregidos posteriormente por Garmin. La política CSV de completar ausencias no basta para actualizar automáticamente un total de pasos que sigue creciendo.
4. Priorizar sincronización al abrir Alpha y mediante un botón manual, con rangos divididos según los límites de cada endpoint. Conservar las ediciones manuales mediante una política explícita de procedencia y conflictos. Probar expiración, revocación, falta de red, respuestas incompletas, límites y reintentos sin duplicados.
5. No prometer ejecución diaria con la PWA cerrada. La [API de sincronización periódica del navegador](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API) tiene disponibilidad limitada y su ejecución depende del navegador. Para horarios garantizados haría falta otra arquitectura.

El recorrido esperado sería reloj → Garmin Connect → API → Alpha. Los datos deben haberse sincronizado primero con Garmin. Esta versión entrega la investigación y el importador CSV; no muestra un botón de conexión que todavía no pueda funcionar.

Otras referencias oficiales: [programa Garmin Connect](https://developer.garmin.com/gc-developer-program/overview/) y [exportación de datos de Garmin Connect](https://support.garmin.com/en-SG/?faq=W1TvTPW8JZ6LfJSfK512Q8).
