import { Check, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

/**
 * Type de toast (correspond aux types de messages)
 */
type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Structure d'un toast individuel
 *
 * @property id - Identifiant unique du toast
 * @property type - Type de toast (détermine couleur et icône)
 * @property message - Message à afficher
 * @property duration - Durée d'affichage en ms (0 = persistant)
 */
interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * API du contexte Toast
 *
 * @property toasts - Liste des toasts actifs
 * @property addToast - Ajoute un nouveau toast
 * @property removeToast - Supprime un toast par son ID
 */
interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Hook pour accéder au système de toasts
 *
 * Doit être utilisé dans un composant enfant de ToastProvider
 *
 * @throws Error si utilisé hors d'un ToastProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { addToast } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       addToast('success', 'Données sauvegardées avec succès');
 *     } catch (error) {
 *       addToast('error', 'Erreur lors de la sauvegarde');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Sauvegarder</button>;
 * }
 * ```
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

/**
 * Props pour ToastProvider
 *
 * @property children - Composants enfants qui auront accès au système de toasts
 */
interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider du système de toasts
 *
 * À placer au niveau racine de l'application (ou du sous-arbre qui en a besoin)
 *
 * Gère :
 * - État global des toasts actifs
 * - Ajout/suppression de toasts
 * - Auto-dismiss après duration
 * - Rendu du container de toasts
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ToastProvider>
 *       <YourApp />
 *     </ToastProvider>
 *   );
 * }
 * ```
 */
export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    // Auto-dismiss après duration (sauf si duration = 0)
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Props pour ToastContainer
 *
 * @property toasts - Liste des toasts à afficher
 * @property onRemove - Callback pour supprimer un toast
 */
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

/**
 * Container des toasts (positionnement fixe en bas à droite)
 *
 * Position : fixed bottom-4 right-4
 * Z-index : 50 (au-dessus de la plupart des éléments)
 * Stack : vertical avec gap-2
 */
const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

/**
 * Props pour ToastItem
 *
 * @property toast - Toast à afficher
 * @property onRemove - Callback pour supprimer le toast
 */
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

/**
 * Toast individuel avec icône, message et bouton de fermeture
 *
 * Features :
 * - Icône par type (success: check, error: x, warning: triangle, info: i)
 * - Couleurs par type cohérentes avec ErrorMessage
 * - Animation slide-in depuis la droite
 * - Bouton de fermeture manuel
 * - Largeur minimale 300px
 * - Shadow pour profondeur visuelle
 */
const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const icons = {
    success: <Check className="text-green-600 flex-shrink-0" size={20} />,
    error: <XCircle className="text-red-600 flex-shrink-0" size={20} />,
    info: <Info className="text-blue-600 flex-shrink-0" size={20} />,
    warning: <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div
      className={`${styles[toast.type]} border rounded-lg p-4 shadow-lg min-w-[300px] animate-slide-in`}
      role="status"
    >
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
          aria-label="Fermer la notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
