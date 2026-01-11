'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from "sonner" // Importação correta do Sonner

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
        size: z.string().min(1, "Tam. obrigatório"),
        color: z.string().min(1, "Cor obrigatória"),
        barcode: z.string().min(1, "Cód. Barras obrigatório"),
        stock_quantity: z.coerce.number().min(0)
    })).min(1, "Adicione pelo menos uma variação")
})

type ProductFormValues = z.infer<typeof productSchema>

export default function NewProductPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            title: '',
            base_price: 0,
            variants: [{ size: 'UN', color: 'Padrão', barcode: '', stock_quantity: 0 }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "variants"
    })

    async function onSubmit(data: ProductFormValues) {
        setIsLoading(true)
        try {
            // 1. Salvar Produto Pai
            const { data: productData, error: productError } = await supabase
                .from('products')
                .insert({
                    title: data.title,
                    category: data.category,
                    base_price: data.base_price,
                    cost_price: data.cost_price || 0
                })
                .select()
                .single()

            if (productError) throw productError

            // 2. Salvar Variantes
            const variantsToInsert = data.variants.map(variant => ({
                product_id: productData.id,
                size: variant.size,
                color: variant.color,
                barcode: variant.barcode,
                stock_quantity: variant.stock_quantity
            }))

            const { error: variantsError } = await supabase
                .from('product_variants')
                .insert(variantsToInsert)

            if (variantsError) throw variantsError

            // Sucesso! Mostra notificação bonita
            toast.success('Produto criado com sucesso!', {
                description: `${data.title} e suas variações foram salvas.`,
            })

            // Opcional: Limpar formulário ou redirecionar
            // router.push('/products') 

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao salvar produto', {
                description: error.message
            })
        } finally {
            setIsLoading(false)
        }
    }

    const generateBarcode = (index: number) => {
        const randomCode = Math.floor(Math.random() * 90000000) + 10000000
        form.setValue(`variants.${index}.barcode`, randomCode.toString())
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <h1 className="text-3xl font-bold text-neutral-900">Novo Produto</h1>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                <Card>
                    <CardHeader>
                        <CardTitle>Dados Gerais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Nome do Produto</Label>
                            <Input {...form.register('title')} placeholder="Ex: Biquíni Asa Delta" />
                            {form.formState.errors.title && <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>}
                        </div>

                        <div>
                            <Label>Categoria</Label>
                            <Input {...form.register('category')} placeholder="Ex: Praia" />
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
                                        <TableCell>
                                            <Input {...form.register(`variants.${index}.size`)} placeholder="P" />
                                        </TableCell>
                                        <TableCell>
                                            <Input {...form.register(`variants.${index}.color`)} placeholder="Preto" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Input {...form.register(`variants.${index}.barcode`)} placeholder="Scan..." />
                                                <Button type="button" variant="ghost" size="icon" title="Gerar" onClick={() => generateBarcode(index)}>
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
                        {form.formState.errors.variants && <p className="text-red-500 text-sm mt-2">{form.formState.errors.variants.message}</p>}
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Produto</>}
                    </Button>
                </div>

            </form>
        </div>
    )
}