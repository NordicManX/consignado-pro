export interface Product {
    id: string;
    title: string;
    description: string | null;
    base_price: number;
    cost_price: number;
    category: string | null;
    active: boolean;
}

export interface ProductVariant {
    id: string;
    product_id: string;
    size: string;
    color: string;
    barcode: string;
    stock_quantity: number;
}

export interface Reseller {
    id: string;
    name: string;
    cpf: string | null;
    phone: string | null;
    default_commission_percent: number;
    credit_limit: number;
    active: boolean;
}

// Tipo auxiliar para quando buscarmos o produto com suas variantes
export interface ProductWithVariants extends Product {
    variants: ProductVariant[];
}