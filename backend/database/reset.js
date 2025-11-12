import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function forceResetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔨 Force resetting database...');
    await client.query('BEGIN');

    // Get all tables that depend on user_role
    const dependentTables = await client.query(`
      SELECT DISTINCT table_name 
      FROM information_schema.columns 
      WHERE udt_name = 'user_role'
    `);

    console.log('Tables using user_role:', dependentTables.rows.map(row => row.table_name));

    // Drop all tables that use the enum first
    const dropOrder = [
      'reports',
      'attachments', 
      'message_status',
      'messages',
      'chat_members', 
      'chats',
      'users',
      'school_registry'
    ];

    for (const table of dropOrder) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`ℹ️  Table ${table} didn't exist or couldn't be dropped:`, error.message);
      }
    }

    // Now try to drop the type with force
    try {
      await client.query('DROP TYPE IF EXISTS user_role CASCADE');
      console.log('✅ Dropped user_role type');
    } catch (error) {
      console.log('ℹ️ Could not drop user_role:', error.message);
    }

    await client.query('COMMIT');
    console.log('✅ Database force reset completed!');

    // Now run the fresh setup
    console.log('🔄 Running fresh setup...');
    await runFreshSetup();
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Force reset failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function runFreshSetup() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create the enum type first
    await client.query(`
      CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'admin', 'class_rep');
    `);
    console.log('✅ Created user_role enum');

    // Now create all tables
    const schemaSQL = `
      CREATE TABLE school_registry (
        id SERIAL PRIMARY KEY,
        index_number VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'student',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        school_registry_id INTEGER UNIQUE NOT NULL REFERENCES school_registry(id),
        index_number VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        avatar_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE chats (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'announcement')),
        title VARCHAR(255),
        description TEXT,
        is_announcement_only BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE chat_members (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role user_role NOT NULL DEFAULT 'student',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, user_id)
      );

      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
        reply_to_id INTEGER REFERENCES messages(id),
        is_edited BOOLEAN DEFAULT FALSE,
        edited_at TIMESTAMP WITH TIME ZONE,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE message_status (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(message_id, user_id)
      );

      CREATE TABLE attachments (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        file_name VARCHAR(500) NOT NULL,
        file_url VARCHAR(1000) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(id),
        reported_user_id INTEGER REFERENCES users(id),
        reported_message_id INTEGER REFERENCES messages(id),
        report_type VARCHAR(50) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by INTEGER REFERENCES users(id)
      );

      -- Indexes
      CREATE INDEX idx_school_registry_email ON school_registry(email);
      CREATE INDEX idx_school_registry_index_number ON school_registry(index_number);
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX idx_messages_created_at ON messages(created_at);
      CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
      CREATE INDEX idx_message_status_user_id ON message_status(user_id);
    `;

    await client.query(schemaSQL);
    console.log('✅ All tables created successfully');

    // Load sample data
    const sampleDataSQL = `
      INSERT INTO school_registry (index_number, email, full_name, role) VALUES
      ('IT2024001', 'john.doe@school.edu', 'John Doe', 'student'),
      ('IT2024002', 'jane.smith@school.edu', 'Jane Smith', 'student'),
      ('IT2024003', 'mike.wilson@school.edu', 'Mike Wilson', 'student'),
      ('LEC001', 'dr.ahmed@school.edu', 'Dr. Ahmed Hassan', 'lecturer'),
      ('LEC002', 'prof.wang@school.edu', 'Professor Wang Li', 'lecturer'),
      ('ADM001', 'admin.office@school.edu', 'Admin Office', 'admin'),
      ('CR2024001', 'sarah.jones@school.edu', 'Sarah Jones', 'class_rep');
    `;

    await client.query(sampleDataSQL);
    console.log('✅ Sample data loaded');

    await client.query('COMMIT');
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Add to package.json
console.log(`
Add this script to your package.json:
"db:force-reset": "node database/force-reset.js"
`);

forceResetDatabase();