import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || 'classchat_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'classchat',
  password: process.env.DB_PASSWORD || 'testdb123',
  port: process.env.DB_PORT || 5432,
});

export const query = (text, params) => pool.query(text, params);
export default pool;