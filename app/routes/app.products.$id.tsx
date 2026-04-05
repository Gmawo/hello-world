import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Checkbox,
  Thumbnail,
  Divider,
  Badge,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getProductWithCompatibility, saveProductCompatibility } from "../models/products.server";
import { listDevices } from "../models/devices.server";
import { groupByBrand } from "../utils/device-data";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const productId = decodeURIComponent(params.id!);

  const [product, devices] = await Promise.all([
    getProductWithCompatibility(admin, productId),
    listDevices(admin),
  ]);

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return json({ product, devices });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const productId = decodeURIComponent(params.id!);
  const formData = await request.formData();

  const deviceHandles = formData.getAll("devices") as string[];
  const result = await saveProductCompatibility(admin, productId, deviceHandles);

  const errors = result?.userErrors;
  if (errors?.length > 0) {
    return json({ success: false, message: errors[0].message });
  }

  return json({ success: true, message: `Saved ${deviceHandles.length} compatible device(s)` });
};

export default function ProductCompatibilityPage() {
  const { product, devices } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isLoading = navigation.state === "submitting";

  const [selected, setSelected] = useState<Set<string>>(new Set(product.compatibleDevices));
  const [search, setSearch] = useState("");

  const grouped = groupByBrand(devices as any);
  const filtered = search
    ? grouped.map((bg) => ({
        ...bg,
        models: bg.models.filter(
          (m) =>
            m.model.toLowerCase().includes(search.toLowerCase()) ||
            m.brand.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((bg) => bg.models.length > 0)
    : grouped;

  function toggle(handle: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) {
        next.delete(handle);
      } else {
        next.add(handle);
      }
      return next;
    });
  }

  function selectAllBrand(brandHandle: string, models: any[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of models) {
        next.add(m.handle);
      }
      return next;
    });
  }

  function deselectAllBrand(brandHandle: string, models: any[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of models) {
        next.delete(m.handle);
      }
      return next;
    });
  }

  function handleSave() {
    const formData = new FormData();
    for (const handle of selected) {
      formData.append("devices", handle);
    }
    submit(formData, { method: "post" });
  }

  return (
    <Page
      title={product.productTitle}
      subtitle="Select which devices this product is compatible with"
      backAction={{ content: "Products", url: "/app/products" }}
      primaryAction={
        <Button variant="primary" tone="success" onClick={handleSave} loading={isLoading}>
          Save compatibility ({selected.size})
        </Button>
      }
    >
      <Layout>
        {actionData && (
          <Layout.Section>
            <Banner tone={actionData.success ? "success" : "critical"}>
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              {product.productImage && (
                <Thumbnail
                  source={product.productImage}
                  alt={product.productTitle}
                  size="large"
                />
              )}
              <Text as="h2" variant="headingMd">{product.productTitle}</Text>
              <Divider />
              <Text as="p" variant="bodyMd" tone="subdued">
                {selected.size} device{selected.size !== 1 ? "s" : ""} selected
              </Text>
              <InlineStack gap="200" wrap>
                {Array.from(selected).slice(0, 6).map((h) => (
                  <Badge key={h} tone="success">
                    {h.replace(/__/g, " › ").replace(/_/g, " ")}
                  </Badge>
                ))}
                {selected.size > 6 && (
                  <Badge tone="info">+{selected.size - 6} more</Badge>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <TextField
                label=""
                labelHidden
                value={search}
                onChange={setSearch}
                placeholder="Search devices..."
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setSearch("")}
              />
            </Card>

            {filtered.map((brandGroup) => {
              const allSelected = brandGroup.models.every((m) => selected.has(m.handle));
              const someSelected = brandGroup.models.some((m) => selected.has(m.handle));

              return (
                <Card key={brandGroup.brandHandle}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        {brandGroup.brand}
                        <span style={{ marginLeft: 8, fontWeight: "normal", color: "#666" }}>
                          ({brandGroup.models.filter((m) => selected.has(m.handle)).length}/{brandGroup.models.length})
                        </span>
                      </Text>
                      <InlineStack gap="200">
                        <Button
                          variant="plain"
                          size="slim"
                          onClick={() => selectAllBrand(brandGroup.brandHandle, brandGroup.models)}
                        >
                          Select all
                        </Button>
                        {someSelected && (
                          <Button
                            variant="plain"
                            size="slim"
                            tone="critical"
                            onClick={() => deselectAllBrand(brandGroup.brandHandle, brandGroup.models)}
                          >
                            Clear
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>
                    <Divider />
                    <BlockStack gap="200">
                      {brandGroup.models.map((model) => (
                        <Checkbox
                          key={model.handle}
                          label={model.model}
                          checked={selected.has(model.handle)}
                          onChange={() => toggle(model.handle)}
                        />
                      ))}
                    </BlockStack>
                  </BlockStack>
                </Card>
              );
            })}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
