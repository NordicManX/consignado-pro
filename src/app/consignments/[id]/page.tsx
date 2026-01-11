'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, ScanBarcode, DollarSign, X } from 'lucide-react' // Adicionei ícones novos
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// IMPORTANTE: Importando o Dialog que acabamos de instalar
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type AuditItem = {
    id: string
    product_variant_id: string
    product_title: string
    size: string
    color: string
    barcode: string
    unit_price: number
    sent_quantity: number
    returned_quantity: number
}

export default function ConsignmentAuditPage() {
    const params = useParams()
    const router = useRouter()
    const auditInputRef = useRef<HTMLInputElement>(null)

    const [items, setItems] = useState<AuditItem[]>([])
    const [reseller, setReseller] = useState<any>(null)
    const [barcode, setBarcode] = useState('')
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    // NOVO: Estado para controlar a janela central
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    // 1. Carregar Dados
    useEffect(() => {
        async function loadData() {
            const consignmentId = params.id
            const { data: consignment } = await supabase
                .from('consignments')
                .select('*, resellers(*)')
                .eq('id', consignmentId)
                .single()

            if (!consignment) return

            setReseller(consignment.resellers)

            const { data: consItems } = await supabase
                .from('consignment_items')
                .select(`id, product_variant_id, unit_price, quantity, returned_quantity, sold_quantity, product_variants (barcode, size, color, products (title))`)
                .eq('consignment_id', consignmentId)

            const formattedItems = consItems?.map((item: any) => ({
                id: item.id,
                product_variant_id: item.product_variant_id,
                product_title: item.product_variants.products.title,
                size: item.product_variants.size,
                color: item.product_variants.color,
                barcode: item.product_variants.barcode,
                unit_price: item.unit_price,
                sent_quantity: item.quantity,
                returned_quantity: item.returned_quantity || 0
            }))

            setItems(formattedItems || [])
            setLoading(false)
        }
        loadData()
    }, [params.id])

    useEffect(() => { auditInputRef.current?.focus() }, [items])

    // 2. Lógica do Bip
    const handleScanReturn = (e: React.FormEvent) => {
        e.preventDefault()
        const index = items.findIndex(i => i.barcode === barcode)
        if (index === -1) {
            toast.error('Item não pertence a esta sacola!')
            setBarcode('')
            return
        }
        const item = items[index]
        if (item.returned_quantity >= item.sent_quantity) {
            toast.warning('Já devolvido.')
            setBarcode('')
            return
        }
        const newItems = [...items]
        newItems[index].returned_quantity += 1
        setItems(newItems)
        setBarcode('')
        toast.success('Devolução registrada', { duration: 500 })
    }

    // 3. Cálculos
    const totalSent = items.reduce((acc, i) => acc + (i.sent_quantity * i.unit_price), 0)
    const totalReturned = items.reduce((acc, i) => acc + (i.returned_quantity * i.unit_price), 0)
    const totalSold = totalSent - totalReturned
    const commissionRate = reseller?.default_commission_percent || 0
    const commissionValue = totalSold * (commissionRate / 100)
    const finalValueToReceive = totalSold - commissionValue

    // 4. Executar Fechamento (Lógica Pura)
    const executeClosing = async () => {
        setProcessing(true)
        try {
            for (const item of items) {
                const sold = item.sent_quantity - item.returned_quantity
                await supabase.from('consignment_items').update({ returned_quantity: item.returned_quantity, sold_quantity: sold }).eq('id', item.id)

                if (item.returned_quantity > 0) {
                    const { data: currentStock } = await supabase.from('product_variants').select('stock_quantity').eq('id', item.product_variant_id).single()
                    if (currentStock) {
                        await supabase.from('product_variants').update({ stock_quantity: currentStock.stock_quantity + item.returned_quantity }).eq('id', item.product_variant_id)
                    }
                }
            }
            await supabase.from('consignments').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', params.id)

            setIsConfirmOpen(false) // Fecha o modal
            toast.success('SACOLA FECHADA COM SUCESSO! 💰')
            router.push('/consignments')
        } catch (error: any) {
            toast.error('Erro ao fechar', { description: error.message })
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return <div className="p-10 text-center">Carregando auditoria...</div>

    return (
        <div className="container mx-auto py-6 max-w-6xl h-screen flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <div className="text-right bg-green-50 p-2 rounded px-4 border border-green-200">
                    <p className="text-xs text-green-700">A Receber (Liq)</p>
                    <p className="text-2xl font-bold text-green-700">R$ {finalValueToReceive.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Painel Esquerdo */}
                <Card className="col-span-1 h-fit bg-neutral-900 text-white border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ScanBarcode className="w-5 h-5" /> Bipar Devoluções
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleScanReturn} className="flex gap-2">
                            <Input ref={auditInputRef} placeholder="Bipe o código..." value={barcode} onChange={e => setBarcode(e.target.value)} className="bg-neutral-800 border-neutral-700 text-white" autoFocus />
                        </form>
                        <div className="space-y-4 pt-4 border-t border-neutral-800">
                            <div className="flex justify-between text-lg font-bold pt-2">
                                <span>Venda Estimada:</span>
                                <span className="text-green-400">{items.reduce((a, b) => a + (b.sent_quantity - b.returned_quantity), 0)} pçs</span>
                            </div>
                        </div>

                        {/* O BOTÃO AGORA SÓ ABRE O MODAL */}
                        <Button
                            variant="secondary"
                            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white border-0 py-6 text-lg font-bold"
                            onClick={() => setIsConfirmOpen(true)}
                        >
                            <CheckCircle className="w-5 h-5 mr-2" /> Finalizar Acerto
                        </Button>
                    </CardContent>
                </Card>

                {/* Tabela Direita */}
                <Card className="col-span-2 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b"><CardTitle>Espelho da Sacola</CardTitle></CardHeader>
                    <div className="flex-1 overflow-auto p-0">
                        <Table>
                            <TableHeader className="bg-neutral-50 sticky top-0">
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-center">Levou</TableHead>
                                    <TableHead className="text-center">Devolveu</TableHead>
                                    <TableHead className="text-center">Vendeu</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id} className={item.returned_quantity === item.sent_quantity ? "opacity-50" : ""}>
                                        <TableCell>
                                            <div className="font-medium">{item.product_title}</div>
                                            <div className="text-xs text-muted-foreground">{item.size} - {item.color}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{item.sent_quantity}</TableCell>
                                        <TableCell className="text-center font-bold text-yellow-600">{item.returned_quantity}</TableCell>
                                        <TableCell className="text-center font-bold text-green-700">{item.sent_quantity - item.returned_quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {item.returned_quantity === item.sent_quantity ? <Badge variant="outline">Devolvido</Badge> : <Badge className="bg-green-100 text-green-800">Vendido</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* --- AQUI ESTÁ O NOVO MODAL EXUBERANTE --- */}
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="bg-white border-2 border-neutral-200 shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-green-100 p-4 rounded-full mb-4">
                            <DollarSign className="w-10 h-10 text-green-600" />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-bold text-neutral-900">
                            Confirmar Fechamento?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-neutral-500">
                            A sacola será fechada e o estoque devolvido atualizado.
                        </AlertDialogDescription>

                        <div className="py-6 text-center">
                            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">A Revendedora deve pagar</p>
                            <div className="text-5xl font-extrabold text-green-600 mt-2">
                                R$ {finalValueToReceive.toFixed(2)}
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-4">
                        <AlertDialogCancel className="w-full sm:w-auto text-lg py-6">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-6 px-8"
                            onClick={executeClosing}
                            disabled={processing}
                        >
                            {processing ? 'Processando...' : 'RECEBER E FECHAR'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}