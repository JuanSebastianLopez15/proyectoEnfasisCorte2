# Automatización de métricas web

Proyecto de la Universidad Autónoma de Manizales (UAM). Evalúa automáticamente el rendimiento de páginas institucionales con **Lighthouse**, usando pruebas organizadas con **Cypress**, y guarda los resultados en un JSON con historial.

## Integrantes y páginas evaluadas

| Integrante | Página | URL |
|---|---|---|
| Maria Camila Prada Cortes | Biblioteca UAM | https://www.autonoma.edu.co/biblioteca-uam |
| Juan Sebastian Lopez | Paz y competitividad | https://www.autonoma.edu.co/proyeccion/paz-y-competitividad |
| ( Maria Camila Prada Cortes, Juan Sebastian Lopez) | UAM Virtual | https://www.autonoma.edu.co/uamvirtual |

Cada página se mide en dos perfiles: **Moto G (412x823)** y **Escritorio (1350x940)**.

## Requisitos

- **Node.js 22** (recomendado 22.19 o superior).
- **Google Chrome**. Las mediciones deben hacerse con Chrome: con Edge los tests pasan pero Lighthouse no mide.
- **Git**.

## Instalación

```bash
git clone git@github.com:JuanSebastianLopez15/proyectoEnfasisCorte2.git
cd proyectoEnfasisCorte2
npm install
```

## Estructura del proyecto

```
├── config/
│   ├── pages.js          Páginas a evaluar
│   ├── devices.js        Perfiles de dispositivo (móvil, escritorio)
│   ├── thresholds.js     Umbrales de clasificación (Bueno / Por mejorar / Deficiente)
│   └── schedule.js       Jobs programados (móvil y escritorio, independientes)
├── scheduler/
│   └── ejecutar.js       Decide qué jobs tocan ahora y lanza Cypress
├── cypress/
│   ├── e2e/rendimiento/lighthouse.cy.js   Prueba que mide con Lighthouse
│   ├── fixtures/lighthouse-metrics.json   Resultados e historial
│   └── support/                           Comandos y configuración de soporte
├── cypress.config.js     Configuración de Cypress y guardado del JSON
└── subirHaciaHoja.js     Sube el historial a Google Sheets
```

## Configuración

La lógica de las pruebas no se toca: todo se agrega editando los archivos de `config/`.

**Agregar una página** (`config/pages.js`):

```javascript
{ id: "admisiones", nombre: "Admisiones", url: "https://...", integrante: "Nombre" }
```

**Agregar un dispositivo** (`config/devices.js`):

```javascript
{ id: "tablet", nombre: "Tablet (768x1024)", width: 768, height: 1024, formFactor: "mobile" }
```

**Cambiar los umbrales** (`config/thresholds.js`): los tiempos están en milisegundos y el puntaje de 0 a 100. Es el único lugar donde se definen los límites.

| Métrica | Bueno | Por mejorar | Deficiente |
|---|---|---|---|
| FCP | ≤ 1,8 s | > 1,8 s y ≤ 3 s | > 3 s |
| LCP | ≤ 2,5 s | > 2,5 s y ≤ 4 s | > 4 s |
| Speed Index | ≤ 3,4 s | > 3,4 s y ≤ 5,8 s | > 5,8 s |
| Performance | 90–100 | 50–89 | 0–49 |

## Ejecución manual

Medir todas las páginas en todos los dispositivos:

```bash
npx cypress run --browser chrome
```

Medir solo un dispositivo o solo algunas páginas (los ids salen de `config/devices.js` y `config/pages.js`):

```bash
npx cypress run --browser chrome --env dispositivo=movil
npx cypress run --browser chrome --env dispositivo=escritorio
npx cypress run --browser chrome --env dispositivo=movil,paginas=biblioteca+paz
```

Si el id del dispositivo no existe, el test de validación falla y no se guarda nada.

> Un test en verde no garantiza que se midió. Revisa que cada página tarde más de 10 segundos y que el JSON tenga registros nuevos.

## Resultados (JSON)

Cada medición se agrega a `cypress/fixtures/lighthouse-metrics.json`, sin borrar el historial:

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

- Los tiempos están en **milisegundos** y se convierten a segundos solo al mostrarlos.
- Si Lighthouse no puede calcular el LCP o el puntaje, el registro se guarda con `"status": "error"`, las métricas faltantes en `null` y un mensaje en `error`.

## Programación de ejecuciones

Los jobs se definen en `config/schedule.js`. Hay dos independientes, uno para móvil y otro para escritorio. Cada job configura:

| Campo | Descripción |
|---|---|
| `habilitado` | `true` o `false` |
| `fechaInicio` | Fecha desde la cual corre (AAAA-MM-DD) |
| `hora` | Hora de ejecución (HH:MM) |
| `zonaHoraria` | `America/Bogota` |
| `frecuencia` | `unica`, `diaria` o `semanal` |
| `diasSemana` | Para `semanal`: 0 = domingo ... 6 = sábado |
| `dispositivos` | Ids de `config/devices.js` |
| `paginas` | `"todas"` o lista de ids de `config/pages.js` |

`config/schedule.js` solo configura. El script `scheduler/ejecutar.js` lee ese archivo, calcula la hora actual en la zona horaria del job, decide qué jobs tocan (hasta 30 minutos después de su hora) y lanza Cypress para cada uno.

```bash
node scheduler/ejecutar.js --dry                    # muestra qué jobs tocan, sin medir
node scheduler/ejecutar.js --forzar movil-diario    # ejecuta un job sin importar la hora
```

> **Pendiente:** documentar el mecanismo que ejecuta `ejecutar.js` periódicamente (GitHub Actions o node-cron): cómo se inicia, cómo se mantiene activo, y la nota de que los servicios programados pueden retrasarse y que el cron de GitHub Actions usa UTC (Bogotá es UTC−5).

## Google Sheets

`subirHaciaHoja.js` reemplaza el contenido de la hoja con todo el historial del JSON (tiempos convertidos a segundos).

1. Crea una cuenta de servicio en Google Cloud y descarga su llave como `credentials.json` en la raíz del proyecto.
2. Comparte la hoja de cálculo con el correo de la cuenta de servicio (`client_email`) como editor.
3. Ejecuta:

```bash
node subirHaciaHoja.js
```

`credentials.json` está en `.gitignore`: **nunca se sube al repositorio**.

## Informe web

> **Pendiente:** describir cómo abrir el informe, qué muestra (URL, fecha, dispositivo, métricas, comparaciones, errores) y cómo clasifica cada métrica con etiquetas.

## Notas sobre las mediciones

- Las mediciones varían según la máquina y la conexión: el mismo sitio dio `performance` de 50 a 56 en un computador y de 66 a 81 en otro. Para comparar, usar condiciones equivalentes y repetir ejecuciones.
- En Paz y competitividad (móvil), Lighthouse no pudo calcular el LCP en algunas ejecuciones. Esos registros quedan como `error` y no deben entrar en los promedios.

## Flujo de trabajo con Git

- `main`: versión estable.
- `develop`: integración.
- `feature/<nombre>`: ramas de trabajo de cada integrante.

Cada integrante trabaja en su rama y aporta commits propios.

## Análisis y recomendaciones

> **Pendiente:** mejor y peor rendimiento, diferencias entre móvil y escritorio, y recomendaciones de mejora, con base en el historial real de mediciones.