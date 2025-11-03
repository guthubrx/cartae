# @cartae/plugin-marketplace

> 🧩 Complete plugin marketplace solution for Cartae - Discovery, ratings, admin dashboard, and performance-optimized components

[![Version](https://img.shields.io/npm/v/@cartae/plugin-marketplace.svg)](https://www.npmjs.com/package/@cartae/plugin-marketplace)
[![License](https://img.shields.io/npm/l/@cartae/plugin-marketplace.svg)](https://github.com/cartae/cartae/blob/main/LICENSE)

## Features

### 🔍 Discovery & Browse
- **Plugin Discovery**: Search, filter by category/pricing, featured/trending sections
- **Plugin Details**: Full details page with screenshots carousel, ratings, and metadata
- **Responsive Design**: Mobile-first UI with Tailwind CSS

### ⭐ Ratings & Reviews
- **User Reviews**: 1-5 star rating system with comments
- **Moderation Queue**: Admin approval workflow (GitHub OAuth)
- **Spam Detection**: Client-side heuristics (caps ratio, links, keywords)
- **Rating Statistics**: Distribution charts, average ratings, helpful votes

### 🛡️ Admin Dashboard
- **Overview**: Global marketplace stats (downloads, plugins, ratings)
- **Moderation**: Bulk approve/reject ratings, pending queue
- **Analytics**: Per-plugin metrics with download/rating trend charts
- **Access Control**: GitHub OAuth authentication (admin roles)

### ⚡ Performance
- **Smart Caching**: React Query patterns with stale-while-revalidate
- **Infinite Scroll**: Pagination infinie avec Intersection Observer
- **Virtual Lists**: Window virtualization pour grandes listes (1000+ plugins)
- **Lazy Loading**: Images chargées on-demand avec blur-up placeholders
- **Memoization**: React.memo optimisations pour éviter re-renders

### 🗄️ Backend Integration
- **Supabase**: Complete infrastructure reuse (tables, auth, rate limiting)
- **Registry API**: Compatible avec bigmind-registry.workers.dev
- **Type-safe**: Full TypeScript avec zod schemas

## Installation

```bash
npm install @cartae/plugin-marketplace
# or
pnpm add @cartae/plugin-marketplace
```

### Peer Dependencies

```bash
npm install react@^18.2.0 @cartae/plugin-system
```

## Quick Start

### Basic Plugin List

```tsx
import { PluginList, PluginStore } from '@cartae/plugin-marketplace';

function MarketplacePage() {
  const [plugins, setPlugins] = useState([]);
  const pluginStore = new PluginStore('https://bigmind-registry.workers.dev');

  useEffect(() => {
    pluginStore.fetchPlugins({}).then(setPlugins);
  }, []);

  return (
    <PluginList
      plugins={plugins}
      onInstall={async (id) => {
        await pluginStore.installPlugin(id);
      }}
      onViewDetails={(id) => {
        router.push(\`/marketplace/\${id}\`);
      }}
    />
  );
}
```

### With Caching (Recommended)

```tsx
import { usePluginsQuery, OptimizedPluginGrid } from '@cartae/plugin-marketplace';

function OptimizedMarketplace() {
  const { data, isLoading, error } = usePluginsQuery(
    'https://bigmind-registry.workers.dev',
    { category: 'productivity' }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <OptimizedPluginGrid
      plugins={data || []}
      onInstall={handleInstall}
      onViewDetails={handleViewDetails}
    />
  );
}
```

## API Reference

See full documentation in [docs/api.md](./docs/api.md)

## Testing

### E2E Tests (Playwright)

```bash
# Run all tests
npm run test:e2e

# Run specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

## License

MIT © BigMind Team

---

**Need help?** Open an issue sur [GitHub](https://github.com/cartae/cartae/issues) 🚀
