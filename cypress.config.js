const { defineConfig } = require("cypress");
const { lighthouse, prepareAudit } = require("@cypress-audit/lighthouse");
const fs = require("fs");

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

//Toma los resultados de Lighthouse y arma un registro
function armarRegistro(resultado) {
  const lhr = resultado.lhr || resultado;
  return {
    url: lhr.requestedUrl,
    screenEmulation: lhr.configSettings.formFactor === "mobile"
      ? "Moto G (412x823)"
      : "Escritorio (1350x940)",
    timestamp: new Date().toISOString(),
    firstContentfulPaint: Math.round(lhr.audits["first-contentful-paint"].numericValue),
    largestContentfulPaint: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
    speedIndex: Math.round(lhr.audits["speed-index"].numericValue),
    performance: Math.round(lhr.categories.performance.score * 100),
    status: "ok",
    error: null,
  };
}

module.exports = defineConfig({
  taskTimeout: 180000, // Lighthouse tarda, así Cypress no corta la tarea
  env: { dispositivo: "todos" }, // <-- NUEVO: por defecto mide todos los dispositivos
  e2e: {
    video: false, // <-- CAMBIO: antes true; no hace falta grabar video en cada medición
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