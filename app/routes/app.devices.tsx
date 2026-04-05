import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  DataTable,
  Modal,
  Banner,
  Badge,
  Divider,
  Select,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  listDevices,
  createDevice,
  deleteDevice,
  seedDevices,
} from "../models/devices.server";
import { groupByBrand } from "../utils/device-data";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const devices = await listDevices(admin);
  return json({ devices });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const brandHandle = brand.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    const modelHandle = model.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    const handle = `${brandHandle}__${modelHandle}`;
    const imageUrl = formData.get("imageUrl") as string || undefined;

    const result = await createDevice(admin, { brand, brandHandle, model, modelHandle, handle, imageUrl });
    const errors = result?.userErrors;
    if (errors?.length > 0) {
      return json({ success: false, message: errors[0].message });
    }
    return json({ success: true, message: `Added: ${brand} ${model}` });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    const result = await deleteDevice(admin, id);
    const errors = result?.userErrors;
    if (errors?.length > 0) {
      return json({ success: false, message: errors[0].message });
    }
    return json({ success: true, message: "Device deleted" });
  }

  if (intent === "seed") {
    await seedDevices(admin);
    return json({ success: true, message: "Default devices seeded" });
  }

  return json({ success: false, message: "Unknown action" });
};

const BRAND_OPTIONS = [
  "Apple", "Samsung", "Garmin", "Fitbit", "Google",
  "Fossil", "Amazfit", "OnePlus", "Polar", "Other",
];

export default function DevicesPage() {
  const { devices } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isLoading = navigation.state === "submitting";

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBrand, setNewBrand] = useState("Apple");
  const [customBrand, setCustomBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const grouped = groupByBrand(devices as any);

  function handleAdd() {
    const brand = newBrand === "Other" ? customBrand : newBrand;
    submit(
      { intent: "create", brand, model: newModel, imageUrl: newImageUrl },
      { method: "post" }
    );
    setShowAddModal(false);
    setNewModel("");
    setNewImageUrl("");
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"? Products tagged with this device will still have the tag.`)) {
      submit({ intent: "delete", id }, { method: "post" });
    }
  }

  const rows = devices.map((d: any) => [
    d.brand,
    d.model,
    <Badge key={d.id} tone="info">{d.handle}</Badge>,
    <Button
      key={`del-${d.id}`}
      variant="plain"
      tone="critical"
      onClick={() => handleDelete(d.id, `${d.brand} ${d.model}`)}
    >
      Delete
    </Button>,
  ]);

  return (
    <Page
      title="Device Catalog"
      subtitle={`${devices.length} devices across ${grouped.length} brands`}
      primaryAction={
        <Button variant="primary" tone="success" onClick={() => setShowAddModal(true)}>
          Add device
        </Button>
      }
      secondaryActions={[
        {
          content: "Re-seed defaults",
          onAction: () => submit({ intent: "seed" }, { method: "post" }),
          loading: isLoading,
        },
      ]}
    >
      <Layout>
        {actionData && (
          <Layout.Section>
            <Banner tone={actionData.success ? "success" : "critical"}>
              {actionData.message}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Brand", "Model", "Tag handle", "Action"]}
              rows={rows}
              truncate
            />
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add device"
        primaryAction={{ content: "Add", onAction: handleAdd, loading: isLoading }}
        secondaryActions={[{ content: "Cancel", onAction: () => setShowAddModal(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Select
              label="Brand"
              options={BRAND_OPTIONS.map((b) => ({ label: b, value: b }))}
              value={newBrand}
              onChange={setNewBrand}
            />
            {newBrand === "Other" && (
              <TextField
                label="Custom brand name"
                value={customBrand}
                onChange={setCustomBrand}
                autoComplete="off"
              />
            )}
            <TextField
              label="Model name"
              value={newModel}
              onChange={setNewModel}
              placeholder="e.g. Galaxy Watch 7"
              autoComplete="off"
            />
            <TextField
              label="Image URL (optional)"
              value={newImageUrl}
              onChange={setNewImageUrl}
              placeholder="https://..."
              autoComplete="off"
              helpText="Device image shown in the customer-facing widget"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
