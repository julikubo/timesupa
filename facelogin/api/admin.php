<?php
header('Content-Type: application/json');
require_once '../supabase_secrets.php';

// Verificar chave de serviço
if (SUPABASE_SERVICE_ROLE_KEY === 'SERVICE_KEY_AQUI') {
    echo json_encode(['success' => false, 'error' => 'Service Role Key não configurada no backend']);
    exit;
}

// Ações
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

if ($action === 'list_users') {
    // Listar usuários via API de Admin do Supabase
    $url = SUPABASE_URL . '/auth/v1/admin/users';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $users = json_decode($response, true);
        echo json_encode(['success' => true, 'users' => $users['users'] ?? []]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Erro ao listar usuários', 'details' => $response]);
    }
    
} elseif ($action === 'update_password') {
    $userId = $input['user_id'] ?? '';
    $newPassword = $input['password'] ?? '';
    
    if (!$userId || !$newPassword) {
        echo json_encode(['success' => false, 'error' => 'ID e Senha obrigatórios']);
        exit;
    }
    
    // Atualizar usuário via API
    $url = SUPABASE_URL . '/auth/v1/admin/users/' . $userId;
    $data = json_encode(['password' => $newPassword]);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . SUPABASE_SERVICE_ROLE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        echo json_encode(['success' => true, 'message' => 'Senha atualizada com sucesso']);
    } else {
         echo json_encode(['success' => false, 'error' => 'Erro ao alterar senha', 'details' => $response]);
    }

} else {
    echo json_encode(['success' => false, 'error' => 'Ação inválida']);
}
