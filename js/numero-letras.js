function numeroALetras(num) {
  const n = Number(num || 0);
  const fmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n);
  // Quitamos "COP" para un texto más natural
  return `${fmt.replace("COP", "").trim()} pesos`;
}

window.numeroALetras = numeroALetras;
