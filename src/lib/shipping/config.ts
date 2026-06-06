/**
 * Static configuration for the Dendê Arts shipping bridge.
 *
 * Anything that might change with the catalog or shipping policy lives here
 * so you can tweak it without touching business logic.
 */

// ─── Return address ──────────────────────────────────────────────────────
export const RETURN_ADDRESS = {
  name: "Dendê Arts",
  street1: "310 Lincoln Park E",
  city: "Cranford",
  state: "NJ",
  zip: "07016",
  country: "US",
  phone: "8625717629",
  email: "dende.arts@gmail.com",
} as const;

// ─── SKU catalog ─────────────────────────────────────────────────────────
// All current products are abadás. Weights are in ounces.
export const SKU_CATALOG: Record<
  string,
  { size: string; weightOz: number }
> = {
  "1102": { size: "XS", weightOz: 12 },
  "11105": { size: "S", weightOz: 12 },
  "1104": { size: "M", weightOz: 12 },
  "1103": { size: "L", weightOz: 12 },
  "1101": { size: "XL", weightOz: 14 },
};

// ─── Parcel tiers ────────────────────────────────────────────────────────
// Shippo identifies USPS flat-rate boxes by `parcel_template`. For custom
// packaging (the polybag) we pass explicit dimensions.
// Service tokens are the Shippo-standard names; see
// https://docs.goshippo.com/docs/reference/servicelevels
export type ParcelTier = {
  id: "POLYBAG" | "MEDIUM_FLAT_RATE" | "LARGE_FLAT_RATE";
  label: string;
  servicelevelToken: string;
  // One of these two must be present.
  template?: string; // e.g. "USPS_MediumFlatRateBox2"
  dimensions?: {
    length: number;
    width: number;
    height: number;
    distanceUnit: "in";
  };
};

export const PARCEL_TIERS: Record<ParcelTier["id"], ParcelTier> = {
  POLYBAG: {
    id: "POLYBAG",
    label: "Polybag (1–3 abadás)",
    servicelevelToken: "usps_ground_advantage",
    dimensions: {
      length: 11,
      width: 9.5,
      height: 3,
      distanceUnit: "in",
    },
  },
  MEDIUM_FLAT_RATE: {
    id: "MEDIUM_FLAT_RATE",
    label: "USPS Priority Mail Medium Flat Rate Box (4–6 abadás)",
    servicelevelToken: "usps_priority",
    // Box 2 is the slim 14×12×3.5 version — better for folded pants than
    // the 11.25×8.75×6 cube (Box 1). Swap to "USPS_MediumFlatRateBox1" if
    // you prefer the cube.
    template: "USPS_MediumFlatRateBox2",
  },
  LARGE_FLAT_RATE: {
    id: "LARGE_FLAT_RATE",
    label: "USPS Priority Mail Large Flat Rate Box (7+ abadás)",
    servicelevelToken: "usps_priority",
    template: "USPS_LargeFlatRateBox",
  },
};

/**
 * Pick a parcel tier from total item count.
 * 1–3 → polybag, 4–6 → medium flat rate, 7+ → large flat rate.
 */
export function pickParcelTier(itemCount: number): ParcelTier {
  if (itemCount <= 3) return PARCEL_TIERS.POLYBAG;
  if (itemCount <= 6) return PARCEL_TIERS.MEDIUM_FLAT_RATE;
  return PARCEL_TIERS.LARGE_FLAT_RATE;
}

// ─── Policy ──────────────────────────────────────────────────────────────
export const POLICY = {
  // Orders with this many items or fewer get a label auto-purchased.
  // Anything above this threshold is pushed to Shippo's Orders dashboard
  // for manual review and label purchase.
  autoBuyMaxItems: 2,
  allowedCountries: ["US"] as const,
  notificationEmail: "dende.arts@gmail.com",
  // Label format Shippo will return.
  labelFileType: "PDF_4x6" as const,
};
