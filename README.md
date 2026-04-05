# Smart Match — Shopify App

A device compatibility filter for smartwatch accessory shops. Lets customers select their smartwatch model and see only compatible products.

## How it works

1. **Green "SMART MATCH" banner** appears at the top of collection pages
2. Customer clicks "Select your device" → modal opens
3. They pick brand (Apple, Samsung, Garmin, etc.) → model → the page filters to compatible products only
4. Selection is saved in `localStorage` and persists across page loads
5. Category tabs (Straps / Protection / Accessories) let customers browse by type

## Project structure

```
smart-match/
├── app/                         # Remix admin app
│   ├── routes/
│   │   ├── app._index.tsx       # Dashboard + setup wizard
│   │   ├── app.devices.tsx      # Device catalog manager
│   │   ├── app.products.tsx     # Product compatibility list
│   │   ├── app.products.$id.tsx # Per-product compatibility editor
│   │   ├── api.devices.tsx      # Public JSON endpoint for the widget
│   │   ├── auth.$.tsx           # OAuth handler
│   │   └── webhooks.tsx         # Webhook handler
│   ├── models/
│   │   ├── devices.server.ts    # Metaobject CRUD
│   │   └── products.server.ts   # Product tag + metafield sync
│   └── utils/
│       ├── device-data.ts       # Seed data: 9 brands, ~50 models
│       └── tag-helpers.ts       # Tag ↔ handle conversion
│
└── extensions/
    └── smart-match-widget/      # Theme App Extension
        ├── blocks/
        │   └── smart-match-widget.liquid
        ├── assets/
        │   ├── smart-match.js   # Widget logic (vanilla JS)
        │   └── smart-match.css  # Widget styles
        └── locales/
```

## Data model

| Storage | What's stored |
|---|---|
| Shopify metaobjects (`smart_match_device`) | Device catalog: brand, model, handle, image URL |
| Product metafield (`smart_match.compatible_devices`) | List of device handles per product |
| Product tags (`device:{handle}`) | Derived from metafield; enables fast Storefront API filtering |
| Browser `localStorage` | Customer's selected device (persists across pages) |

## Setup

### 1. Create Shopify app

In [Shopify Partners](https://partners.shopify.com):
- Create a new app
- Set `App URL` and `Redirect URL` to your deployment URL + `/auth/callback`
- Copy the API key and secret

### 2. Configure environment

```bash
cp .env.example .env
# Fill in SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL
```

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

### 4. Run app setup

After installing the app on a test store, go to the dashboard and click **Run Setup**. This:
- Creates the `smart_match_device` metaobject definition
- Creates the `smart_match.compatible_devices` product metafield definition
- Seeds the device catalog with 9 brands

### 5. Add the widget to your theme

In the Shopify theme editor:
1. Go to a Collection template
2. Click **Add block** → find **Smart Match Widget**
3. Configure:
   - **Storefront API Access Token** (from Shopify admin → Apps → API access)
   - **App URL** (where this app is deployed)
   - **Collection handles** for Straps, Protection, Accessories

### 6. Tag your products

In the app under **Products**, click **Edit compatibility** on each product and select which devices it's compatible with. Products are automatically tagged.

## Supported brands (default seed)

Amazfit, Apple, Fitbit, Fossil, Garmin, Google, OnePlus, Polar, Samsung

## Widget filtering

The widget uses the **Storefront API** to query products filtered by `tag:device:{handle}`. This requires a Storefront API access token configured in the theme block settings.

Product tag format: `device:apple__apple_watch_ultra`
(brand handle + `__` + model handle, double underscore separator)
