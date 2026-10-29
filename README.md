# Automatización de métricas web

Proyecto de la Universidad Autónoma de Manizales (UAM). Evalúa automáticamente el rendimiento de páginas institucionales con Lighthouse, usando pruebas organizadas con Cypress. Los resultados se guardan en un JSON con historial, se clasifican, se actualizan en una hoja de cálculo de Google y se presentan en un informe web.

Repositorio: https://github.com/JuanSebastianLopez15/proyectoEnfasisCorte2

## Integrantes y páginas evaluadas

El grupo evalúa tres páginas institucionales. Maria Camila Prada Cortes es responsable de la página de la Biblioteca UAM, en https://www.autonoma.edu.co/biblioteca-uam. Juan Sebastian Lopez es responsable de la página de Paz y competitividad, en https://www.autonoma.edu.co/proyeccion/paz-y-competitividad. La tercera página, UAM Virtual, en https://www.autonoma.edu.co/uamvirtual, es trabajada de forma compartida por Maria Camila Prada Cortes y Juan Sebastian Lopez.

Cada página se mide en dos perfiles de dispositivo: móvil, con la emulación Moto G de 412 por 823, y escritorio, de 1350 por 940.

## Requisitos

Se necesita Node.js 22 (se recomienda la versión 22.19 o superior), Git y Google Chrome. Las mediciones deben hacerse con Chrome: con Microsoft Edge las pruebas pasan, pero Lighthouse no mide realmente y no se guarda ningún dato.

## Instalación

```bash
git clone git@github.com:JuanSebastianLopez15/proyectoEnfasisCorte2.git
cd proyectoEnfasisCorte2
npm install
```

## Estructura del proyecto

```
├── .github/workflows/
│   └── mediciones.yml    Flujo de GitHub Actions que ejecuta los jobs programados
├── config/
│   ├── pages.js          Páginas a evaluar
│   ├── devices.js        Perfiles de dispositivo (móvil, escritorio)
│   ├── thresholds.js     Umbrales de clasificación (Bueno / Por mejorar / Deficiente)
│   └── schedule.js       Jobs programados (móvil y escritorio, independientes)
├── scheduler/
│   └── ejecutar.js       Decide qué jobs tocan ahora y lanza Cypress
├── report/
│   ├── index.html        Informe web
│   ├── style.css         Estilos del informe
│   └── script.js         Lee el JSON y clasifica las métricas
├── cypress/
│   ├── e2e/rendimiento/lighthouse.cy.js   Prueba que mide con Lighthouse
│   ├── fixtures/lighthouse-metrics.json   Resultados e historial
│   └── support/                           Comandos y configuración de soporte
├── cypress.config.js     Configuración de Cypress y guardado del JSON
└── subirHaciaHoja.js     Sube el historial a Google Sheets
```

## Configuración

La lógica de las pruebas no se toca: todo se agrega editando los archivos de la carpeta config. La prueba recorre automáticamente todas las páginas y todos los dispositivos que estén configurados.

Para agregar una página se añade un elemento a config/pages.js con su identificador, nombre, dirección e integrante:

```javascript
{ id: "admisiones", nombre: "Admisiones", url: "https://...", integrante: "Nombre" }
```

Para agregar un dispositivo se añade un elemento a config/devices.js con su identificador, nombre, ancho, alto y tipo de pantalla, que puede ser mobile o desktop. El siguiente es solo un ejemplo ilustrativo, ese dispositivo no existe actualmente en el proyecto:

```javascript
{ id: "tablet", nombre: "Tablet (768x1024)", width: 768, height: 1024, formFactor: "mobile" }
```

Los umbrales de clasificación están en un solo lugar, config/thresholds.js, y se pueden modificar. Los tiempos se expresan en milisegundos y el puntaje de rendimiento de 0 a 100. Para el First Contentful Paint, una medición es buena hasta 1,8 segundos, por mejorar hasta 3 segundos y deficiente por encima. Para el Largest Contentful Paint, buena hasta 2,5 segundos, por mejorar hasta 4 y deficiente por encima. Para el Speed Index, bueno hasta 3,4 segundos, por mejorar hasta 5,8 y deficiente por encima. Para el puntaje de rendimiento, bueno de 90 a 100, por mejorar de 50 a 89 y deficiente de 0 a 49. Los intervalos no se solapan.

## Ejecución manual

Para medir todas las páginas en todos los dispositivos:

```bash
npx cypress run --browser chrome
```

Para medir un solo dispositivo o solo algunas páginas se usa el parámetro env con los identificadores definidos en config. Varias páginas se separan con el signo más:

```bash
npx cypress run --browser chrome --env dispositivo=movil
npx cypress run --browser chrome --env dispositivo=escritorio
npx cypress run --browser chrome --env dispositivo=movil,paginas=biblioteca+paz
```

Si el identificador de dispositivo no existe, una prueba de validación falla con un mensaje claro y no se guarda ninguna medición, de modo que un error de escritura no pasa desapercibido.

Un test en verde no garantiza que se midió. Conviene revisar que cada página tarde más de 10 segundos y que el JSON tenga registros nuevos.

## Resultados en JSON

Cada medición se agrega al final de cypress/fixtures/lighthouse-metrics.json sin borrar las anteriores, por lo que el archivo conserva todo el historial:

```json
{
  "url": "https://www.autonoma.edu.co/biblioteca-uam",
  "screenEmulation": "Moto G (412x823)",
  "timestamp": "2026-10-29T07:10:19.000Z",
  "firstContentfulPaint": 1222,
  "largestContentfulPaint": 1260,
  "speedIndex": 1388,
  "performance": 82,
  "status": "ok",
  "error": null
}
```

Los tiempos se guardan siempre como números en milisegundos y solo se convierten a segundos al mostrarlos en el informe y en la hoja. Si una evaluación falla, por ejemplo por un tiempo de espera agotado al cargar la página o porque Lighthouse no logra calcular el Largest Contentful Paint o el puntaje, el registro se guarda igualmente con estado error, las métricas que faltan en null y el mensaje del problema. Estos registros no se incluyen en los promedios del informe.

## Programación de ejecuciones

Los jobs se definen en config/schedule.js. Hay dos jobs independientes: movil-diario, que corre todos los días a las 7:00, y escritorio-diario, que corre todos los días a las 7:30, ambos en hora de Bogotá y con fecha de inicio el 30 de octubre de 2026. Cada job configura si está habilitado o no, su fecha de inicio, la hora, la zona horaria America/Bogota, la frecuencia (única, diaria o semanal), los días de la semana cuando la frecuencia es semanal, los dispositivos y las páginas que evalúa. Las páginas pueden ser todas o una lista de identificadores.

El archivo schedule.js solo contiene la configuración. Quien ejecuta los jobs es el programa scheduler/ejecutar.js, que lee esa configuración, calcula la fecha y hora actuales en la zona horaria de cada job y decide cuáles corresponden. Un job se considera pendiente durante los 30 minutos siguientes a su hora programada, y para cada uno se lanza Cypress una vez por dispositivo. Se puede probar a mano:

```bash
node scheduler/ejecutar.js --dry
node scheduler/ejecutar.js --forzar movil-diario
```

La primera orden solo muestra qué jobs corresponden en este momento, sin medir. La segunda ejecuta un job concreto sin importar la hora.

### Mecanismo: GitHub Actions

La ejecución programada se hace con GitHub Actions, definida en .github/workflows/mediciones.yml. El flujo se activa cada 30 minutos, en los minutos 7 y 37 de cada hora, y en cada activación ejecuta scheduler/ejecutar.js, que decide qué jobs corresponden. Se eligieron esos minutos y no la hora en punto porque GitHub suele retrasar más las tareas programadas a las horas exactas.

Como la decisión se toma dentro de ejecutar.js usando la zona horaria de cada job, las horas de schedule.js se escriben en hora de Bogotá y no hace falta convertirlas a UTC, aunque el cron de GitHub Actions use UTC internamente.

Después de medir, el flujo detecta si el JSON cambió, sube el historial completo a la hoja de cálculo y guarda el JSON actualizado en el repositorio con un commit automático. Esos pasos se ejecutan aunque alguna medición haya fallado, para que los errores también queden registrados.

Hay que tener en cuenta varias limitaciones. Las ejecuciones programadas de GitHub pueden retrasarse varios minutos y, bajo mucha carga, incluso omitirse; la ventana de 30 minutos tolera retrasos moderados pero no todos. El cron solo corre desde la rama principal del repositorio, y el botón de ejecución manual también aparece solo allí.

Para ejecutar un job a mano, se entra a la pestaña Actions, se elige Mediciones programadas, se pulsa Run workflow y se escribe el identificador del job, por ejemplo movil-diario o escritorio-diario.

### Configuración necesaria en GitHub

La subida a la hoja usa una cuenta de servicio de Google. Su archivo de credenciales no está en el repositorio, ya que credentials.json figura en el archivo .gitignore. Se guarda como secreto del repositorio con el nombre GOOGLE_CREDENTIALS, en Settings, Secrets and variables, Actions. La hoja de cálculo debe estar compartida como editor con el correo de la cuenta de servicio. El workflow necesita además permiso de escritura sobre el repositorio, que se define en el propio archivo.

## Google Sheets

El archivo subirHaciaHoja.js reemplaza el contenido de la hoja con todo el historial del JSON, con los tiempos convertidos a segundos. Para usarlo a mano se crea una cuenta de servicio en Google Cloud, se descarga su llave como credentials.json en la raíz del proyecto, se comparte la hoja con el correo de la cuenta de servicio como editor y se ejecuta:

```bash
node subirHaciaHoja.js
```

El archivo credentials.json está en .gitignore y nunca se sube al repositorio.

En el flujo programado, la hoja se actualiza sola después de cada ejecución. Tiene formato condicional con los mismos umbrales de clasificación, y cada valor muestra además del color un símbolo distinto para bueno, por mejorar y deficiente, de modo que la clasificación no depende solo del color. Las mediciones con error dejan vacías las celdas de métricas y quedan sin clasificar.

## Informe web

El informe está en la carpeta report y lee directamente el JSON vigente. Muestra tarjetas de resumen con el número de mediciones, los errores, la fecha de la última actualización y los casos de mejor y peor rendimiento. Muestra también la última medición de cada página en cada dispositivo, con los tiempos en segundos y una etiqueta con símbolo para Bueno, Por mejorar o Deficiente, una comparación del rendimiento promedio entre móvil y escritorio, una sección con los errores registrados, y el historial completo con filtro por dispositivo. Los umbrales se leen de config/thresholds.js, así que se mantienen en un solo lugar.

Los navegadores no permiten leer el JSON abriendo el archivo con doble clic, por lo que hay que servirlo con un servidor local, desde la raíz del proyecto:

```bash
npx http-server -p 8080 -c-1
```

y abrir en el navegador http://localhost:8080/report/index.html

## Notas sobre las mediciones

Las mediciones varían según la máquina y la conexión. En las pruebas, el puntaje de rendimiento de una misma página fue notablemente distinto entre un computador personal y el servidor de GitHub Actions: el mismo sitio dio entre 50 y 56 en un computador y entre 66 y 81 en otro. Para comparar, se recomienda usar condiciones equivalentes y repetir las ejecuciones. Las mediciones oficiales son las del flujo programado, porque siempre usan el mismo entorno.

En Paz y competitividad, en móvil, Lighthouse no pudo calcular el Largest Contentful Paint en varias ejecuciones. En la Biblioteca UAM, varias mediciones hechas desde GitHub Actions fallaron por tiempo de espera agotado al cargar la página. Estos registros quedan guardados como error y no entran en los promedios. Por eso un paso del flujo puede aparecer en rojo aunque el resto del proceso, incluido el guardado y la subida a la hoja, haya terminado bien.

## Evidencias

Se adjuntan, dentro de la carpeta evidencias o como enlaces: la ejecución de los dos jobs independientes de móvil y de escritorio en la pestaña Actions de GitHub, las filas de ambos dispositivos en la hoja de cálculo con su clasificación, una captura del informe web y el historial de commits de cada integrante. COMPLETAR con las rutas o los enlaces.

## Flujo de trabajo con Git

La rama main contiene la versión estable, develop sirve para integrar el trabajo y cada integrante trabaja en su propia rama, por ejemplo feature/kami y feature/lopez. Cada integrante aporta commits propios, verificables en el historial del repositorio.

## Análisis y recomendaciones

Este análisis se basa en las mediciones de prueba realizadas hasta ahora y debe actualizarse con el historial acumulado por el flujo programado.

En las mediciones válidas, el First Contentful Paint, el Largest Contentful Paint y el Speed Index de las tres páginas se mantuvieron en el rango bueno, con tiempos de alrededor de 1 a 2 segundos. La métrica que marca la diferencia es el puntaje de rendimiento, que osciló entre 50 y 91 según la página, el dispositivo y la máquina que hizo la medición, y estuvo casi siempre en el rango por mejorar. COMPLETAR con la página de mejor y peor rendimiento y la diferencia entre móvil y escritorio, usando el historial final.

Como recomendaciones, se sugiere revisar en Paz y competitividad qué elemento debería ser el contenido principal para que se pueda medir su Largest Contentful Paint, revisar el tiempo de respuesta del servidor de la Biblioteca UAM ante conexiones externas, y atender las oportunidades que Lighthouse reporta para subir el puntaje de rendimiento, como optimizar imágenes y reducir el código que bloquea la carga. COMPLETAR con recomendaciones específicas tras revisar el informe de Lighthouse de cada página.