# SHODHINI Production Deployment Guide

This document describes how to deploy the SHODHINI application to Web and Mobile production targets.

---

## 1. Web Deployment (Vercel / Netlify)

### Export Web Assets
Export static web production bundle to `dist/`:
```bash
npx expo export -p web
```

### Environment Variables
Configure the following environment variables in your Vercel / Netlify project settings:
```ini
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-production-anon-key>
```

### Deploy Output
- **Vercel**: Deploy the output `dist/` directory using Vercel CLI or Git integration.
  ```bash
  npx vercel deploy dist/ --prod
  ```
- **Netlify**: Deploy `dist/`:
  ```bash
  npx netlify deploy --dir=dist --prod
  ```

---

## 2. Mobile Deployment (Google Play Store / Android)

### Production Build via EAS
Generate an Android App Bundle (`.aab`) configured for the Google Play Store:
```bash
npx eas-cli@latest build -p android --profile production
```

### Submit to Google Play
Submit the built binary directly to Google Play Console:
```bash
npx eas-cli@latest submit -p android --profile production
```

---

## 3. Supabase Edge Functions Deployment

Deploy Edge Functions to your Supabase project:
```bash
supabase functions deploy notify-area --no-verify-jwt
```
Set Edge Function secrets if required:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```
