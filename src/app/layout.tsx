'use client'

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MainSidebar } from "@/src/components/main-sidebar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname()

  // Se for a página de login, NÃO mostramos o menu lateral
  const isLoginPage = pathname === '/login'

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-neutral-50">

          {/* Renderização Condicional da Sidebar */}
          {!isLoginPage && <MainSidebar />}

          <main className="flex-1 overflow-auto h-screen">
            {children}
          </main>

        </div>
        <Toaster />
      </body>
    </html>
  );
}