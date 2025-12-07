<?php
/**
 * API de Autenticação Facial (Versão PHP para MAMP/Hospedagem Comum)
 * Recebe o nome do rosto e autentica no Supabase.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $face_name = $input['face_name'] ?? null;

    if (!$face_name) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nome do rosto não fornecido']);
        exit;
    }

    // Credenciais (Hardcoded para protótipo - em produção use variáveis de ambiente)
    $EMAIL = getenv('AUTO_EMAIL') ?: 'julikubo@gmail.com';
    $PASSWORD = getenv('AUTO_PASSWORD') ?: 'leandrok';
    
    $SUPABASE_URL = 'https://nljeheupokqsvsuudlvt.supabase.co';
    $SUPABASE_KEY = getenv('SUPABASE_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5samVoZXVwb2txc3ZzdXVkbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTMyODUsImV4cCI6MjA3NTc4OTI4NX0._SlcHYKtEbmDosDCVHNtLySgtlglnMnODBQH5O1QE70';

    // Autenticação via API REST do Supabase
    $url = $SUPABASE_URL . '/auth/v1/token?grant_type=password';
    $data = json_encode(['email' => $EMAIL, 'password' => $PASSWORD]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'apikey: ' . $SUPABASE_KEY
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($response === false) {
        throw new Exception('Erro no cURL: ' . curl_error($ch));
    }
    
    curl_close($ch);

    $json = json_decode($response, true);

    if ($httpCode >= 200 && $httpCode < 300 && isset($json['access_token'])) {
        echo json_encode([
            'success' => true,
            'access_token' => $json['access_token'],
            'refresh_token' => $json['refresh_token']
        ]);
    } else {
        $msg = $json['error_description'] ?? $json['msg'] ?? 'Falha na autenticação Supabase';
        echo json_encode(['success' => false, 'message' => $msg]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
}
?>
