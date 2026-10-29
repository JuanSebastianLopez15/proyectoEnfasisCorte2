const RUTA_JSON = "../cypress/fixtures/lighthouse-metrics.json";
const UMBRALES = module.exports; // viene de config/thresholds.js
const TEXTO = { bueno: "✔ Bueno", mejorar: "▲ Por mejorar", deficiente: "✖ Deficiente" };

// Evita que un texto del JSON se interprete como HTML
function esc(t) {
  const d = document.createElement("div");
  d.textContent = t == null ? "" : t;
  return d.innerHTML;
}

function fecha(ts) {
  return new Date(ts).toLocaleString("es-CO", { timeZone: "America/Bogota" });
}

function nombrePagina(url) {
  return new URL(url).pathname;
}

// Devuelve "bueno", "mejorar" o "deficiente" según los umbrales
function clasificar(metrica, valor) {
  const u = UMBRALES[metrica];
  if (metrica === "performance") {
    if (valor >= u.bueno) return "bueno";
    if (valor >= u.mejorar) return "mejorar";
    return "deficiente";
  }
  if (valor <= u.bueno) return "bueno";
  if (valor <= u.mejorar) return "mejorar";
  return "deficiente";
}

// Celda con el valor (en segundos) y su etiqueta
function celda(metrica, valor) {
  if (valor == null) return "—";
  const clase = clasificar(metrica, valor);
  const mostrado = metrica === "performance" ? valor : (valor / 1000).toFixed(2) + " s";
  return mostrado + '<span class="etiqueta ' + clase + '">' + TEXTO[clase] + "</span>";
}

function tarjeta(titulo, valor, detalle) {
  return '<div class="tarjeta"><small>' + titulo + "</small><b>" + valor + "</b><small>" + (detalle || "") + "</small></div>";
}

function pintar(datos) {
  datos.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const buenos = datos.filter((d) => d.status === "ok");
  const errores = datos.filter((d) => d.status !== "ok");

  // Agrupar por página + dispositivo (solo mediciones válidas)
  const grupos = {};
  buenos.forEach((d) => {
    const k = d.url + "|" + d.screenEmulation;
    if (!grupos[k]) grupos[k] = { url: d.url, dispositivo: d.screenEmulation, registros: [] };
    grupos[k].registros.push(d);
  });
  const lista = Object.values(grupos).map((g) => {
    const suma = g.registros.reduce((s, r) => s + r.performance, 0);
    g.promedio = Math.round(suma / g.registros.length);
    g.ultima = g.registros[g.registros.length - 1];
    return g;
  });

  // Tarjetas de resumen
  let html = tarjeta("Mediciones", datos.length, buenos.length + " válidas");
  html += tarjeta("Errores", errores.length, "no entran en los promedios");
  if (datos.length) {
    html += tarjeta("Última actualización", fecha(datos[datos.length - 1].timestamp).split(",")[0], "");
  }
  if (lista.length) {
    const mejor = lista.reduce((a, b) => (b.promedio > a.promedio ? b : a));
    const peor = lista.reduce((a, b) => (b.promedio < a.promedio ? b : a));
    html += tarjeta("Mejor rendimiento", mejor.promedio + "/100", esc(nombrePagina(mejor.url)) + " · " + esc(mejor.dispositivo));
    html += tarjeta("Peor rendimiento", peor.promedio + "/100", esc(nombrePagina(peor.url)) + " · " + esc(peor.dispositivo));
  }
  document.getElementById("tarjetas").innerHTML = html;

  // Última medición por página y dispositivo
  let t = "<tr><th>Página</th><th>Dispositivo</th><th>Fecha</th><th>FCP</th><th>LCP</th><th>Speed Index</th><th>Performance</th></tr>";
  lista.forEach((g) => {
    const u = g.ultima;
    t += "<tr><td>" + esc(nombrePagina(g.url)) + "</td><td>" + esc(g.dispositivo) + "</td><td>" + fecha(u.timestamp) + "</td><td>" +
      celda("firstContentfulPaint", u.firstContentfulPaint) + "</td><td>" +
      celda("largestContentfulPaint", u.largestContentfulPaint) + "</td><td>" +
      celda("speedIndex", u.speedIndex) + "</td><td>" +
      celda("performance", u.performance) + "</td></tr>";
  });
  document.getElementById("ultimas").innerHTML = t;

  // Comparación entre dispositivos
  const dispositivos = [...new Set(lista.map((g) => g.dispositivo))];
  const urls = [...new Set(lista.map((g) => g.url))];
  let c = "<tr><th>Página</th>" + dispositivos.map((d) => "<th>" + esc(d) + "</th>").join("") + "<th>Diferencia</th></tr>";
  urls.forEach((url) => {
    const promedios = [];
    let fila = "<tr><td>" + esc(nombrePagina(url)) + "</td>";
    dispositivos.forEach((d) => {
      const g = grupos[url + "|" + d];
      if (g) {
        promedios.push(g.promedio);
        fila += "<td>" + celda("performance", g.promedio) + "</td>";
      } else {
        fila += "<td>—</td>";
      }
    });
    const dif = promedios.length > 1 ? Math.max(...promedios) - Math.min(...promedios) + " puntos" : "—";
    c += fila + "<td>" + dif + "</td></tr>";
  });
  document.getElementById("comparacion").innerHTML = c;

  // Errores
  let e = "<tr><th>Fecha</th><th>Página</th><th>Dispositivo</th><th>Mensaje</th></tr>";
  if (errores.length === 0) e += '<tr><td colspan="4">Sin errores.</td></tr>';
  errores.slice().reverse().forEach((r) => {
    e += '<tr class="error"><td>' + fecha(r.timestamp) + "</td><td>" + esc(nombrePagina(r.url)) + "</td><td>" +
      esc(r.screenEmulation) + "</td><td>" + esc(r.error) + "</td></tr>";
  });
  document.getElementById("errores").innerHTML = e;

  // Historial con filtro por dispositivo
  const filtro = document.getElementById("filtro");
  filtro.innerHTML = '<option value="">Todos los dispositivos</option>' +
    dispositivos.map((d) => '<option value="' + esc(d) + '">' + esc(d) + "</option>").join("");
  filtro.onchange = () => pintarHistorial(buenos, filtro.value);
  pintarHistorial(buenos, "");

  document.getElementById("estado").textContent = "Datos leídos de " + RUTA_JSON;
}

function pintarHistorial(buenos, dispositivo) {
  let h = "<tr><th>Fecha</th><th>Página</th><th>Dispositivo</th><th>FCP</th><th>LCP</th><th>Speed Index</th><th>Performance</th></tr>";
  buenos.slice().reverse().forEach((r) => {
    if (dispositivo && r.screenEmulation !== dispositivo) return;
    h += "<tr><td>" + fecha(r.timestamp) + "</td><td>" + esc(nombrePagina(r.url)) + "</td><td>" + esc(r.screenEmulation) + "</td><td>" +
      celda("firstContentfulPaint", r.firstContentfulPaint) + "</td><td>" +
      celda("largestContentfulPaint", r.largestContentfulPaint) + "</td><td>" +
      celda("speedIndex", r.speedIndex) + "</td><td>" +
      celda("performance", r.performance) + "</td></tr>";
  });
  document.getElementById("historial").innerHTML = h;
}

// Lee el JSON y pinta el informe
fetch(RUTA_JSON)
  .then((r) => r.json())
  .then(pintar)
  .catch((err) => {
    document.getElementById("estado").textContent =
      "No se pudo leer el JSON (" + err.message + "). Abre el informe con un servidor local, no con doble clic.";
  });