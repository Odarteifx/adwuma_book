# Google Sign-In Setup

Adwuma Book already has Google OAuth wired up in the code. To enable it, configure both **Google Cloud Console** and **Supabase**.

---

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select an existing one.
3. Go to **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the **OAuth consent screen**:
   - Choose **External** (or Internal for workspace-only).
   - Add app name (e.g. "Adwuma Book"), support email, developer contact.
   - Add scopes: `email`, `profile`, `openid` (usually added by default).
   - Save.
6. Create the OAuth client:
   - Application type: **Web application**.
   - Name: e.g. "Adwuma Book Web".
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
     - Replace `<YOUR_SUPABASE_PROJECT_REF>` with your Supabase project ref (e.g. `abcdefghijklmnop` from `https://abcdefghijklmnop.supabase.co`).
7. Copy the **Client ID** and **Client Secret**.

---

## 2. Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Open **Authentication** → **Providers**.
3. Find **Google** and enable it.
4. Paste the **Client ID** and **Client Secret** from Google.
5. Save.

---

## 3. Verify

1. Ensure `NEXT_PUBLIC_APP_URL` in `.env.local` matches your app (e.g. `http://localhost:3000`).
2. Restart the dev server.
3. Visit `/login` or `/signup` and click **Sign in with Google** or **Sign up with Google**.
4. After successful auth, you should be redirected to `/dashboard` (if you have a business) or `/onboarding` (if new).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid redirect" | Ensure the redirect URI in Google Cloud exactly matches `https://<project-ref>.supabase.co/auth/v1/callback`. |
| "Redirect URI mismatch" | Add your app URL to **Authorized JavaScript origins** in Google Cloud. |
| "Provider not enabled" | Enable Google in Supabase → Authentication → Providers. |
| Stays on login after redirect | Check that `/auth/callback` is allowed in your middleware (it should be). |
