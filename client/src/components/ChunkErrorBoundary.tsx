import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Si un trozo de código de una pantalla no carga (red caída, o un despliegue nuevo dejó de servir el trozo antiguo),
// se ofrece recargar en lugar de dejar la página en blanco. Se remonta al cambiar de ruta (ver Layout).
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="space-y-3">
        <p>No se pudo cargar esta pantalla. Revisa tu conexión o recarga la página para obtener la versión más reciente.</p>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    );
  }
}
