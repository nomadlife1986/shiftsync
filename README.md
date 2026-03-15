# ShiftSync

ShiftSync is a multi-location staff scheduling platform for Coastal Eats. This repo contains the Next.js web app, the NestJS GraphQL API, and the shared Prisma package used for schema and seed data.

## Setup

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Local services:

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API / GraphQL | `http://localhost:3002/graphql` |

The default local database is PostgreSQL on `localhost:5433`.

## Login

The login screen includes demo quick-fill buttons for the three evaluator paths:

- Admin
- Manager
- Staff

Use those buttons on [login/page.tsx](/Users/didd/Work/priority-soft/shiftsync/apps/web/src/app/%28auth%29/login/page.tsx) to enter the app as each role without manually hunting for seeded accounts.

## Known Limitations

- Real-time updates are delivered with short polling in the web client instead of full subscription-driven updates on every page.
- Notification preferences are represented in-app, but email delivery is not implemented.
- One-off availability exceptions are supported by the data model but are not fully editable from the current settings UI.
- De-certifying a staff member from a location does not retroactively cancel existing assignments; historical assignments and audit data are preserved.

## Assumptions And Decisions

- Desired hours are a soft planning target used for fairness and scheduling guidance, not a hard assignment constraint.
- Any worked shift counts as a worked day for consecutive-day calculations, regardless of shift length.
- If a shift changes after a swap has reached manager review, the pending coverage workflow is cancelled and the original assignment stays in place until a new approval happens.
- Each location belongs to one configured timezone, and availability is evaluated in the timezone of the shift location.
