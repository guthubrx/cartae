/**
 * Marketplace Config Service
 * Service pour gérer la configuration du marketplace via Supabase
 */

// Types copiés depuis MarketplaceSourceResolver
export interface SourceConfig {
  type: 'git' | 'cloudflare' | 'both';
  priority: string[];
  gitUrl?: string;
  cloudflareUrl?: string;
  healthCheckEnabled: boolean;
  healthCheckIntervalMs: number;
  fallbackOnError: boolean;
}

// Supabase client - sera injecté à l'utilisation
let supabaseClient: any = null;

export function setSupabaseClient(client: any) {
  supabaseClient = client;
}

/**
 * Récupère la configuration actuelle du marketplace
 */
export async function getCurrentConfig(): Promise<SourceConfig | null> {
  if (!supabaseClient) {
    console.error('[MarketplaceConfigService] Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('app_config')
      .select('*')
      .eq('config_key', 'marketplace_source')
      .single();

    if (error) {
      console.error('[MarketplaceConfigService] Error fetching config:', error);
      return null;
    }

    return data?.config_value as SourceConfig;
  } catch (error) {
    console.error('[MarketplaceConfigService] Exception fetching config:', error);
    return null;
  }
}

/**
 * Met à jour la configuration du marketplace
 */
export async function updateConfig(config: SourceConfig): Promise<boolean> {
  if (!supabaseClient) {
    console.error('[MarketplaceConfigService] Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabaseClient.rpc('update_app_config', {
      p_config_key: 'marketplace_source',
      p_config_value: config as any,
      p_description: 'Configuration de la source du marketplace (git, cloudflare, ou both)',
    });

    if (error) {
      console.error('[MarketplaceConfigService] Error updating config:', error);
      return false;
    }

    console.info('[MarketplaceConfigService] Config updated successfully:', config.type);
    return true;
  } catch (error) {
    console.error('[MarketplaceConfigService] Exception updating config:', error);
    return false;
  }
}

/**
 * Bascule vers Git
 */
export async function switchToGit(): Promise<boolean> {
  const config: SourceConfig = {
    type: 'git',
    priority: ['git'],
    gitUrl: 'https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json',
    healthCheckEnabled: true,
    healthCheckIntervalMs: 60000,
    fallbackOnError: true,
  };

  return updateConfig(config);
}

/**
 * Bascule vers Cloudflare CDN
 */
export async function switchToCloudflare(cloudflareUrl?: string): Promise<boolean> {
  const config: SourceConfig = {
    type: 'cloudflare',
    priority: ['cloudflare'],
    cloudflareUrl: cloudflareUrl || 'https://marketplace.cartae.com',
    healthCheckEnabled: true,
    healthCheckIntervalMs: 60000,
    fallbackOnError: true,
  };

  return updateConfig(config);
}

/**
 * Bascule en mode hybride (both) avec priorité personnalisable
 */
export async function switchToBoth(
  priority: ('git' | 'cloudflare')[],
  options?: {
    gitUrl?: string;
    cloudflareUrl?: string;
    healthCheckEnabled?: boolean;
    fallbackOnError?: boolean;
  }
): Promise<boolean> {
  const config: SourceConfig = {
    type: 'both',
    priority,
    gitUrl: options?.gitUrl || 'https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json',
    cloudflareUrl: options?.cloudflareUrl || 'https://marketplace.cartae.com',
    healthCheckEnabled: options?.healthCheckEnabled ?? true,
    healthCheckIntervalMs: 60000,
    fallbackOnError: options?.fallbackOnError ?? true,
  };

  return updateConfig(config);
}

/**
 * Obtient l'historique des changements de configuration
 */
export async function getConfigHistory(): Promise<
  Array<{
    id: string;
    config_key: string;
    config_value: SourceConfig;
    updated_at: string;
    updated_by_email?: string;
    updated_by_name?: string;
  }>
> {
  if (!supabaseClient) {
    console.error('[MarketplaceConfigService] Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('app_config_history')
      .select('*')
      .eq('config_key', 'marketplace_source')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[MarketplaceConfigService] Error fetching history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[MarketplaceConfigService] Exception fetching history:', error);
    return [];
  }
}

/**
 * Test de connectivité vers une source
 */
export async function testSourceConnectivity(
  source: 'git' | 'cloudflare',
  url: string
): Promise<{
  success: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        responseTime,
      };
    } else {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Récupère les statistiques d'utilisation des sources
 */
export async function getSourceUsageStats(): Promise<{
  totalRequests: number;
  gitRequests: number;
  cloudflareRequests: number;
  fallbacks: number;
  errors: number;
  avgResponseTime: number;
}> {
  // Ces stats viennent du resolver côté client
  // On pourrait les agréger côté serveur via Supabase
  // Pour l'instant, on retourne des stats mockées
  // TODO: Implémenter l'agrégation via Supabase Functions
  return {
    totalRequests: 0,
    gitRequests: 0,
    cloudflareRequests: 0,
    fallbacks: 0,
    errors: 0,
    avgResponseTime: 0,
  };
}
