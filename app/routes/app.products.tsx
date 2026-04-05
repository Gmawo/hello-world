import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
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
  Thumbnail,
  Badge,
  Pagination,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { listProductsWithCompatibility } from "../models/products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || undefined;
  const cursor = url.searchParams.get("cursor") || undefined;

  const { products, hasNextPage, endCursor } = await listProductsWithCompatibility(
    admin,
    searchQuery,
    cursor
  );

  return json({ products, hasNextPage, endCursor, searchQuery: searchQuery ?? "" });
};

export default function ProductsPage() {
  const { products, hasNextPage, endCursor, searchQuery: initialQuery } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(initialQuery);

  function handleSearch() {
    navigate(`/app/products?q=${encodeURIComponent(searchValue)}`);
  }

  function handleNextPage() {
    const params = new URLSearchParams();
    if (searchValue) params.set("q", searchValue);
    if (endCursor) params.set("cursor", endCursor);
    navigate(`/app/products?${params.toString()}`);
  }

  const rows = products.map((p) => [
    <Thumbnail
      key={`img-${p.productId}`}
      source={p.productImage || ""}
      alt={p.productTitle}
      size="small"
    />,
    <Text key={`title-${p.productId}`} as="span" variant="bodyMd" fontWeight="medium">
      {p.productTitle}
    </Text>,
    p.compatibleDevices.length > 0 ? (
      <InlineStack key={`devs-${p.productId}`} gap="100" wrap>
        {p.compatibleDevices.slice(0, 3).map((d) => (
          <Badge key={d} tone="success">{d.replace(/__/g, " › ").replace(/_/g, " ")}</Badge>
        ))}
        {p.compatibleDevices.length > 3 && (
          <Badge tone="info">+{p.compatibleDevices.length - 3} more</Badge>
        )}
      </InlineStack>
    ) : (
      <Badge key={`none-${p.productId}`} tone="attention">Not tagged</Badge>
    ),
    <Link key={`edit-${p.productId}`} to={`/app/products/${encodeURIComponent(p.productId)}`}>
      <Button variant="plain">Edit compatibility</Button>
    </Link>,
  ]);

  return (
    <Page
      title="Product Compatibility"
      subtitle="Assign device compatibility to products so the Smart Match widget can filter them"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <InlineStack gap="300" blockAlign="end">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Search products"
                  value={searchValue}
                  onChange={setSearchValue}
                  placeholder="Search by product title..."
                  autoComplete="off"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </InlineStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Image", "Product", "Compatible devices", "Action"]}
              rows={rows}
            />
          </Card>
        </Layout.Section>

        {hasNextPage && (
          <Layout.Section>
            <InlineStack align="center">
              <Button onClick={handleNextPage}>Load more</Button>
            </InlineStack>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
