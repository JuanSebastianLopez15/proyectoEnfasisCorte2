// Un job = una programación independiente.
// Este archivo solo configura: quien lo ejecuta es scheduler/ejecutar.js
module.exports = [
  {
    id: "movil-diario",
    habilitado: true,
    fechaInicio: "2026-10-30",      // AAAA-MM-DD (hora de Bogotá)
    hora: "07:00",                  // HH:MM (hora de Bogotá)
    zonaHoraria: "America/Bogota",
    frecuencia: "diaria",           // "unica" | "diaria" | "semanal"
    diasSemana: [],                 // solo para "semanal": 0=domingo ... 6=sábado
    dispositivos: ["movil"],        // ids de config/devices.js
    paginas: "todas",               // "todas" o una lista de ids de config/pages.js
  },
  {
    id: "escritorio-diario",
    habilitado: true,
    fechaInicio: "2026-10-30",
    hora: "07:30",
    zonaHoraria: "America/Bogota",
    frecuencia: "diaria",
    diasSemana: [],
    dispositivos: ["escritorio"],
    paginas: "todas",
  },
];