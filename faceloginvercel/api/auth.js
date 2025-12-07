export default async function handler(req, res) {
    // Configurações CORS para permitir chamadas do frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { face_name } = req.body;

        if (!face_name) {
            return res.status(400).json({ success: false, message: 'Nome do rosto não fornecido' });
        }

        // Mapeamento simples de segurança (Backend)
        // Aqui você define quais rostos têm permissão para logar e com qual usuário
        // Em um sistema real, isso viria de um banco de dados.
        // Para este protótipo, vamos permitir que o rosto 'leandro' (ou qualquer um reconhecido) logue como admin.

        // Lista de rostos permitidos (nomes dos arquivos sem extensão em labeled_images)
        // Se quiser restringir, adicione lógica aqui. Por enquanto, aceitamos qualquer rosto válido.

        // Credenciais do Admin (Seguras aqui no Backend)
        // Idealmente, use process.env.AUTO_EMAIL e process.env.AUTO_PASSWORD no Vercel
        const EMAIL = process.env.AUTO_EMAIL || 'julikubo@gmail.com';
        const PASSWORD = process.env.AUTO_PASSWORD || 'leandrok';

        const SUPABASE_URL = 'https://nljeheupokqsvsuudlvt.supabase.co';
        const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5samVoZXVwb2txc3ZzdXVkbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTMyODUsImV4cCI6MjA3NTc4OTI4NX0._SlcHYKtEbmDosDCVHNtLySgtlglnMnODBQH5O1QE70';

        // Autenticação via API REST do Supabase (GoTrue)
        const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

        const authResponse = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
                email: EMAIL,
                password: PASSWORD
            })
        });

        const data = await authResponse.json();

        if (!authResponse.ok) {
            throw new Error(data.error_description || data.msg || 'Falha na autenticação Supabase');
        }

        // Sucesso! Retornamos os tokens para o frontend
        return res.status(200).json({
            success: true,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: {
                email: data.user.email,
                id: data.user.id
            }
        });

    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno de autenticação',
            error: error.message
        });
    }
}
