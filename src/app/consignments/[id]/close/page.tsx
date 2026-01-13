'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Calculator, Save, AlertCircle } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

// Tipos para facilitar
type BagItem = {
    id: string
    variant_id: string
    title: string
    size: string
    color: string
    barcode: string
    unit_price: number
    status: 'sold' | 'returned'
}

export default function CloseConsignmentPage() {
    const router = useRouter()
    const params = useParams()
    const consignmentId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [items, setItems] = useState<BagItem[]>([])
    const [resellerName, setResellerName] = useState('')
    const [commissionRate, setCommissionRate] = useState(30)

    // 1. Carregar Dados
    useEffect(() => {
        async function loadData() {
            const { data: consignment, error: consError } = await supabase
                .from('consignments')
                .select(`
                    *,
                    resellers (name, default_commission_percent)
                `)
                .eq('id', consignmentId)
                .single()

            if (consError) {
                toast.error('Erro ao carregar sacola')
                router.back()
                return
            }

            setResellerName(consignment.resellers?.name || 'Revendedora')
            setCommissionRate(consignment.resellers?.default_commission_percent || 30)

            const { data: bagItems, error: itemsError } = await supabase
                .from('consignment_items')
                .select(`
                    id, unit_price, product_variant_id,
                    product_variants (
                        id, size, color, barcode,
                        products (title)
                    )
                `)
                .eq('consignment_id', consignmentId)

            if (itemsError) {
                toast.error('Erro ao carregar itens')
                return
            }

            const formattedItems: BagItem[] = bagItems.map((item: any) => ({
                id: item.id,
                variant_id: item.product_variant_id,
                title: item.product_variants?.products?.title || 'Produto',
                size: item.product_variants?.size,
                color: item.product_variants?.color,
                barcode: item.product_variants?.barcode,
                unit_price: item.unit_price,
                status: 'sold'
            }))

            setItems(formattedItems)
            setLoading(false)
        }
        loadData()
    }, [consignmentId, router])

    // 2. Alternar Status
    const toggleStatus = (index: number) => {
        const newItems = [...items]
        newItems[index].status = newItems[index].status === 'sold' ? 'returned' : 'sold'
        setItems(newItems)
    }

    // 3. Cálculos
    const totalItems = items.length
    const returnedItems = items.filter(i => i.status === 'returned')
    const soldItems = items.filter(i => i.status === 'sold')

    const totalValueBag = items.reduce((acc, i) => acc + i.unit_price, 0)
    const totalSoldValue = soldItems.reduce((acc, i) => acc + i.unit_price, 0)

    const commissionValue = totalSoldValue * (commissionRate / 100)
    const storeReceiveValue = totalSoldValue - commissionValue

    // 4. Finalizar
    const handleFinish = async () => {
        // OBS: O alerta que aparece aqui é do navegador, ele sempre será padrão do sistema.
        if (!confirm('Confirmar o fechamento? Os itens devolvidos voltarão ao estoque.')) return

        setSaving(true)
        try {
            // A. Atualizar Estoque
            for (const item of returnedItems) {
                const { data: currentVariant } = await supabase
                    .from('product_variants')
                    .select('stock_quantity')
                    .eq('id', item.variant_id)
                    .single()

                if (currentVariant) {
                    await supabase
                        .from('product_variants')
                        .update({ stock_quantity: currentVariant.stock_quantity + 1 })
                        .eq('id', item.variant_id)
                }
            }

            // B. Atualizar Sacola
            const { error: updateError } = await supabase
                .from('consignments')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                })
                .eq('id', consignmentId)

            if (updateError) throw updateError

            toast.success('Acerto realizado com sucesso!')
            router.push('/consignments')

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao finalizar', { description: error.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando acerto...</div>

    return (
        <div className="container mx-auto py-8 max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Fechamento de Sacola</h1>
                        <p className="text-muted-foreground">Revendedora: <span className="font-semibold text-black">{resellerName}</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LADO ESQUERDO: LISTA */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base flex justify-between">
                            <span>Itens da Sacola ({totalItems})</span>
                            <span className="text-sm font-normal text-muted-foreground">Clique no botão para marcar devolução</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead className="text-center w-[150px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.id} className={item.status === 'returned' ? "bg-neutral-50 opacity-70" : ""}>
                                        <TableCell>
                                            <div className="font-medium">{item.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.size} - {item.color} <span className="font-mono ml-1">({item.barcode})</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            R$ {item.unit_price.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                size="sm"
                                                variant={item.status === 'sold' ? 'default' : 'outline'}
                                                className={`w-full ${item.status === 'sold' ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground'}`}
                                                onClick={() => toggleStatus(index)}
                                            >
                                                {item.status === 'sold' ? (
                                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Vendido</>
                                                ) : (
                                                    <><XCircle className="w-4 h-4 mr-2" /> Devolvido</>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* LADO DIREITO: RESUMO */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-blue-600" /> Resumo do Acerto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Total da Sacola</span>
                                    <span>R$ {totalValueBag.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                    <span>(-) Devoluções ({returnedItems.length})</span>
                                    <span>- R$ {(totalValueBag - totalSoldValue).toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total Vendido</span>
                                    <span>R$ {totalSoldValue.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border space-y-3 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Comissão Revendedora ({commissionRate}%)</span>
                                    <span className="font-medium text-orange-600">R$ {commissionValue.toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-700">A RECEBER (Loja)</span>
                                    <span className="text-xl font-bold text-green-700">R$ {storeReceiveValue.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-xs text-yellow-800 flex gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <div>
                                    Ao confirmar, <strong>{returnedItems.length} itens</strong> voltarão automaticamente para o estoque físico.
                                </div>
                            </div>

                            {/* --- BOTÃO VERDE CORRIGIDO --- */}
                            <Button
                                className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-md text-white"
                                onClick={handleFinish}
                                disabled={saving}
                            >
                                {saving ? 'Processando...' : 'Finalizar Acerto'} <Save className="w-5 h-5 ml-2" />
                            </Button>

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}