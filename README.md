# Expense Tracker & Reminders

A private, two-module app:

1. **Expenses** — log every rupee given to someone: recipient, amount,
   transaction ID, date, reason, description, remarks, payment mode
   (PhonePe / Bank Transfer / Cash / paid by someone else), and a photo
   of the bill/slip.
2. **Reminders / Tasks** — create a reminder for yourself or assign it
   to someone else. They get a **push notification on their phone**
   the moment it's assigned, and again when it becomes due. They can
   log in with their own username/password and post updates or mark
   it done.

Plus a small **Dashboard** (this month's total, top recipients, by
payment mode, pending/overdue tasks) and a **Users** page (owner-only)
to create logins for other people.

---

## 1. Backend setup

```bash
cd backend
npm install
npm run seed     # creates the first "owner" login from .env
npm run dev      # starts on http://localhost:5001
```

Your `.env` is already filled in with the Mongo/JWT/VAPID/Cloudinary
values you gave me. At the bottom of `.env` there's also:

```
OWNER_USERNAME=owner
OWNER_PASSWORD=changeme123
```

`npm run seed` creates that owner account once. **Log in with it and
change the password mentally (there's no in-app password-change yet —
see "Known gaps" below) or just edit `.env` and reseed before you give
it out.**

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:3001
```

Open `http://localhost:3001` — it'll redirect to `/login`.

## 3. Creating a second login (for whoever you assign tasks to)

Log in as the owner → **Users** (left menu) → fill in name/username/
password → **Create Login**. Give them that username/password; they
log in at the same URL and only see their own assigned reminders.

## 4. Push notifications — what to know

- The first time anyone logs in, the browser will ask for notification
  permission. They need to tap **Allow** for pushes to work.
- Push works over `http://localhost` for local testing. For real phone
  use, the frontend needs to be served over **HTTPS** (any real domain
  with SSL, or a tunnel like ngrok/Cloudflare Tunnel while testing on
  a phone) — browsers block push subscriptions on plain HTTP once it's
  not `localhost`.
- A reminder notification fires twice: once immediately when it's
  assigned, and once when its due time arrives (checked every 60s by
  `backend/reminderScheduler.js`).

## 5. Folder structure

```
backend/
  config/        Mongo, Cloudinary, web-push setup
  models/        User, Expense, Reminder, PushSubscription
  controllers/   route logic
  routes/        express routers
  middleware/    JWT auth, multer upload, error handling
  reminderScheduler.js   the "check for due reminders" loop
  seed.js        creates the first owner login
  server.js      entry point

frontend/
  app/           Next.js App Router pages (login, dashboard, expenses, reminders, users)
  components/    Navbar, ProtectedRoute, ExpenseCard, StatCard
  lib/           api client, auth helpers, push-subscribe helper
  public/        service-worker.js (handles incoming push), manifest.json
```

## 6. Known gaps (kept out to stay shippable — easy to add later)

- No in-app "change my password" screen yet — the owner's password
  only comes from `.env` at seed time.
- Editing an expense's photo works, but there's no in-app password
  reset flow for members (owner would need to know their password or
  you'd add a "reset password" button to the Users page).
- `public/service-worker.js` references `/icon-192.png` for the
  notification icon — add any 192×192 PNG at that path (or change the
  reference) for a custom icon; without it the browser just uses its
  default bell icon, nothing breaks.

## 7. Every file was syntax-checked before packaging

- All backend files: `node --check` (Node's own parser) — all pass.
- All frontend files: parsed with `esbuild`'s real JSX parser — all
  pass.
- Every relative `import`/`require` path was checked to actually
  resolve to a real file.

That doesn't guarantee zero bugs (nothing can without your actual
Mongo/Cloudinary credentials responding live), but there are no
syntax errors or broken imports anywhere in the package.
