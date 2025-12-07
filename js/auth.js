// Funções de Autenticação com Supabase
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
    }

    // Verificar se usuário está logado
    async checkAuth() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Erro ao verificar sessão:', error);
                return false;
            }

            if (session?.user) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erro na verificação de autenticação:', error);
            return false;
        }
    }

    // Carregar perfil do usuário
    async loadUserProfile() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Erro ao carregar perfil:', error);
                return null;
            }

            this.userProfile = data;
            return data;
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
            return null;
        }
    }

    // Login com email e senha
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            this.currentUser = data.user;
            await this.loadUserProfile();
            
            console.log('✅ Login realizado com sucesso');
            return { success: true, user: data.user };

        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    // Registro de novo usuário
    async register(email, password, fullName, companyName = '') {
        try {
            // Criar conta no Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        company_name: companyName
                    },
                    emailRedirectTo: `${window.location.origin}/proj/timesupa/index.html`
                }
            });

            if (error) {
                throw error;
            }

            // Fazer login automaticamente após o registro
            await this.login(email, password);

            console.log('✅ Usuário registrado com sucesso');
            return { 
                success: true, 
                user: data.user,
                message: 'Conta criada com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro no registro:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    // Logout
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            this.currentUser = null;
            this.userProfile = null;
            
            console.log('✅ Logout realizado com sucesso');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro no logout:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    // Resetar senha
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/proj/timesupa/login.html`
            });

            if (error) {
                throw error;
            }

            return { 
                success: true, 
                message: 'Email de recuperação enviado!' 
            };

        } catch (error) {
            console.error('❌ Erro ao resetar senha:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    // Atualizar perfil do usuário
    async updateProfile(profileData) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .upsert({
                    id: this.currentUser.id,
                    ...profileData,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            this.userProfile = data;
            console.log('✅ Perfil atualizado com sucesso');
            return { success: true, profile: data };

        } catch (error) {
            console.error('❌ Erro ao atualizar perfil:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    async updateEmail(email) {
        try {
            const { data, error } = await supabase.auth.updateUser({ email });
            if (error) throw error;
            if (data?.user) {
                this.currentUser = data.user;
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    async updatePassword(password) {
        try {
            const { data, error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Traduzir mensagens de erro
    getErrorMessage(error) {
        const errorMessages = {
            'Invalid login credentials': 'Email ou senha incorretos',
            'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
            'User already registered': 'Este email já está cadastrado',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
            'Invalid email': 'Email inválido',
            'signup_disabled': 'Cadastro desabilitado',
            'email_address_invalid': 'Endereço de email inválido',
            'password_too_short': 'Senha muito curta (mínimo 6 caracteres)'
        };

        return errorMessages[error.message] || error.message || 'Erro desconhecido';
    }

    // Verificar se usuário tem permissão de admin
    isAdmin() {
        return this.userProfile?.role === 'admin';
    }

    // Obter dados do usuário atual
    getCurrentUser() {
        return {
            user: this.currentUser,
            profile: this.userProfile
        };
    }
}

// Instância global do gerenciador de autenticação
const authManager = new AuthManager();

// Listener para mudanças na autenticação
supabase?.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN') {
        authManager.currentUser = session.user;
        authManager.loadUserProfile();
    } else if (event === 'SIGNED_OUT') {
        authManager.currentUser = null;
        authManager.userProfile = null;
        
        // Redirecionar para login se não estiver na página de login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});