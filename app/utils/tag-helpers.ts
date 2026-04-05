/** Prefix used on all Shopify product tags for device compatibility */
export const TAG_PREFIX = "device:";

/** Convert a device handle to a product tag */
export function handleToTag(deviceHandle: string): string {
  return `${TAG_PREFIX}${deviceHandle}`;
}

/** Convert a product tag back to a device handle (returns null if not a device tag) */
export function tagToHandle(tag: string): string | null {
  if (!tag.startsWith(TAG_PREFIX)) return null;
  return tag.slice(TAG_PREFIX.length);
}

/** Extract all device handles from a product's tag array */
export function tagsToHandles(tags: string[]): string[] {
  return tags
    .map(tagToHandle)
    .filter((h): h is string => h !== null);
}

/** Build the new tags array: keep non-device tags + add new device tags */
export function syncDeviceTags(existingTags: string[], newDeviceHandles: string[]): string[] {
  const nonDeviceTags = existingTags.filter((t) => !t.startsWith(TAG_PREFIX));
  const deviceTags = newDeviceHandles.map(handleToTag);
  return [...nonDeviceTags, ...deviceTags];
}

/** Build a Storefront API product filter query for a device handle */
export function deviceHandleToQuery(deviceHandle: string): string {
  return `tag:${handleToTag(deviceHandle)}`;
}
