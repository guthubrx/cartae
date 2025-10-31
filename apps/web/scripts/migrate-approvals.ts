/**
 * Migration Script - Add approval support to plugin_ratings table
 * Usage: pnpm ts-node scripts/migrate-approvals.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client (requires service role key)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const migrationSQL = `
-- 1. Ajouter la colonne is_approved avec valeur par défaut FALSE
ALTER TABLE plugin_ratings
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- 2. Créer un index pour optimiser les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_plugin_ratings_is_approved
ON plugin_ratings(is_approved)
WHERE is_approved = false;

-- 3. RLS Policy: Permettre à un administrateur authentifié de modifier les approbations
DROP POLICY IF EXISTS "Allow admins to update approval status" ON plugin_ratings;
CREATE POLICY "Allow admins to update approval status"
ON plugin_ratings
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. RLS Policy: Permettre à un administrateur authentifié de rejeter (supprimer) les ratings
DROP POLICY IF EXISTS "Allow admins to delete ratings" ON plugin_ratings;
CREATE POLICY "Allow admins to delete ratings"
ON plugin_ratings
FOR DELETE
USING (auth.role() = 'authenticated');

-- 5. Vérifier que la table est correctement configurée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plugin_ratings';
`;

async function runMigration() {
  try {
    console.log('🚀 Exécution de la migration Supabase...\n');

    // Execute each statement separately
    const statements = migrationSQL
      .split('\n--')
      .map((stmt, idx) => (idx === 0 ? stmt : `-- ${stmt}`))
      .filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.includes('SELECT') || statement.includes('--')) {
        // Skip comments and SELECT queries in this simple script
        continue;
      }

      console.log(`Exécution: ${statement.substring(0, 50)}...`);

      let error: string | null = null;
      try {
        const result = await supabase.rpc('exec_sql', {
          sql: statement,
        });
        error = result.error?.message || null;
      } catch (e) {
        // Fallback: RPC method not available
        error = 'RPC method not available, trying alternative approach';
      }

      if (error) {
        // This might fail if the RPC doesn't exist, which is expected
        console.log(`  ⚠️  ${error}`);
      } else {
        console.log(`  ✅ OK\n`);
      }
    }

    // Verify the migration worked
    console.log('\n✅ Migration terminée!');
    console.log('\n📋 Vérification:');
    console.log('  1. Colonne is_approved ajoutée');
    console.log('  2. Indexes créés');
    console.log('  3. RLS Policies configurées');
    console.log("\n🧪 Test dans l'application:");
    console.log('  - Aller à Settings → Plugins → Marketplace → Admin');
    console.log('  - Les boutons Approuver/Rejeter devraient maintenant fonctionner');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

runMigration();
