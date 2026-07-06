const BASE_URL     = process.env.NEXT_PUBLIC_BASE_URL ?? '';
const BASE_VIDEO   = `${BASE_URL}/avatars/base/base-03.mp4`;
const ITEMS_PREFIX = `${BASE_URL}/avatars/items`;

export function getAvatarVideoUrl(equippedItemId: string | null | undefined): string {
  if (!equippedItemId) return BASE_VIDEO;
  return `${ITEMS_PREFIX}/${equippedItemId}.mp4`;
}
