import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CBDEVS — Portal de Cliente",
  description: "Portal privado para revisar avance, entregas, pagos y mensajes de proyectos CBDEVS.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
