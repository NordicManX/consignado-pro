'use client'

import { Menu, Package } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MainSidebar } from "@/src/components/main-sidebar"

export function MobileHeader() {
    return (
        <div className="flex h-14 items-center border-b px-4 lg:hidden bg-white justify-between">
            <div className="flex items-center gap-2 font-bold text-lg">
                <Package className="w-5 h-5 text-green-600" />
                NordicConsig
            </div>

            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 bg-neutral-900 border-r-neutral-800 w-72">
                    {/* Reutilizamos a Sidebar original aqui dentro! */}
                    <MainSidebar />
                </SheetContent>
            </Sheet>
        </div>
    )
}