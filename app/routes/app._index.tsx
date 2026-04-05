import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  List,
  Badge,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  ensureMetaobjectDefinition,
  ensureProductMetafieldDefinition,
  listDevices,
  seedDevices,
} from "../models/devices.server";
import { listProductsWithCompatibility } from "../models/products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const [devices, { products }] = await Promise.all([
    listDevices(admin),
    listProductsWithCompatibility(admin),
  ]);

  const taggedCount = products.filter((p) => p.compatibleDevices.length > 0).length;

  return json({
    deviceCount: devices.length,
    productCount: products.length,
    taggedProductCount: taggedCount,
    isSetupDone: devices.length > 0,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "setup") {
    try {
      await ensureMetaobjectDefinition(admin);
      await ensureProductMetafieldDefinition(admin);
      await seedDevices(admin);
      return json({ success: true, message: "Setup complete! Device catalog has been seeded with 9 brands." });
    } catch (error) {
      return json({ success: false, message: `Setup failed: ${(error as Error).message}` });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function Index() {
  const { deviceCount, productCount, taggedProductCount, isSetupDone } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isLoading = navigation.state === "submitting";

  function handleSetup() {
    submit({ intent: "setup" }, { method: "post" });
  }

  return (
    <Page
      title="Smart Match"
      subtitle="Device compatibility matcher for smartwatch accessories"
    >
      <Layout>
        {actionData && (
          <Layout.Section>
            <Banner
              tone={actionData.success ? "success" : "critical"}
              onDismiss={() => {}}
            >
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        {!isSetupDone && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Welcome to Smart Match</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Smart Match lets your customers filter products by their specific smartwatch model.
                  Run setup to create the device catalog with 9 brands and ~50 watch models.
                </Text>
                <List type="bullet">
                  <List.Item>Creates the Smart Match device metaobject definition</List.Item>
                  <List.Item>Creates the product compatibility metafield definition</List.Item>
                  <List.Item>Seeds the device catalog (Apple, Samsung, Garmin, Fitbit, Google, Fossil, Amazfit, OnePlus, Polar)</List.Item>
                </List>
                <InlineStack>
                  <Button
                    variant="primary"
                    tone="success"
                    onClick={handleSetup}
                    loading={isLoading}
                    size="large"
                  >
                    Run Setup
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Layout>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Devices in catalog</Text>
                  <Text as="p" variant="headingXl">{deviceCount}</Text>
                  <Link to="/app/devices">
                    <Button variant="plain">Manage devices →</Button>
                  </Link>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Total products</Text>
                  <Text as="p" variant="headingXl">{productCount}</Text>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Products with compatibility</Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="p" variant="headingXl">{taggedProductCount}</Text>
                    {productCount > 0 && (
                      <Badge tone={taggedProductCount === productCount ? "success" : "attention"}>
                        {Math.round((taggedProductCount / productCount) * 100)}%
                      </Badge>
                    )}
                  </InlineStack>
                  <Link to="/app/products">
                    <Button variant="plain">Tag products →</Button>
                  </Link>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">How to install the widget</Text>
              <Divider />
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">1. Add the app block to your theme</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Go to Online Store → Themes → Customize. Navigate to a collection template,
                  click "Add block" and find "Smart Match Widget". Place it at the top of the collection.
                </Text>
                <Text as="h3" variant="headingSm">2. Configure the block settings</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  In the block settings panel, enter your Storefront API access token and the handles
                  of your Straps, Protection, and Accessories collections.
                </Text>
                <Text as="h3" variant="headingSm">3. Tag your products</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Go to Products in this app and assign device compatibility to each product.
                  Products will automatically be tagged and filtered by the widget.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
