# SHODHINI Supabase Backend Setup

This directory contains the database migration schema and Edge Functions for SHODHINI's decentralized waste management backend.

---

## 1. Database Setup

1. In your Supabase Project Dashboard, go to **SQL Editor**.
2. Run the script located at [`supabase/migrations/001_init.sql`](./migrations/001_init.sql).
   - This creates:
     - `areas` table seeded with Ward 1 to Ward 10
     - `profiles` table linked to `auth.users`
     - `complaints` table with RLS policies
     - Eco points trigger: adds 15 points to citizen upon completion
     - Realtime publication on `public.complaints`

---

## 2. Deploying the Edge Function (`notify-area`)

The edge function dispatches push notifications to all garbage collectors assigned to the complaint's ward.

### Deploy with Supabase CLI:
```bash
supabase functions deploy notify-area --no-verify-jwt
```

---

## 3. Database Webhook Configuration

To trigger the `notify-area` edge function automatically whenever a complaint is inserted:

1. Open your **Supabase Dashboard** -> **Integrations** or **Database** -> **Webhooks**.
2. Click **Create a new webhook**:
   - **Name**: `on_complaint_created`
   - **Table**: `complaints` (schema `public`)
   - **Events**: Check **INSERT**
   - **Type**: **Supabase Edge Function** (or HTTP Request)
   - **Edge Function**: Select `notify-area` (Method: `POST`)
   - **HTTP Headers**:
     - `Content-Type`: `application/json`
3. Click **Save**.

---

## 4. Important Notice on Push Notifications

> [!IMPORTANT]
> **Push Notifications require a Development Build or Standalone Build**:
> Starting with recent Expo SDK versions, remote push notifications (`getExpoPushTokenAsync`) cannot run inside the standard pre-built **Expo Go** client without a custom development build.
>
> To test push notifications on physical devices:
> 1. Build a development client:
>    ```bash
>    npx eas-cli build --profile development --platform android
>    ```
> 2. Install the resulting development build APK onto your device.
> 3. Start Metro with:
>    ```bash
>    npx expo start --dev-client
>    ```
