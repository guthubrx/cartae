/**
 * Generic request interface for extracting network information
 * Compatible with Express, Hono, Cloudflare Workers, etc.
 */
export interface GenericRequest {
  headers: {
    get?: (name: string) => string | null | undefined;
    [key: string]: any;
  };
  socket?: {
    remoteAddress?: string;
  };
  connection?: {
    remoteAddress?: string;
  };
  ip?: string;
}

/**
 * Extrait l'adresse IP du client depuis une requête HTTP.
 *
 * Supporte plusieurs formats de headers pour la compatibilité multi-plateformes:
 * - Cloudflare: `cf-connecting-ip`
 * - Proxies standard: `x-forwarded-for`, `x-real-ip`
 * - Direct: `req.socket.remoteAddress`, `req.connection.remoteAddress`, `req.ip`
 *
 * @param req - L'objet requête HTTP (compatible Express, Hono, CF Workers)
 * @returns L'adresse IP du client ou 'unknown' si non disponible
 *
 * @example
 * ```typescript
 * const ip = getClientIP(req);
 * console.log(`Client IP: ${ip}`);
 * ```
 */
export function getClientIP(req: GenericRequest): string {
  // Helper pour récupérer un header de manière safe
  const getHeader = (name: string): string | null | undefined => {
    if (req.headers.get) {
      return req.headers.get(name);
    }
    return req.headers[name];
  };

  // 1. Cloudflare Workers: cf-connecting-ip (IP réelle du client)
  const cfIP = getHeader('cf-connecting-ip');
  if (cfIP) return cfIP;

  // 2. Proxies standard: x-forwarded-for (liste d'IPs si plusieurs proxies)
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    // Prendre la première IP de la liste (client original)
    return forwardedFor.split(',')[0].trim();
  }

  // 3. Nginx/Apache: x-real-ip
  const realIP = getHeader('x-real-ip');
  if (realIP) return realIP;

  // 4. Connexion directe (Node.js)
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  if (req.ip) return req.ip;

  return 'unknown';
}

/**
 * Extrait l'identifiant du tenant depuis le header `x-tenant-id`.
 *
 * Utilisé dans les architectures multi-tenant pour identifier
 * l'organisation/compte du client faisant la requête.
 *
 * @param req - L'objet requête HTTP
 * @returns L'ID du tenant ou `null` si non fourni
 *
 * @example
 * ```typescript
 * const tenantID = getTenantID(req);
 * if (tenantID) {
 *   console.log(`Request from tenant: ${tenantID}`);
 * }
 * ```
 */
export function getTenantID(req: GenericRequest): string | null {
  const getHeader = (name: string): string | null | undefined => {
    if (req.headers.get) {
      return req.headers.get(name);
    }
    return req.headers[name];
  };

  const tenantID = getHeader('x-tenant-id');
  return tenantID || null;
}

/**
 * Vérifie si une adresse IP est dans une liste d'IPs autorisées (whitelist).
 *
 * Supporte:
 * - IPs exactes: `192.168.1.100`
 * - Wildcards simples: `192.168.1.*`
 * - CIDR (à améliorer): comparaison exacte pour l'instant
 *
 * @param ip - L'adresse IP à vérifier
 * @param allowedIPs - Liste des IPs/patterns autorisés
 * @returns `true` si l'IP est autorisée, `false` sinon
 *
 * @example
 * ```typescript
 * const allowed = isIPAllowed('192.168.1.100', ['192.168.1.*', '10.0.0.5']);
 * // allowed = true
 *
 * const denied = isIPAllowed('203.0.113.50', ['192.168.1.*']);
 * // denied = false
 * ```
 */
export function isIPAllowed(ip: string, allowedIPs: string[]): boolean {
  if (allowedIPs.length === 0) {
    return false; // Pas de whitelist = deny all
  }

  for (const pattern of allowedIPs) {
    // 1. Match exact
    if (pattern === ip) return true;

    // 2. Wildcard pattern (ex: 192.168.1.*)
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      );
      if (regex.test(ip)) return true;
    }

    // 3. TODO: Support CIDR notation (192.168.1.0/24)
    // Pour l'instant, on fait un match exact sur CIDR
    if (pattern.includes('/') && pattern === ip) {
      return true;
    }
  }

  return false;
}

/**
 * Extrait le User-Agent du client depuis les headers HTTP.
 *
 * Utile pour:
 * - Logging/analytics
 * - Détection de bots
 * - Compatibilité navigateur
 *
 * @param req - L'objet requête HTTP
 * @returns Le User-Agent ou `undefined` si non fourni
 *
 * @example
 * ```typescript
 * const userAgent = getUserAgent(req);
 * if (userAgent?.includes('bot')) {
 *   console.log('Bot detected');
 * }
 * ```
 */
export function getUserAgent(req: GenericRequest): string | undefined {
  const getHeader = (name: string): string | null | undefined => {
    if (req.headers.get) {
      return req.headers.get(name);
    }
    return req.headers[name];
  };

  const ua = getHeader('user-agent');
  return ua || undefined;
}
