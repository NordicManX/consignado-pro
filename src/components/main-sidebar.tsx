'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    LogOut,
    Shirt,
    Settings,
    Shield,
    UserCircle
} from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { Button } from "@/components/ui/button"

export function MainSidebar() {
    const pathname = usePathname()
    const router = useRouter()

    // MUDANÇA 1: Começa como false por segurança (ninguém é admin até provar o contrário)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkRole() {
            const { data: { user } } = await supabase.auth.getUser()

            // --- ESPIÃO ---
            console.log("USUÁRIO LOGADO:", user?.email)
            console.log("PERMISSÃO:", user?.user_metadata?.role)
            // --------------

            if (user?.user_metadata?.role === 'admin') {
                setIsAdmin(true)
            }
            setLoading(false)
        }
        checkRole()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // MUDANÇA 2: Lista unificada com flag 'adminOnly'
    const allMenuItems = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
        { href: "/consignments", label: "Sacolas", icon: ShoppingBag, adminOnly: false },
        { href: "/products", label: "Produtos", icon: Shirt, adminOnly: false },
        { href: "/clients", label: "Clientes Finais", icon: UserCircle, adminOnly: false },

        // --- ITENS RESTRITOS (Só Admin vê) ---
        { href: "/resellers", label: "Revendedoras", icon: Users, adminOnly: true },
        { href: "/admin/users", label: "Gerenciar Acessos", icon: Shield, adminOnly: true },
        // -------------------------------------

        { href: "/profile", label: "Meu Perfil", icon: Settings, adminOnly: false },
    ]

    // MUDANÇA 3: Filtra os itens antes de renderizar
    const visibleMenuItems = allMenuItems.filter(item => {
        // Se o item for só para admin E o usuário não for admin, esconde
        if (item.adminOnly && !isAdmin) return false
        return true
    })

    return (
        <div className="w-64 h-screen bg-neutral-900 text-white flex flex-col border-r border-neutral-800">

            {/* Logo */}
            <div className="p-6 border-b border-neutral-800 flex flex-col items-center text-center">
                <h1 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Package className="text-green-500" />
                    Consignados<span className="text-green-500">Pro</span>
                </h1>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                    Gestão Inteligente
                </p>
            </div>

            {/* Navegação */}
            <nav className="flex-1 p-4 space-y-2">
                {/* Se estiver carregando, não mostra nada para evitar 'pulo' visual */}
                {!loading && visibleMenuItems.map((item) => {
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

            {/* Logout */}
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