// Tiempos en milisegundos. "bueno" y "mejorar" son los límites máximos de cada rango.
module.exports = {
  firstContentfulPaint:   { bueno: 1800, mejorar: 3000 },
  largestContentfulPaint: { bueno: 2500, mejorar: 4000 },
  speedIndex:             { bueno: 3400, mejorar: 5800 },
  // Puntaje de 0 a 100: bueno = 90 o más, mejorar = 50 o más
  performance:            { bueno: 90,   mejorar: 50 },
};