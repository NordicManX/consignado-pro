'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Search, ScanBarcode, Trash2, ShoppingBag } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Tipos ---
type CartItem = {
    variant_id: string
    product_title: string
    size: string
    color: string
    price: number
    barcode: string
}

type Reseller = {
    id: string
    name: string
}

export default function NewConsignmentPage() {
    const router = useRouter()
    const barcodeInputRef = useRef<HTMLInputElement>(null)

    const [resellers, setResellers] = useState<Reseller[]>([])
    const [selectedResellerId, setSelectedResellerId] = useState<string>('')

    const [barcode, setBarcode] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)

    // 1. Carregar Revendedoras ao abrir
    useEffect(() => {
        supabase.from('resellers').select('id, name').order('name')
            .then(({ data }) => setResellers(data || []))
    }, [])

    // 2. Focar no input de código de barras sempre que atualizar o carrinho
    useEffect(() => {
        barcodeInputRef.current?.focus()
    }, [cart])

    // 3. Função Mágica: Adicionar item pelo código de barras
    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!barcode) return

        // Busca o produto pelo código
        const { data: variant, error } = await supabase
            .from('product_variants')
            .select(`
        id, size, color, barcode, stock_quantity,
        products (title, base_price)
      `)
            .eq('barcode', barcode)
            .single()

        if (error || !variant) {
            toast.error('Produto não encontrado!')
            setBarcode('') // Limpa para tentar de novo
            return
        }

        // Verifica se tem estoque
        if (variant.stock_quantity <= 0) {
            toast.warning('Produto sem estoque físico!')
            // Em consignado as vezes permite furar estoque, mas vamos avisar
        }

        // Adiciona ao carrinho visual
        const newItem: CartItem = {
            variant_id: variant.id,
            product_title: (variant.products as any).title,
            size: variant.size,
            color: variant.color,
            price: (variant.products as any).base_price,
            barcode: variant.barcode
        }

        setCart([newItem, ...cart]) // Adiciona no topo da lista
        setBarcode('') // Limpa o input para o próximo bip
        toast.success('Bipado!', { duration: 1000 })
    }

    // 4. Salvar a Sacola no Banco
    const handleFinish = async () => {
        if (!selectedResellerId) return toast.error('Selecione uma revendedora')
        if (cart.length === 0) return toast.error('A sacola está vazia')

        setLoading(true)
        try {
            const totalValue = cart.reduce((acc, item) => acc + item.price, 0)

            // A. Cria a Sacola (Header)
            const { data: consignment, error: consError } = await supabase
                .from('consignments')
                .insert({
                    reseller_id: selectedResellerId,
                    total_items: cart.length,
                    total_value: totalValue,
                    status: 'open'
                })
                .select()
                .single()

            if (consError) throw consError

            // B. Cria os Itens da Sacola
            // Agrupamos itens iguais? Por enquanto vamos salvar linha a linha para simplificar o retorno depois
            const itemsToInsert = cart.map(item => ({
                consignment_id: consignment.id,
                product_variant_id: item.variant_id,
                unit_price: item.price,
                quantity: 1
            }))

            const { error: itemsError } = await supabase
                .from('consignment_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            // C. Baixa no Estoque (Opcional, mas recomendado)
            // Nota: Num sistema real faríamos uma "RPC" (Procedure) para isso ser atômico
            for (const item of cart) {
                await supabase.rpc('decrement_stock', { variant_id: item.variant_id, qty: 1 })
                // Se não tiver a procedure, pode pular essa etapa ou fazer update normal
            }

            toast.success('Sacola criada com sucesso!')
            router.push('/consignments') // Volta para a lista ou vai para detalhes

        } catch (error: any) {
            toast.error('Erro ao finalizar', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-6 max-w-4xl h-screen flex flex-col">
            {/* Topo */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6" /> Nova Sacola
                    </h1>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total da Sacola</p>
                    <p className="text-2xl font-bold text-green-600">
                        R$ {cart.reduce((acc, item) => acc + item.price, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">

                {/* Esquerda: Controles */}
                <Card className="col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">1. Quem vai levar?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Revendedora</label>
                            <Select onValueChange={setSelectedResellerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {resellers.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <label className="text-sm font-medium">2. Bipar Produtos</label>
                            <form onSubmit={handleScan} className="flex gap-2">
                                <Input
                                    ref={barcodeInputRef}
                                    placeholder="Código de barras..."
                                    value={barcode}
                                    onChange={e => setBarcode(e.target.value)}
                                    autoFocus
                                />
                                <Button type="submit" size="icon">
                                    <ScanBarcode className="w-4 h-4" />
                                </Button>
                            </form>
                            <p className="text-xs text-muted-foreground">
                                Pressione Enter após bipar.
                            </p>
                        </div>

                        <Button
                            className="w-full mt-4"
                            size="lg"
                            onClick={handleFinish}
                            disabled={loading || cart.length === 0}
                        >
                            {loading ? 'Processando...' : 'Finalizar Saída'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Direita: Lista de Itens (O Carrinho) */}
                <Card className="col-span-2 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between">
                            <span>Itens na Sacola ({cart.length})</span>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-red-500 text-xs h-6">
                                    Limpar Tudo
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <div className="flex-1 overflow-auto p-0">
                        <Table>
                            <TableHeader className="bg-neutral-50 sticky top-0">
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Variação</TableHead>
                                    <TableHead className="text-right">Preço</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.product_title}</TableCell>
                                        <TableCell>
                                            <span className="bg-neutral-100 px-2 py-1 rounded text-xs mr-1">{item.size}</span>
                                            <span className="text-sm">{item.color}</span>
                                        </TableCell>
                                        <TableCell className="text-right">R$ {item.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-400 hover:text-red-600"
                                                onClick={() => setCart(cart.filter((_, i) => i !== index))}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>
    )
}