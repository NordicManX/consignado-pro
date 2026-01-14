'use client'

import {
    LayoutDashboard,
    ShoppingBag,
    Shirt,
    Users,
    UserCircle,
    LogOut,
    Shield,
    Menu,
    X,
    UserCog
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MainSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isAdmin, setIsAdmin] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [isOpen, setIsOpen] = useState(false) // Controle do menu mobile

    // Verifica se o usuário é Admin ao carregar a sidebar
    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                setUserEmail(user.email || '')
                // Verifica a metadata que salvamos no passo anterior
                const role = user.user_metadata?.role
                setIsAdmin(role === 'admin')
            }
        }
        checkUser()
    }, [])

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Lista de Menus
    const menuItems = [
        {
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
            visible: true // Todo mundo vê
        },
        {
            label: 'Sacolas',
            href: '/consignments',
            icon: ShoppingBag,
            visible: true
        },
        {
            label: 'Produtos',
            href: '/products',
            icon: Shirt,
            visible: true
        },
        {
            label: 'Clientes Finais',
            href: '/clients',
            icon: UserCircle,
            visible: true
        },
        // --- MENUS EXCLUSIVOS DE ADMIN ---
        {
            label: 'Revendedoras',
            href: '/resellers',
            icon: Users,
            visible: isAdmin // Só admin vê
        },
        {
            label: 'Gerenciar Acessos',
            href: '/admin/users', // Ajuste para a rota correta da sua tela de admin
            icon: Shield,
            visible: isAdmin // Só admin vê
        }
    ]

    return (
        <>
            {/* Botão Mobile (Hambúrguer) */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </div>

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed left-0 top-0 z-40 h-screen w-64 bg-neutral-900 text-white transition-transform duration-300 md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-full flex-col justify-between px-4 py-6">

                    {/* Topo: Logo e Menus */}
                    <div className="space-y-8">
                        {/* Logo */}
                        <div className="flex items-center gap-2 px-2 font-bold text-xl text-green-500">
                            <Shirt className="w-8 h-8" />
                            <span>Consignados Pro</span>
                        </div>

                        {/* Navegação */}
                        <nav className="space-y-1">
                            {menuItems.map((item) => (
                                item.visible && (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)} // Fecha menu mobile ao clicar
                                    >
                                        <div className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                                            pathname === item.href
                                                ? "bg-green-600 text-white"
                                                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                        )}>
                                            <item.icon className="w-5 h-5" />
                                            {item.label}
                                        </div>
                                    </Link>
                                )
                            ))}
                        </nav>
                    </div>

                    {/* Rodapé: Usuário e Logout */}
                    <div className="border-t border-neutral-800 pt-6">
                        <div className="mb-4 px-2">
                            <p className="text-xs font-semibold text-neutral-500 uppercase">Usuário Logado</p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-neutral-300 truncate">
                                <UserCog className="w-4 h-4 text-green-500" />
                                <span className="truncate max-w-[180px]" title={userEmail}>
                                    {userEmail || 'Carregando...'}
                                </span>
                            </div>
                            {isAdmin && (
                                <span className="mt-1 inline-block rounded bg-purple-900/50 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-800">
                                    Administrador
                                </span>
                            )}
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-5 h-5" /> Sair do Sistema
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Overlay para fechar no mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    )
}