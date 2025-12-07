// Configurações do Supabase
const SUPABASE_CONFIG = {
    // Credenciais do Supabase
    url: 'https://nljeheupokqsvsuudlvt.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5samVoZXVwb2txc3ZzdXVkbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTMyODUsImV4cCI6MjA3NTc4OTI4NX0._SlcHYKtEbmDosDCVHNtLySgtlglnMnODBQH5O1QE70', // Chave anônima do Supabase
    
    // Configurações opcionais
    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
};

// Inicializar cliente Supabase
let supabase;

// Função para inicializar Supabase
function initSupabase() {
    if (typeof supabase === 'undefined') {
        // Verificar se as configurações foram definidas
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
            console.error('❌ Configure suas credenciais do Supabase em config.js');
            showAlert('Configure suas credenciais do Supabase primeiro!', 'error');
            return false;
        }
        
        try {
            supabase = window.supabase.createClient(
                SUPABASE_CONFIG.url, 
                SUPABASE_CONFIG.anonKey,
                SUPABASE_CONFIG.options
            );
            console.log('✅ Supabase inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            showAlert('Erro ao conectar com Supabase: ' + error.message, 'error');
            return false;
        }
    }
    return true;
}

// Função para mostrar alertas
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Inserir no topo da página
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Verificar se está em ambiente de desenvolvimento
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isDevelopment) {
    console.log('🔧 Modo desenvolvimento ativo');
}

// Diagnóstico: testar alcance do Supabase
async function checkSupabaseReachability() {
    try {
        const url = `${SUPABASE_CONFIG.url}/auth/v1/settings`;
        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
            }
        });
        if (!resp.ok) {
            console.error('Supabase retornou status não OK:', resp.status);
            return false;
        }
        console.log('🔌 Conectividade com Supabase OK');
        return true;
    } catch (err) {
        console.error('🌐 Falha de rede ao acessar Supabase:', err);
        return false;
    }
}