# Dockview Patterns & Best Practices - Session 54C

## 📋 Patterns Discovered During Migration

### 1. Panel Content Wrapping (Wrapper Pattern)

**Problem:** Each panel component needs standard styling and structure (padding, borders, etc.)

**Solution:** Create a wrapper function to inject `panel-content` class:

```typescript
const wrapPanelContent = (Component: React.ComponentType<any>, className?: string) => {
  return (props: IDockviewPanelProps) => (
    <div className={`panel-content${className ? ` ${className}` : ''}`}>
      <Component {...props} />
    </div>
  );
};

// Usage
const components = {
  files: wrapPanelContent(FileTabs),
  canvas: wrapPanelContent(MindMapCanvas, 'canvas-panel'), // Special class for canvas
  explorer: wrapPanelContent(NodeExplorer),
};
```

**Benefits:**
- ✅ DRY principle (Don't Repeat Yourself)
- ✅ Consistent styling across all panels
- ✅ Easy to add special classes per panel (canvas, etc.)
- ✅ Avoids JSX duplication in factory

---

### 2. Layout Configuration Object

**Problem:** Hardcoding layout structure in `onReady` is verbose and fragile

**Solution:** Define layout as a configuration object:

```typescript
interface LayoutConfig {
  columns: Array<{
    weight: number; // 15, 55, 30
    panels: Array<{
      id: string;
      component: string;
      title: string;
      position?: { direction?: 'below' | 'right' };
    }>;
  }>;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  columns: [
    {
      weight: 15,
      panels: [
        { id: 'files-panel', component: 'files', title: 'Files' },
        { id: 'explorer-panel', component: 'explorer', title: 'Explorer' },
      ],
    },
    {
      weight: 55,
      panels: [{ id: 'canvas-panel', component: 'canvas', title: 'Canvas' }],
    },
    {
      weight: 30,
      panels: [
        { id: 'properties-panel', component: 'properties', title: 'Properties' },
        {
          id: 'mapsettings-panel',
          component: 'mapsettings',
          title: 'Map Settings',
          position: { direction: 'below' },
        },
      ],
    },
  ],
};

// Initialize
const initializeDefaultLayout = (api: DockviewApi) => {
  DEFAULT_LAYOUT_CONFIG.columns.forEach((column) => {
    const group = api.addGroup();
    column.panels.forEach((panel) => {
      api.addPanel({
        id: panel.id,
        component: panel.component,
        title: panel.title,
        position: {
          referenceGroup: group,
          direction: panel.position?.direction as any,
        },
      });
    });
  });
};
```

**Benefits:**
- ✅ Layout structure is data, not imperative code
- ✅ Easy to modify layout without touching JSX
- ✅ TypeScript validation (compiler catches errors)
- ✅ Separates data from rendering logic

---

### 3. Plugin Registry Integration

**Problem:** Core panels and plugin panels need unified system

**Solution:** Separate initialization, merge at runtime:

```typescript
// Core panels (always present)
const CORE_PANELS = { files, explorer, canvas, properties, mapsettings };

// Dynamic panels (from registry)
const [dynamicPanels, setDynamicPanels] = useState<Record<string, React.ComponentType<any>>>({});

// Listen to registry changes
useEffect(() => {
  const unsubscribe = onPanelRegistryChange(() => {
    const allPanels = getAllPanels();
    const newDynamic: Record<string, React.ComponentType<any>> = {};

    allPanels.forEach((panel) => {
      // Only add if NOT in core (avoid duplicates)
      if (!CORE_PANELS[panel.id]) {
        newDynamic[panel.id] = wrapPanelContent(panel.component);
      }
    });

    setDynamicPanels(newDynamic);
  });

  return unsubscribe;
}, []);

// Merge at render time
const components = { ...CORE_PANELS, ...dynamicPanels };
```

**Benefits:**
- ✅ Core panels guaranteed to exist
- ✅ Plugins can't override core
- ✅ Runtime panel addition/removal
- ✅ Type-safe component registry

---

### 4. Badge System Implementation

**Problem:** How to show badges on tabs without reimplementing tab rendering?

**Solution:** Custom tab component that queries panel registry:

```typescript
interface PanelWithBadge {
  id: string;
  badge?: () => number | null;
}

const getPanel = (componentId: string): PanelWithBadge | undefined => {
  return getAllPanels().find((p) => p.id === componentId);
};

const CustomTab: React.FC<IDockviewPanelProps> = ({ api, params }) => {
  const [badgeCount, setBadgeCount] = useState<number | null>(null);

  // Update badge count on interval (allows dynamic updates)
  useEffect(() => {
    const panel = getPanel(params?.component as string);
    if (!panel?.badge) return;

    const updateBadge = () => setBadgeCount(panel.badge?.() ?? null);
    updateBadge(); // Initial

    const interval = setInterval(updateBadge, 1000); // Update every 1s
    return () => clearInterval(interval);
  }, [params?.component]);

  return (
    <div className="dockview-custom-tab">
      <span>{api.title}</span>
      {badgeCount && badgeCount > 0 && (
        <span
          className="tab-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '18px',
            padding: '0 6px',
            marginLeft: '8px',
            background: 'var(--accent-color)',
            color: 'white',
            borderRadius: '9px',
            fontSize: '11px',
            fontWeight: '600',
          }}
        >
          {badgeCount}
        </span>
      )}
    </div>
  );
};
```

**Benefits:**
- ✅ Dynamic badge updates without re-rendering tabs
- ✅ Supports any badge count source (API, state, etc.)
- ✅ Non-intrusive (doesn't require panel modifications)
- ✅ Styled with Cartae design variables

---

### 5. Error Handling & Fallbacks

**Problem:** What if component is missing, JSON is corrupted, or unknown panel type is requested?

**Solution:** Graceful degradation with error logging:

```typescript
// Placeholder for missing components
const PlaceholderPanel: React.FC<IDockviewPanelProps> = ({ api }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--fg-tertiary)',
    }}
  >
    <div>Unknown component: {api.title}</div>
  </div>
);

// In components map
const components = {
  ...CORE_PANELS,
  ...dynamicPanels,
  placeholder: PlaceholderPanel,
};

// In onReady
const handleReady = (event: DockviewReadyEvent) => {
  dockviewApiRef.current = event.api;

  // Try to load persisted layout
  const savedLayout = localStorage.getItem('cartae_dockview_layout_v1');
  if (savedLayout) {
    try {
      event.api.fromJSON(JSON.parse(savedLayout));
      return;
    } catch (error) {
      console.warn('Failed to restore layout, using default:', error);
      localStorage.removeItem('cartae_dockview_layout_v1'); // Clean up corrupted data
    }
  }

  // Initialize default layout
  initializeDefaultLayout(event.api);
};
```

**Benefits:**
- ✅ App doesn't crash on corrupted storage
- ✅ Missing components show user-friendly placeholder
- ✅ Clear console logs for debugging
- ✅ Automatic cleanup of bad data

---

## 🎯 Session 54C Summary

**What was accomplished:**
- ✅ Migrated all 5 core panels from flexlayout to Dockview factory pattern
- ✅ Integrated plugin system with runtime panel registration
- ✅ Implemented badge display system
- ✅ Added error handling and graceful fallbacks
- ✅ Documented 5 reusable patterns

**Code Statistics:**
- DockableLayoutV2.tsx: ~377 LOC (complete factory implementation)
- 5 core panels properly wrapped and registered
- Badge system with 1-second refresh interval
- localStorage persistence (Session 54E ready)

**Testing Checklist for Each Panel:**
- [ ] Files panel: Renders correctly, can interact
- [ ] Explorer panel: Tree navigation works
- [ ] Canvas panel: MindMap displays
- [ ] Properties panel: Shows node properties
- [ ] MapSettings panel: Settings controls functional
- [ ] Drag between panels: Smooth dragging
- [ ] Close/reopen: Layout persists (Session 54E)
- [ ] Plugin panels: Dynamic loading works

**Patterns Reusable for:**
- Session 54D (layout refinement, plugin integration)
- Session 54E (persistence, badges enhancement)
- Session 54F+ (theming, polish, animations)
- Future projects requiring modular panel systems

---

## 🔗 References

- Dockview GitHub: https://github.com/mathuo/dockview
- TypeScript patterns: Factory pattern, Component composition
- React patterns: Custom hooks, Context API, Portal rendering
- Cartae panels: FileTabs, NodeExplorer, MindMapCanvas, NodeProperties, MapSettings
