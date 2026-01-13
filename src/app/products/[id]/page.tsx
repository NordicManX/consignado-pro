'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from "sonner"

import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Schema de Validação
const productSchema = z.object({
    title: z.string().min(3, "Nome do produto é obrigatório"),
    category: z.string().optional(),
    base_price: z.coerce.number().min(0.01, "Preço deve ser maior que 0"),
    cost_price: z.coerce.number().optional(),
    variants: z.array(z.object({
        id: z.string().optional(), // ID opcional para saber se é edição
        size: z.string().min(1, "Tam. obrigatório"),
        color: z.string().min(1, "Cor obrigatória"),
        barcode: z.string().min(1, "Cód. Barras obrigatório"),
        stock_quantity: z.coerce.number().min(0)
    })).min(1, "Adicione pelo menos uma variação")
})

type ProductFormValues = z.infer<typeof productSchema>

export default function EditProductPage() {
    const router = useRouter()
    const params = useParams()
    const productId = params.id as string

    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            title: '',
            base_price: 0,
            variants: []
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "variants"
    })

    // 1. CARREGAR DADOS DO PRODUTO
    useEffect(() => {
        async function loadProduct() {
            if (!productId) return

            const { data, error } = await supabase
                .from('products')
                .select('*, product_variants(*)')
                .eq('id', productId)
                .single()

            if (error) {
                toast.error('Erro ao carregar produto')
                router.push('/products')
                return
            }

            // Preenche o formulário com os dados do banco
            form.reset({
                title: data.title,
                category: data.category || '',
                base_price: data.base_price,
                cost_price: data.cost_price || 0,
                variants: data.product_variants.map((v: any) => ({
                    id: v.id, // O ID VEM AQUI
                    size: v.size,
                    color: v.color,
                    barcode: v.barcode,
                    stock_quantity: v.stock_quantity
                }))
            })
            setIsFetching(false)
        }
        loadProduct()
    }, [productId, router, form])

    // 2. SALVAR ALTERAÇÕES
    async function onSubmit(data: ProductFormValues) {
        setIsLoading(true)
        try {
            // A. Atualiza Produto Pai
            const { error: productError } = await supabase
                .from('products')
                .update({
                    title: data.title,
                    category: data.category,
                    base_price: data.base_price,
                    cost_price: data.cost_price || 0
                })
                .eq('id', productId)

            if (productError) throw productError

            // B. Atualiza Variantes (Upsert)
            const variantsToUpsert = data.variants.map(variant => {
                const variantData: any = {
                    product_id: productId,
                    size: variant.size,
                    color: variant.color,
                    barcode: variant.barcode,
                    stock_quantity: variant.stock_quantity
                }
                // Se tiver ID, mantém para atualizar. Se não, o banco cria novo.
                if (variant.id) {
                    variantData.id = variant.id
                }
                return variantData
            })

            const { error: variantsError } = await supabase
                .from('product_variants')
                .upsert(variantsToUpsert)

            if (variantsError) throw variantsError

            toast.success('Produto atualizado com sucesso!')
            router.push('/products')

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao atualizar', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const generateBarcode = (index: number) => {
        const randomCode = Math.floor(Math.random() * 90000000) + 10000000
        form.setValue(`variants.${index}.barcode`, randomCode.toString())
    }

    if (isFetching) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <h1 className="text-3xl font-bold text-neutral-900">Editar Produto</h1>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Dados Gerais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Nome do Produto</Label>
                            <Input {...form.register('title')} />
                            {form.formState.errors.title && <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>}
                        </div>
                        <div>
                            <Label>Categoria</Label>
                            <Input {...form.register('category')} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Preço de Venda (R$)</Label>
                                <Input type="number" step="0.01" {...form.register('base_price')} />
                            </div>
                            <div>
                                <Label>Custo (R$)</Label>
                                <Input type="number" step="0.01" {...form.register('cost_price')} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Grade e Estoque</CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ size: '', color: '', barcode: '', stock_quantity: 0 })}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Variação
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Tam.</TableHead>
                                    <TableHead className="w-[150px]">Cor</TableHead>
                                    <TableHead>Cód. Barras</TableHead>
                                    <TableHead className="w-[100px]">Estoque</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        {/* --- CAMPO OCULTO DO ID --- */}
                                        <TableCell className="hidden">
                                            <input type="hidden" {...form.register(`variants.${index}.id`)} />
                                        </TableCell>

                                        <TableCell>
                                            <Input {...form.register(`variants.${index}.size`)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input {...form.register(`variants.${index}.color`)} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Input {...form.register(`variants.${index}.barcode`)} />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => generateBarcode(index)}>
                                                    <span className="text-xs">🎲</span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" {...form.register(`variants.${index}.stock_quantity`)} />
                                        </TableCell>
                                        <TableCell>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Atualizar Produto</>}
                    </Button>
                </div>
            </form>
        </div>
    )
}