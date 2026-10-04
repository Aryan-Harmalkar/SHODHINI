# SHODHINI — Smart Decentralized Waste Management System 🌱

**SHODHINI** is a cross-platform mobile and web application built with **React Native** and **Expo SDK 57**, powered by a decentralized, real-time **Supabase** backend. It connects active citizens with local municipal sanitation workers and garbage collectors for faster, coordinated waste reporting and area-based collection.

---

## 🌟 Key Features

- **Decentralized Multi-Role System**:
  - **Citizen / User**: File waste complaints with categories, descriptions, ward selection, and optional GPS coordinates. Track resolution status live and earn **Eco Points**.
  - **Garbage Collector**: Live, reactive feed of complaints filtered strictly to their assigned operating Ward. Update status in real time (`Assigned` ➔ `In Progress` ➔ `Completed`).
- **Real-Time Cross-Device Synchronization**:
  - Subscribes to Supabase Postgres Changes via WebSockets. When a citizen files a complaint, it appears in the collector's dashboard without refreshing.
  - When a collector updates a complaint's status, the citizen's screen updates live.
- **Eco Points & Automated Rewards**:
  - PostgreSQL trigger automatically awards **15 Eco Points** to the citizen when their complaint is marked `Completed` (guarded against re-awarding).
- **Row Level Security (RLS)**:
  - Database-enforced isolation ensuring workers only access their assigned wards and citizens manage their own reports.
- **Push Notification Ready**:
  - Built-in Supabase Edge Function (`notify-area`) and database webhook triggers to dispatch push notifications to workers via the Expo Push API.

---

## 🚀 Quick Start Guide (For Anyone Pulling This Repo)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Aryan-Harmalkar/SHODHINI.git
cd SHODHINI
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:
```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Note**: If you are collaborating with the team, ask for the project's shared Supabase URL and Anon Key. If setting up your own backend, see [Database Setup](#-database-setup) below.

### 3. Start the Application

```bash
npx expo start --web
```

- **Web Browser**: Open [http://localhost:8081](http://localhost:8081) for desktop or responsive smartphone mockup preview.
- **Mobile Device**: Open **Expo Go** on Android/iOS and scan the terminal QR code (or use USB debugging with `adb reverse tcp:8081 tcp:8081`).

---

## 🗄️ Database Setup (For New Supabase Projects)

If you are deploying your own Supabase project:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** (`>_`) in your Supabase Dashboard.
3. Run the migrations in order:
   - [`supabase/migrations/001_init.sql`](./supabase/migrations/001_init.sql) *(Creates areas, profiles, complaints, RLS policies, and eco-point triggers)*.
   - [`supabase/migrations/002_fix_auth_rls.sql`](./supabase/migrations/002_fix_auth_rls.sql) *(Enables instant user auto-confirmation and automated profile creation)*.
4. Go to **Authentication** ➔ **Providers** ➔ **Email** and toggle **OFF** *"Confirm email"*.
5. Copy your **Project URL** and **`anon` `public` key** into your `.env` file.

---

## 🧪 Testing Checklist

Refer to [`TESTING.md`](./TESTING.md) for step-by-step test scenarios verifying cross-device live complaint dispatch, ward isolation, status updates, and eco-point crediting.

---

## 📦 Production Deployment

Refer to [`DEPLOY.md`](./DEPLOY.md) for building and deploying:
- Web: Vercel / Netlify static export (`npx expo export -p web`)
- Android: Google Play production build via EAS CLI (`npx eas-cli build -p android --profile production`)
