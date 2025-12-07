# 🕐 TimeSupa - Sistema de Controle de Ponto

Sistema moderno de controle de horas trabalhadas integrado com **Supabase**, baseado no sistema TimeCard original.

## ✨ Características

- 🔐 **Autenticação Segura** com Supabase Auth
- ⏰ **Controle de Ponto** em tempo real
- 📊 **Dashboard Interativo** com estatísticas
- 📱 **Interface Responsiva** (Bootstrap 5)
- 🔄 **Dados em Tempo Real** com Supabase Realtime
- 💰 **Cálculo Automático** de horas normais/extras
- 📈 **Relatórios Detalhados**

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **UI Framework**: Bootstrap 5
- **Ícones**: Bootstrap Icons
- **Hospedagem**: Qualquer servidor web

## 📋 Pré-requisitos

1. **Conta no Supabase** (gratuita)
2. **Servidor Web** (MAMP, XAMPP, Apache, etc.)
3. **Navegador Moderno** com suporte a ES6+

## ⚙️ Configuração

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Clique em "New Project"
4. Escolha sua organização
5. Defina nome, senha do banco e região
6. Aguarde a criação (1-2 minutos)

### 2. Obter Credenciais

No dashboard do seu projeto:

1. Vá em **Settings** → **API**
2. Copie a **URL** do projeto
3. Copie a **anon/public key**

### 3. Configurar o TimeSupa

Edite o arquivo `config.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://seuprojetoid.supabase.co',
    anonKey: 'sua_chave_publica_aqui'
};
```

### 4. Criar Tabelas no Supabase

Execute os seguintes comandos SQL no **SQL Editor** do Supabase:

```sql
-- Tabela de perfis de usuários
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    company_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações de trabalho
CREATE TABLE work_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    company_name TEXT,
    daily_hours INTEGER DEFAULT 8,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    overtime_rate INTEGER DEFAULT 50,
    lunch_minutes INTEGER DEFAULT 60,
    break_minutes INTEGER DEFAULT 15,
    work_start TIME DEFAULT '09:00',
    work_end TIME DEFAULT '18:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Tabela de registros de ponto
CREATE TABLE time_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    total_hours DECIMAL(5,2) DEFAULT 0,
    normal_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    lunch_discount INTEGER DEFAULT 0,
    break_discount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_time_records_user_date ON time_records(user_id, date);
CREATE INDEX idx_time_records_date ON time_records(date);
CREATE INDEX idx_profiles_user_id ON profiles(id);
CREATE INDEX idx_work_settings_user_id ON work_settings(user_id);
```

### 5. Configurar RLS (Row Level Security)

Execute no **SQL Editor**:

```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para work_settings
CREATE POLICY "Users can manage own settings" ON work_settings
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para time_records
CREATE POLICY "Users can manage own records" ON time_records
    FOR ALL USING (auth.uid() = user_id);
```

### 6. Criar Trigger para Perfis

```sql
-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, company_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'company_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novos usuários
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🎯 Como Usar

### 1. Primeiro Acesso

1. Abra `login.html` no navegador
2. Clique em "Não tem conta? Cadastre-se"
3. Preencha os dados e cadastre-se
4. Confirme o email (verifique spam/lixo)
5. Faça login

### 2. Dashboard

- **Status Atual**: Mostra se está trabalhando
- **Botões de Ponto**: Entrada e Saída
- **Estatísticas**: Horas do dia/semana/mês
- **Registros Recentes**: Últimos pontos

### 3. Controle de Ponto

- **Entrada**: Clique em "Entrada" para iniciar
- **Saída**: Clique em "Saída" para finalizar
- **Cálculo Automático**: Horas e valores calculados automaticamente

## 📁 Estrutura de Arquivos

```
timesupa/
├── index.html          # Dashboard principal
├── login.html          # Página de login/registro
├── config.js           # Configurações do Supabase
├── auth.js             # Gerenciamento de autenticação
├── timecard.js         # Lógica do controle de ponto
├── styles.css          # Estilos customizados
└── README.md           # Este arquivo
```

## 🔧 Funcionalidades Implementadas

- ✅ **Autenticação** (Login/Registro/Logout)
- ✅ **Dashboard** com estatísticas
- ✅ **Controle de Ponto** (Entrada/Saída)
- ✅ **Cálculo de Horas** (Normal/Extra)
- ✅ **Interface Responsiva**
- ✅ **Configurações de Trabalho**

## 🚧 Próximas Funcionalidades

- [ ] **Relatórios Avançados**
- [ ] **Edição de Registros**
- [ ] **Exportação de Dados**
- [ ] **Notificações Push**
- [ ] **Modo Offline**
- [ ] **API REST**

## 🐛 Solução de Problemas

### Erro de Conexão

1. Verifique se as credenciais em `config.js` estão corretas
2. Confirme se o projeto Supabase está ativo
3. Verifique a conexão com internet

### Erro de Autenticação

1. Confirme o email após registro
2. Verifique se RLS está configurado
3. Teste com outro navegador
4. Se estiver usando o Login Facial (facelogin), configure as credenciais de auto-login:
   - Preferência: defina variáveis de ambiente no servidor:
     - `TIMESUPA_AUTO_EMAIL` e `TIMESUPA_AUTO_PASSWORD`
   - Alternativa: edite `proj/timesupa/facelogin/auto_login.php` e preencha:
     - `email`: email do usuário no Supabase (id 1)
     - `password`: senha do usuário
   - O `facelogin/auth_facial.php` usa essas credenciais para gerar sessão Supabase e redirecionar para `login.html`, que aplica os tokens automaticamente.

### Erro nas Tabelas

1. Execute novamente os comandos SQL
2. Verifique se todas as tabelas foram criadas
3. Confirme as políticas RLS

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique este README
2. Consulte a [documentação do Supabase](https://supabase.com/docs)
3. Verifique o console do navegador (F12)

## 📄 Licença

Este projeto é baseado no sistema TimeCard original e utiliza tecnologias open-source.

---

**TimeSupa v1.0** - Sistema de Controle de Ponto Moderno 🚀
