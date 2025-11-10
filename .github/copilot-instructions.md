# GitHub Copilot Instructions for PetPawket

## Project Overview

PetPawket is a pet-focused e-commerce platform built with Node.js/Express 5, integrating with Shopify Storefront API, and using PostgreSQL for user data. The application helps pet owners discover products, manage pet profiles, track journals, and shop for their pets.

## Tech Stack

- **Backend**: Node.js 20+, Express 5, ESM modules
- **Database**: PostgreSQL with `pg` driver
- **Authentication**: Shopify Storefront cookie-based auth (no Clerk)
- **Frontend**: Vanilla JavaScript (ES modules), Bootstrap 5
- **E-commerce**: Shopify Storefront API integration
- **File Uploads**: Multer + Sharp for image processing
- **CSS**: Custom CSS with Stylelint enforcement

## Architecture Patterns

### Module System
- **Always use ESM**: `import/export` syntax, not `require()`
- **File extensions**: `.js` files use ESM (specified in `package.json` with `"type": "module"`)
- **Imports**: Always include `.js` extension in relative imports

### Authentication
- Cookie-based Shopify Storefront authentication
- **Middleware**: 
  - `requireAuth` - Blocks unauthenticated requests (401)
  - `softSession` - Non-blocking session check (returns `{ signedIn: false }`)
- **Token caching**: In-memory cache with configurable TTL (default 10 minutes)
- **Graceful degradation**: Falls back to cache on Shopify timeouts
- **No direct git/gh operations**: Use provided tools like `report_progress`

### Database Patterns

#### Naming Conventions
- **Database columns**: `snake_case` (e.g., `first_name`, `created_at`)
- **JavaScript objects**: `camelCase` (e.g., `firstName`, `createdAt`)
- **Always map between conventions** in queries using `AS` aliases

Example:
```javascript
const SELECT_USER = `
  id,
  email,
  first_name AS "firstName",
  last_name AS "lastName",
  created_at AS "createdAt"
`;
```

#### Connection
- Use the shared `Pool` instance from `userDB.pg.js` or `db/pgClient.js`
- Connection string from `process.env.DATABASE_URL`
- SSL mode controlled by `process.env.PGSSLMODE`

#### Data Types
- **UUIDs**: For primary keys (pets, users when applicable)
- **JSONB**: For flexible data (preferences, achievements, traits)
- **Arrays**: PostgreSQL arrays for tags, allergies, preferences (e.g., `TEXT[]`)
- **Timestamps**: Use `TIMESTAMPTZ` with `DEFAULT now()`

### API Routes

#### Organization
- Routes grouped by domain in `/routes/` directory
- Each router file exports an Express router
- Mounted in `server.js` with appropriate prefixes

#### Common Patterns
```javascript
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
router.use(express.json({ limit: '512kb' }));
router.use(express.urlencoded({ extended: false }));

// Public route
router.get('/public-endpoint', (req, res) => { /* ... */ });

// Protected route
router.get('/protected-endpoint', requireAuth, (req, res) => {
  const { customer } = req; // Available after requireAuth
  // ...
});

export default router;
```

#### Response Patterns
- **Success**: `res.json({ ok: true, data: ... })`
- **Client errors**: `res.status(4xx).json({ error: 'Message' })`
- **Server errors**: `res.status(500).json({ error: 'Internal error' })`
- **No caching for APIs**: All `/api/*` routes have `no-store` headers set automatically

### Shopify Integration

#### Storefront API
- Use `storefrontFetch()` from `utils/shopify.js`
- GraphQL queries with variables
- Timeout handling with retries for transient errors
- Offline fallbacks in development (when `ALLOW_OFFLINE_PRODUCTS=1`)

Example:
```javascript
import { storefrontFetch } from '../utils/shopify.js';

const query = `
  query GetProducts($limit: Int!) {
    products(first: $limit) {
      edges {
        node { id, title, handle }
      }
    }
  }
`;

const result = await storefrontFetch(query, { limit: 10 });
```

#### Environment Variables
- `SHOPIFY_DOMAIN` - Your shop domain (e.g., `your-shop.myshopify.com`)
- `SHOPIFY_STOREFRONT_TOKEN` - Storefront API access token
- `SHOPIFY_API_VERSION` - API version (default: `2024-07`)

### Frontend Patterns

#### JavaScript
- **Vanilla JS with ES modules**: No framework dependencies
- **Module imports**: Use `import` in `<script type="module">`
- **DOM utilities**: Helper functions like `byId()`, `debounce()`, `escapeHtml()`
- **Event delegation**: Attach listeners to parent elements when possible
- **Auth-aware fetches**: Use `authFetch()` from `navbar.js` for authenticated requests

#### HTML Structure
- **Component injection**: Load HTML fragments dynamically (e.g., navbar, footer)
- **Placeholders**: Use container divs like `<div id="navbar-container"></div>`
- **Bootstrap 5**: Primary UI framework
- **Icons**: Bootstrap Icons CDN

#### CSS Guidelines
- **Stylelint enforced**: Run `npm run lint:css` to check
- **Naming patterns**:
  - IDs: camelCase or kebab-case acceptable during migration
  - Classes: Prefer `pp-*` prefix for PetPawket components (e.g., `pp-featured`, `pp-cart-pill`)
- **Specificity**: Maximum 2 ID selectors per rule
- **No vendor prefixes**: Handled by PostCSS
- **Single-line declarations**: Max 1 property per line
- **File organization**: One CSS file per major component

Example class naming:
```css
/* Good */
.pp-navbar { }
.pp-cart-pill { }
.pp-dropdown { }

/* Acceptable during migration */
#navbarContainer { }
#cart-count { }
```

### File Organization

```
/
├── server.js                 # Main Express app
├── userDB.pg.js             # User data access layer
├── package.json             # ESM module type specified
├── .env                     # Environment variables (not committed)
│
├── /routes/                 # API route handlers
│   ├── productsRoutes.js    # Product endpoints
│   ├── cartRoutes.js        # Cart management
│   ├── petsRoutes.js        # Pet profiles
│   ├── addressesRoutes.js   # Shipping addresses
│   └── ...
│
├── /middleware/             # Express middleware
│   └── requireAuth.js       # Authentication guards
│
├── /utils/                  # Shared utilities
│   ├── shopify.js          # Shopify API helpers
│   └── auth.js             # Auth utilities
│
├── /db/                     # Database layer
│   ├── pgClient.js         # PostgreSQL client
│   └── migrations/         # SQL migration files
│
├── /public/                 # Static frontend files
│   ├── *.html              # Page templates
│   ├── *.js                # Client-side modules
│   ├── /css/               # Stylesheets
│   ├── /components/        # Reusable UI components
│   └── /uploads/           # User-uploaded files
│
└── /scripts/               # Build/utility scripts
```

## Development Guidelines

### Error Handling
- **Async/await**: Wrap in try/catch for async routes
- **Timeouts**: Set appropriate timeouts for external API calls
- **Graceful degradation**: Provide fallbacks for network failures
- **Logging**: Use `console.warn()` for non-critical issues, `console.error()` for errors

### Security
- **Never commit secrets**: Use `.env` file (in `.gitignore`)
- **SQL injection**: Always use parameterized queries (`$1`, `$2`, etc.)
- **XSS prevention**: Escape user input with `escapeHtml()` on frontend
- **Input validation**: Validate and sanitize all user inputs

### Environment Variables
Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SHOPIFY_DOMAIN` - Shopify store domain
- `SHOPIFY_STOREFRONT_TOKEN` - Storefront API token

Optional:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `SHOPIFY_API_VERSION` - API version (default: 2024-07)
- `SHOPIFY_TIMEOUT_MS` - API timeout (default: 5000)
- `SHOPIFY_AUTH_CACHE_TTL_MS` - Auth cache TTL (default: 600000)
- `PGSSLMODE` - PostgreSQL SSL mode (require/prefer/disable)

### Testing & Linting

#### Available Scripts
```bash
npm start              # Start production server
npm run dev            # Start with hot-reload
npm run lint:css       # Check CSS with Stylelint
npm run lint:css:fix   # Auto-fix CSS issues
npm test               # Run tests (currently placeholder)
```

#### Before Committing
1. Run CSS linter: `npm run lint:css:fix`
2. Test locally: `npm run dev`
3. Verify database migrations are idempotent
4. Check no secrets in code

## Common Tasks

### Adding a New API Route

1. Create route file in `/routes/`:
```javascript
// routes/myFeatureRoutes.js
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
router.use(express.json({ limit: '512kb' }));

router.get('/', requireAuth, async (req, res) => {
  try {
    // Implementation
    res.json({ ok: true, data: [] });
  } catch (err) {
    console.error('[myFeature] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
```

2. Mount in `server.js`:
```javascript
import myFeatureRouter from './routes/myFeatureRoutes.js';
app.use('/api/my-feature', myFeatureRouter);
```

### Adding a Database Migration

1. Create file in `/db/migrations/` with sequential numbering:
```sql
-- db/migrations/003_add_new_feature.sql
-- Make migrations idempotent with IF NOT EXISTS

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS new_field TEXT;

CREATE INDEX IF NOT EXISTS idx_users_new_field 
  ON users(new_field);
```

### Adding a Frontend Component

1. Create HTML in `/public/components/`:
```html
<!-- components/my-component.html -->
<div class="pp-my-component">
  <!-- Component markup -->
</div>
```

2. Create JavaScript module:
```javascript
// my-component.js
export function initMyComponent() {
  const container = document.getElementById('my-component-container');
  if (!container) return;
  
  // Initialize component
}
```

3. Create CSS in `/public/css/`:
```css
/* css/my-component.css */
.pp-my-component {
  /* Styles following Stylelint rules */
}
```

## Debugging Tips

- **Database**: Check PostgreSQL logs and query performance
- **Shopify API**: Look for timeout errors, check rate limits
- **Authentication**: Verify cookie is set, check token cache
- **Frontend**: Use browser DevTools console, Network tab
- **CSS**: Run `npm run lint:css` to catch issues early

## Migration Notes

- **Legacy code**: Some files may have older patterns (e.g., dropdown toggles)
- **Gradual modernization**: Prefer new patterns but don't break existing functionality
- **ID naming**: Both camelCase and kebab-case acceptable during transition
- **Comments**: Keep existing inline comments that explain "why" not "what"
