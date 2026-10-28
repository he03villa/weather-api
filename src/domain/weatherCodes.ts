export function mapWeatherCode(code: number): string {
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if (code >= 51 && code <= 57) return "Llovizna";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Lluvia";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "Nieve";
  if (code >= 95 && code <= 99) return "Tormenta eléctrica";
  return "Condición desconocida";
}
