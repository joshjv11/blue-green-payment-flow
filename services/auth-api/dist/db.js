import { Pool } from 'pg';
import { env } from './env.js';
let poolInstance;
function getPool() {
    if (!poolInstance) {
        poolInstance = new Pool({
            connectionString: env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
        });
        poolInstance.on('error', (err) => {
            console.error('Unexpected PostgreSQL pool error:', err);
        });
    }
    return poolInstance;
}
export const pool = new Proxy({}, {
    get(_target, prop) {
        const value = getPool()[prop];
        if (typeof value === 'function') {
            return value.bind(getPool());
        }
        return value;
    },
});
export async function checkDbConnection() {
    try {
        await pool.query('SELECT 1');
        return true;
    }
    catch {
        return false;
    }
}
