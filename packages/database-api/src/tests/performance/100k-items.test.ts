/**
 * Tests de Performance - 100k CartaeItems
 *
 * Teste les performances de l'API et des indexes sur un gros volume:
 * 1. Insertion de 100k items
 * 2. Full-text search (GIN index)
 * 3. Vector search (HNSW index)
 * 4. Hybrid search
 *
 * Objectifs de performance:
 * - Insert batch: < 60s pour 100k items
 * - Full-text search: < 100ms
 * - Vector search: < 20ms (HNSW)
 * - Hybrid search: < 150ms
 *
 * @module tests/performance/100k-items
 */

import { testConnection, pool } from '../../db/client';
import { insertItem } from '../../db/queries/items';
import { fullTextSearch, semanticSearch, hybridSearch } from '../../db/queries/search';
import type { CartaeItem } from '@cartae/core';

// ============================================================================
// Helpers - Génération de données de test
// ============================================================================

/**
 * Génère un embedding aléatoire (1536 dimensions)
 */
function generateRandomEmbedding(): number[] {
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
}

/**
 * Génère un CartaeItem de test
 */
function generateTestItem(index: number): Partial<CartaeItem> {
  const types: Array<'email' | 'task' | 'document' | 'message' | 'event' | 'note'> = [
    'email',
    'task',
    'document',
    'message',
    'event',
    'note',
  ];

  const type = types[index % types.length];

  return {
    id: `test-${index.toString().padStart(10, '0')}`,
    type,
    title: `Test Item ${index} - ${type} - Performance Test`,
    content: `This is test content for item ${index}. It contains various keywords like urgent, important, deadline, budget, client, meeting, project, task, email, document. Random data: ${Math.random()}`,
    metadata: {
      priority: index % 4 === 0 ? 'high' : 'medium',
      status: 'new',
    },
    tags: ['test', `batch-${Math.floor(index / 1000)}`],
    categories: [`category-${index % 10}`],
    source: {
      connector: 'test-connector',
      originalId: `test-original-${index}`,
      lastSync: new Date(),
    },
  };
}

// ============================================================================
// Tests de performance
// ============================================================================

async function runPerformanceTests() {
  console.log('');
  console.log('🔬 Cartae Database API - Performance Tests');
  console.log('📊 Target: 100,000 items');
  console.log('');

  try {
    // Test connexion
    console.log('🔌 Testing PostgreSQL connection...');
    await testConnection();
    console.log('');

    // ========================================================================
    // Test 1: Insertion 100k items
    // ========================================================================

    console.log('📝 Test 1: Inserting 100,000 items...');

    const TOTAL_ITEMS = 100_000;
    const BATCH_SIZE = 1000;
    const batches = Math.ceil(TOTAL_ITEMS / BATCH_SIZE);

    const insertStart = Date.now();

    for (let batch = 0; batch < batches; batch++) {
      const batchItems: Partial<CartaeItem>[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const index = batch * BATCH_SIZE + i;
        if (index >= TOTAL_ITEMS) break;

        batchItems.push(generateTestItem(index));
      }

      // Insert batch via SQL multi-row INSERT (plus rapide que N requêtes)
      const values = batchItems
        .map((item, i) => {
          const paramBase = i * 11 + 1;
          return `($${paramBase}, $${paramBase + 1}, $${paramBase + 2}, $${paramBase + 3}, $${paramBase + 4}, $${paramBase + 5}, $${paramBase + 6}, $${paramBase + 7}, $${paramBase + 8}, $${paramBase + 9}, $${paramBase + 10})`;
        })
        .join(', ');

      const params = batchItems.flatMap(item => [
        item.id,
        item.type,
        item.title,
        item.content,
        JSON.stringify(item.metadata),
        item.tags,
        item.categories,
        JSON.stringify(item.source),
        false, // archived
        false, // favorite
        null, // embedding (on ajoutera après)
      ]);

      const query = `
        INSERT INTO cartae_items (
          id, type, title, content, metadata, tags, categories, source, archived, favorite, embedding
        ) VALUES ${values}
      `;

      await pool.query(query, params);

      // Progress
      const progress = ((batch + 1) / batches) * 100;
      process.stdout.write(
        `\r   Progress: ${progress.toFixed(1)}% (${(batch + 1) * BATCH_SIZE} items)`
      );
    }

    const insertDuration = Date.now() - insertStart;
    const insertRate = TOTAL_ITEMS / (insertDuration / 1000);

    console.log('');
    console.log(`✅ Inserted ${TOTAL_ITEMS.toLocaleString()} items`);
    console.log(`   Duration: ${(insertDuration / 1000).toFixed(2)}s`);
    console.log(`   Rate: ${insertRate.toFixed(0)} items/sec`);
    console.log('');

    // ========================================================================
    // Test 2: Ajout embeddings (10k items pour le test)
    // ========================================================================

    console.log('🧠 Test 2: Adding embeddings to 10,000 items...');

    const EMBEDDING_COUNT = 10_000;
    const embeddingStart = Date.now();

    // Batch update embeddings
    const EMBED_BATCH = 100;
    const embedBatches = Math.ceil(EMBEDDING_COUNT / EMBED_BATCH);

    for (let batch = 0; batch < embedBatches; batch++) {
      const updatePromises = [];

      for (let i = 0; i < EMBED_BATCH; i++) {
        const index = batch * EMBED_BATCH + i;
        if (index >= EMBEDDING_COUNT) break;

        const id = `test-${index.toString().padStart(10, '0')}`;
        const embedding = generateRandomEmbedding();
        const vectorString = `[${embedding.join(',')}]`;

        updatePromises.push(
          pool.query(
            'UPDATE cartae_items SET embedding = $1, embedding_model = $2, embedding_updated_at = NOW() WHERE id = $3',
            [vectorString, 'test-embedding-model', id]
          )
        );
      }

      await Promise.all(updatePromises);

      const progress = ((batch + 1) / embedBatches) * 100;
      process.stdout.write(`\r   Progress: ${progress.toFixed(1)}%`);
    }

    const embeddingDuration = Date.now() - embeddingStart;
    const embeddingRate = EMBEDDING_COUNT / (embeddingDuration / 1000);

    console.log('');
    console.log(`✅ Added ${EMBEDDING_COUNT.toLocaleString()} embeddings`);
    console.log(`   Duration: ${(embeddingDuration / 1000).toFixed(2)}s`);
    console.log(`   Rate: ${embeddingRate.toFixed(0)} embeddings/sec`);
    console.log('');

    // ========================================================================
    // Test 3: Full-text search
    // ========================================================================

    console.log('🔍 Test 3: Full-text search performance...');

    const queries = ['urgent important', 'deadline budget', 'client meeting', 'project task'];

    const searchResults: Array<{ query: string; duration: number; count: number }> = [];

    for (const query of queries) {
      const start = Date.now();
      const results = await fullTextSearch(query, 20);
      const duration = Date.now() - start;

      searchResults.push({ query, duration, count: results.length });
    }

    const avgSearchTime =
      searchResults.reduce((sum, r) => sum + r.duration, 0) / searchResults.length;

    console.log(`✅ Full-text search completed`);
    searchResults.forEach(r => {
      console.log(`   "${r.query}": ${r.duration}ms (${r.count} results)`);
    });
    console.log(`   Average: ${avgSearchTime.toFixed(2)}ms`);
    console.log('');

    // ========================================================================
    // Test 4: Vector search (HNSW)
    // ========================================================================

    console.log('🧬 Test 4: Vector search performance (HNSW index)...');

    const vectorQueries = Array.from({ length: 5 }, () => generateRandomEmbedding());

    const vectorResults: Array<{ duration: number; count: number }> = [];

    for (const embedding of vectorQueries) {
      const start = Date.now();
      const results = await semanticSearch(embedding, 20, 0.7);
      const duration = Date.now() - start;

      vectorResults.push({ duration, count: results.length });
    }

    const avgVectorTime =
      vectorResults.reduce((sum, r) => sum + r.duration, 0) / vectorResults.length;

    console.log(`✅ Vector search completed`);
    vectorResults.forEach((r, i) => {
      console.log(`   Query ${i + 1}: ${r.duration}ms (${r.count} results)`);
    });
    console.log(`   Average: ${avgVectorTime.toFixed(2)}ms`);
    console.log('');

    // ========================================================================
    // Test 5: Hybrid search
    // ========================================================================

    console.log('🔀 Test 5: Hybrid search performance...');

    const hybridQueries = [
      { text: 'urgent deadline', embedding: generateRandomEmbedding() },
      { text: 'client meeting budget', embedding: generateRandomEmbedding() },
    ];

    const hybridResults: Array<{ query: string; duration: number; count: number }> = [];

    for (const { text, embedding } of hybridQueries) {
      const start = Date.now();
      const results = await hybridSearch(text, embedding, 0.5, 0.5, 20);
      const duration = Date.now() - start;

      hybridResults.push({ query: text, duration, count: results.length });
    }

    const avgHybridTime =
      hybridResults.reduce((sum, r) => sum + r.duration, 0) / hybridResults.length;

    console.log(`✅ Hybrid search completed`);
    hybridResults.forEach(r => {
      console.log(`   "${r.query}": ${r.duration}ms (${r.count} results)`);
    });
    console.log(`   Average: ${avgHybridTime.toFixed(2)}ms`);
    console.log('');

    // ========================================================================
    // Résumé final
    // ========================================================================

    console.log('📊 Performance Summary:');
    console.log('');
    console.log(`   Insert rate:         ${insertRate.toFixed(0)} items/sec`);
    console.log(`   Embedding rate:      ${embeddingRate.toFixed(0)} embeddings/sec`);
    console.log(`   Full-text search:    ${avgSearchTime.toFixed(2)}ms avg`);
    console.log(`   Vector search:       ${avgVectorTime.toFixed(2)}ms avg`);
    console.log(`   Hybrid search:       ${avgHybridTime.toFixed(2)}ms avg`);
    console.log('');

    // Vérifier objectifs
    const objectives = {
      insert: insertDuration / 1000 < 60,
      search: avgSearchTime < 100,
      vector: avgVectorTime < 20,
      hybrid: avgHybridTime < 150,
    };

    console.log('🎯 Performance Objectives:');
    console.log(
      `   ${objectives.insert ? '✅' : '❌'} Insert 100k items < 60s: ${(insertDuration / 1000).toFixed(2)}s`
    );
    console.log(
      `   ${objectives.search ? '✅' : '❌'} Full-text search < 100ms: ${avgSearchTime.toFixed(2)}ms`
    );
    console.log(
      `   ${objectives.vector ? '✅' : '❌'} Vector search < 20ms: ${avgVectorTime.toFixed(2)}ms`
    );
    console.log(
      `   ${objectives.hybrid ? '✅' : '❌'} Hybrid search < 150ms: ${avgHybridTime.toFixed(2)}ms`
    );
    console.log('');

    const allPassed = Object.values(objectives).every(v => v);
    console.log(allPassed ? '🎉 All objectives met!' : '⚠️  Some objectives not met');
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await pool.query("DELETE FROM cartae_items WHERE source->>'connector' = 'test-connector'");
    console.log('✅ Cleanup complete');
    console.log('');
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Lance les tests
runPerformanceTests().catch(error => {
  console.error(error);
  process.exit(1);
});
