// TSM Base pricing (TSM_Wolseley_Synnex 2026 SSOT) — single flat base price per product.
// Variants list the specific SKUs that roll up under each catalog product, each with its own TSM Base price.

export interface ProductVariant {
  sku: string;
  description: string;
  basePrice: number;
}

export interface ProductCatalogItem {
  name: string;
  basePrice: number;
  // Retained for backward compatibility with components that still read pricingTiers.
  // All tiers now equal the TSM Base price (no quantity-based pricing).
  pricingTiers: {
    volumeRange: string;
    minQty: number;
    maxQty: number | null;
    usPrice: number;
    caPrice: number;
  }[];
  variants: ProductVariant[];
}

function flatTier(basePrice: number) {
  return [
    { volumeRange: "Base", minQty: 1, maxQty: null, usPrice: basePrice, caPrice: basePrice },
  ];
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    name: "Nest Learning Thermostat (4th Gen)",
    basePrice: 184.04,
    pricingTiers: flatTier(184.04),
    variants: [
      { sku: "GA05551-US", description: "4th Gen + Temp Sensor — Silver", basePrice: 184.04 },
      { sku: "GA05560-US", description: "4th Gen + Temp Sensor — PRO, Silver", basePrice: 184.04 },
      { sku: "GA05171-US", description: "4th Gen + Temp Sensor — Gold", basePrice: 184.04 },
      { sku: "GA05169-US", description: "4th Gen + Temp Sensor — Obsidian", basePrice: 184.04 },
      { sku: "GA12466-US", description: "4th Gen Pro Standalone", basePrice: 157.91 },
    ],
  },
  {
    name: "Nest Thermostat",
    basePrice: 72.92,
    pricingTiers: flatTier(72.92),
    variants: [
      { sku: "GA01334-US", description: "Snow", basePrice: 72.92 },
      { sku: "GA02081-US", description: "Charcoal", basePrice: 72.92 },
      { sku: "GA02082-US", description: "Sand", basePrice: 72.92 },
      { sku: "GA02083-US", description: "Deep Fog", basePrice: 72.92 },
      { sku: "GA02180-US", description: "PRO, Snow", basePrice: 72.92 },
    ],
  },
  {
    name: "Google Nest Cam Outdoor (wired, 2nd gen)",
    basePrice: 96.17,
    pricingTiers: flatTier(96.17),
    variants: [
      { sku: "GA09963-US", description: "Snow", basePrice: 96.17 },
      { sku: "GA09964-US", description: "Hazel", basePrice: 96.17 },
      { sku: "GA10919-US", description: "Snow Pro", basePrice: 96.17 },
      { sku: "GA09965-US", description: "2-Pack", basePrice: 160.28 },
    ],
  },
  {
    name: "Google Nest Doorbell (wired, 3rd gen)",
    basePrice: 111.96,
    pricingTiers: flatTier(111.96),
    variants: [
      { sku: "GA09967-US", description: "Snow", basePrice: 111.96 },
      { sku: "GA09968-US", description: "Hazel", basePrice: 111.96 },
      { sku: "GA09969-US", description: "Linen", basePrice: 111.96 },
    ],
  },
  {
    name: "Google Nest Cam Indoor (wired, 3rd gen)",
    basePrice: 64.10,
    pricingTiers: flatTier(64.10),
    variants: [
      { sku: "GA09973-US", description: "Snow", basePrice: 64.10 },
      { sku: "GA09974-US", description: "Berry", basePrice: 64.10 },
      { sku: "GA09975-US", description: "Hazel", basePrice: 64.10 },
    ],
  },
  {
    name: "Google Nest Doorbell (Battery)",
    basePrice: 113.19,
    pricingTiers: flatTier(113.19),
    variants: [
      { sku: "GA01318-US", description: "White", basePrice: 113.19 },
      { sku: "GA02075-US", description: "Green (Ivy)", basePrice: 113.19 },
      { sku: "GA02076-US", description: "Ash", basePrice: 113.19 },
      { sku: "GA03013-US", description: "Beige (Linen)", basePrice: 113.19 },
      { sku: "GA02268-US", description: "PRO, White", basePrice: 113.19 },
    ],
  },
  {
    name: "Google Nest Camera (Battery)",
    basePrice: 116.69,
    pricingTiers: flatTier(116.69),
    variants: [
      { sku: "GA01317-US", description: "White", basePrice: 116.69 },
      { sku: "GA02276-US", description: "PRO, White", basePrice: 116.69 },
      { sku: "GA01894-US", description: "2-Pack", basePrice: 213.91 },
      { sku: "GA02077-US", description: "3-Pack", basePrice: 311.14 },
    ],
  },
  {
    name: "Google Nest Cam w/ Floodlight",
    basePrice: 181.50,
    pricingTiers: flatTier(181.50),
    variants: [
      { sku: "GA02411-US", description: "White", basePrice: 181.50 },
      { sku: "GA02942-US", description: "PRO, White", basePrice: 181.50 },
    ],
  },
  {
    name: "Nest Wifi Pro",
    basePrice: 130.27,
    pricingTiers: flatTier(130.27),
    variants: [
      { sku: "GA03030-US", description: "Cotton White 1-pk", basePrice: 130.27 },
      { sku: "GA03902-US", description: "Fog 1-pk", basePrice: 130.27 },
      { sku: "GA03901-US", description: "Almond 1-pk", basePrice: 130.27 },
      { sku: "GA03903-US", description: "Lemon Mint 1-pk", basePrice: 130.27 },
      { sku: "GA03689-US", description: "Cotton White 2-pk", basePrice: 206.45 },
      { sku: "GA03690-US", description: "Cotton White 3-pk", basePrice: 275.27 },
      { sku: "GA03904-US", description: "Multi-Color 3-pk", basePrice: 275.27 },
      { sku: "GA03691-US", description: "Cotton White 4-pk", basePrice: 309.68 },
    ],
  },
];

export const PRODUCT_NAMES = PRODUCT_CATALOG.map((p) => p.name);

/**
 * Returns the TSM Base unit price for a product. Quantity is accepted for
 * backward compatibility but no longer affects pricing (flat Base pricing).
 */
export function getUnitPrice(productName: string, _quantity?: number): number {
  const product = PRODUCT_CATALOG.find((p) => p.name === productName);
  return product?.basePrice ?? 0;
}

/**
 * Returns the variant Base price for a specific SKU (falls back to the
 * product's default Base price when the SKU isn't found).
 */
export function getVariantPrice(productName: string, sku: string): number {
  const product = PRODUCT_CATALOG.find((p) => p.name === productName);
  if (!product) return 0;
  const variant = product.variants.find((v) => v.sku === sku);
  return variant?.basePrice ?? product.basePrice;
}

/** Pricing is flat under TSM Base — kept for backward compatibility. */
export function getVolumeTier(_quantity: number): string {
  return "Base";
}
