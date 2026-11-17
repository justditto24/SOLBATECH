# SOLBATEC Industries website

Run locally: `node server.js` (Node 18+), then open http://localhost:3000
Owner login on first run: admin@solbatec.com / Solbatec@2026. Change it on the Account page straight away.

## Folder layout
```
solbatec/
  server.js            backend and API
  package.json
  public/
    index.html         page shell
    app.js             the React app
    style.css          Bootstrap theme overrides
    vendor/            React, htm and Bootstrap (kept here so the site works without a CDN)
```
No build step: edit the files and refresh.

## Settings (environment variables)
| Name | What it is |
|---|---|
| SECRET | Long random text used to sign logins. Always set this online. |
| DATA_FILE | Where data is saved, e.g. /data/data.json on a persistent disk. |
| SITE_URL | Your public address, e.g. https://solbatec.com (used for return links). |
| PAYSTACK_SECRET | Paystack secret key (sk_test_... to try, sk_live_... for real money). |
| FLW_SECRET, FLW_HASH | Flutterwave secret key, and a webhook "secret hash" you choose yourself. |
| MONNIFY_API_KEY, MONNIFY_SECRET, MONNIFY_CONTRACT | Monnify credentials. Add MONNIFY_BASE=https://api.monnify.com for live (default is sandbox). |
| REMITA_MERCHANT_ID, REMITA_SERVICE_TYPE_ID, REMITA_API_KEY | Remita credentials. Add REMITA_BASE=https://login.remita.net/remita for live (default is demo). |
| ISW_MERCHANT_CODE, ISW_PAY_ITEM_ID | Interswitch (Quickteller Business) details. Add ISW_MODE=LIVE for real payments (default is test). |
| ISW_MAC_KEY | Optional. Only if Interswitch asks for a hash on transaction checks. |
| BANK_NAME, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME | Your company account, for manual bank transfers (needs staff to confirm). |

Each method switches on only when its settings are present. Use any or all.

## Automatic payment confirmation
Online payments are confirmed three ways, with no staff needed: when the customer returns to the site,
by the provider's webhook, and by a background check every 5 minutes (for 3 days) that asks each provider
about any unpaid order. Webhook addresses (set in the provider's dashboard):
- Paystack:    https://YOUR-SITE/api/paystack/webhook
- Flutterwave: https://YOUR-SITE/api/flutterwave/webhook  (secret hash = FLW_HASH)
- Monnify:     https://YOUR-SITE/api/monnify/webhook
- Remita and Interswitch are confirmed by the return and the background check (no webhook needed).

Manual transfers to your own account cannot be seen by the website, so staff must confirm those.

Always test with each provider's test/sandbox settings before going live.
