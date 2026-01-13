'use client'

import { Menu, Package } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MainSidebar } from "@/src/components/main-sidebar"

export function MobileHeader() {
    return (
        <div className="flex h-14 items-center border-b px-4 lg:hidden bg-white justify-between">

            {/* Logo Centralizado Mobile */}
            <div className="flex flex-col items-center text-center mx-auto">
                <div className="flex items-center gap-2 font-bold text-lg leading-none text-neutral-900">
                    <Package className="w-5 h-5 text-green-600" />
                    Consignados<span className="text-green-500">Pro</span>
                </div>
                {/* Ajuste: fonte bem pequena e cinza */}
                <p className="text-[10px] font-normal text-neutral-500 mt-0.5 leading-none">
                    Gestão Inteligente
                </p>
            </div>

            <Sheet modal={false}>
                <SheetTrigger asChild className="absolute left-4">
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 bg-neutral-900 border-r-neutral-800 w-72">
                    <MainSidebar />
                </SheetContent>
            </Sheet>
        </div>
    )
}