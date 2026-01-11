'use client'

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MainSidebar } from "@/src/components/main-sidebar";
import { MobileHeader } from "@/src/components/mobile-header"; // <--- ESTA IMPORTAÇÃO ESTAVA FALTANDO
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <html lang="pt-BR">
      <body className={inter.className}>

        {/* Lógica de Layout */}
        {isLoginPage ? (
          // Layout de Login (Tela Cheia)
          <main className="min-h-screen bg-neutral-100">{children}</main>
        ) : (
          // Layout do Sistema (Com Sidebar/Header)
          <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">

            {/* Navegação Mobile (Topo) - Só aparece em telas pequenas */}
            <div className="md:hidden sticky top-0 z-50">
              <MobileHeader />
            </div>

            {/* Navegação Desktop (Lateral) - Só aparece em telas médias+ */}
            <div className="hidden md:block w-64 flex-shrink-0 fixed inset-y-0 z-50">
              <MainSidebar />
            </div>

            {/* Área de Conteúdo */}
            <main className="flex-1 overflow-x-hidden md:pl-64">
              <div className="p-4 md:p-8">
                {children}
              </div>
            </main>
          </div>
        )}

        <Toaster />
      </body>
    </html>
  );
}