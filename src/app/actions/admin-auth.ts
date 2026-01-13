'use server'

import { createClient } from '@supabase/supabase-js'

// Cria um cliente com superpoderes (apenas no servidor)
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

export async function createSystemUser(data: any) {
    const { email, password, fullName } = data

    // 1. Cria o usuário no Auth do Supabase
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Já confirma o email automaticamente
        user_metadata: { full_name: fullName }
    })

    if (error) {
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Usuário criado com sucesso!' }
}

export async function listSystemUsers() {
    // Lista todos os usuários do sistema
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
        console.error('Erro ao listar usuários', error)
        return []
    }

    return users
}

export async function deleteSystemUser(userId: string) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Usuário removido.' }
}

export async function updateSystemUser(userId: string, data: any) {
    const updates: any = {
        email: data.email,
        user_metadata: { full_name: data.fullName }
    }

    // Só atualiza a senha se for informada (e tiver mais de 6 caracteres)
    if (data.password && data.password.trim().length >= 6) {
        updates.password = data.password
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)

    if (error) {
        return { success: false, message: error.message }
    }

    return { success: true, message: 'Dados atualizados com sucesso!' }
}