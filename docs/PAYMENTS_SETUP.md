# Customer payments setup (Paystack)

Adwuma Book uses **Paystack** for customer deposit payments (GHS). This guide gets payments working for your deployment.

## 1. Environment variables

In `.env` (or your host’s env config), set:

```bash
# Required for live payments
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxx   # or sk_test_xxx for test mode

# Optional: public key if you add Paystack Inline/Popup later
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxx
```

- **Test keys**: [Paystack Dashboard](https://dashboard.paystack.com) → Settings → API Keys & Webhooks → Test keys.
- **Live keys**: Same place, use Live keys when going to production.

## 2. Webhook URL (required for confirming bookings)

Paystack must call your app when a payment succeeds so bookings can be confirmed.

1. In Paystack Dashboard → **Settings** → **API Keys & Webhooks**.
2. Under **Webhook URL**, set:
   ```text
   https://<your-domain>/api/webhooks/paystack
   ```
   Examples:
   - Production: `https://adwumabook.com/api/webhooks/paystack`
   - Staging: `https://staging.yourdomain.com/api/webhooks/paystack`
3. Save. Paystack will send `charge.success` events to this URL.

### Local development (localhost:3000)

Paystack cannot call `http://localhost:3000` directly. Expose your app with a **tunnel** so you get a public URL that forwards to your machine.

**Option A: ngrok (recommended)**

1. Install: [ngrok.com](https://ngrok.com) → sign up (free) and install the CLI.
2. Start your app: `npm run dev` (port 3000).
3. In another terminal, run:
   ```bash
   ngrok http 3000
   ```
4. Copy the **HTTPS** URL ngrok shows (e.g. `https://a1b2c3d4.ngrok-free.app`).
5. In Paystack Dashboard → **Settings** → **API Keys & Webhooks**, set **Webhook URL** to:
   ```text
   https://a1b2c3d4.ngrok-free.app/api/webhooks/paystack
   ```
   (Replace with your actual ngrok URL.)
6. Each time you restart ngrok (free tier), the URL changes — update the webhook URL in Paystack if needed. Paid ngrok plans can use a fixed subdomain.

**Option B: Cloudflare Tunnel**

1. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. Run: `cloudflared tunnel --url http://localhost:3000`
3. Use the `*.trycloudflare.com` URL it prints as your webhook base, e.g. `https://xyz.trycloudflare.com/api/webhooks/paystack`.

**Option C: localtunnel**

```bash
npx localtunnel --port 3000
```

Use the generated URL (e.g. `https://something.loca.lt`) plus `/api/webhooks/paystack` in Paystack. Some networks block or throttle it, so ngrok is usually more reliable.

---

## 3. Customer flow (what’s already implemented)

1. Customer selects services, date/time, and enters name/phone/email on the booking page.
2. They click **Pay & confirm** → your app creates pending bookings and calls Paystack to initialize a transaction.
3. Customer is redirected to Paystack to pay (card, mobile money, etc.).
4. After payment, Paystack redirects the customer to your success page and sends a webhook to `/api/webhooks/paystack`.
5. The webhook verifies the payment, marks the payment record as success, confirms the booking(s), and (if configured) sends a WhatsApp notification to the business.

## 4. Without Paystack configured (dev mode)

If `PAYSTACK_SECRET_KEY` is not set:

- **Initialize**: The app still creates a payment record but returns no `authorization_url`. The customer is sent straight to the success page (no real charge). Use this for local UI/testing.
- **Webhook**: Returns `503 Payments not configured` so you know to set the key and webhook.

## 5. Checklist

- [ ] `PAYSTACK_SECRET_KEY` set in env (test or live).
- [ ] Webhook URL in Paystack set to `https://<your-domain>/api/webhooks/paystack`.
- [ ] For production, use live keys and your real domain in the webhook URL.

After this, customer payments are fully set up end to end.
