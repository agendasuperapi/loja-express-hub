/**
 * Generates a shareable URL for a product that includes Open Graph meta tags
 * This URL points to the meta-tags-proxy edge function which serves rich previews
 * for social media crawlers (WhatsApp, Facebook, etc.)
 */
export const getShareableProductUrl = (shortId: string): string => {
  const supabaseProjectId = 'aqxgwdwuhgdxlwmbxxbi';
  return `https://${supabaseProjectId}.supabase.co/functions/v1/meta-tags-proxy?short_id=${shortId}`;
};

/**
 * Gets the regular app URL for a product (for navigation within the app)
 */
export const getProductUrl = (shortId: string): string => {
  return `/p/${shortId}`;
};

/**
 * Copies the shareable URL to clipboard
 */
export const copyShareableUrl = async (shortId: string): Promise<boolean> => {
  try {
    const url = getShareableProductUrl(shortId);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    return false;
  }
};
