const { spawnSync } = require("child_process");
const path = require("path");
const jobs = require("../config/schedule");

// Cada cuántos minutos se dispara el workflow (cron). Un job "toca" si
// han pasado menos de estos minutos desde su hora programada.
const VENTANA_MIN = 30;

// PASO 1: saber qué fecha y hora es ahora en la zona horaria del job
function horaActual(zonaHoraria) {
  // Convierte la hora de este momento a la zona horaria pedida (America/Bogota)
  const texto = new Date().toLocaleString("en-US", { timeZone: zonaHoraria });
  const ahora = new Date(texto);

  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0"); // 1 -> "01"
  const dia = String(ahora.getDate()).padStart(2, "0");

  return {
    fecha: anio + "-" + mes + "-" + dia,                     // "2026-10-30"
    minutosDelDia: ahora.getHours() * 60 + ahora.getMinutes(), // 7:05 -> 425
    diaSemana: ahora.getDay(),                               // 0=domingo ... 6=sábado
  };
}

// PASO 2: decidir si un job le toca correr ahora
function tocaCorrer(job) {
  // Si está deshabilitado, no corre
  if (job.habilitado === false) {
    return false;
  }

  const ahora = horaActual(job.zonaHoraria);

  // Si todavía no llega la fecha de inicio, no corre
  if (ahora.fecha < job.fechaInicio) {
    return false;
  }

  // Frecuencia "unica": solo corre el día de inicio
  if (job.frecuencia === "unica" && ahora.fecha !== job.fechaInicio) {
    return false;
  }

  // Frecuencia "semanal": solo corre los días de la semana indicados
  if (job.frecuencia === "semanal" && !job.diasSemana.includes(ahora.diaSemana)) {
    return false;
  }

  // Frecuencia "diaria": no hay más condiciones de día.
  // Ahora se revisa la hora: "07:00" -> 7 horas y 0 minutos -> 420 minutos
  const partes = job.hora.split(":");
  const minutosJob = Number(partes[0]) * 60 + Number(partes[1]);

  // Toca si ya pasó la hora del job pero no han pasado más de VENTANA_MIN minutos
  if (ahora.minutosDelDia >= minutosJob && ahora.minutosDelDia < minutosJob + VENTANA_MIN) {
    return true;
  }
  return false;
}


//leer las opciones escritas en la terminal
//   --dry              solo muestra qué jobs tocan, sin medir
//   --forzar <id>      corre ese job sin importar la hora
// ---------------------------------------------------------------
const argumentos = process.argv.slice(2);
let soloMostrar = false;
let jobForzado = null;

for (let i = 0; i < argumentos.length; i++) {
  if (argumentos[i] === "--dry") {
    soloMostrar = true;
  }
  if (argumentos[i] === "--forzar") {
    jobForzado = argumentos[i + 1];
  }
}

// armar la lista de jobs que se van a ejecutar
const pendientes = [];

for (let i = 0; i < jobs.length; i++) {
  if (jobForzado !== null) {
    if (jobs[i].id === jobForzado) {
      pendientes.push(jobs[i]);
    }
  } else if (tocaCorrer(jobs[i])) {
    pendientes.push(jobs[i]);
  }
}

if (jobForzado !== null && pendientes.length === 0) {
  const ids = jobs.map((j) => j.id).join(", ");
  console.error('No existe el job "' + jobForzado + '". Disponibles: ' + ids);
  process.exit(1);
}

const nombres = pendientes.map((j) => j.id).join(", ");
console.log("Jobs que tocan ahora: " + (nombres || "ninguno"));

if (soloMostrar) {
  process.exit(0);
}

//ejecutar Cypress para cada job y cada dispositivo
const rutaCypress = path.join(__dirname, "..", "node_modules", "cypress", "bin", "cypress");
let fallos = 0;

for (let i = 0; i < pendientes.length; i++) {
  const job = pendientes[i];

  // Páginas: "todas" o una lista unida con "+" (ej. "biblioteca+paz")
  let paginas = "todas";
  if (job.paginas !== "todas") {
    paginas = job.paginas.join("+");
  }

  for (let j = 0; j < job.dispositivos.length; j++) {
    const dispositivo = job.dispositivos[j];
    console.log("\n>>> " + job.id + ": dispositivo=" + dispositivo + ", paginas=" + paginas);

    // Equivale a escribir: cypress run --browser chrome --env dispositivo=...,paginas=...
    const resultado = spawnSync(
      process.execPath,
      [rutaCypress, "run", "--browser", "chrome", "--env", "dispositivo=" + dispositivo + ",paginas=" + paginas],
      { stdio: "inherit" }
    );

    if (resultado.status !== 0) {
      fallos++;
    }
  }
}

// Si alguna ejecución falló, el script termina con error (el workflow lo sabrá)
if (fallos > 0) {
  process.exitCode = 1;
}