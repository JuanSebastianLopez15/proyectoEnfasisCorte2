const { defineConfig } = require("cypress");
const { lighthouse, prepareAudit } = require("@cypress-audit/lighthouse");
const fs = require("fs");
const dispositivos = require("./config/devices");
const archivo = "cypress/fixtures/lighthouse-metrics.json";

// Agrega un registro al JSON 
function guardar(registro) {
  let historial = [];
  if (fs.existsSync(archivo)) {
    historial = JSON.parse(fs.readFileSync(archivo, "utf8"));
  }
  historial.push(registro);
  fs.writeFileSync(archivo, JSON.stringify(historial, null, 2));
}


// busca en config/devices.js el dispositivo que coincide con lo que midió Lighthouse
function nombreDispositivo(lhr) {
  const emu = lhr.configSettings.screenEmulation || {};
  const encontrado = dispositivos.find(
    (d) =>
      d.formFactor === lhr.configSettings.formFactor &&
      d.width === emu.width &&
      d.height === emu.height
  );
  // Si no coincide, guarda lo medido en lugar de un nombre equivocado
  return encontrado
    ? encontrado.nombre
    : `${lhr.configSettings.formFactor} (${emu.width}x${emu.height})`;
}



//Toma los resultados de Lighthouse y arma un registro
function armarRegistro(resultado) {
  // Informe completo de Lighthouse (el plugin lo entrega en .lhr o directo)
  const lhr = resultado.lhr || resultado;

  // Elemento más grande pintado, en ms (puede venir vacío si Lighthouse no lo detecta)
  const lcp = lhr.audits["largest-contentful-paint"].numericValue;

  // Puntaje general de 0 a 1 (null si Lighthouse no pudo calcularlo)
  const score = lhr.categories.performance.score;

  return {
    url: lhr.requestedUrl,
    screenEmulation: nombreDispositivo(lhr),
    timestamp: new Date().toISOString(),
    firstContentfulPaint: Math.round(lhr.audits["first-contentful-paint"].numericValue),
    largestContentfulPaint: Math.round(lcp),
    speedIndex: Math.round(lhr.audits["speed-index"].numericValue),

    // Si no hay puntaje guarda null; antes se guardaba 0, que parecía una página lenta
    performance: score == null ? null : Math.round(score * 100),

    // Si falta el LCP o el puntaje, la medición no es válida y se marca como error
    status: (lcp == null || score == null) ? "error" : "ok",

    // Mensaje que explica el error (null cuando la medición es válida)
    error: (lcp == null || score == null)
      ? "Lighthouse no pudo calcular LCP o el puntaje de performance"
      : null,
  };
}

module.exports = defineConfig({
  taskTimeout: 180000, // Lighthouse tarda, así Cypress no corta la tarea
  env: { dispositivo: "todos" }, // por defecto mide todos los dispositivos
  e2e: {
    video: false, //no hace falta grabar video en cada medición
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser = {}, opciones) => {
        prepareAudit(opciones);
      });
      on("task", {
        //guarda el registro
        lighthouse: lighthouse((resultado) => {
          guardar(armarRegistro(resultado));
        }),
        // Si una medición falla, se guarda un registro con el error
        guardarError(registro) {
          guardar(registro);
          return null;
        },
      });
    },
  },
});