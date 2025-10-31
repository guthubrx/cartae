/**
 * Migration: App Config for Marketplace Source Control
 *
 * Cette table permet de contrôler dynamiquement la source du marketplace
 * (Git vs Cloudflare CDN) sans nécessiter de rebuild des applications déployées.
 *
 * Le plugin Admin écrira dans cette table via une UI,
 * et toutes les apps (anciennes et nouvelles) liront cette config au runtime.
 */

-- Créer la table app_config
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commentaires sur les colonnes
COMMENT ON TABLE app_config IS 'Configuration globale de l''application accessible en lecture publique';
COMMENT ON COLUMN app_config.config_key IS 'Clé unique de configuration (ex: marketplace_source)';
COMMENT ON COLUMN app_config.config_value IS 'Valeur JSON de la configuration';
COMMENT ON COLUMN app_config.description IS 'Description de la configuration';
COMMENT ON COLUMN app_config.updated_by IS 'UUID de l''admin qui a mis à jour (nullable pour config initiale)';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);
CREATE INDEX IF NOT EXISTS idx_app_config_updated_at ON app_config(updated_at DESC);

-- Activer RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture publique (toutes les apps peuvent lire)
CREATE POLICY "app_config_public_read" ON app_config
  FOR SELECT
  USING (true);

-- Policy: Écriture réservée aux admins
CREATE POLICY "app_config_admin_write" ON app_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Insérer la configuration par défaut (Git)
INSERT INTO app_config (config_key, config_value, description)
VALUES (
  'marketplace_source',
  jsonb_build_object(
    'type', 'git',
    'priority', ARRAY['git']::text[],
    'gitUrl', 'https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json',
    'cloudflareUrl', null,
    'healthCheckEnabled', true,
    'healthCheckIntervalMs', 60000,
    'fallbackOnError', true
  ),
  'Configuration de la source du marketplace (git, cloudflare, ou both)'
)
ON CONFLICT (config_key) DO NOTHING;

-- Créer une fonction pour mettre à jour la config avec l'user ID
CREATE OR REPLACE FUNCTION update_app_config(
  p_config_key TEXT,
  p_config_value JSONB,
  p_description TEXT DEFAULT NULL
)
RETURNS app_config
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result app_config;
  v_is_admin BOOLEAN;
BEGIN
  -- Vérifier que l'utilisateur est admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update app config';
  END IF;

  -- Upsert la configuration
  INSERT INTO app_config (config_key, config_value, description, updated_by)
  VALUES (p_config_key, p_config_value, p_description, auth.uid())
  ON CONFLICT (config_key)
  DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = COALESCE(EXCLUDED.description, app_config.description),
    updated_by = auth.uid(),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION update_app_config IS 'Met à jour la configuration de l''app (réservé aux admins)';

-- Créer une fonction pour obtenir la config du marketplace
CREATE OR REPLACE FUNCTION get_marketplace_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT config_value INTO v_config
  FROM app_config
  WHERE config_key = 'marketplace_source';

  -- Si pas de config, retourner la config par défaut
  IF v_config IS NULL THEN
    RETURN jsonb_build_object(
      'type', 'git',
      'priority', ARRAY['git']::text[],
      'gitUrl', 'https://raw.githubusercontent.com/cartae/cartae-plugins/main/registry.json',
      'healthCheckEnabled', true,
      'healthCheckIntervalMs', 60000,
      'fallbackOnError', true
    );
  END IF;

  RETURN v_config;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION get_marketplace_config IS 'Récupère la config marketplace (accessible publiquement)';

-- Grant permissions
GRANT SELECT ON app_config TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_marketplace_config TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_app_config TO authenticated;

-- Créer une vue pour l'historique des changements (audit)
CREATE OR REPLACE VIEW app_config_history AS
SELECT
  ac.id,
  ac.config_key,
  ac.config_value,
  ac.description,
  ac.updated_at,
  ac.updated_by,
  au.email as updated_by_email,
  au.full_name as updated_by_name
FROM app_config ac
LEFT JOIN admin_users adu ON ac.updated_by = adu.user_id
LEFT JOIN auth.users au ON ac.updated_by = au.id
ORDER BY ac.updated_at DESC;

-- Commentaire sur la vue
COMMENT ON VIEW app_config_history IS 'Historique des modifications de config avec infos admin';

-- Grant sur la vue (seulement pour les admins)
GRANT SELECT ON app_config_history TO authenticated;

-- Policy pour la vue (admins only)
CREATE POLICY "app_config_history_admin_only" ON app_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );
