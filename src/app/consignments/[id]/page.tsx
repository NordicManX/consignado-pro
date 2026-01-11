'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, ScanBarcode, DollarSign, Minus, Plus } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
                .select(`id, product_variant_id, unit_price, quantity, returned_quantity, product_variants (barcode, size, color, products (title))`)
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

    // 2. Manipulação Manual (+ e -)
    const handleManualAdjustment = (index: number, delta: number) => {
        const newItems = [...items]
        const item = newItems[index]
        const newValue = item.returned_quantity + delta

        // Travas de segurança
        if (newValue < 0) return // Não pode devolver negativo
        if (newValue > item.sent_quantity) return // Não pode devolver mais do que levou

        item.returned_quantity = newValue
        setItems(newItems)
    }

    // 3. Lógica do Bip
    const handleScanReturn = (e: React.FormEvent) => {
        e.preventDefault()
        const index = items.findIndex(i => i.barcode === barcode)
        if (index === -1) {
            toast.error('Item não pertence a esta sacola!')
            setBarcode('')
            return
        }
        handleManualAdjustment(index, 1) // Reutiliza a lógica manual
        setBarcode('')
        toast.success('Bipado!', { duration: 500 })
    }

    // 4. Cálculos
    const totalSent = items.reduce((acc, i) => acc + (i.sent_quantity * i.unit_price), 0)
    const totalReturned = items.reduce((acc, i) => acc + (i.returned_quantity * i.unit_price), 0)
    const totalSold = totalSent - totalReturned
    const commissionRate = reseller?.default_commission_percent || 0
    const commissionValue = totalSold * (commissionRate / 100)
    const finalValueToReceive = totalSold - commissionValue

    // 5. Executar Fechamento
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

            setIsConfirmOpen(false)
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
        <div className="container mx-auto py-6 max-w-6xl min-h-screen flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <div className="text-right bg-green-50 p-2 rounded px-4 border border-green-200 shadow-sm">
                    <p className="text-xs text-green-700 font-semibold uppercase">A Receber (Líquido)</p>
                    <p className="text-3xl font-bold text-green-700">R$ {finalValueToReceive.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Painel Esquerdo */}
                <Card className="col-span-1 h-fit bg-neutral-900 text-white border-neutral-800 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ScanBarcode className="w-5 h-5 text-green-400" /> Scanner
                        </CardTitle>
                        <p className="text-neutral-400 text-xs">Bipe o que <strong>VOLTOU</strong> para o estoque.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleScanReturn} className="flex gap-2">
                            <Input ref={auditInputRef} placeholder="Código de barras..." value={barcode} onChange={e => setBarcode(e.target.value)} className="bg-neutral-800 border-neutral-700 text-white focus-visible:ring-green-500" autoFocus />
                        </form>
                        <div className="space-y-4 pt-4 border-t border-neutral-800">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Total Levado:</span>
                                <span>{items.reduce((a, b) => a + b.sent_quantity, 0)} pçs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Devolvido (Estoque):</span>
                                <span className="text-yellow-400 font-bold">{items.reduce((a, b) => a + b.returned_quantity, 0)} pçs</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-4 border-t border-neutral-800">
                                <span>Venda Real:</span>
                                <span className="text-green-400">{items.reduce((a, b) => a + (b.sent_quantity - b.returned_quantity), 0)} pçs</span>
                            </div>
                        </div>

                        <Button
                            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white border-0 py-6 text-lg font-bold shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02]"
                            onClick={() => setIsConfirmOpen(true)}
                        >
                            <CheckCircle className="w-5 h-5 mr-2" /> Finalizar
                        </Button>
                    </CardContent>
                </Card>

                {/* Tabela Direita */}
                <Card className="col-span-2 flex flex-col overflow-hidden shadow-md">
                    <CardHeader className="pb-2 border-b bg-neutral-50/50"><CardTitle className="text-base">Conferência de Itens</CardTitle></CardHeader>
                    <div className="flex-1 overflow-auto p-0">
                        <Table>
                            <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-center w-[100px]">Levou</TableHead>
                                    <TableHead className="text-center w-[160px]">Devolveu</TableHead>
                                    <TableHead className="text-center w-[100px]">Vendeu</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => {
                                    const isFullyReturned = item.returned_quantity === item.sent_quantity
                                    return (
                                        <TableRow key={item.id} className={isFullyReturned ? "bg-neutral-50" : ""}>
                                            <TableCell>
                                                <div className="font-medium">{item.product_title}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {item.size} - {item.color}
                                                    <span className="bg-neutral-100 px-1 rounded border font-mono">{item.barcode}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-neutral-500">{item.sent_quantity}</TableCell>

                                            {/* AQUI ESTÃO OS BOTÕES QUE FALTAVAM */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 bg-neutral-100 p-1 rounded-lg w-fit mx-auto border">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-white hover:text-red-500 rounded-md"
                                                        onClick={() => handleManualAdjustment(index, -1)}
                                                        disabled={item.returned_quantity === 0}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>

                                                    <span className={`w-8 text-center font-bold ${item.returned_quantity > 0 ? 'text-yellow-600' : 'text-neutral-300'}`}>
                                                        {item.returned_quantity}
                                                    </span>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-white hover:text-green-600 rounded-md"
                                                        onClick={() => handleManualAdjustment(index, 1)}
                                                        disabled={item.returned_quantity >= item.sent_quantity}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-center font-bold text-green-700 bg-green-50/50">
                                                {item.sent_quantity - item.returned_quantity}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isFullyReturned
                                                    ? <Badge variant="outline" className="text-neutral-400 border-neutral-200">Devolvido</Badge>
                                                    : <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 shadow-none">Vendido</Badge>
                                                }
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="bg-white border-0 shadow-2xl max-w-md p-0 overflow-hidden">
                    <div className="bg-green-600 p-6 text-center">
                        <div className="mx-auto bg-white/20 p-3 rounded-full w-fit mb-4 backdrop-blur-sm">
                            <DollarSign className="w-8 h-8 text-white" />
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-bold text-white mb-1">
                            Confirmar Pagamento
                        </AlertDialogTitle>
                        <p className="text-green-100 text-sm">A sacola será baixada e o estoque atualizado.</p>
                    </div>

                    <div className="p-6 text-center space-y-6">
                        <div>
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Valor a Receber</p>
                            <div className="text-5xl font-black text-neutral-900 tracking-tight">
                                R$ {finalValueToReceive.toFixed(2)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <AlertDialogCancel className="h-12 border-neutral-200 hover:bg-neutral-50 text-neutral-600">
                                Voltar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-lg shadow-green-900/20"
                                onClick={executeClosing}
                                disabled={processing}
                            >
                                {processing ? '...' : 'CONFIRMAR'}
                            </AlertDialogAction>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}