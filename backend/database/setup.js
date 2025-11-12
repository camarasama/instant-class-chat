import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    
    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    console.log('✅ Database schema created successfully');
    
    // Load sample data
    const sampleDataPath = path.join(__dirname, 'sample_data', '001_sample_school_registry.sql');
    if (fs.existsSync(sampleDataPath)) {
      const sampleDataSQL = fs.readFileSync(sampleDataPath, 'utf8');
      await pool.query(sampleDataSQL);
      console.log('✅ Sample data loaded successfully');
    }
    
    console.log('🎉 Database setup completed!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();