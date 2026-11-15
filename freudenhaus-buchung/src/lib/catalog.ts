import type { Category, Product, ProductModel } from "../api";

/** Core package products (Easyrent rental-group IDs). */
export const ONLINE_PRODUCT_IDS = new Set([
  "1", // Ski Platin
  "2", // Ski Gold
  "3", // Ski Silber
  "6", // Skischuh
  "18", // Snowboard
  "21", // Snowboard Boot
  "35", // Skihelm
]);

/**
 * Extras under “Extras dazu”.
 * Includes Easyrent IDs and legacy Rent-Buddy IDs used in media export.
 */
export const EXTRA_PRODUCT_IDS = new Set([
  "83",
  "47", // Skibrille
  "81",
  "44", // Rückenprotektor
  "80",
  "43", // Skischloss
  "91",
  "49", // Depot
]);

const MAX_MODELS = 4;

export function filterOnlineCatalog(categories: Category[]): Category[] {
  return categories
    .map((c) => ({
      ...c,
      products: c.products
        .filter((p) => ONLINE_PRODUCT_IDS.has(p.id) || EXTRA_PRODUCT_IDS.has(p.id))
        .map(limitModels),
    }))
    .filter((c) => c.products.length > 0);
}

function limitModels(product: Product): Product {
  if (!product.models?.length) return product;
  const withImg = product.models.filter((m) => m.image);
  const without = product.models.filter((m) => !m.image);
  const picked: ProductModel[] = [...withImg, ...without].slice(0, MAX_MODELS);
  return { ...product, models: picked };
}

export function curatedExtras(products: Product[]): Product[] {
  const order = ["47", "83", "44", "81", "43", "80", "49", "91"];
  const byId = new Map(products.filter((p) => EXTRA_PRODUCT_IDS.has(p.id)).map((p) => [p.id, p]));
  const out: Product[] = [];
  for (const id of order) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out.slice(0, 4);
}
