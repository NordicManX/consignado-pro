'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer, Package } from 'lucide-react'

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
        <div className="bg-white min-h-screen p-8 text-black font-sans">

            {/* Botão Flutuante (Some na impressão) */}
            <div className="fixed top-4 right-4 print:hidden">
                <Button onClick={() => window.print()} className="bg-neutral-900 text-white hover:bg-neutral-800 shadow-xl">
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Documento
                </Button>
            </div>

            {/* --- CABEÇALHO NOVO COM LOGO --- */}
            <div className="border-b-2 border-neutral-800 pb-6 mb-8">
                <div className="flex justify-between items-start">

                    {/* Logo e Identidade Visual */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            {/* Ícone da Caixa Verde (Apenas os traços verdes agora) */}
                            <Package className="w-8 h-8 text-green-600 print:text-black stroke-[1.5]" />

                            {/* Texto do Logo */}
                            <div>
                                <h1 className="text-2xl font-bold leading-none text-neutral-900">
                                    Consignados <span className="text-green-600 print:text-black">Pro</span>
                                </h1>
                            </div>
                        </div>
                        {/* Slogan ajustado */}
                        <p className="text-xs text-neutral-500 pl-[44px] -mt-1 font-medium">Gestão Inteligente</p>

                        <p className="text-sm text-neutral-400 mt-4 uppercase tracking-widest font-bold">Romaneio de Conferência</p>
                    </div>

                    {/* Dados da Sacola (Direita) */}
                    <div className="text-right">
                        <p className="text-sm text-neutral-500">Sacola ID</p>
                        <p className="font-mono font-bold text-lg mb-1">#{data.consignment.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-neutral-600">
                            {format(new Date(data.consignment.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                    </div>
                </div>
            </div>
            {/* ------------------------------- */}

            {/* Dados da Revendedora */}
            <div className="mb-8 bg-neutral-50 p-6 rounded-lg border border-neutral-100 print:border-neutral-300 print:bg-transparent">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Revendedora</p>
                        <p className="font-bold text-xl text-neutral-900">{data.consignment.resellers.name}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Contato</p>
                        <p className="font-medium text-lg text-neutral-900">{data.consignment.resellers.phone}</p>
                    </div>
                </div>
            </div>

            {/* Lista de Itens */}
            <div className="mb-8">
                <Table className="border-collapse w-full">
                    <TableHeader>
                        <TableRow className="border-b-2 border-neutral-800">
                            <TableHead className="text-black font-extrabold text-xs uppercase tracking-wider py-3 w-[50%]">Produto / Código</TableHead>
                            <TableHead className="text-black font-extrabold text-xs uppercase tracking-wider py-3 text-center">Detalhes</TableHead>
                            <TableHead className="text-black font-extrabold text-xs uppercase tracking-wider py-3 text-center">Qtd</TableHead>
                            <TableHead className="text-black font-extrabold text-xs uppercase tracking-wider py-3 text-right">Valor Un.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items.map((item: any) => (
                            <TableRow key={item.id} className="border-b border-neutral-200 break-inside-avoid">
                                <TableCell className="py-3 align-top">
                                    <span className="font-bold text-neutral-900 block">{item.product_variants.products.title}</span>
                                    <span className="text-xs font-mono text-neutral-500">{item.product_variants.barcode}</span>
                                </TableCell>
                                <TableCell className="text-center py-3 align-top">
                                    {item.product_variants.size} <span className="text-neutral-300">|</span> {item.product_variants.color}
                                </TableCell>
                                <TableCell className="text-center font-bold py-3 text-lg align-top">
                                    {item.quantity}
                                </TableCell>
                                <TableCell className="text-right py-3 align-top">
                                    R$ {item.unit_price.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Totais */}
            <div className="flex justify-end mb-16 break-inside-avoid">
                <div className="w-1/2 md:w-1/3 bg-neutral-50 p-4 rounded border border-neutral-100 print:bg-transparent print:border-none">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="text-neutral-600">Total de Peças:</span>
                        <span className="font-bold">{data.consignment.total_items} un.</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                        <span className="text-lg font-bold">Valor Total:</span>
                        <span className="text-lg font-bold text-black">R$ {data.consignment.total_value.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Termos e Assinatura */}
            <div className="text-[10px] text-justify mb-12 text-neutral-500 leading-relaxed border p-4 rounded break-inside-avoid">
                <p>
                    <strong>TERMO DE RESPONSABILIDADE:</strong> Declaro ter recebido os produtos listados acima em perfeito estado de conservação.
                    Comprometo-me a devolvê-los na data estipulada ou efetuar o pagamento correspondente aos itens não devolvidos.
                    Estou ciente de que a comissão acordada ({data.consignment.resellers.default_commission_percent}%) incidirá apenas sobre as vendas efetivadas.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-16 mt-8 break-inside-avoid">
                <div className="text-center">
                    <div className="border-t border-neutral-400 pt-2 w-3/4 mx-auto">
                        <p className="font-bold text-sm">Consignados Pro</p>
                        <p className="text-[10px] uppercase text-neutral-500">Responsável</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t border-neutral-400 pt-2 w-3/4 mx-auto">
                        <p className="font-bold text-sm">{data.consignment.resellers.name}</p>
                        <p className="text-[10px] uppercase text-neutral-500">Assinatura da Revendedora</p>
                    </div>
                </div>
            </div>
        </div>
    )
}