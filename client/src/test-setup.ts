// Las pantallas son lazy: la primera importación de cada una dentro de jsdom puede tardar más de 1 s (el límite por defecto).
// Solo en tests del cliente (jsdom); los del servidor corren en node.
if (typeof document !== "undefined") {
  const { configure } = await import("@testing-library/react");
  configure({ asyncUtilTimeout: 5000 });
}

export {}; // módulo (necesario para el await de nivel superior)
