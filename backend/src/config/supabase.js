const { createClient } = require('@supabase/supabase-js');
const { AsyncLocalStorage } = require('node:async_hooks');
require('dotenv').config();

const requestTokenStorage = new AsyncLocalStorage();
let cachedSession = null;

function createMockSupabase() {
    console.warn('[AI Studio] SUPABASE_URL / SUPABASE_KEY not configured — using in-memory store');
    const store = {
        categorias: [
            { id: 1, nombre: 'Hamburguesas' },
            { id: 2, nombre: 'Bebidas' },
            { id: 3, nombre: 'Combos' }
        ],
        platos: [
            { id: 1, nombre: 'Hamburguesa Clásica', precio: 4.5, stock: 25, categoria: 'Hamburguesas', id_padre: null },
            { id: 2, nombre: 'Hamburguesa Doble Queso', precio: 6.0, stock: 4, categoria: 'Hamburguesas', id_padre: null },
            { id: 3, nombre: 'Refresco Natural', precio: 1.5, stock: 40, categoria: 'Bebidas', id_padre: null },
            { id: 4, nombre: 'Combo De La Casa', precio: 7.5, stock: 0, categoria: 'Combos', id_padre: null }
        ],
        ordenes: [],
        gastos: [],
        ingresos_extras: [],
        cierres: []
    };
    const counters = { categorias: 4, platos: 5, ordenes: 1, gastos: 1, ingresos_extras: 1, cierres: 1 };

    class QueryBuilder {
        constructor(table) {
            this.table = table;
            this.op = 'select';
            this.payload = null;
            this.filters = [];
            this.orders = [];
            this.limitVal = null;
            this.rangeVal = null;
            this.isSingle = false;
            this.selectOptions = {};
        }
        select(_cols = '*', options = {}) {
            if (this.op === 'select') {
                this.selectOptions = options || {};
            }
            return this;
        }
        insert(rows) {
            this.op = 'insert';
            this.payload = Array.isArray(rows) ? rows : [rows];
            return this;
        }
        update(values) {
            this.op = 'update';
            this.payload = values;
            return this;
        }
        delete() {
            this.op = 'delete';
            return this;
        }
        eq(col, val) {
            this.filters.push(r => String(r[col]) === String(val));
            return this;
        }
        lt(col, val) {
            this.filters.push(r => r[col] < val);
            return this;
        }
        gte(col, val) {
            this.filters.push(r => r[col] >= val);
            return this;
        }
        order(col, { ascending = true } = {}) {
            this.orders.push({ col, ascending });
            return this;
        }
        limit(n) {
            this.limitVal = n;
            return this;
        }
        range(from, to) {
            this.rangeVal = { from, to };
            return this;
        }
        single() {
            this.isSingle = true;
            return this;
        }
        _execute() {
            const list = store[this.table] || (store[this.table] = []);
            if (this.op === 'insert') {
                const inserted = this.payload.map(item => {
                    const nextId = counters[this.table] || 1;
                    counters[this.table] = nextId + 1;
                    const record = {
                        id: item.id ?? nextId,
                        created_at: item.created_at || new Date().toISOString(),
                        ...item
                    };
                    list.push(record);
                    return { ...record };
                });
                return {
                    data: this.isSingle ? (inserted[0] || null) : inserted,
                    error: null
                };
            }

            const matched = list.filter(row => this.filters.every(fn => fn(row)));

            if (this.op === 'update') {
                const updated = matched.map(row => {
                    Object.assign(row, this.payload);
                    return { ...row };
                });
                return {
                    data: this.isSingle ? (updated[0] || null) : updated,
                    error: null
                };
            }

            if (this.op === 'delete') {
                store[this.table] = list.filter(row => !this.filters.every(fn => fn(row)));
                return { data: matched, error: null };
            }

            let results = matched.map(r => ({ ...r }));
            for (const { col, ascending } of this.orders) {
                results.sort((a, b) => {
                    if (a[col] < b[col]) return ascending ? -1 : 1;
                    if (a[col] > b[col]) return ascending ? 1 : -1;
                    return 0;
                });
            }
            const totalCount = results.length;
            if (this.rangeVal !== null) {
                results = results.slice(this.rangeVal.from, this.rangeVal.to + 1);
            } else if (this.limitVal !== null) {
                results = results.slice(0, this.limitVal);
            }
            if (this.selectOptions && this.selectOptions.head) {
                return { data: null, count: totalCount, error: null };
            }
            if (this.isSingle) {
                if (results.length === 0) {
                    return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
                }
                return { data: results[0], error: null };
            }
            return { data: results, count: totalCount, error: null };
        }
        then(resolve, reject) {
            return Promise.resolve(this._execute()).then(resolve, reject);
        }
    }

    return {
        isMock: true,
        runWithToken: (_token, callback) => callback(),
        getActiveToken: () => 'mock-session-token',
        setCachedSession: () => {},
        getCachedSession: () => null,
        from: (table) => new QueryBuilder(table),
        auth: {
            signInWithPassword: async ({ email, password }) => {
                if (!email || !password) {
                    return { data: null, error: { message: 'Invalid login credentials' } };
                }
                const session = {
                    access_token: 'mock-session-token',
                    refresh_token: 'mock-refresh-token',
                    user: { id: 'demo-user', email }
                };
                return { data: { session, user: session.user }, error: null };
            },
            refreshSession: async () => ({
                data: {
                    session: {
                        access_token: 'mock-session-token',
                        refresh_token: 'mock-refresh-token',
                        user: { id: 'demo-user', email: 'demo@dlacasa.com' }
                    }
                },
                error: null
            }),
            signOut: async () => ({ error: null })
        }
    };
}

function createStatelessAuthClient() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    const getActiveToken = () => {
        const store = requestTokenStorage.getStore();
        if (store && store.accessToken) {
            return store.accessToken;
        }
        if (cachedSession && cachedSession.access_token) {
            return cachedSession.access_token;
        }
        return null;
    };

    const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        accessToken: async () => getActiveToken()
    });

    supabase = {
        isMock: false,
        runWithToken: (accessToken, callback) => {
            return requestTokenStorage.run({ accessToken }, callback);
        },
        getActiveToken,
        setCachedSession: (session) => {
            if (session && session.access_token) {
                cachedSession = session;
            }
        },
        getCachedSession: () => cachedSession,
        from: (table) => dbClient.from(table),
        rpc: (fn, args, options) => dbClient.rpc(fn, args, options),
        schema: (name) => dbClient.schema(name),
        auth: {
            signInWithPassword: async ({ email, password }) => {
                const authClient = createStatelessAuthClient();
                const result = await authClient.auth.signInWithPassword({ email, password });
                if (!result.error && result.data?.session?.access_token) {
                    cachedSession = result.data.session;
                }
                return result;
            },
            refreshSession: async ({ refresh_token }) => {
                const authClient = createStatelessAuthClient();
                const result = await authClient.auth.refreshSession({ refresh_token });
                if (!result.error && result.data?.session?.access_token) {
                    cachedSession = result.data.session;
                }
                return result;
            },
            signOut: async () => ({ error: null })
        }
    };
} else {
    supabase = createMockSupabase();
}

module.exports = supabase;