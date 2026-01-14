'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Calculator, Save, AlertCircle, Layers, List } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Tipos
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

    // Estado para Agrupamento
    const [isGrouped, setIsGrouped] = useState(true)

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
                status: 'sold' // Padrão: Vendido
            }))

            setItems(formattedItems)
            setLoading(false)
        }
        loadData()
    }, [consignmentId, router])

    // --- LÓGICA DE AGRUPAMENTO ---
    const groupedItems = useMemo(() => {
        const groups: Record<string, any> = {}

        items.forEach((item) => {
            if (!groups[item.variant_id]) {
                groups[item.variant_id] = {
                    ...item,
                    totalQuantity: 0,
                    soldCount: 0,
                    returnedCount: 0,
                    totalPrice: 0
                }
            }
            groups[item.variant_id].totalQuantity += 1
            groups[item.variant_id].totalPrice += item.unit_price

            if (item.status === 'sold') groups[item.variant_id].soldCount += 1
            else groups[item.variant_id].returnedCount += 1
        })

        return Object.values(groups)
    }, [items])


    // 2. Alternar Status (Individual)
    const toggleStatusIndividual = (id: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, status: item.status === 'sold' ? 'returned' : 'sold' }
            }
            return item
        }))
    }

    // 2b. Alternar Status (Grupo Inteiro)
    const toggleStatusGroup = (variantId: string, currentStatus: 'sold' | 'returned' | 'mixed') => {
        // Lógica: Se estiver tudo vendido ou misto -> muda tudo para devolvido. 
        // Se estiver tudo devolvido -> muda tudo para vendido.
        const newStatus = (currentStatus === 'sold' || currentStatus === 'mixed') ? 'returned' : 'sold'

        setItems(prev => prev.map(item => {
            if (item.variant_id === variantId) {
                return { ...item, status: newStatus }
            }
            return item
        }))
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
                <Card className="lg:col-span-2 flex flex-col min-h-[500px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-neutral-50/50">
                        <CardTitle className="text-base">
                            Itens ({totalItems})
                        </CardTitle>

                        {/* --- SWITCH DE AGRUPAMENTO --- */}
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="group-mode" className="text-xs font-normal text-muted-foreground flex items-center gap-1 cursor-pointer">
                                {isGrouped ? <Layers className="w-3 h-3" /> : <List className="w-3 h-3" />}
                                {isGrouped ? 'Agrupado' : 'Lista Detalhada'}
                            </Label>
                            <Switch
                                id="group-mode"
                                checked={isGrouped}
                                onCheckedChange={setIsGrouped}
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Variação</TableHead>
                                    {isGrouped && <TableHead className="text-center">Qtd.</TableHead>}
                                    <TableHead>Preço {isGrouped && 'Unit.'}</TableHead>
                                    <TableHead className="text-center w-[180px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* --- MODO AGRUPADO --- */}
                                {isGrouped ? (
                                    groupedItems.map((group) => {
                                        // Determina status do grupo
                                        let groupStatus: 'sold' | 'returned' | 'mixed' = 'mixed'
                                        if (group.soldCount === group.totalQuantity) groupStatus = 'sold'
                                        if (group.returnedCount === group.totalQuantity) groupStatus = 'returned'

                                        return (
                                            <TableRow key={group.variant_id} className={groupStatus === 'returned' ? "bg-neutral-50 opacity-70" : ""}>
                                                <TableCell className="font-medium">
                                                    {group.title}
                                                </TableCell>
                                                <TableCell>
                                                    {group.size} - {group.color}
                                                </TableCell>
                                                <TableCell className="text-center font-bold">
                                                    {group.totalQuantity}x
                                                </TableCell>
                                                <TableCell>
                                                    R$ {group.unit_price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        size="sm"
                                                        variant={groupStatus === 'sold' ? 'default' : (groupStatus === 'mixed' ? 'secondary' : 'outline')}
                                                        className={`w-full ${groupStatus === 'sold' ? 'bg-green-600 hover:bg-green-700' :
                                                                groupStatus === 'mixed' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                                                    'text-muted-foreground'
                                                            }`}
                                                        onClick={() => toggleStatusGroup(group.variant_id, groupStatus)}
                                                    >
                                                        {groupStatus === 'sold' && <><CheckCircle2 className="w-4 h-4 mr-2" /> Vendidos</>}
                                                        {groupStatus === 'returned' && <><XCircle className="w-4 h-4 mr-2" /> Devolvidos</>}
                                                        {groupStatus === 'mixed' && <span className="text-xs font-bold">{group.soldCount} Vend. / {group.returnedCount} Dev.</span>}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    /* --- MODO LISTA SIMPLES --- */
                                    items.map((item) => (
                                        <TableRow key={item.id} className={item.status === 'returned' ? "bg-neutral-50 opacity-70" : ""}>
                                            <TableCell className="font-medium">
                                                {item.title}
                                                <span className="block text-xs text-muted-foreground font-mono">{item.barcode}</span>
                                            </TableCell>
                                            <TableCell>
                                                {item.size} - {item.color}
                                            </TableCell>
                                            <TableCell>
                                                R$ {item.unit_price.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    variant={item.status === 'sold' ? 'default' : 'outline'}
                                                    className={`w-full ${item.status === 'sold' ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground'}`}
                                                    onClick={() => toggleStatusIndividual(item.id)}
                                                >
                                                    {item.status === 'sold' ? (
                                                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Vendido</>
                                                    ) : (
                                                        <><XCircle className="w-4 h-4 mr-2" /> Devolvido</>
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
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

                            {/* --- SUBSTITUIÇÃO DO BOTÃO PELO ALERT DIALOG --- */}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-md text-white"
                                        disabled={saving}
                                    >
                                        {saving ? 'Processando...' : 'Finalizar Acerto'} <Save className="w-5 h-5 ml-2" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar fechamento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação finalizará a sacola.
                                            <br /><br />
                                            <ul className="list-disc pl-4 text-sm text-neutral-600">
                                                <li><strong>{soldItems.length} itens vendidos</strong> serão contabilizados.</li>
                                                <li><strong>{returnedItems.length} itens devolvidos</strong> retornarão ao estoque agora.</li>
                                            </ul>
                                            <br />
                                            Essa ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                                            Confirmar e Fechar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}