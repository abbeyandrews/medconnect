# MedConnect — Web app

The staff workspace for [MedConnect](https://github.com/abbeyandrews/medconnect-backend),
a USSD-web hybrid appointment system for a hospital.

Administrators, receptionists and doctors sign in here and work one shared
appointment book. Patients never sign in — they reach the same book by dialling
a USSD short code from any phone, and those bookings appear here the moment
they are made.

The API lives in a separate repository:
**[abbeyandrews/medconnect-backend](https://github.com/abbeyandrews/medconnect-backend)**.

## Running it

**You need:** Node 18+, and the API running (locally or deployed).

```bash
cp .env.local.example .env.local     # point NEXT_PUBLIC_API_URL at the API
npm install
npm run dev                          # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` must include the `/api` suffix, for example
`http://localhost:5000/api`. **It is baked in when the site is built**, not read
at runtime, so changing it later needs a rebuild.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## What is in here

| Screen | For |
|---|---|
| Dashboard | The clinic at a glance, by role |
| Appointments | The shared book — search, filter, reschedule, change status |
| Schedule | One doctor's day, slot by slot |
| Patients | Records, history, and who registered them |
| Doctors | Profiles, clinic hours, and emergency cover |
| USSD channel | A working handset against the live endpoint, plus session logs |
| Reports | Attendance, channel mix, and the message log |
| Admin | Staff accounts, departments, settings, audit log |

## Notes

**The USSD console is not a mock-up.** Every screen comes from the same
`POST /api/ussd` a telecom gateway calls, so a booking made there is a real
booking.

**Sessions are per-tab.** They live in `sessionStorage`, so a new tab starts
signed out. Two roles can be compared side by side in two tabs, and nobody
inherits whoever used the machine last.

**Built with** Next.js 14 (App Router), TypeScript, Tailwind, Radix primitives
and Recharts.
