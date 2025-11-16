/**
 * Run RBAC + MFA Migration
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Executes the 001_rbac_mfa_schema.sql migration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/db/client';

async function runMigration() {
  try {
    console.log('🔄 Running RBAC + MFA migration...\n');

    // Read migration file
    const migrationPath = join(__dirname, '../src/db/migrations/001_rbac_mfa_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Created:');
    console.log('  - 6 system roles (super_admin, admin, manager, editor, viewer, analyst)');
    console.log('  - 17 granular permissions');
    console.log('  - Role-permission assignments');
    console.log('  - Audit logs table');
    console.log('  - Sessions table');
    console.log('  - Enhanced users table (MFA + SSO columns)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
