import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { listDevices } from "../models/devices.server";
import { groupByBrand } from "../utils/device-data";

// Simple in-memory cache: revalidate every 60 seconds
let cache: { data: any; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // CORS headers so the storefront widget can call this from any domain
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "Content-Type": "application/json",
  };

  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cache.data), { headers });
  }

  // Extract shop from query param — widget sends ?shop=store.myshopify.com
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400, headers });
  }

  try {
    const { admin } = await unauthenticated.admin(shop);
    const devices = await listDevices(admin);
    const grouped = groupByBrand(devices as any);

    const responseData = {
      brands: grouped.map((bg) => ({
        brand: bg.brand,
        brandHandle: bg.brandHandle,
        models: bg.models.map((m) => ({
          model: m.model,
          modelHandle: m.modelHandle,
          handle: m.handle,
          imageUrl: (m as any).imageUrl || null,
        })),
      })),
    };

    cache = { data: responseData, ts: Date.now() };
    return new Response(JSON.stringify(responseData), { headers });
  } catch (error) {
    return json({ error: "Failed to fetch devices" }, { status: 500, headers });
  }
};

// Handle preflight CORS
export const action = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
};
