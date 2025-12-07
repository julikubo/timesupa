<?php
/**
 * API: Facial Recognition Login for TimeSupa
 * Autentica via reconhecimento facial e cria sessão Supabase
 */
session_start();

header('Content-Type: application/json');

// Segredos/credenciais Supabase (URL, anonKey, e credenciais do usuário 1)
require_once __DIR__ . '/supabase_secrets.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $face_name = $data['face_name'] ?? null;

    if (!$face_name) {
        echo json_encode(['success' => false, 'message' => 'Nome do rosto não fornecido']);
        exit;
    }

    // Load face-to-user mapping: /proj/cam/face_user_mapping.php
    $mappingPath = __DIR__ . '/../../cam/face_user_mapping.php';
    if (!file_exists($mappingPath)) {
        echo json_encode(['success' => false, 'message' => 'Mapa de rostos não encontrado']);
        exit;
    }
    $face_mapping = require $mappingPath;

    // Verificar se o rosto está mapeado
    if (!isset($face_mapping[$face_name]) || $face_mapping[$face_name] === null) {
        echo json_encode([
            'success' => false,
            'message' => 'Rosto reconhecido mas não mapeado para nenhum usuário',
            'face_name' => $face_name
        ]);
        exit;
    }

    $user_id = (int)$face_mapping[$face_name];

    // Apenas usuário id 1, conforme solicitado
    if ($user_id !== 1) {
        echo json_encode([
            'success' => false,
            'message' => 'Este usuário não está habilitado para login automático',
            'user_id' => $user_id
        ]);
        exit;
    }

    // Criar sessão Supabase usando email/senha configurados (sem expor senha ao cliente)
    $session = createSupabaseSession(AUTO_LOGIN_EMAIL, AUTO_LOGIN_PASSWORD);
    if (!$session['success']) {
        echo json_encode([
            'success' => false,
            'message' => 'Falha ao gerar sessão Supabase: ' . ($session['message'] ?? 'erro desconhecido')
        ]);
        exit;
    }

    // Redirecionar para login do TimeSupa com tokens no hash (não ficam em logs do servidor)
    $access = urlencode($session['access_token']);
    $refresh = urlencode($session['refresh_token']);
    $redirectUrl = '../login.html#access_token=' . $access . '&refresh_token=' . $refresh;

    echo json_encode([
        'success' => true,
        'message' => 'Login facial OK, iniciando sessão no TimeSupa',
        'redirect' => $redirectUrl
    ]);
    exit;

} catch (Exception $e) {
    error_log('Facial Login Error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>
