const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { createMockSupabase } = require('./supabase.mock');

const VERIFIED_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché para tokens ya verificados con Supabase Auth
const verifiedTokensCache = new Map();

function createStatelessClient() {
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
    // Cliente dedicado exclusivamente a consultas de base de datos usando SUPABASE_KEY del servidor,
    // sin que signInWithPassword altere nunca su cabecera Authorization original.
    const dbClient = createStatelessClient();

    supabase = {
        isMock: false,
        from: (table) => dbClient.from(table),
        rpc: (fn, args, options) => dbClient.rpc(fn, args, options),
        schema: (name) => dbClient.schema(name),
        auth: {
            signInWithPassword: async ({ email, password }) => {
                const authClient = createStatelessClient();
                const result = await authClient.auth.signInWithPassword({ email, password });
                if (!result.error && result.data?.session?.access_token && result.data?.user) {
                    verifiedTokensCache.set(result.data.session.access_token, {
                        user: result.data.user,
                        expiresAt: Date.now() + VERIFIED_TOKEN_TTL_MS
                    });
                }
                return result;
            },
            getUser: async (accessToken) => {
                if (!accessToken) {
                    return { data: { user: null }, error: { message: 'missing JWT token' } };
                }
                const cached = verifiedTokensCache.get(accessToken);
                if (cached && cached.expiresAt > Date.now()) {
                    return { data: { user: cached.user }, error: null };
                }
                verifiedTokensCache.delete(accessToken);

                const authClient = createStatelessClient();
                const result = await authClient.auth.getUser(accessToken);
                if (!result.error && result.data?.user) {
                    verifiedTokensCache.set(accessToken, {
                        user: result.data.user,
                        expiresAt: Date.now() + VERIFIED_TOKEN_TTL_MS
                    });
                }
                return result;
            },
            refreshSession: async ({ refresh_token }) => {
                const authClient = createStatelessClient();
                const result = await authClient.auth.refreshSession({ refresh_token });
                if (!result.error && result.data?.session?.access_token && result.data?.session?.user) {
                    verifiedTokensCache.set(result.data.session.access_token, {
                        user: result.data.session.user,
                        expiresAt: Date.now() + VERIFIED_TOKEN_TTL_MS
                    });
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