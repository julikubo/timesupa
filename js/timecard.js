/**
 * TimecardManager - Gerencia o controle de ponto
 */
class TimecardManager {
    constructor() {
        this.supabase = typeof supabase !== 'undefined' ? supabase : null;
        this.workSettings = null;
        this.currentUser = null;
        this.currentRecord = null;

    }

    getClient() {
        if (this.supabase) return this.supabase;
        if (typeof supabase !== 'undefined') {
            this.supabase = supabase;
            return this.supabase;
        }
        throw new Error('Cliente Supabase não inicializado');
    }

    getCacheKey() {
        return this.currentUser ? `work_settings_cache_${this.currentUser.id}` : 'work_settings_cache';
    }

    saveSettingsCache(settings) {
        try {
            const key = this.getCacheKey();
            localStorage.setItem(key, JSON.stringify(settings));
        } catch (e) { }
    }

    loadSettingsCache() {
        try {
            const key = this.getCacheKey();
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    /**
     * Carrega as configurações de trabalho do usuário
     */
    async loadWorkSettings() {
        try {
            // Obter usuário atual
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');
            this.currentUser = user;

            // Buscar configurações de trabalho
            const { data, error } = await this.getClient()
                .from('work_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                this.workSettings = data;
            } else {
                // Criar configurações padrão se não existirem
                await this.createDefaultWorkSettings(user.id);
            }

            const cached = this.loadSettingsCache();
            if (cached) {
                this.workSettings = { ...this.workSettings, ...cached };
            }

            return this.workSettings;
        } catch (error) {
            console.error('Erro ao carregar configurações de trabalho:', error);
            throw error;
        }
    }

    async saveWorkSettings(settings) {
        try {
            if (!this.currentUser) {
                const { data: { user } } = await this.getClient().auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');
                this.currentUser = user;
            }
            const payload = {
                user_id: this.currentUser.id,
                daily_hours: settings.daily_hours,
                lunch_minutes: settings.lunch_minutes,
                company_name: settings.company_name,
                start_date: settings.start_date,
                end_date: settings.end_date,
                hourly_rate: settings.hourly_rate,
                overtime_rate: settings.overtime_rate,
                break_count: settings.break_count,
                break_minutes: settings.break_minutes,
                work_start: settings.work_start,
                work_end: settings.work_end,
                updated_at: new Date().toISOString()
            };
            let res = await this.getClient()
                .from('work_settings')
                .upsert(payload, { onConflict: 'user_id' })
                .select()
                .single();
            if (res.error) {
                const minimal = {
                    user_id: this.currentUser.id,
                    updated_at: new Date().toISOString()
                };
                res = await this.getClient()
                    .from('work_settings')
                    .upsert(minimal, { onConflict: 'user_id' })
                    .select()
                    .single();
                if (res.error) throw res.error;
            }
            this.workSettings = res.data;
            this.saveSettingsCache(settings);
            return { success: true };
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Cria configurações de trabalho padrão para um novo usuário
     */
    async createDefaultWorkSettings(userId) {
        try {
            const defaultSettings = {
                user_id: userId,
                daily_hours: 8,
                work_days: [1, 2, 3, 4, 5],
                lunch_minutes: 60,
                created_at: new Date().toISOString()
            };
            let resp = await this.getClient()
                .from('work_settings')
                .insert(defaultSettings)
                .select()
                .single();
            if (resp.error) {
                const minimal = {
                    user_id: userId,
                    created_at: new Date().toISOString()
                };
                resp = await this.getClient()
                    .from('work_settings')
                    .insert(minimal)
                    .select()
                    .single();
                if (resp.error) throw resp.error;
            }
            this.workSettings = resp.data;
            return resp.data;
        } catch (error) {
            console.error('Erro ao criar configurações padrão:', error);
            throw error;
        }
    }

    /**
     * Verifica se há um registro de ponto em aberto
     */
    async checkCurrentRecord() {
        try {
            if (!this.currentUser) {
                const { data: { user } } = await this.getClient().auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');
                this.currentUser = user;
            }

            const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

            const { data, error } = await this.getClient()
                .from('time_records')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('date', today)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            this.currentRecord = data || null;
            return this.currentRecord;
        } catch (error) {
            console.error('Erro ao verificar registro atual:', error);
            throw error;
        }
    }



    /**
     * Registra entrada
     */
    async clockIn() {
        try {
            // Verificar se já existe um registro em aberto
            await this.checkCurrentRecord();

            if (this.currentRecord && this.currentRecord.clock_in && !this.currentRecord.clock_out) {
                return {
                    success: false,
                    message: 'Você já registrou entrada hoje e ainda não registrou saída'
                };
            }

            // Obter hora atual
            const now = new Date();
            const timeStr = this.formatTime(now);
            const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

            // Criar novo registro
            const newRecord = {
                user_id: this.currentUser.id,
                date: today,
                clock_in: timeStr,
                status: 'working',
                created_at: now.toISOString()
            };

            const { data, error } = await this.getClient()
                .from('time_records')
                .insert(newRecord)
                .select()
                .single();

            if (error) throw error;

            this.currentRecord = data;
            return { success: true, record: data };
        } catch (error) {
            console.error('Erro ao registrar entrada:', error);
            return { success: false, message: 'Erro ao registrar entrada: ' + (error.message || error) };
        }
    }

    /**
     * Registra saída
     */
    async clockOut(note = null) {
        try {
            // Verificar se existe um registro em aberto
            await this.checkCurrentRecord();

            if (!this.currentRecord || !this.currentRecord.clock_in) {
                return {
                    success: false,
                    message: 'Não há registro de entrada para hoje'
                };
            }

            if (this.currentRecord.clock_out) {
                return {
                    success: false,
                    message: 'Você já registrou saída para este ponto'
                };
            }

            // Obter hora atual
            const now = new Date();
            const timeStr = this.formatTime(now);

            // Calcular horas trabalhadas
            const clockInParts = this.normalizeTime(this.currentRecord.clock_in).split(':');
            const clockInHours = parseInt(clockInParts[0]);
            const clockInMinutes = parseInt(clockInParts[1]);

            const clockOutHours = now.getHours();
            const clockOutMinutes = now.getMinutes();

            // Calcular diferença em minutos
            let totalMinutes = (clockOutHours * 60 + clockOutMinutes) - (clockInHours * 60 + clockInMinutes);

            // Se for negativo (virada do dia), ajustar
            if (totalMinutes < 0) {
                totalMinutes += 24 * 60;
            }

            // Converter para horas decimais
            const totalHours = totalMinutes / 60;

            // Atualizar registro
            let updatePayload = {
                clock_out: timeStr,
                total_hours: totalHours,
                status: 'completed',
                updated_at: now.toISOString()
            };
            if (note !== null) updatePayload.notes = note;

            let { data, error } = await this.getClient()
                .from('time_records')
                .update(updatePayload)
                .eq('id', this.currentRecord.id)
                .select()
                .single();

            if (error) {
                if (updatePayload.notes !== undefined) {
                    delete updatePayload.notes;
                    const retry = await this.getClient()
                        .from('time_records')
                        .update(updatePayload)
                        .eq('id', this.currentRecord.id)
                        .select()
                        .single();
                    if (retry.error) throw retry.error;
                    data = retry.data;
                } else {
                    throw error;
                }
            }

            this.currentRecord = data;
            return { success: true, record: data };
        } catch (error) {
            console.error('Erro ao registrar saída:', error);
            return { success: false, message: 'Erro ao registrar saída: ' + (error.message || error) };
        }
    }

    async saveManualRecord(input) {
        try {
            if (!this.currentUser) {
                const { data: { user } } = await this.getClient().auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');
                this.currentUser = user;
            }
            if (!this.workSettings) {
                await this.loadWorkSettings();
            }
            const calc = this.calculateRecord(input);
            const nowIso = new Date().toISOString();
            const payload = {
                user_id: this.currentUser.id,
                date: input.date,
                clock_in: this.normalizeTime(input.clock_in),
                clock_out: this.normalizeTime(input.clock_out),
                total_hours: calc.totalHours,
                status: 'completed',
                created_at: nowIso,
                updated_at: nowIso,
                notes: input.notes ?? null
            };
            let { data, error } = await this.getClient()
                .from('time_records')
                .insert(payload)
                .select()
                .single();
            if (error) {
                if ('notes' in payload) {
                    delete payload.notes;
                    const retry = await this.getClient()
                        .from('time_records')
                        .insert(payload)
                        .select()
                        .single();
                    if (retry.error) throw retry.error;
                    data = retry.data;
                } else {
                    throw error;
                }
            }
            return { success: true, record: data, calc };
        } catch (error) {
            console.error('Erro ao salvar registro manual:', error);
            return { success: false, message: 'Erro ao salvar registro: ' + (error.message || error) };
        }
    }

    calculateRecord(input) {
        const hIn = this.normalizeTime(input.clock_in).split(':');
        const hOut = this.normalizeTime(input.clock_out).split(':');
        const inMinutes = parseInt(hIn[0]) * 60 + parseInt(hIn[1]);
        const outMinutes = parseInt(hOut[0]) * 60 + parseInt(hOut[1]);
        let totalMinutes = outMinutes - inMinutes;
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const lunch = parseInt(this.workSettings?.lunch_minutes ?? 60);
        const breakCount = parseInt(this.workSettings?.break_count ?? 0);
        const breakMinutes = parseInt(this.workSettings?.break_minutes ?? 15);
        const discounts = lunch + breakCount * breakMinutes;
        const consideredMinutes = Math.max(0, totalMinutes - discounts);
        const totalHours = consideredMinutes / 60;
        let normalHours = 0;
        let extraHours = 0;
        if (input.is_sunday || input.is_holiday) {
            normalHours = 0;
            extraHours = totalHours;
        } else {
            const base = parseFloat(this.workSettings?.daily_hours ?? 8);
            normalHours = Math.min(base, totalHours);
            extraHours = Math.max(0, totalHours - base);
        }
        const hourRate = parseFloat(this.workSettings?.hourly_rate ?? 0);
        const extraPercent = parseFloat(this.workSettings?.overtime_rate ?? 25);
        const normalValue = normalHours * hourRate;
        const extraValue = extraHours * hourRate * (1 + (extraPercent / 100));
        return { totalHours, normalHours, extraHours, normalValue, extraValue };
    }

    async getRecordById(id) {
        const { data, error } = await this.getClient()
            .from('time_records')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async updateRecord(id, updates) {
        try {
            if (!this.currentUser) {
                const { data: { user } } = await this.getClient().auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');
                this.currentUser = user;
            }
            const payload = { ...updates };
            if (payload.clock_in) payload.clock_in = this.normalizeTime(payload.clock_in);
            if (payload.clock_out) payload.clock_out = this.normalizeTime(payload.clock_out);
            if (payload.clock_in && payload.clock_out) {
                if (!this.workSettings) await this.loadWorkSettings();
                const calc = this.calculateRecord({
                    date: updates.date || new Date().toISOString().split('T')[0],
                    clock_in: payload.clock_in,
                    clock_out: payload.clock_out,
                    is_sunday: false,
                    is_holiday: false
                });
                payload.total_hours = calc.totalHours;
            }
            payload.updated_at = new Date().toISOString();

            let { data, error } = await this.getClient()
                .from('time_records')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                if ('notes' in payload) {
                    const { notes, ...withoutNotes } = payload;
                    const retry = await this.getClient()
                        .from('time_records')
                        .update(withoutNotes)
                        .eq('id', id)
                        .select()
                        .single();
                    if (retry.error) throw retry.error;
                    data = retry.data;
                } else {
                    throw error;
                }
            }
            return { success: true, record: data };
        } catch (e) {
            return { success: false, message: e.message || e };
        }
    }

    async deleteRecord(id) {
        try {
            if (!this.currentUser) {
                const { data: { user } } = await this.getClient().auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');
                this.currentUser = user;
            }
            const { error } = await this.getClient()
                .from('time_records')
                .delete()
                .eq('id', id)
                .eq('user_id', this.currentUser.id);
            if (error) throw error;
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message || e };
        }
    }

    normalizeTime(t) {
        if (!t) return '00:00:00';
        const parts = t.split(':');
        if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
        if (parts.length >= 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
        return '00:00:00';
    }

    formatTime(d) {
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const ss = d.getSeconds().toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    /**
     * Busca registros de ponto em um período
     */
    async getRecords(startDate, endDate) {
        try {
            if (!this.currentUser) {
                const { data: { user } } = await this.getClient().auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');
                this.currentUser = user;
            }

            let query = this.getClient()
                .from('time_records')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('date', { ascending: false });

            if (startDate) {
                query = query.gte('date', startDate);
            }

            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar registros:', error);
            throw error;
        }
    }

    /**
     * Calcula estatísticas de horas trabalhadas em um período
     */
    async getStatistics(startDate, endDate) {
        try {
            const records = await this.getRecords(startDate, endDate);

            let totalHours = 0;
            let overtimeHours = 0;

            // Calcular horas totais
            records.forEach(record => {
                if (record.total_hours) {
                    totalHours += record.total_hours;
                }
            });

            // Calcular horas extras (se aplicável)
            if (this.workSettings && records.length > 0) {
                const expectedHours = records.length * this.workSettings.work_hours_per_day;
                overtimeHours = Math.max(0, totalHours - expectedHours);
            }

            return {
                totalHours,
                overtimeHours,
                recordCount: records.length
            };
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
            return {
                totalHours: 0,
                overtimeHours: 0,
                recordCount: 0
            };
        }
    }

    /**
     * Formata horas decimais para formato HH:MM
     */
    formatHours(hours) {
        if (!hours && hours !== 0) return '0:00';

        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        return `${h}:${m.toString().padStart(2, '0')}`;
    }
}
