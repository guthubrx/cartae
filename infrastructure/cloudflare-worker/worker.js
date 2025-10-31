/**
 * Cartae Plugin Marketplace API - Cloudflare Worker
 *
 * REST API pour le marketplace de plugins Cartae/BigMind
 * Stockage: Cloudflare R2
 *
 * Architecture:
 * - R2 Bucket: Stockage des ZIPs et registry.json
 * - KV Store: Cache et metadata
 * - Analytics: Track downloads et installs
 *
 * Endpoints:
 * - GET  /api/plugins                    - Liste paginée avec filtres
 * - GET  /api/plugins/:id                - Détails d'un plugin
 * - GET  /api/plugins/:id/download       - Télécharger le ZIP
 * - GET  /api/plugins/featured           - Plugins en vedette
 * - GET  /api/plugins/trending           - Plugins tendance
 * - GET  /api/plugins/categories/:cat    - Filtrer par catégorie
 * - POST /api/plugins/:id/track-install  - Track installation
 * - GET  /api/search                     - Recherche avancée
 * - GET  /api/health                     - Health check
 *
 * Déploiement:
 * ```bash
 * cd infrastructure/cloudflare-worker
 * wrangler deploy
 * ```
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  cache: {
    registry: 60, // 1 minute
    plugin: 300, // 5 minutes
    download: 86400, // 24 heures
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  rateLimit: {
    requests: 100, // Par minute
    window: 60000, // 1 minute en ms
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Headers CORS standards
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * Réponse JSON avec headers CORS
 */
function jsonResponse(data, status = 200, cacheControl = null) {
  const headers = {
    ...getCorsHeaders(),
    'Content-Type': 'application/json',
  };

  if (cacheControl) {
    headers['Cache-Control'] = cacheControl;
  }

  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Réponse d'erreur standardisée
 */
function errorResponse(message, status = 500, details = null) {
  return jsonResponse(
    {
      error: message,
      status,
      details,
      timestamp: new Date().toISOString(),
    },
    status
  );
}

/**
 * Récupérer le registry depuis R2 avec cache
 */
async function getRegistry(env) {
  try {
    const registry = await env.R2_BUCKET.get('registry.json');

    if (!registry) {
      return { plugins: [] };
    }

    const data = await registry.text();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error fetching registry:', error);
    throw new Error('Failed to load registry');
  }
}

/**
 * Parser les paramètres de pagination
 */
function getPaginationParams(url) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || String(CONFIG.pagination.defaultLimit), 10),
    CONFIG.pagination.maxLimit
  );

  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    offset: (Math.max(1, page) - 1) * limit,
  };
}

/**
 * Filtrer les plugins selon les critères
 */
function filterPlugins(plugins, filters) {
  let filtered = [...plugins];

  // Filtrer par catégorie
  if (filters.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }

  // Filtrer par source
  if (filters.source) {
    filtered = filtered.filter(p => p.source === filters.source);
  }

  // Filtrer par pricing
  if (filters.pricing) {
    filtered = filtered.filter(p => p.pricing === filters.pricing);
  }

  // Filtrer par featured
  if (filters.featured === 'true') {
    filtered = filtered.filter(p => p.featured === true);
  }

  // Recherche textuelle
  if (filters.q) {
    const query = filters.q.toLowerCase();
    filtered = filtered.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
}

/**
 * Trier les plugins
 */
function sortPlugins(plugins, sortBy = 'name') {
  const sorted = [...plugins];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'downloads':
      return sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    case 'updated':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
      });

    default:
      return sorted;
  }
}

/**
 * Paginer un tableau
 */
function paginateArray(array, offset, limit) {
  return array.slice(offset, offset + limit);
}

/**
 * Créer une réponse paginée
 */
function createPaginatedResponse(items, total, page, limit) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Track une installation (analytics basique)
 */
async function trackInstall(env, pluginId, version) {
  try {
    const key = `install:${pluginId}:${version}`;
    const current = await env.KV_STORE.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;

    await env.KV_STORE.put(key, String(count), {
      expirationTtl: 86400 * 30, // 30 jours
    });

    return count;
  } catch (error) {
    console.error('Failed to track install:', error);
    return null;
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/plugins
 * Liste tous les plugins avec pagination, filtres et tri
 */
async function handleGetPlugins(request, env) {
  const url = new URL(request.url);

  // Récupérer le registry
  const registry = await getRegistry(env);
  let plugins = registry.plugins || [];

  // Appliquer les filtres
  const filters = {
    category: url.searchParams.get('category'),
    source: url.searchParams.get('source'),
    pricing: url.searchParams.get('pricing'),
    featured: url.searchParams.get('featured'),
    q: url.searchParams.get('q'),
  };
  plugins = filterPlugins(plugins, filters);

  // Trier
  const sortBy = url.searchParams.get('sort') || 'name';
  plugins = sortPlugins(plugins, sortBy);

  // Pagination
  const { page, limit, offset } = getPaginationParams(url);
  const total = plugins.length;
  const paginatedPlugins = paginateArray(plugins, offset, limit);

  // Réponse
  return jsonResponse(
    createPaginatedResponse(paginatedPlugins, total, page, limit),
    200,
    `public, max-age=${CONFIG.cache.registry}`
  );
}

/**
 * GET /api/plugins/:id
 * Détails d'un plugin spécifique
 */
async function handleGetPlugin(pluginId, env) {
  const registry = await getRegistry(env);
  const plugin = registry.plugins.find(p => p.id === pluginId);

  if (!plugin) {
    return errorResponse('Plugin not found', 404, { pluginId });
  }

  return jsonResponse(plugin, 200, `public, max-age=${CONFIG.cache.plugin}`);
}

/**
 * GET /api/plugins/:id/download
 * Télécharger le ZIP d'un plugin
 */
async function handleDownloadPlugin(pluginId, version, env) {
  // Récupérer les infos du plugin
  const registry = await getRegistry(env);
  const plugin = registry.plugins.find(p => p.id === pluginId);

  if (!plugin) {
    return errorResponse('Plugin not found', 404, { pluginId });
  }

  // Déterminer la version
  const targetVersion = version === 'latest' || !version ? plugin.version : version;
  const zipPath = `plugins/${pluginId}/${pluginId}-${targetVersion}.zip`;

  console.log(`Downloading: ${zipPath}`);

  // Récupérer le ZIP depuis R2
  const zipFile = await env.R2_BUCKET.get(zipPath);

  if (!zipFile) {
    return errorResponse('Plugin ZIP not found', 404, { path: zipPath });
  }

  // Retourner le fichier
  return new Response(zipFile.body, {
    headers: {
      ...getCorsHeaders(),
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pluginId}-${targetVersion}.zip"`,
      'Cache-Control': `public, max-age=${CONFIG.cache.download}`,
    },
  });
}

/**
 * GET /api/plugins/featured
 * Récupérer les plugins en vedette
 */
async function handleGetFeatured(env) {
  const registry = await getRegistry(env);
  const featured = registry.plugins.filter(p => p.featured === true);

  return jsonResponse({ data: featured }, 200, `public, max-age=${CONFIG.cache.registry}`);
}

/**
 * GET /api/plugins/trending
 * Récupérer les plugins tendance (basé sur downloads récents)
 */
async function handleGetTrending(env) {
  const registry = await getRegistry(env);

  // Trier par downloads décroissants
  const trending = sortPlugins(registry.plugins, 'downloads').slice(0, 10);

  return jsonResponse({ data: trending }, 200, `public, max-age=${CONFIG.cache.registry}`);
}

/**
 * GET /api/plugins/categories/:category
 * Filtrer par catégorie
 */
async function handleGetByCategory(category, env) {
  const registry = await getRegistry(env);
  const plugins = registry.plugins.filter(p => p.category === category);

  return jsonResponse({ data: plugins, category }, 200, `public, max-age=${CONFIG.cache.registry}`);
}

/**
 * POST /api/plugins/:id/track-install
 * Track une installation de plugin
 */
async function handleTrackInstall(request, pluginId, env) {
  try {
    const body = await request.json();
    const { version } = body;

    if (!version) {
      return errorResponse('Version is required', 400);
    }

    const count = await trackInstall(env, pluginId, version);

    return jsonResponse({
      success: true,
      pluginId,
      version,
      installs: count,
    });
  } catch (error) {
    return errorResponse('Failed to track install', 500, error.message);
  }
}

/**
 * GET /api/search
 * Recherche avancée avec suggestions
 */
async function handleSearch(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query || query.length < 2) {
    return errorResponse('Query must be at least 2 characters', 400);
  }

  const registry = await getRegistry(env);
  const results = filterPlugins(registry.plugins, { q: query });

  // Limiter les résultats
  const limited = results.slice(0, 20);

  return jsonResponse(
    {
      query,
      results: limited,
      total: results.length,
    },
    200,
    `public, max-age=${CONFIG.cache.registry}`
  );
}

/**
 * GET /api/health
 * Health check endpoint
 */
async function handleHealth(env) {
  try {
    // Vérifier R2
    const registry = await env.R2_BUCKET.get('registry.json');
    const r2Status = registry ? 'ok' : 'empty';

    // Vérifier KV si disponible
    let kvStatus = 'not_configured';
    if (env.KV_STORE) {
      try {
        await env.KV_STORE.get('health_check');
        kvStatus = 'ok';
      } catch {
        kvStatus = 'error';
      }
    }

    return jsonResponse({
      status: 'ok',
      service: 'cartae-marketplace-api',
      timestamp: new Date().toISOString(),
      components: {
        r2: r2Status,
        kv: kvStatus,
      },
    });
  } catch (error) {
    return errorResponse('Health check failed', 503, error.message);
  }
}

// ============================================================================
// ROUTER
// ============================================================================

/**
 * Router principal
 */
async function router(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  // OPTIONS (CORS preflight)
  if (method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
  }

  try {
    // GET /api/plugins (list with filters)
    if (pathname === '/api/plugins' && method === 'GET') {
      return await handleGetPlugins(request, env);
    }

    // GET /api/plugins/featured
    if (pathname === '/api/plugins/featured' && method === 'GET') {
      return await handleGetFeatured(env);
    }

    // GET /api/plugins/trending
    if (pathname === '/api/plugins/trending' && method === 'GET') {
      return await handleGetTrending(env);
    }

    // GET /api/plugins/categories/:category
    const categoryMatch = pathname.match(/^\/api\/plugins\/categories\/([^\/]+)$/);
    if (categoryMatch && method === 'GET') {
      return await handleGetByCategory(categoryMatch[1], env);
    }

    // GET /api/plugins/:id/download
    const downloadMatch = pathname.match(/^\/api\/plugins\/([^\/]+)\/download$/);
    if (downloadMatch && method === 'GET') {
      const version = url.searchParams.get('version') || 'latest';
      return await handleDownloadPlugin(downloadMatch[1], version, env);
    }

    // POST /api/plugins/:id/track-install
    const trackMatch = pathname.match(/^\/api\/plugins\/([^\/]+)\/track-install$/);
    if (trackMatch && method === 'POST') {
      return await handleTrackInstall(request, trackMatch[1], env);
    }

    // GET /api/plugins/:id (single plugin)
    const pluginMatch = pathname.match(/^\/api\/plugins\/([^\/]+)$/);
    if (pluginMatch && method === 'GET') {
      return await handleGetPlugin(pluginMatch[1], env);
    }

    // GET /api/search
    if (pathname === '/api/search' && method === 'GET') {
      return await handleSearch(request, env);
    }

    // GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
      return await handleHealth(env);
    }

    // Route non trouvée
    return errorResponse('Not found', 404, {
      path: pathname,
      method,
      availableEndpoints: [
        'GET /api/plugins',
        'GET /api/plugins/:id',
        'GET /api/plugins/:id/download?version=latest',
        'GET /api/plugins/featured',
        'GET /api/plugins/trending',
        'GET /api/plugins/categories/:category',
        'POST /api/plugins/:id/track-install',
        'GET /api/search?q=query',
        'GET /api/health',
      ],
    });
  } catch (error) {
    console.error('Router error:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
}

// ============================================================================
// WORKER ENTRYPOINT
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    return await router(request, env);
  },
};
