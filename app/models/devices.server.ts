import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { DEVICE_SEED_DATA } from "~/utils/device-data";

export const METAOBJECT_TYPE = "smart_match_device";
export const METAFIELD_NAMESPACE = "smart_match";
export const METAFIELD_KEY = "compatible_devices";

// ─── Metaobject definition setup ────────────────────────────────────────────

export async function ensureMetaobjectDefinition(admin: AdminApiContext) {
  const createDefinitionMutation = `#graphql
    mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition {
          id
          type
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const result = await admin.graphql(createDefinitionMutation, {
    variables: {
      definition: {
        name: "Smart Match Device",
        type: METAOBJECT_TYPE,
        fieldDefinitions: [
          { name: "Brand", key: "brand", type: "single_line_text_field" },
          { name: "Brand Handle", key: "brand_handle", type: "single_line_text_field" },
          { name: "Model", key: "model", type: "single_line_text_field" },
          { name: "Model Handle", key: "model_handle", type: "single_line_text_field" },
          { name: "Handle", key: "handle", type: "single_line_text_field" },
          { name: "Image URL", key: "image_url", type: "url" },
          { name: "Sort Order", key: "sort_order", type: "number_integer" },
        ],
      },
    },
  });

  const data = await result.json();
  return data;
}

// ─── Product metafield definition ───────────────────────────────────────────

export async function ensureProductMetafieldDefinition(admin: AdminApiContext) {
  const mutation = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
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
      definition: {
        name: "Compatible Devices",
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
        type: "list.single_line_text_field",
        ownerType: "PRODUCT",
        description: "List of device handles this product is compatible with (managed by Smart Match app)",
      },
    },
  });

  const data = await result.json();
  return data;
}

// ─── CRUD operations on device metaobjects ───────────────────────────────────

export async function listDevices(admin: AdminApiContext) {
  const query = `#graphql
    query ListDevices($type: String!, $first: Int!) {
      metaobjects(type: $type, first: $first) {
        nodes {
          id
          handle
          fields {
            key
            value
          }
        }
      }
    }
  `;

  const result = await admin.graphql(query, {
    variables: { type: METAOBJECT_TYPE, first: 250 },
  });
  const data = await result.json();

  if (!data?.data?.metaobjects?.nodes) return [];

  return data.data.metaobjects.nodes.map((obj: any) => {
    const fields: Record<string, string> = {};
    for (const f of obj.fields) {
      fields[f.key] = f.value;
    }
    return {
      id: obj.id,
      brand: fields.brand,
      brandHandle: fields.brand_handle,
      model: fields.model,
      modelHandle: fields.model_handle,
      handle: fields.handle,
      imageUrl: fields.image_url || null,
    };
  });
}

export async function createDevice(
  admin: AdminApiContext,
  device: {
    brand: string;
    brandHandle: string;
    model: string;
    modelHandle: string;
    handle: string;
    imageUrl?: string;
  }
) {
  const mutation = `#graphql
    mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          id
          handle
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
      metaobject: {
        type: METAOBJECT_TYPE,
        fields: [
          { key: "brand", value: device.brand },
          { key: "brand_handle", value: device.brandHandle },
          { key: "model", value: device.model },
          { key: "model_handle", value: device.modelHandle },
          { key: "handle", value: device.handle },
          { key: "image_url", value: device.imageUrl || "" },
        ],
      },
    },
  });

  const data = await result.json();
  return data.data?.metaobjectCreate;
}

export async function updateDevice(
  admin: AdminApiContext,
  id: string,
  fields: Partial<{
    brand: string;
    brandHandle: string;
    model: string;
    modelHandle: string;
    handle: string;
    imageUrl: string;
  }>
) {
  const mutation = `#graphql
    mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message }
      }
    }
  `;

  const fieldList = [];
  if (fields.brand !== undefined) fieldList.push({ key: "brand", value: fields.brand });
  if (fields.brandHandle !== undefined) fieldList.push({ key: "brand_handle", value: fields.brandHandle });
  if (fields.model !== undefined) fieldList.push({ key: "model", value: fields.model });
  if (fields.modelHandle !== undefined) fieldList.push({ key: "model_handle", value: fields.modelHandle });
  if (fields.handle !== undefined) fieldList.push({ key: "handle", value: fields.handle });
  if (fields.imageUrl !== undefined) fieldList.push({ key: "image_url", value: fields.imageUrl });

  const result = await admin.graphql(mutation, {
    variables: { id, metaobject: { fields: fieldList } },
  });
  const data = await result.json();
  return data.data?.metaobjectUpdate;
}

export async function deleteDevice(admin: AdminApiContext, id: string) {
  const mutation = `#graphql
    mutation DeleteMetaobject($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors { field message }
      }
    }
  `;

  const result = await admin.graphql(mutation, { variables: { id } });
  const data = await result.json();
  return data.data?.metaobjectDelete;
}

export async function seedDevices(admin: AdminApiContext) {
  const results = [];
  for (const device of DEVICE_SEED_DATA) {
    const result = await createDevice(admin, device);
    results.push(result);
  }
  return results;
}
