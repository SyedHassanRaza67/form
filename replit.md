# ProxyForm

Full-stack SaaS application for automated proxy-based form filling.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT tokens stored in localStorage
- **Form Scraping**: Cheerio + Axios

## Architecture

### Database Models
- **users**: name, email, password(hashed), role(admin/user/agent), isActive, parentUserId, proxy config fields, lastActive
- **sites**: ownerId, name, url, formSelector, submitSelector, fields(JSONB), isActive, scrapedAt
- **agent_sites**: junction table for agent-site assignments
- **submissions**: agentId, siteId, formData, proxy info, status, screenshot, duration

### User Roles
- **admin**: Sees all users, stats, can enable/disable/delete users, create users manually
- **user**: Adds target websites, scrapes forms, configures proxy, creates agent accounts
- **agent**: Fills forms for assigned sites, views submission history

### Key Files
- `shared/schema.ts` - All database schemas and Zod validation
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database CRUD operations
- `server/auth.ts` - JWT middleware
- `server/scraper.ts` - Cheerio form scraper
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/pages/admin-dashboard.tsx` - Admin panel
- `client/src/pages/user-dashboard.tsx` - User dashboard with 3 tabs
- `client/src/pages/agent-dashboard.tsx` - Agent form filling interface
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

### API Routes
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Current user
- `GET /api/admin/users` - All users (admin)
- `GET /api/admin/stats` - Dashboard stats (admin)
- `PATCH /api/admin/users/:id/toggle` - Toggle user active (admin)
- `DELETE /api/admin/users/:id` - Delete user (admin)
- `POST /api/admin/users` - Create user (admin)
- `POST /api/sites/scrape` - Scrape URL for form fields
- `POST /api/sites` - Save site
- `GET /api/sites` - Get user's sites
- `DELETE /api/sites/:id` - Delete site
- `POST /api/agents` - Create agent
- `GET /api/agents` - Get user's agents
- `DELETE /api/agents/:id` - Delete agent
- `PUT /api/proxy` - Save proxy config
- `GET /api/proxy` - Get proxy config
- `POST /api/proxy/test` - Test proxy connection
- `GET /api/agent/sites` - Agent's assigned sites
- `GET /api/agent/submissions` - Agent's submissions

### Design
- Dark theme (forced via HTML class="dark")
- Fonts: DM Sans (body), Space Mono (code/mono)
- Primary color: Blue (#3b82f6 range)

### Phases
- Phase 1: Auto Form Scraper (COMPLETE)
- Phase 2: Decodo Proxy Configuration (COMPLETE - UI ready, backend ready)
- Phase 3: Smart Proxy Geo-Targeting (planned)
- Phase 4: Headless Browser Auto-Fill with Puppeteer (planned)

### Environment Variables
- DATABASE_URL - PostgreSQL connection
- JWT_SECRET - JWT signing secret
- ADMIN_EMAIL - Auto-created admin email
- ADMIN_PASSWORD - Auto-created admin password
