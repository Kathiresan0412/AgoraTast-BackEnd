"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const missingSupabaseClient = (clientName) => new Proxy({}, {
    get() {
        throw new Error(`${clientName} is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.`);
    },
});
const createSupabaseClient = (clientName, url, key) => {
    if (!url || !key) {
        return missingSupabaseClient(clientName);
    }
    try {
        return (0, supabase_js_1.createClient)(url, key);
    }
    catch (error) {
        console.error(`Could not initialize ${clientName}:`, error);
        return missingSupabaseClient(clientName);
    }
};
// Public client — respects RLS policies
exports.supabase = createSupabaseClient('supabase', supabaseUrl, supabaseAnonKey);
// Admin client — bypasses RLS (for server-side operations)
exports.supabaseAdmin = createSupabaseClient('supabaseAdmin', supabaseUrl, supabaseServiceKey);
