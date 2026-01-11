'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    LogOut,
    Shirt
} from "lucide-react" // Ícones bonitos
import { supabase } from "@/src/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function MainSidebar() {
    const pathname = usePathname() // Para saber em qual página estamos e marcar o botão
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Lista dos menus
    const menuItems = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/consignments", label: "Sacolas", icon: ShoppingBag },
        { href: "/products", label: "Produtos", icon: Shirt },
        { href: "/resellers", label: "Revendedoras", icon: Users },
    ]

    return (
        <div className="w-64 h-screen bg-neutral-900 text-white flex flex-col border-r border-neutral-800">

            {/* Logo / Título */}
            <div className="p-6 border-b border-neutral-800">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Package className="text-green-500" />
                    Nordic<span className="text-green-500">Consig</span>
                </h1>
                <p className="text-xs text-neutral-500 mt-1">Gestão Inteligente</p>
            </div>

            {/* Navegação */}
            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                    return (
                        <Link key={item.href} href={item.href}>
                            <div className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                                    ? "bg-green-600 text-white font-medium shadow-lg shadow-green-900/20"
                                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}
              `}>
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* Rodapé / Logout */}
            <div className="p-4 border-t border-neutral-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair do Sistema
                </Button>
            </div>
        </div>
    )
}