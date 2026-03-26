import "./globals.css";

export const metadata = {
  title: "LexIA Admin",
  description: "Panel de administracion de LexIA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
