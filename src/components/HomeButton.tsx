import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function HomeButton() {
  return (
    <Link
      to="/"
      aria-label="Ir al inicio"
      className="fixed right-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-secondary"
    >
      <Home className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}
