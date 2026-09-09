// migrate.ts - AFTER
import { Pool } from 'pg'; // Changed import
import { drizzle } from 'drizzle-orm/node-postgres'; // Changed import
// The 'migrate' function is no longer used in this custom script
import * as schema from './shared/schema';
import 'dotenv/config';
// The 'ws' import is no longer needed

// Required for Neon serverless
// neonConfig.webSocketConstructor = ws;

async function main() {
  console.log('Starting migration...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  console.log('Connected to database');
  
  // Create tables if they don't exist
  console.log('Ensuring tables exist...');
  
  // Define SQL to create tables if they don't exist
  const createTablesSql = `
    -- Check if tables exist and create them if they don't
    DO $$
    BEGIN
      -- tenants table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants') THEN
        CREATE TABLE tenants (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          subdomain TEXT NOT NULL UNIQUE,
          theme_config JSONB,
          logo_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      ELSE
        -- Ensure columns exist on existing table
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='tenants' AND column_name='theme_config') THEN
          ALTER TABLE tenants ADD COLUMN theme_config JSONB;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='tenants' AND column_name='logo_url') THEN
          ALTER TABLE tenants ADD COLUMN logo_url TEXT;
        END IF;
      END IF;

      -- theme_templates table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theme_templates') THEN
        CREATE TABLE theme_templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          tag TEXT,
          token_overrides JSONB NOT NULL,
          is_preset BOOLEAN DEFAULT FALSE,
          tenant_id INTEGER,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      END IF;

      -- users table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT,
          first_name TEXT,
          last_name TEXT,
          role TEXT DEFAULT 'student',
          tenant_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      END IF;

      -- courses table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
        CREATE TABLE courses (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT,
          difficulty TEXT,
          duration INTEGER,
          module_count INTEGER DEFAULT 0,
          lesson_count INTEGER DEFAULT 0,
          thumbnail TEXT,
          instructor_id INTEGER,
          tenant_id INTEGER NOT NULL,
          is_enrollment_required BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      END IF;

      -- modules table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'modules') THEN
        CREATE TABLE modules (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          course_id INTEGER NOT NULL,
          "order" INTEGER NOT NULL
        );
      END IF;

      -- lessons table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lessons') THEN
        CREATE TABLE lessons (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          content_type TEXT NOT NULL,
          module_id INTEGER NOT NULL,
          "order" INTEGER NOT NULL,
          duration INTEGER,
          is_required BOOLEAN DEFAULT TRUE,
          quiz_data JSONB
        );
      END IF;

      -- enrollments table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'enrollments') THEN
        CREATE TABLE enrollments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          course_id INTEGER NOT NULL,
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          progress INTEGER DEFAULT 0
        );
      END IF;

      -- exams table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exams') THEN
        CREATE TABLE exams (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          course_id INTEGER NOT NULL,
          duration INTEGER NOT NULL,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          max_attempts INTEGER DEFAULT 1,
          tenant_id INTEGER NOT NULL,
          created_by INTEGER NOT NULL
        );
      END IF;

      -- questions table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questions') THEN
        CREATE TABLE questions (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          exam_id INTEGER NOT NULL,
          question_type TEXT DEFAULT 'multiple-choice',
          options JSONB,
          correct_answer TEXT NOT NULL,
          points INTEGER DEFAULT 1
        );
      END IF;

      -- exam_attempts table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_attempts') THEN
        CREATE TABLE exam_attempts (
          id SERIAL PRIMARY KEY,
          exam_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP,
          score INTEGER,
          answers JSONB,
          status TEXT DEFAULT 'in-progress'
        );
      END IF;

      -- activity_logs table
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
        CREATE TABLE activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          activity_type TEXT NOT NULL,
          details JSONB,
          tenant_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      END IF;
      
      -- session table for express-session
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session') THEN
        CREATE TABLE session (
          sid varchar NOT NULL PRIMARY KEY,
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        );
        CREATE INDEX idx_session_expire ON session (expire);
      END IF;

      -- Add a default tenant if none exists
      IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        INSERT INTO tenants (name, subdomain) VALUES ('Default Tenant', 'default');
      END IF;

      -- Add a default admin user if none exists
      IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        -- Password: admin123 (this is just a default password for initial setup)
        INSERT INTO users (username, password, first_name, last_name, role, tenant_id)
        VALUES ('admin', '9e771e3a56e31d536e35ab478770cd38a405d3a176a09e52286e34c35ee06c53.b3aa61f8617dbd457509196693dd0c5a', 'Admin', 'User', 'admin', 1);
      END IF;
    END
    $$;
  `;
  
  // Execute the SQL to create tables
  await pool.query(createTablesSql);
  
  console.log('All tables have been created or verified');
  
  await pool.end();
  console.log('Connection closed');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});