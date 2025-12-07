<?php
// Supabase project settings (copiado de js/config.js)
define('SUPABASE_URL', 'https://nljeheupokqsvsuudlvt.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5samVoZXVwb2txc3ZzdXVkbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTMyODUsImV4cCI6MjA3NTc4OTI4NX0._SlcHYKtEbmDosDCVHNtLySgtlglnMnODBQH5O1QE70');
define('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5samVoZXVwb2txc3ZzdXVkbHZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDIxMzI4NSwiZXhwIjoyMDc1Nzg5Mjg1fQ.dimyud9clIsLjUlt-SEX0lE6Jw5obl81gZzzr89gIag'); // Pegue em Project Settings > API > service_role secret

// Credenciais do usuário do TimeSupa para login automático (usuário id 1)
// Preferência: definir via variáveis de ambiente TIMESUPA_AUTO_EMAIL e TIMESUPA_AUTO_PASSWORD.
// Fallback: arquivo local auto_login.php que retorna ['email' => '...', 'password' => '...']
define('AUTO_LOGIN_EMAIL', getenv('TIMESUPA_AUTO_EMAIL') ?: '');
define('AUTO_LOGIN_PASSWORD', getenv('TIMESUPA_AUTO_PASSWORD') ?: '');

function getAutoLoginCredentials()
{
    $email = AUTO_LOGIN_EMAIL;
    $password = AUTO_LOGIN_PASSWORD;

    if (!empty($email) && !empty($password)) {
        return ['email' => $email, 'password' => $password];
    }

    $localFile = __DIR__ . '/auto_login.php';
    if (file_exists($localFile)) {
        $data = require $localFile;
        if (is_array($data) && !empty($data['email']) && !empty($data['password'])) {
            return ['email' => $data['email'], 'password' => $data['password']];
        }
    }
    return ['email' => '', 'password' => ''];
}

/**
 * Cria uma sessão Supabase via GoTrue (grant_type=password) usando email/senha
 * Retorna access_token e refresh_token em caso de sucesso
 */
function createSupabaseSession($email, $password)
{
    if (empty($email) || empty($password)) {
        // tentar obter via fallback local
        $creds = getAutoLoginCredentials();
        $email = $creds['email'];
        $password = $creds['password'];
        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Credenciais não configuradas (email/senha)'];
        }
    }

    $url = rtrim(SUPABASE_URL, '/') . '/auth/v1/token?grant_type=password';
    $payload = json_encode(['email' => $email, 'password' => $password]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . SUPABASE_ANON_KEY
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($resp === false) {
        return ['success' => false, 'message' => 'Falha cURL: ' . $err];
    }

    $data = json_decode($resp, true);
    if ($httpCode >= 200 && $httpCode < 300 && isset($data['access_token']) && isset($data['refresh_token'])) {
        return [
            'success' => true,
            'access_token' => $data['access_token'],
            'refresh_token' => $data['refresh_token']
        ];
    }

    $message = isset($data['error_description']) ? $data['error_description'] : 'Resposta inválida do Supabase (' . $httpCode . ')';
    return ['success' => false, 'message' => $message, 'raw' => $data];
}
?>
