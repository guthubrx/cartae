# Dockview Exploration - Session 54A

## Installation Status

✅ **Completed** (15 min):

- `pnpm add dockview` - v4.10.0 installed successfully
- `pnpm remove flexlayout-react` - removed successfully
- Package.json updated in `/apps/web/package.json`

---

## Dockview Overview

### What is Dockview?

- **Zero-dependency layout manager** for ReactJS and vanilla TypeScript
- Built on VSCode's splitview/gridview architecture (proven, battle-tested)
- Supports tabs, grids, splitviews, and docking solutions
- MIT License, active GitHub repo: https://github.com/mathuo/dockview

### Key Features Relevant to Cartae

1. **Serializable Layouts** - Persist panel configs, add/remove panels dynamically
2. **Drag & Drop** - Native drag zones with visual previews (colored borders, animations)
3. **Customizable Theming** - CSS variables + class targeting for deep customization
4. **Rich Component Control** - Custom headers, tabs, badges, notifications
5. **Floating/Popout Windows** - Programmatic control via API
6. **Resize Handles** - Correct cursors (col-resize, row-resize), live updates
7. **No External Dependencies** - Unlike flexlayout-react

### Package Structure

- Main package: `dockview@4.10.0`
- Core dependency: `dockview-core@4.10.0` (bundled inside dockview)
- React wrapper: `dockview/react`
- Built outputs: ESM, CJS, AMD formats

---

## React API Deep Dive

### Core Components

#### 1. **DockviewReact** (Main Component)

```typescript
interface IDockviewReactProps extends DockviewOptions {
  // Component Registration (factory pattern)
  components: Record<string, React.FunctionComponent<IDockviewPanelProps>>;

  // Optional: Custom tab renderers
  tabComponents?: Record<string, React.FunctionComponent<IDockviewPanelHeaderProps>>;

  // Optional: Custom header actions
  rightHeaderActionsComponent?: React.FunctionComponent<IDockviewHeaderActionsProps>;
  leftHeaderActionsComponent?: React.FunctionComponent<IDockviewHeaderActionsProps>;
  prefixHeaderActionsComponent?: React.FunctionComponent<IDockviewHeaderActionsProps>;

  // Optional: Watermark (empty state)
  watermarkComponent?: React.FunctionComponent<IWatermarkPanelProps>;

  // Callbacks
  onReady: (event: DockviewReadyEvent) => void;
  onDidDrop?: (event: DockviewDidDropEvent) => void;
  onWillDrop?: (event: DockviewWillDropEvent) => void;
}
```

**Key Points:**

- Accepts a `components` map: register all panel types upfront
- Lifecycle starts with `onReady` callback, gives you the API object
- Forward ref returns HTMLDivElement for container

#### 2. **DockviewApi** (Obtained via onReady callback)

The API object passed to `onReady` is your main control interface:

```typescript
api.addPanel(options: AddPanelOptions): void
api.removePanel(panelId: string): void
api.getGroup(groupId: string): DockviewGroupPanelApi | undefined
api.toJSON(): DockviewLayoutState  // Serialization
api.fromJSON(state: DockviewLayoutState): void  // Deserialization
```

#### 3. **ReactPanelContentPart** (Content Renderer)

Manages panel content:

- Receives `IDockviewPanelProps`:
  - `api`: PanelApi for interacting with the panel
  - `group`: GroupApi for group operations
  - `params`: Custom data passed during panel creation

#### 4. **ReactPanelHeaderPart** (Tab Renderer)

Manages tab headers:

- Receives `IDockviewPanelHeaderProps`:
  - `api`: PanelApi for the panel
  - `group`: GroupApi
  - Render custom tab content with badges, icons, etc.

### Portal System (React Integration)

```typescript
export const usePortalsLifecycle: () => [
  React.ReactPortal[],
  (portal: React.ReactPortal) => DockviewIDisposable,
];

export class ReactPart<P extends object> implements IFrameworkPart {
  // Bridges Dockview's core with React components
  // Uses React.createPortal internally
}
```

---

## Key API Methods & Events

### Adding Panels

```typescript
api.addPanel({
  id: 'unique-panel-id',
  component: 'registered-component-name',
  position: { reference: 'group-id' },
  params: {
    /* custom data */
  },
  title: 'Panel Title',
});
```

### Group Operations

```typescript
const group = api.getGroup('group-id');
group?.api.addPanel(...);
group?.api.removePanel('panel-id');
group?.api.closePanelGroup();  // Close entire group
```

### Layout Serialization

```typescript
// Save layout state
const state = api.toJSON();
localStorage.setItem('layout', JSON.stringify(state));

// Restore layout state
const saved = JSON.parse(localStorage.getItem('layout'));
api.fromJSON(saved);
```

### Drag & Drop Events

- `onWillDrop(event)`: Fired before drop, can cancel
- `onDidDrop(event)`: Fired after successful drop
- Drop event includes: source panel, target location, group reference

---

## Architectural Patterns Discovered

### 1. **Component Registration (Factory Pattern)**

```typescript
const components = {
  'file-explorer': FileExplorerPanel,
  'properties': PropertiesPanel,
  'canvas': CanvasPanel,
  'settings': SettingsPanel
};

<DockviewReact components={components} {...} />
```

**Benefit:** Dynamic panel type support without React Router or complex conditional rendering

### 2. **State Management via API Ref**

```typescript
const apiRef = useRef<DockviewApi>(null);

const handleReady = (event: DockviewReadyEvent) => {
  apiRef.current = event.api;
};

// Later: apiRef.current.addPanel(...)
```

**Benefit:** Decouples panel operations from component hierarchy

### 3. **Custom Tab Rendering**

```typescript
tabComponents: {
  'default': ({ api, group, params }) => (
    <div>
      <Icon name={params.icon} />
      <span>{params.title}</span>
      {params.isModified && <span className="dot">*</span>}
    </div>
  )
}
```

**Benefit:** Rich tab interactions without touching core Dockview

### 4. **Header Actions (VSCode-style)**

```typescript
rightHeaderActionsComponent: ({ api, group }) => (
  <div>
    <Button onClick={() => api.removePanel()}>✕</Button>
    <Button onClick={() => api.maximizePanel()}>⬜</Button>
  </div>
)
```

**Benefit:** Standard toolbar interactions familiar to users

### 5. **Layout Persistence**

```typescript
// On unmount or before page leave
const state = api.toJSON();
sessionStorage.setItem('dockview-layout', JSON.stringify(state));

// On mount/init
const saved = sessionStorage.getItem('dockview-layout');
if (saved) api.fromJSON(JSON.parse(saved));
```

**Benefit:** Auto-restore user's panel arrangement across sessions

### 6. **Portal System for React Integration**

Dockview uses React.createPortal internally via ReactPart:

- Each panel gets rendered as a portal
- Allows normal React state/hooks within panels
- Context propagation works (if configured correctly)

---

## Integration Points with Cartae

### Current State (from DockableLayout.tsx, 672 LOC)

- Uses flexlayout-react with BorderFactory
- Hard-coded panels: Files, Map, Kanban, Table, Properties, Settings
- CSS manages theming (336 LOC)

### Migration Strategy (Session 54C-54D)

1. **Component Registration** - Map existing panels to Dockview `components` prop
2. **Layout Structure** - Replace flexlayout JSON with Dockview serialization
3. **Panel Registry** - Adapt `panelRegistry.tsx` to work with Dockview API
4. **Styling** - Map CSS variables from Cartae design system to Dockview classes

### Potential Enhancements (Session 54F-54H)

1. **Drag Zones** - Add visual drop zones (preview borders)
2. **Tab Badges** - Show unsaved state, notifications on tabs
3. **Animations** - Smooth transitions on resize, panel appearance
4. **Context Menu** - Right-click on tabs for close/split/pin options
5. **Keyboard Shortcuts** - Focus cycling, panel creation, layout reset

---

## CSS/Theming Integration

### Dockview CSS Variables

- `.dockview { --dockview-primary-color: ... }`
- `.dockview-tab { --dockview-tab-height: ... }`
- `.dockview-splitview { --dockview-splitview-border: ... }`

### Cartae Design System Mapping

- Primary: `--cartae-primary-500` → `--dockview-primary-color`
- Border: `--cartae-border-500` → `--dockview-splitview-border`
- Text: `--cartae-text-primary` → `--dockview-text-color`
- Background: `--cartae-bg-secondary` → `--dockview-bg-color`

---

## Files to Review Next (Session 54B)

1. `dockview.dev/docs/api` - Full API documentation
2. `dockview.dev/docs/examples` - Code examples and patterns
3. `/apps/web/src/layouts/DockableLayout.tsx` - Current implementation to migrate
4. `/apps/web/src/components/panelRegistry.tsx` - Panel definitions

---

## Summary of Session 54A

**Completed:**

- ✅ Install dockview@4.10.0
- ✅ Remove flexlayout-react
- ✅ Explore TypeScript type definitions
- ✅ Document React API surface
- ✅ Identify architectural patterns
- ✅ Plan integration with Cartae

**Token Usage:** ~45 min of exploration docs (expected ~4h for ultra-deep analysis across all 9 sessions)

**Next Session (54B):**

- Deep research on theming patterns
- CSS variables strategy
- Component registration patterns
- Build base layout + styling infrastructure

**Estimated Difficulty:** Medium (straightforward React integration, proven patterns)
**Estimated Risk:** Low (zero dependencies, battle-tested architecture)
