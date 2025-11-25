import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const OLD_SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc4OTQxNCwiZXhwIjoyMDc0MzY1NDE0fQ.sabLfnzwaJxxhzvmy0k0U4rtOKeFvKKJGRScnx64y0M';

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);

const TABLES = ['customers', 'products', 'expenses', 'invoices'];

function mapType(value) {
    if (value === null) return 'TEXT'; // Default to text if null
    if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'object') return 'JSONB';
    // Check if date
    if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.length > 10) return 'TIMESTAMP WITH TIME ZONE';
    return 'TEXT';
}

async function inferSchema() {
    let sql = '-- Auto-generated schema for missing tables\n\n';

    for (const table of TABLES) {
        console.log(`Inferring schema for ${table}...`);
        const { data, error } = await oldSupabase.from(table).select('*').limit(100); // Get more rows to better guess types

        if (error) {
            console.log(`Error fetching ${table}: ${error.message}`);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`No data in ${table}, skipping...`);
            continue;
        }

        // Aggregate keys and types
        const columns = {};
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!columns[key]) {
                    columns[key] = { type: 'TEXT', nullable: true };
                }
                if (row[key] !== null) {
                    columns[key].type = mapType(row[key]);
                }
            });
        });

        // Generate SQL
        sql += `CREATE TABLE IF NOT EXISTS public.${table} (\n`;
        const colDefs = Object.keys(columns).map(key => {
            let type = columns[key].type;
            if (key === 'id') type = 'UUID PRIMARY KEY DEFAULT gen_random_uuid()';
            if (key === 'user_id') type = 'UUID REFERENCES auth.users(id) ON DELETE CASCADE';
            return `  ${key} ${type}`;
        });
        sql += colDefs.join(',\n');
        sql += '\n);\n\n';

        // Enable RLS
        sql += `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n`;
        sql += `CREATE POLICY "${table}_select_own" ON public.${table} FOR SELECT USING (auth.uid() = user_id);\n`;
        sql += `CREATE POLICY "${table}_modify_own" ON public.${table} FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);\n\n`;
    }

    fs.writeFileSync('scripts/create-extra-tables.sql', sql);
    console.log('Schema written to scripts/create-extra-tables.sql');
}

inferSchema();
