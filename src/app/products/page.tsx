'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
// 1. Adicionei o Pencil aqui nos imports
import { Plus, Search, Trash2, Package, ChevronDown, ChevronUp, Barcode, Pencil } from 'lucide-react'
import { toast } from "sonner"

import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// --- Tipos Atualizados ---
type Variant = {
    id: string
    size: string
    color: string
    barcode: string
    stock_quantity: number
}

type ProductWithVariants = {
    id: string
    title: string
    category: string
    base_price: number
    product_variants: Variant[]
}

// --- Componente de Linha ---
function ProductRow({ product, onDelete }: { product: ProductWithVariants, onDelete: (id: string) => void }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const totalStock = product.product_variants.reduce((acc, curr) => acc + curr.stock_quantity, 0)

    return (
        <>
            {/* Linha do Pai */}
            <TableRow className={isExpanded ? "bg-neutral-50 border-b-0" : ""}>
                <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span className="text-base">{product.title}</span>
                        <span className="text-xs text-muted-foreground">{product.category || 'Sem Categoria'}</span>
                    </div>
                </TableCell>
                <TableCell>
                    R$ {product.base_price.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                    <Badge variant="secondary" className="mr-2">
                        {totalStock} un. totais
                    </Badge>
                </TableCell>
                <TableCell className="text-center">
                    {/* Botão Mágico que expande */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="gap-2"
                    >
                        {product.product_variants.length} variações
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </TableCell>

                {/* --- AQUI ESTÁ A MUDANÇA: Coluna de Ações --- */}
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">

                        {/* Botão de Editar */}
                        <Link href={`/products/${product.id}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-blue-50 hover:text-blue-600" title="Editar">
                                <Pencil className="w-4 h-4" />
                            </Button>
                        </Link>

                        {/* Botão de Excluir */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onDelete(product.id)}
                            title="Excluir"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>

            {/* Linha dos Filhos (Só aparece se isExpanded for true) */}
            {isExpanded && (
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableCell colSpan={5} className="p-4 pt-0">
                        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-100 hover:bg-neutral-100">
                                        <TableHead className="h-8 text-xs w-[100px]">Tamanho</TableHead>
                                        <TableHead className="h-8 text-xs">Cor / Estampa</TableHead>
                                        <TableHead className="h-8 text-xs">Código de Barras</TableHead>
                                        <TableHead className="h-8 text-xs text-right">Estoque Físico</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {product.product_variants.map((variant) => (
                                        <TableRow key={variant.id} className="hover:bg-transparent">
                                            <TableCell className="py-2 text-sm font-bold">{variant.size}</TableCell>
                                            <TableCell className="py-2 text-sm">{variant.color}</TableCell>
                                            <TableCell className="py-2 text-sm font-mono text-muted-foreground flex items-center gap-2">
                                                <Barcode className="w-3 h-3" />
                                                {variant.barcode}
                                            </TableCell>
                                            <TableCell className="py-2 text-sm text-right">
                                                <span className={variant.stock_quantity === 0 ? "text-red-500 font-bold" : ""}>
                                                    {variant.stock_quantity}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}

// --- Página Principal ---
export default function ProductsListPage() {
    const [products, setProducts] = useState<ProductWithVariants[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchProducts = async () => {
        setLoading(true)

        // Query atualizada: Trazemos o objeto variants inteiro (*)
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        product_variants (*)
      `)
            .order('created_at', { ascending: false })

        if (error) {
            toast.error('Erro ao carregar produtos')
            console.error(error)
        } else {
            setProducts(data as any)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? Isso apagará todas as variações e estoque deste produto.')) return
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) toast.error('Erro ao deletar')
        else {
            toast.success('Produto deletado')
            fetchProducts()
        }
    }

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
                    <p className="text-muted-foreground">Gerencie seu catálogo e estoque central.</p>
                </div>
                <Link href="/products/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" /> Novo Produto
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar produto..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Produto</TableHead>
                                    <TableHead>Preço Base</TableHead>
                                    <TableHead className="text-center">Estoque Total</TableHead>
                                    <TableHead className="text-center">Variações</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">Carregando estoque...</TableCell>
                                    </TableRow>
                                ) : filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center">
                                                <Package className="w-8 h-8 mb-2 opacity-50" />
                                                Nenhum produto encontrado.
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <ProductRow key={product.id} product={product} onDelete={handleDelete} />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}