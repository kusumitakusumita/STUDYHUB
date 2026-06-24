# StudyHub — Engineering Archive (full-stack version)

A shared study-material library for your class — browse/search resources,
comment, upvote helpful material, post requests for things you're missing,
and track top contributors. This version is a real standalone website:
a Node.js/Express API with its own database, and a React frontend that
talks to it over HTTP. It runs anywhere (your laptop, a free host, a
university server) — it no longer depends on Claude in any way.

## Project structure

```
studyhub-fullstack/
├── backend/             Node.js + Express REST API
│   ├── server.js         entry point
│   ├── db.json            ← created automatically on first run (your database)
│   ├── .env.example      copy to .env and fill in
│   └── src/
│       ├── db.js          reads/writes db.json
│       ├── middleware/auth.js    checks login tokens
│       ├── utils/helpers.js
│       └── routes/
│           ├── auth.js        register / login / "who am I"
│           ├── resources.js   study material CRUD, upvotes, comments
│           ├── requests.js    the "ask the class" board
│           ├── leaderboard.js
│           └── bookmarks.js
│
└── frontend/            React app (built with Vite)
    ├── index.html
    ├── .env.example      copy to .env and fill in
    └── src/
        ├── main.jsx       entry point
        ├── App.jsx        top-level state + wiring
        ├── api.js         talks to the backend
        ├── AuthContext.jsx, ToastContext.jsx
        ├── constants.js, utils.jsx
        ├── styles.css     all visual design (same "blueprint" theme as before)
        └── components/    one file per UI piece (cards, modals, tabs, etc.)
```

## How to run it

You need [Node.js](https://nodejs.org) installed (v18 or newer). Two terminals:

**Terminal 1 — backend**
```bash
cd backend
npm install
cp .env.example .env
# open .env and set JWT_SECRET to a long random string —
# the command below generates one for you:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run dev
```
The API will start at `http://localhost:4000`. The first time it runs it
creates `db.json` (your database file) with a few example resources already
in it.

**Terminal 2 — frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
This starts the website at `http://localhost:5173`. Open that in your
browser. Register an account (any name + password, no email needed) and
you're in.

## How the backend actually works

- **Database**: `backend/db.json` — a plain JSON file holding three lists:
  `users`, `resources`, `requests`. It's read into memory and written back
  to disk after every change, via a small library called `lowdb`. This is
  deliberately simple (no SQL, no separate database server to install) so
  the whole thing is easy to read end-to-end. If your class grows large
  enough that a JSON file stops being practical, only `backend/src/db.js`
  would need to change — every route file just calls `db.read()`/`db.write()`
  without caring how that's implemented underneath.
- **Accounts**: real password-based accounts now (hashed with `bcryptjs` —
  passwords are never stored in plain text). Logging in gives you a signed
  token (JWT) that the frontend stores and sends back on every request that
  needs to know who you are.
- **API**: a standard REST API under `/api/...` — see the route files for
  the full list of endpoints, each with a comment explaining what it does.

## Deploying this somewhere real

This is two separate deployable pieces:
- **Backend**: any Node hosting works — Render, Railway, Fly.io, a VPS, etc.
  Just make sure `JWT_SECRET` is set as an environment variable there, and
  `CLIENT_ORIGIN` matches wherever you deploy the frontend.
- **Frontend**: `npm run build` in `frontend/` produces a `dist/` folder of
  static files you can host anywhere (Vercel, Netlify, GitHub Pages, etc.).
  Set `VITE_API_URL` to your deployed backend's URL before building.

## Admin dashboard

The **first person to register** automatically becomes an admin. You can also
pre-assign admin access to specific names by setting `ADMIN_NAMES` in
`backend/.env` before those people register:

```
ADMIN_NAMES=Prof_Rao,TA_Priya
```

Admin users see an **Admin** tab in the navigation with three sections:

- **Overview** — headline numbers (total users, active users in last 7 days,
  total resources, views, open requests) + 14-day bar charts for signups and
  activity, a most-active-users table, most-viewed-resources table, and a
  full breakdown of every type of action taken on the site.
- **Users** — full table of every registered account, sortable by any column:
  name, branch, semester, number of uploads, number of bookmarks, total
  actions taken, last active time, and join date.
- **Activity feed** — raw event log (newest first), filterable by event type.
  Every meaningful action is recorded: registrations, logins, resource
  uploads/views/upvotes/comments/deletes, bookmarks, and request
  posts/replies/fulfillments.

## Visitor analytics (anonymous traffic)

The site includes a slot for **Umami** analytics in `frontend/index.html` —
a privacy-friendly, cookie-free, GDPR-compliant analytics tool that records
page views, visitor counts, referrers, countries, browsers, and devices.
No personally identifiable information is collected, and no cookie consent
banner is required.

**To enable it after you deploy:**
1. Sign up free at [cloud.umami.is](https://cloud.umami.is) (or self-host)
2. Add your site — Umami gives you a **Website ID** and a script URL
3. Open `frontend/index.html` and:
   - Replace `REPLACE-WITH-YOUR-UMAMI-WEBSITE-ID` with your real Website ID
   - Replace the `src` URL with your Umami instance URL
   - **Remove** the `data-disabled="true"` attribute
4. Re-run `npm run build` and redeploy the frontend

The `data-disabled="true"` attribute is intentional — it prevents the script
from sending data while you're developing locally, so test traffic doesn't
pollute your real dashboard.



- `db.json` is a single file — fine for a class, not built for thousands of
  concurrent writers. Swap in Postgres/MongoDB if this ever needs to scale.
- No password reset flow (there's no email system wired up).
- No realtime updates — if a classmate adds something while you're looking
  at the page, you'll see it after your next refresh, not instantly. Adding
  that would mean introducing WebSockets.
- No file uploads — big files (PDFs, scans) still go through an external
  link (Drive, etc.) rather than being hosted by this server directly.
