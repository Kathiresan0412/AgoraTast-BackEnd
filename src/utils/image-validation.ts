const MAX_DATA_URL_LENGTH = 2_800_000;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=]+$/i;

export const isAllowedImageValue = (value: unknown) => {
  if (typeof value !== 'string') return false;
  if (!value) return true;
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return true;
  return value.length <= MAX_DATA_URL_LENGTH && IMAGE_DATA_URL_PATTERN.test(value);
};
