const paginas = require("../../../config/pages");
const dispositivos = require("../../../config/devices");

// Se pone 0 para que el test no falle por un puntaje bajo: solo queremos medir
const sinMinimos = { performance: 0, accessibility: 0, "best-practices": 0, seo: 0 };

dispositivos.forEach((dispositivo) => {
  paginas.forEach((pagina) => {
    describe(`${pagina.nombre} - ${dispositivo.nombre}`, () => {
      it("mide el rendimiento con Lighthouse", () => {
        cy.viewport(dispositivo.width, dispositivo.height);
        cy.visit(pagina.url);

        cy.lighthouse(sinMinimos, {}, {
          extends: "lighthouse:default",
          settings: {
            formFactor: dispositivo.formFactor,
            screenEmulation: {
              mobile: dispositivo.formFactor === "mobile",
              width: dispositivo.width,
              height: dispositivo.height,
              deviceScaleFactor: 1,
              disabled: false,
            },
          },
        });
      });

      afterEach(function () {
        if (this.currentTest.state === "failed") {
          cy.task("guardarError", {
            url: pagina.url,
            screenEmulation: dispositivo.nombre,
            timestamp: new Date().toISOString(),
            firstContentfulPaint: null,
            largestContentfulPaint: null,
            speedIndex: null,
            performance: null,
            status: "error",
            error: this.currentTest.err.message,
          });
        }
      });
    });
  });
});