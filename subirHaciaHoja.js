const { google } = require("googleapis");
const fs = require("fs");

const idHoja = "181IRA0_I3NvSbbdBkKWNY0tgVl2fRhb-9WyhYMeZYD8";
const archivoJson = "cypress/fixtures/lighthouse-metrics.json";

// Convierte milisegundos a segundos
function aSegundos(ms) {
  return ms === null ? "" : ms / 1000;
}

async function subir() {
  const historial = JSON.parse(fs.readFileSync(archivoJson, "utf8"));

  // Usa la llave para entrar a Google
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const hojas = google.sheets({ version: "v4", auth });

  const encabezado = ["URL", "Dispositivo", "Fecha", "FCP (s)", "LCP (s)",
    "Speed Index (s)", "Performance", "Estado", "Error"];

  const filas = historial.map((r) => [
    r.url,
    r.screenEmulation,
    new Date(r.timestamp).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    aSegundos(r.firstContentfulPaint),
    aSegundos(r.largestContentfulPaint),
    aSegundos(r.speedIndex),
    r.performance === null ? "" : r.performance,
    r.status,
    r.error === null ? "" : r.error,
  ]);

  // Borra lo anterior y escribe todo el historial
  await hojas.spreadsheets.values.clear({
    spreadsheetId: idHoja,
    range: "'Hoja 1'!A:I",
  });
  await hojas.spreadsheets.values.update({
    spreadsheetId: idHoja,
    range: "'Hoja 1'!A1",
    valueInputOption: "RAW",
    requestBody: { values: [encabezado, ...filas] },
  });

  console.log("Hoja actualizada con " + filas.length + " registros");
}

subir().catch((e) => console.error("Error al subir a la hoja:", e.message));