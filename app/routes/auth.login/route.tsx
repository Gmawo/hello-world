import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/auth?${url.searchParams.toString()}`);
  }
  return json({ showForm: Boolean(login) });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const shop = String(formData.get("shop"));
  if (!shop) return json({ errors: { shop: "Shop domain required" } });
  return login(request);
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ maxWidth: 400, width: "100%", padding: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Smart Match</h1>
        {loaderData.showForm && (
          <Form method="post">
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="shop" style={{ display: "block", marginBottom: 4 }}>
                Shopify store domain
              </label>
              <input
                id="shop"
                name="shop"
                type="text"
                placeholder="your-store.myshopify.com"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: 4 }}
              />
              {actionData?.errors?.shop && (
                <p style={{ color: "red", marginTop: 4 }}>{actionData.errors.shop}</p>
              )}
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "10px 0",
                background: "#2e6b2e",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              Install Smart Match
            </button>
          </Form>
        )}
      </div>
    </div>
  );
}
