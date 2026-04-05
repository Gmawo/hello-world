import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { syncDeviceTags, tagsToHandles } from "~/utils/tag-helpers";
import { METAFIELD_NAMESPACE, METAFIELD_KEY } from "./devices.server";

export interface ProductCompatibility {
  productId: string;
  productTitle: string;
  productHandle: string;
  productImage: string | null;
  compatibleDevices: string[];
}

// ─── List products with their compatibility ───────────────────────────────────

export async function listProductsWithCompatibility(
  admin: AdminApiContext,
  searchQuery?: string,
  cursor?: string
): Promise<{ products: ProductCompatibility[]; hasNextPage: boolean; endCursor: string | null }> {
  const query = `#graphql
    query ListProducts($first: Int!, $query: String, $after: String) {
      products(first: $first, query: $query, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          handle
          tags
          featuredImage {
            url
          }
          metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
            value
          }
        }
      }
    }
  `;

  const result = await admin.graphql(query, {
    variables: {
      first: 50,
      query: searchQuery ? `title:*${searchQuery}*` : undefined,
      after: cursor,
    },
  });

  const data = await result.json();
  const nodes = data?.data?.products?.nodes ?? [];
  const pageInfo = data?.data?.products?.pageInfo;

  return {
    products: nodes.map((p: any) => ({
      productId: p.id,
      productTitle: p.title,
      productHandle: p.handle,
      productImage: p.featuredImage?.url ?? null,
      compatibleDevices: tagsToHandles(p.tags),
    })),
    hasNextPage: pageInfo?.hasNextPage ?? false,
    endCursor: pageInfo?.endCursor ?? null,
  };
}

// ─── Get a single product with its compatibility ──────────────────────────────

export async function getProductWithCompatibility(
  admin: AdminApiContext,
  productId: string
): Promise<ProductCompatibility | null> {
  const query = `#graphql
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        tags
        featuredImage {
          url
        }
        metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
          value
        }
      }
    }
  `;

  const result = await admin.graphql(query, { variables: { id: productId } });
  const data = await result.json();
  const p = data?.data?.product;
  if (!p) return null;

  return {
    productId: p.id,
    productTitle: p.title,
    productHandle: p.handle,
    productImage: p.featuredImage?.url ?? null,
    compatibleDevices: tagsToHandles(p.tags),
  };
}

// ─── Save compatibility for a product ─────────────────────────────────────────

export async function saveProductCompatibility(
  admin: AdminApiContext,
  productId: string,
  deviceHandles: string[]
) {
  // First fetch current tags so we can preserve non-device tags
  const getTagsQuery = `#graphql
    query GetProductTags($id: ID!) {
      product(id: $id) { tags }
    }
  `;
  const tagsResult = await admin.graphql(getTagsQuery, { variables: { id: productId } });
  const tagsData = await tagsResult.json();
  const existingTags: string[] = tagsData?.data?.product?.tags ?? [];

  const newTags = syncDeviceTags(existingTags, deviceHandles);

  const mutation = `#graphql
    mutation UpdateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const result = await admin.graphql(mutation, {
    variables: {
      input: {
        id: productId,
        tags: newTags,
        metafields: [
          {
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "list.single_line_text_field",
            value: JSON.stringify(deviceHandles),
          },
        ],
      },
    },
  });

  const data = await result.json();
  return data.data?.productUpdate;
}

// ─── Bulk save: assign same devices to multiple products ──────────────────────

export async function bulkSaveProductCompatibility(
  admin: AdminApiContext,
  productIds: string[],
  deviceHandles: string[]
) {
  const results = [];
  for (const id of productIds) {
    const result = await saveProductCompatibility(admin, id, deviceHandles);
    results.push({ productId: id, result });
  }
  return results;
}
