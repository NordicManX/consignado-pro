'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer } from 'lucide-react'

import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ConsignmentPrintPage() {
    const params = useParams()
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        async function load() {
            // Busca Sacola e Revendedora
            const { data: consignment } = await supabase
                .from('consignments')
                .select('*, resellers(*)')
                .eq('id', params.id)
                .single()

            // Busca Itens
            const { data: items } = await supabase
                .from('consignment_items')
                .select('*, product_variants(size, color, barcode, products(title))')
                .eq('consignment_id', params.id)

            setData({ consignment, items })
        }
        load()
    }, [params.id])

    if (!data) return <div className="p-10 text-center">Carregando documento...</div>

    return (
        <div className="bg-white min-h-screen p-8 text-black">

            {/* Botão Flutuante (Some na impressão) */}
            <div className="fixed top-4 right-4 print:hidden">
                <Button onClick={() => window.print()} className="bg-neutral-900 text-white hover:bg-neutral-800">
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Documento
                </Button>
            </div>

            {/* Cabeçalho */}
            <div className="border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider">Nordic Consig</h1>
                        <p className="text-sm text-neutral-600">Comprovante de Consignação / Romaneio</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">Sacola #{data.consignment.id.slice(0, 8)}</p>
                        <p>{format(new Date(data.consignment.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    </div>
                </div>
            </div>

            {/* Dados da Revendedora */}
            <div className="mb-8 p-4 border border-neutral-200 bg-neutral-50 rounded-sm">
                <h2 className="text-sm font-bold uppercase text-neutral-500 mb-2">Dados da Revendedora</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm">Nome:</p>
                        <p className="font-bold text-lg">{data.consignment.resellers.name}</p>
                    </div>
                    <div>
                        <p className="text-sm">Telefone:</p>
                        <p className="font-bold">{data.consignment.resellers.phone}</p>
                    </div>
                </div>
            </div>

            {/* Lista de Itens */}
            <div className="mb-8">
                <Table className="border border-black">
                    <TableHeader>
                        <TableRow className="border-b border-black hover:bg-transparent">
                            <TableHead className="text-black font-bold border-r border-black w-[50%]">PRODUTO</TableHead>
                            <TableHead className="text-black font-bold border-r border-black text-center">TAM/COR</TableHead>
                            <TableHead className="text-black font-bold border-r border-black text-center">QTD</TableHead>
                            <TableHead className="text-black font-bold text-right">VALOR UN.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items.map((item: any) => (
                            <TableRow key={item.id} className="border-b border-black/20 hover:bg-transparent">
                                <TableCell className="border-r border-black/20 py-2">
                                    {item.product_variants.products.title}
                                    <span className="block text-xs font-mono mt-1">{item.product_variants.barcode}</span>
                                </TableCell>
                                <TableCell className="border-r border-black/20 text-center py-2">
                                    {item.product_variants.size} - {item.product_variants.color}
                                </TableCell>
                                <TableCell className="border-r border-black/20 text-center font-bold py-2">
                                    {item.quantity}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                    R$ {item.unit_price.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Totais */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 space-y-2">
                    <div className="flex justify-between border-b border-black border-dashed pb-1">
                        <span>Total de Peças:</span>
                        <span className="font-bold">{data.consignment.total_items} un.</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-1">
                        <span>Valor Total da Sacola:</span>
                        <span>R$ {data.consignment.total_value.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Termos e Assinatura */}
            <div className="text-xs text-justify mb-8 text-neutral-600">
                <p className="mb-2">
                    DECLARAÇÃO: Declaro ter recebido os produtos listados acima em perfeitas condições.
                    Comprometo-me a devolvê-los na data combinada ou realizar o pagamento dos itens vendidos,
                    sob pena de cobrança judicial. A comissão de {data.consignment.resellers.default_commission_percent}%
                    será descontada apenas sobre os itens efetivamente vendidos e pagos.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-16 mt-20">
                <div className="text-center">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold">Nordic Consig</p>
                        <p className="text-xs">Responsável</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold">{data.consignment.resellers.name}</p>
                        <p className="text-xs">Revendedora</p>
                    </div>
                </div>
            </div>
        </div>
    )
}