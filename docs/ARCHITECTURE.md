# Molarity Calculator - Architecture Documentation

## Overview

This document outlines the architectural decisions, design patterns, and technical implementation details of the Molarity Calculator application.

## Technology Stack Rationale

### Frontend Framework: React 18 + TypeScript

**Why React?**
- Component-based architecture ideal for calculator UI with multiple modes
- Large ecosystem and community support
- Excellent performance with hooks and memoization
- TypeScript provides type safety for scientific calculations

**Why TypeScript?**
- Prevents calculation errors through type checking
- Better IDE support with autocomplete
- Easier refactoring and maintenance
- Self-documenting code with interfaces

### Desktop Framework: Tauri

**Why Tauri over Electron?**
- Smaller bundle size (~3MB vs ~100MB)
- Lower memory footprint
- Uses system webview instead of bundling Chromium
- Rust backend provides better security
- Native system integration

### Styling: Tailwind CSS

**Advantages:**
- Utility-first approach speeds up development
- Consistent design system
- Easy to customize
- Small production bundle with PurgeCSS
- Responsive design built-in
- Dark mode support

### State Management: Context API

**Why Context API over Redux?**
- Simpler for this application's scope
- No additional dependencies
- Built into React
- Sufficient for managing:
  - Chemical database
  - Recipes
  - User preferences
  - Toast notifications

**When to consider Redux:**
- If adding user accounts
- If implementing undo/redo
- If adding complex state transformations

### Database: IndexedDB

**Why IndexedDB?**
- Browser-native, no server required
- Supports offline functionality
- Can store large amounts of data
- Asynchronous operations
- Structured data with indexes

**idb Library:**
- Promise-based API (cleaner than native IndexedDB)
- TypeScript support
- Small size (~1.5KB)
- Maintained by Google Chrome team

## Application Architecture

### Layer Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│    (React Components + Tailwind)        │
├─────────────────────────────────────────┤
│         State Management Layer          │
│         (Context API)                   │
├─────────────────────────────────────────┤
│         Business Logic Layer            │
│    (Calculation Utils, Validators)      │
├─────────────────────────────────────────┤
│         Data Layer                      │
│  (IndexedDB Service, PubChem API)       │
└─────────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── AppProvider (Context)
│   ├── Header
│   │   └── Navigation
│   ├── Main Content
│   │   ├── Calculator
│   │   │   ├── Mode Selector
│   │   │   ├── Input Fields
│   │   │   ├── ChemicalSearch
│   │   │   └── Result Display
│   │   ├── RecipeList
│   │   │   ├── Search/Filter
│   │   │   ├── Recipe Cards
│   │   │   └── Recipe Detail Modal
│   │   └── About
│   ├── ToastContainer
│   │   └── Toast (multiple)
│   └── Footer
```

## Data Flow

### Chemical Search Flow

```
User Input
    ↓
ChemicalSearch Component
    ↓
Local Search (IndexedDB)
    ↓
Results Found? → Yes → Display
    ↓ No
PubChem API Search
    ↓
Cache Result → Display → Save to IndexedDB
```

### Calculation Flow

```
User Input → Validate → Calculate → Format → Display
                ↓           ↓
            Error?      Generate Steps
                ↓           ↓
            Show Toast  Show in UI
```

## Design Patterns

### 1. Container/Presentational Pattern

**Container Components:**
- `App.tsx` - Manages global state and routing
- `Calculator.tsx` - Manages calculation state
- `RecipeList.tsx` - Manages recipe filtering and selection

**Presentational Components:**
- `Toast.tsx` - Pure display component
- Individual input fields - Controlled components

### 2. Custom Hooks Pattern

```typescript
// useApp hook for accessing context
const { chemicals, recipes, showToast } = useApp();
```

**Benefits:**
- Encapsulates context access
- Type-safe
- Easier to test
- Reusable across components

### 3. Service Pattern

**Services encapsulate external interactions:**

```typescript
// Database Service
src/services/database.ts
- getAllChemicals()
- saveChemical()
- searchChemicals()

// API Service
src/services/pubchem.ts
- searchCompoundByName()
- getCompoundByCID()
- Cache management
```

### 4. Factory Pattern

Used in calculation system to create different calculators:

```typescript
performCalculation(calculation) {
  switch (calculation.mode) {
    case MASS_FROM_MOLARITY:
      return calculateMassFromMolarity(calculation);
    case MOLARITY_FROM_MASS:
      return calculateMolarityFromMass(calculation);
    // etc.
  }
}
```

## Database Schema Design

### Normalized Structure

**Chemicals Table**
```typescript
{
  id: string (primary key)
  commonName: string (indexed)
  iupacName?: string
  formula: string
  molecularWeight: number
  casNumber?: string
  category: ChemicalCategory (indexed)
  tags: string[]
}
```

**Recipes Table**
```typescript
{
  id: string (primary key)
  name: string
  category: RecipeCategory (indexed)
  components: RecipeComponent[] (foreign key: chemicalId)
  totalVolume: number
  isCustom: boolean (indexed)
  // ... other fields
}
```

**Why this design?**
- Chemicals are reusable across recipes
- Easy to update chemical data
- Efficient querying with indexes
- Future-proof for cloud sync

### Future Cloud Sync Preparation

The database is designed to support eventual cloud synchronization:

1. **UUID-based IDs**: Prevent conflicts between local and cloud
2. **Timestamps**: Track created/modified dates
3. **isCustom flag**: Distinguish user vs. system data
4. **Modular structure**: Easy to add sync fields (syncedAt, serverId, etc.)

## API Integration Strategy

### PubChem API

**Caching Strategy:**
- Cache responses for 24 hours
- Store in Map (in-memory cache)
- Fast lookups for frequently searched chemicals
- Automatic cleanup of stale entries

**Error Handling:**
- Graceful degradation
- User-friendly error messages
- Retry logic for network errors
- Fallback to local database

**Rate Limiting:**
- Client-side throttling
- Exponential backoff on errors
- User feedback during long operations

## Performance Optimizations

### 1. React Optimizations

```typescript
// Memoization for expensive calculations
const filteredRecipes = useMemo(() => {
  // Filtering logic
}, [recipes, filterCategory, searchQuery]);

// Callback memoization
const handleSelect = useCallback((chemical) => {
  // ...
}, [dependencies]);
```

### 2. Database Optimizations

- Indexes on frequently searched fields
- Batch operations for bulk inserts
- Lazy loading of large datasets
- Efficient queries with getAll vs. cursor iteration

### 3. Bundle Size Optimizations

- Tree shaking with ES modules
- Dynamic imports for heavy features (future)
- Tailwind CSS purging
- Compression in production build

### 4. Rendering Optimizations

- Virtualization for long lists (future enhancement)
- Debounced search inputs
- Controlled re-renders with React.memo

## Testing Strategy

### Unit Tests

**Coverage:**
- ✅ Calculation utilities
- ✅ Unit conversions
- ✅ Validation functions
- ⏳ Component logic (future)

**Testing Library:**
- Vitest (Vite-native, fast)
- Compatible with Jest ecosystem
- Built-in code coverage

### Future Testing

**Integration Tests:**
- Database operations
- API mocking
- Context provider behavior

**E2E Tests:**
- Tauri commands
- User workflows
- Cross-platform builds

## Security Considerations

### Input Validation

- All user inputs validated before calculations
- Range checks for realistic values
- Type safety with TypeScript
- SQL injection not applicable (IndexedDB)

### API Security

- HTTPS for PubChem API
- No API keys required (public API)
- Rate limiting to prevent abuse
- Input sanitization for search queries

### Tauri Security

- CSP (Content Security Policy) configured
- Limited allowlist for system APIs
- Sandboxed webview
- Rust backend prevents common vulnerabilities

## Scalability Considerations

### Current Limits

- **Chemicals**: ~10,000 (IndexedDB quota: ~50MB)
- **Recipes**: ~5,000
- **Concurrent calculations**: Unlimited (client-side)

### Future Scaling

**For Cloud Version:**
- Pagination for large datasets
- Server-side search
- CDN for static assets
- Load balancing for API requests

**For Desktop:**
- SQLite for larger datasets
- Background workers for heavy operations
- Streaming for large imports/exports

## Accessibility

### Standards Compliance

- ARIA labels on interactive elements
- Keyboard navigation support
- Semantic HTML structure
- Focus management
- Screen reader compatibility

### User Experience

- Clear error messages
- Loading states
- Success confirmations
- Undo/clear operations
- Helpful tooltips (future)

## Code Organization

### File Structure Philosophy

```
src/
├── components/     # Reusable UI components
├── contexts/       # Global state (Context API)
├── data/           # Static data and seeds
├── services/       # External integrations
├── types/          # TypeScript definitions
├── utils/          # Pure utility functions
└── styles/         # CSS and themes
```

**Principles:**
- One component per file
- Colocate related code
- Separate concerns (UI vs. Logic)
- Group by feature, not by type

### Naming Conventions

**Components:**
- PascalCase: `Calculator.tsx`
- Descriptive names: `ChemicalSearch.tsx`

**Functions:**
- camelCase: `calculateMass()`
- Verb-first: `getChemical()`, `saveRecipe()`

**Types:**
- PascalCase: `Chemical`, `Recipe`
- Descriptive: `CalculationResult` not `CalcRes`

**Constants:**
- UPPER_SNAKE_CASE: `CALCULATION_MODES`
- Grouped by context

## Future Architecture Considerations

### Potential Enhancements

1. **Custom Recipe Builder**
   - Add drag-and-drop component
   - Form validation
   - Real-time calculation preview

2. **User Accounts**
   - Authentication layer (Firebase, Auth0)
   - User-specific data partitioning
   - Sync service
   - Conflict resolution

3. **Advanced Calculations**
   - pH calculator module
   - Serial dilution planner
   - Percentage solutions
   - Plugin architecture for extensibility

4. **Collaboration Features**
   - Share recipes via URL
   - Export as PDF/PNG
   - QR code for mobile transfer
   - Version control for recipes

### Migration Paths

**From IndexedDB to Cloud:**
```
Local IndexedDB → Export JSON → Backend API → Cloud Database
    ↓                               ↓
Periodic Sync ← ← ← ← ← ← ← Sync Service
```

**From Context to Redux (if needed):**
- Gradual migration per feature
- Both can coexist
- Move complex state first
- Keep simple state in Context

## Conclusion

This architecture balances:
- **Simplicity** for current needs
- **Flexibility** for future enhancements
- **Performance** for smooth UX
- **Maintainability** for long-term support

The modular design allows incremental improvements without major rewrites.
