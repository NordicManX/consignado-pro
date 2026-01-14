'use server'

import { createClient } from '@supabase/supabase-js'

// IMPORTANTE: Certifique-se de ter essa chave no seu .env.local
// SUPABASE_SERVICE_ROLE_KEY=...
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function listSystemUsers() {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
        console.error('Erro ao listar:', error)
        return []
    }
    return users
}

export async function createSystemUser(data: { email: string, password?: string, fullName: string, role?: string }) {
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password || '12345678', // Senha padrão se não for informada
        email_confirm: true,
        user_metadata: {
            full_name: data.fullName,
            role: data.role || 'user' // <--- AQUI: Salva se é admin ou user na criação
        }
    })

    if (error) return { success: false, message: error.message }
    return { success: true, user }
}

export async function updateSystemUser(id: string, data: { email: string, password?: string, fullName: string, role?: string }) {
    // Prepara os dados para atualização
    const updatePayload: any = {
        email: data.email,
        user_metadata: {
            full_name: data.fullName,
            role: data.role // <--- AQUI: O pulo do gato! Atualiza a permissão no metadata
        }
    }

    // Só atualiza a senha se vier alguma coisa (evita sobrescrever com vazio)
    if (data.password && data.password.trim() !== '') {
        updatePayload.password = data.password
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload)

    if (error) return { success: false, message: error.message }
    return { success: true, user }
}

export async function deleteSystemUser(id: string) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) return { success: false, message: error.message }
    return { success: true }
}