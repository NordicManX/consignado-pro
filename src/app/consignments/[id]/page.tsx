'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, ScanBarcode, Minus, Plus } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// MUDANÇA 1: Importamos Dialog ao invés de AlertDialog
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"

export default function ConsignmentAuditPage() {
    const params = useParams()
    const router = useRouter()
    const auditInputRef = useRef<HTMLInputElement>(null)

    const [items, setItems] = useState<any[]>([])
    const [reseller, setReseller] = useState<any>(null)
    const [clients, setClients] = useState<any[]>([])
    const [selectedClient, setSelectedClient] = useState<string>('')
    const [barcode, setBarcode] = useState('')
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    useEffect(() => {
        async function loadData() {
            // A. Carregar Sacola
            const { data: consignment } = await supabase
                .from('consignments')
                .select('*, resellers(*)')
                .eq('id', params.id)
                .single()

            if (!consignment) return
            setReseller(consignment.resellers)

            // Se a sacola já tiver cliente vinculado, preenche o estado
            if (consignment.client_id) {
                setSelectedClient(consignment.client_id)
            }

            // B. Carregar Itens
            const { data: consItems } = await supabase
                .from('consignment_items')
                .select(`id, product_variant_id, unit_price, quantity, returned_quantity, product_variants (barcode, size, color, products (title))`)
                .eq('consignment_id', params.id)

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

            // C. Carregar Lista de Clientes
            const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
            setClients(clientsData || [])
            setLoading(false)
        }
        loadData()
    }, [params.id])

    const handleManualAdjustment = (index: number, delta: number) => {
        const newItems = [...items]
        const item = newItems[index]
        const newValue = item.returned_quantity + delta
        if (newValue < 0 || newValue > item.sent_quantity) return
        item.returned_quantity = newValue
        setItems(newItems)
    }

    const handleScanReturn = (e: React.FormEvent) => {
        e.preventDefault()
        const index = items.findIndex(i => i.barcode === barcode)
        if (index === -1) {
            toast.error('Item não pertence a esta sacola!')
            setBarcode('')
            return
        }
        handleManualAdjustment(index, 1)
        setBarcode('')
        toast.success('Bipado!')
    }

    // Cálculos
    const totalSent = items.reduce((acc, i) => acc + (i.sent_quantity * i.unit_price), 0)
    const totalReturned = items.reduce((acc, i) => acc + (i.returned_quantity * i.unit_price), 0)
    const totalSold = totalSent - totalReturned
    const commissionRate = reseller?.default_commission_percent || 0
    const commissionValue = totalSold * (commissionRate / 100)
    const finalValueToReceive = totalSold - commissionValue

    // FECHAMENTO
    const executeClosing = async () => {
        setProcessing(true)
        try {
            // Atualiza itens
            for (const item of items) {
                const sold = item.sent_quantity - item.returned_quantity
                await supabase.from('consignment_items')
                    .update({ returned_quantity: item.returned_quantity, sold_quantity: sold })
                    .eq('id', item.id)

                if (item.returned_quantity > 0) {
                    const { data: currentStock } = await supabase.from('product_variants').select('stock_quantity').eq('id', item.product_variant_id).single()
                    if (currentStock) {
                        await supabase.from('product_variants').update({ stock_quantity: currentStock.stock_quantity + item.returned_quantity }).eq('id', item.product_variant_id)
                    }
                }
            }

            // Fecha sacola e Atualiza Cliente se mudou
            const updateData: any = {
                status: 'closed',
                closed_at: new Date().toISOString()
            }
            if (selectedClient) updateData.client_id = selectedClient

            const { error } = await supabase.from('consignments').update(updateData).eq('id', params.id)
            if (error) throw error

            toast.success('SACOLA FECHADA! 💰')
            router.refresh()
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
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
                            <div className="flex justify-between text-sm"><span className="text-neutral-400">Total Levado:</span><span>{items.reduce((a, b) => a + b.sent_quantity, 0)} pçs</span></div>
                            <div className="flex justify-between text-sm"><span className="text-neutral-400">Devolvido:</span><span className="text-yellow-400 font-bold">{items.reduce((a, b) => a + b.returned_quantity, 0)} pçs</span></div>
                        </div>
                        <Button className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => setIsConfirmOpen(true)}>
                            <CheckCircle className="w-5 h-5 mr-2" /> Finalizar
                        </Button>
                    </CardContent>
                </Card>

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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.id} className={item.returned_quantity === item.sent_quantity ? "bg-neutral-50" : ""}>
                                        <TableCell>
                                            <div className="font-medium">{item.product_title}</div>
                                            <div className="text-xs text-muted-foreground">{item.size} - {item.color} <span className="bg-neutral-100 px-1 rounded border font-mono ml-1">{item.barcode}</span></div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-neutral-500">{item.sent_quantity}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1 bg-neutral-100 p-1 rounded-lg w-fit mx-auto border">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleManualAdjustment(index, -1)} disabled={item.returned_quantity === 0}><Minus className="w-3 h-3" /></Button>
                                                <span className={`w-8 text-center font-bold ${item.returned_quantity > 0 ? 'text-yellow-600' : 'text-neutral-300'}`}>{item.returned_quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleManualAdjustment(index, 1)} disabled={item.returned_quantity >= item.sent_quantity}><Plus className="w-3 h-3" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-green-700 bg-green-50/50">{item.sent_quantity - item.returned_quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* MUDANÇA 2: Usando Dialog padrão para permitir o Select funcionar */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="bg-white border-0 shadow-2xl max-w-md p-0 overflow-hidden gap-0">
                    <div className="bg-green-600 p-6 text-center">
                        <DialogTitle className="text-center text-2xl font-bold text-white mb-1">Confirmar Pagamento</DialogTitle>
                        <p className="text-green-100 text-sm">A sacola será baixada.</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2 text-left">
                            <label className="text-xs font-semibold text-neutral-500 uppercase">Cliente Comprador (Confirmar)</label>
                            <Select value={selectedClient} onValueChange={setSelectedClient}>
                                <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Valor Total a Receber</p>
                            <div className="text-5xl font-black text-neutral-900 tracking-tight">R$ {finalValueToReceive.toFixed(2)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 border-neutral-200 text-neutral-600" onClick={() => setIsConfirmOpen(false)}>
                                Voltar
                            </Button>
                            <Button className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={executeClosing} disabled={processing}>
                                {processing ? '...' : 'CONFIRMAR'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}