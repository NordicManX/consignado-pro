'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    ShoppingBag,
    ScanBarcode,
    Trash2,
    UserCircle,
    Layers, // Ícone para Agrupado
    List,   // Ícone para Lista
} from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function NewConsignmentPage() {
    const router = useRouter()
    const barcodeInputRef = useRef<HTMLInputElement>(null)

    // Estados
    const [resellers, setResellers] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [selectedReseller, setSelectedReseller] = useState<string>('')
    const [selectedClient, setSelectedClient] = useState<string>('')

    // ESTADO PRINCIPAL (Lista Plana - Fonte da Verdade)
    const [bagItems, setBagItems] = useState<any[]>([])

    const [barcode, setBarcode] = useState('')
    const [loading, setLoading] = useState(false)

    // NOVO: Estado para controlar a visualização
    const [isGrouped, setIsGrouped] = useState(true)

    // 1. Carregar Dados Iniciais
    useEffect(() => {
        async function loadInitialData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const userIsAdmin = user.user_metadata?.role === 'admin'

            // A. Revendedoras
            let query = supabase.from('resellers').select('*').order('name')
            // if (!userIsAdmin) { query = query.eq('email', user.email) } // Descomente se precisar do filtro
            const { data: resellersData } = await query

            if (resellersData) {
                setResellers(resellersData)
                const match = resellersData.find(r => r.email === user.email)
                if (match) setSelectedReseller(match.id)
            }

            // B. Clientes
            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, name')
                .order('name')
            setClients(clientsData || [])
        }
        loadInitialData()
    }, [])

    useEffect(() => {
        barcodeInputRef.current?.focus()
    }, [bagItems])

    // --- LÓGICA DE AGRUPAMENTO (Memoizada) ---
    // Isso transforma a lista plana em lista agrupada sem alterar os dados originais
    const groupedItems = useMemo(() => {
        const groups: Record<string, any> = {}

        bagItems.forEach((item) => {
            // Usa o ID da variação como chave única
            if (!groups[item.variant_id]) {
                groups[item.variant_id] = {
                    ...item,
                    quantity: 0,
                    totalPrice: 0
                }
            }
            groups[item.variant_id].quantity += 1
            groups[item.variant_id].totalPrice += item.price
        })

        return Object.values(groups)
    }, [bagItems])

    // 2. Adicionar Item
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanBarcode = barcode.trim()
        if (!cleanBarcode) return

        const { data: variant, error } = await supabase
            .from('product_variants')
            .select(`
                id, size, color, stock_quantity, barcode,
                products ( title, base_price ) 
            `)
            .eq('barcode', cleanBarcode)
            .maybeSingle()

        if (error || !variant) {
            toast.error('Produto não encontrado!')
            setBarcode('')
            return
        }

        // Verifica estoque considerando o que já está na sacola atual
        const itemsInBag = bagItems.filter(i => i.variant_id === variant.id).length
        if (variant.stock_quantity - itemsInBag <= 0) {
            toast.error(`Sem estoque físico! (Disp: ${variant.stock_quantity})`)
            setBarcode('')
            return
        }

        const newItem = {
            variant_id: variant.id,
            title: variant.products?.title || 'Produto',
            size: variant.size,
            color: variant.color,
            price: (variant.products as any)?.base_price || 0,
            barcode: variant.barcode
        }

        setBagItems([...bagItems, newItem])
        toast.success('Adicionado!')
        setBarcode('')
    }

    // Remover Item Individual (Modo Lista)
    const handleRemoveItem = (index: number) => {
        const newItems = [...bagItems]
        newItems.splice(index, 1)
        setBagItems(newItems)
    }

    // Remover Grupo Inteiro (Modo Agrupado)
    const handleRemoveGroup = (variantId: string) => {
        if (!confirm("Remover todos os itens deste produto da sacola?")) return
        const newItems = bagItems.filter(item => item.variant_id !== variantId)
        setBagItems(newItems)
    }

    // 3. Finalizar
    const handleFinish = async () => {
        if (!selectedReseller) return toast.error('Selecione uma revendedora!')
        if (!selectedClient) return toast.error('Selecione o Cliente Final!')
        if (bagItems.length === 0) return toast.error('A sacola está vazia!')

        setLoading(true)

        try {
            const totalItems = bagItems.length
            const totalValue = bagItems.reduce((acc, item) => acc + item.price, 0)

            const { data: consignment, error: consError } = await supabase
                .from('consignments')
                .insert({
                    reseller_id: selectedReseller,
                    client_id: selectedClient || null,
                    total_items: totalItems,
                    total_value: totalValue,
                    status: 'open'
                })
                .select()
                .single()

            if (consError) throw consError

            // Insere Itens (Aqui usamos o bagItems original, pois o banco espera 1 por linha)
            // Se quiser salvar agrupado no banco, a lógica mudaria aqui, mas geralmente consignment_items é linha a linha ou tem coluna quantity
            // Vamos manter linha a linha por enquanto para compatibilidade com seu banco atual
            for (const item of bagItems) {
                await supabase.from('consignment_items').insert({
                    consignment_id: consignment.id,
                    product_variant_id: item.variant_id,
                    quantity: 1,
                    unit_price: item.price
                })

                // Baixa estoque
                const { data: currentVariant } = await supabase
                    .from('product_variants')
                    .select('stock_quantity')
                    .eq('id', item.variant_id)
                    .single()

                if (currentVariant) {
                    await supabase
                        .from('product_variants')
                        .update({ stock_quantity: currentVariant.stock_quantity - 1 })
                        .eq('id', item.variant_id)
                }
            }

            toast.success('Sacola criada com sucesso!')
            router.push('/consignments')

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao criar sacola', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const totalValue = bagItems.reduce((acc, item) => acc + item.price, 0)

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShoppingBag className="w-8 h-8" /> Nova Sacola
                    </h1>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total da Sacola</p>
                    <p className="text-2xl font-bold text-green-600">
                        R$ {totalValue.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ESQUERDA: Controles */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">1. Dados da Saída</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Revendedora</label>
                                <Select value={selectedReseller} onValueChange={setSelectedReseller}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {resellers.map((r) => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <UserCircle className="w-3 h-3" /> Cliente Final
                                </label>
                                <Select value={selectedClient} onValueChange={setSelectedClient}>
                                    <SelectTrigger className="bg-blue-50/50 border-blue-200">
                                        <SelectValue placeholder="Selecione o cliente..." />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {clients.length === 0 && <div className="p-2 text-xs text-center text-muted-foreground">Nenhum cliente cadastrado</div>}
                                        {clients.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ScanBarcode className="w-5 h-5 text-green-600" /> 2. Bipar Produtos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        ref={barcodeInputRef}
                                        placeholder="Código de barras..."
                                        value={barcode}
                                        onChange={e => setBarcode(e.target.value)}
                                        className="focus-visible:ring-green-500"
                                        autoFocus
                                    />
                                    <Button type="submit" size="icon" className="bg-green-600 hover:bg-green-700">
                                        <ScanBarcode className="w-4 h-4" />
                                    </Button>
                                </div>
                            </form>

                            <div className="pt-6 border-t mt-6">
                                <Button
                                    className="w-full h-12 text-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-md"
                                    onClick={handleFinish}
                                    disabled={loading || bagItems.length === 0 || !selectedReseller || !selectedClient}
                                >
                                    {loading ? 'Processando...' : 'Finalizar Saída'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* DIREITA: Lista de Itens */}
                <Card className="col-span-2 min-h-[500px] flex flex-col">
                    <CardHeader className="border-b bg-neutral-50/50 flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base">
                            Itens ({bagItems.length})
                        </CardTitle>

                        {/* --- BOTÃO DE AGRUPAR --- */}
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="group-mode" className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                                {isGrouped ? <Layers className="w-3 h-3" /> : <List className="w-3 h-3" />}
                                {isGrouped ? 'Agrupado' : 'Lista Simples'}
                            </Label>
                            <Switch
                                id="group-mode"
                                checked={isGrouped}
                                onCheckedChange={setIsGrouped}
                            />
                        </div>
                    </CardHeader>

                    <div className="flex-1 overflow-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Variação</TableHead>
                                    {isGrouped && <TableHead className="text-center">Qtd.</TableHead>}
                                    <TableHead>Preço {isGrouped && 'Unit.'}</TableHead>
                                    {isGrouped && <TableHead>Subtotal</TableHead>}
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bagItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={isGrouped ? 6 : 4} className="h-[300px] text-center text-muted-foreground">Bipe os produtos...</TableCell></TableRow>
                                ) : (
                                    <>
                                        {/* RENDERIZAÇÃO CONDICIONAL: AGRUPADO OU LISTA */}
                                        {isGrouped ? (
                                            // --- MODO AGRUPADO ---
                                            groupedItems.map((item) => (
                                                <TableRow key={item.variant_id}>
                                                    <TableCell className="font-medium">
                                                        {item.title}
                                                        <span className="block text-xs text-muted-foreground font-mono">{item.barcode}</span>
                                                    </TableCell>
                                                    <TableCell>{item.size} - {item.color}</TableCell>
                                                    <TableCell className="text-center font-bold bg-neutral-50">
                                                        {item.quantity}x
                                                    </TableCell>
                                                    <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                                                    <TableCell className="font-medium text-green-700">
                                                        R$ {item.totalPrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveGroup(item.variant_id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            // --- MODO LISTA SIMPLES (Original) ---
                                            bagItems.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">
                                                        {item.title}
                                                        <span className="block text-xs text-muted-foreground font-mono">{item.barcode}</span>
                                                    </TableCell>
                                                    <TableCell>{item.size} - {item.color}</TableCell>
                                                    <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>
    )
}