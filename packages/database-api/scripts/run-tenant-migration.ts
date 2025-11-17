#!/usr/bin/env tsx
/**
 * Script d'exécution de la migration Tenant Isolation (002)
 * Session 88 - Phase 8A
 *
 * Usage:
 *   pnpm migrate:tenant
 */

import fs from 'fs/promises';
import path from 'path';
import { pool } from '../src/db/client';

const MIGRATION_FILE = path.join(
  __dirname,
  '../src/db/migrations/002_tenant_isolation.sql'
);

async function runMigration() {
  console.log('🔄 Running Tenant Isolation migration...\n');

  try {
    // Read migration SQL
    const sql = await fs.readFile(MIGRATION_FILE, 'utf-8');

    // Execute migration
    console.log('📝 Executing SQL migration...');
    await pool.query(sql);

    console.log('\n✅ Tenant Isolation migration completed successfully!\n');

    // Show summary
    console.log('📊 Summary:');
    console.log('  - Added user_id to cartae_items table');
    console.log('  - Added user_id to semantic_embeddings table');
    console.log('  - Created indexes for all data tables');
    console.log('  - Enabled Row-Level Security policies');
    console.log('  - Created set_current_user_id() helper function\n');

    console.log('⚠️  IMPORTANT:');
    console.log('  - Existing data will have NULL user_id');
    console.log('  - Update existing items manually or assign to super_admin');
    console.log('  - All future inserts MUST include user_id\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
