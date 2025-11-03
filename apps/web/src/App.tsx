/**
 * FR: Composant principal de l'application BigMind
 * EN: Main BigMind application component
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useMindmap } from './hooks/useMindmap';
import DockableLayoutV2 from './layouts/DockableLayoutV2';
import SettingsPage from './pages/Settings';
import { MarketplacePage } from './pages/MarketplacePage';
import { useAppSettings } from './hooks/useAppSettings';
import { useOpenFiles } from './hooks/useOpenFiles';
import { useTagGraphFileSync } from './hooks/useTagGraphFileSync';
import { useColumnCollapse } from './hooks/useColumnCollapse';
import { useCanvasOptions } from './hooks/useCanvasOptions';
import { clearTagsLocalStorage } from './utils/clearTagsLocalStorage';
import { initializePlugins } from './utils/pluginManager';
import { OAuthCallbackHandler } from './components/plugins/OAuthCallbackHandler';
import { ToastContainer } from './components/ui/ToastContainer';
import './App.css';

function App() {
  const { mindMap, actions } = useMindmap();
  const loadAppSettings = useAppSettings(s => s.load);
  const reopenFilesOnStartup = useAppSettings(s => s.reopenFilesOnStartup);
  const restoreOpenFilesFromStorage = useOpenFiles(s => s.restoreOpenFilesFromStorage);
  const openFiles = useOpenFiles(s => s.openFiles);
  const loadColumnCollapse = useColumnCollapse(s => s.load);
  const loadCanvasOptions = useCanvasOptions(s => s.load);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // FR: Nettoyer le localStorage des anciens tags (une seule fois au démarrage)
  // EN: Clean localStorage of old tags (once on startup)
  useEffect(() => {
    clearTagsLocalStorage();

    // FR: Initialiser le système de plugins
    // EN: Initialize the plugin system
    initializePlugins();
  }, []);

  // FR: Synchroniser les tags avec le fichier actif
  // EN: Sync tags with active file
  useTagGraphFileSync();

  // FR: Charger les paramètres (accent color, etc.) très tôt au démarrage
  // EN: Load persisted settings (accent color, etc.) early on startup
  useEffect(() => {
    loadAppSettings();
    loadColumnCollapse();
    loadCanvasOptions();
    setSettingsLoaded(true);
  }, [loadAppSettings, loadColumnCollapse, loadCanvasOptions]);

  // FR: Restaurer les fichiers ouverts si le paramètre est activé (attendre que les settings soient chargés)
  // EN: Restore open files if setting is enabled (wait for settings to load)
  useEffect(() => {
    if (settingsLoaded && reopenFilesOnStartup) {
      restoreOpenFilesFromStorage();
    }
  }, [settingsLoaded, reopenFilesOnStartup, restoreOpenFilesFromStorage]);

  // FR: Initialiser une nouvelle carte au chargement SEULEMENT si aucun fichier n'a été restauré
  // EN: Initialize a new map on load ONLY if no files were restored
  useEffect(() => {
    if (settingsLoaded && !mindMap && openFiles.length === 0) {
      actions.createNewMap('Ma première carte');
    }
  }, [settingsLoaded, mindMap, actions, openFiles.length]);

  return (
    <div className="app">
      {/* Handle GitHub OAuth callback globally */}
      <OAuthCallbackHandler />

      {/* Global toast notifications */}
      <ToastContainer />

      <Routes>
        <Route path="/" element={<DockableLayoutV2 />} />
        <Route path="/map/:id" element={<DockableLayoutV2 />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
      </Routes>
    </div>
  );
}

export default App;
