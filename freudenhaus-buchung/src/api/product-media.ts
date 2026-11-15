import media from "./product-media.json";
import type { Category, Product, ProductModel } from "./types";

type MediaProduct = {
  title: string;
  image?: string;
  models: Array<{
    id: string;
    title: string;
    brand?: string;
    image?: string;
    variants: Array<{ property1: string }>;
  }>;
};

const byTitle = new Map<string, MediaProduct>();
for (const row of Object.values(media as Record<string, MediaProduct>)) {
  byTitle.set(row.title.toLowerCase(), row);
}

/** Merge catalog photos/models from Rent Buddy media export (title match). */
export function enrichCategoriesWithMedia(categories: Category[]): Category[] {
  return categories.map((cat) => ({
    ...cat,
    products: cat.products.map((p) => enrichProduct(p)),
  }));
}

function enrichProduct(product: Product): Product {
  const mediaRow = byTitle.get(product.title.toLowerCase());
  if (!mediaRow) return product;

  const models: ProductModel[] =
    product.models.length > 0
      ? product.models.map((m) => {
          const hit =
            mediaRow.models.find(
              (x) =>
                x.title.toLowerCase() === m.title.toLowerCase() ||
                (x.brand && m.brand && x.brand.toLowerCase() === m.brand.toLowerCase() && x.title.includes(m.title)),
            ) ||
            mediaRow.models.find((x) => m.title.toLowerCase().includes(x.title.toLowerCase()));
          return {
            ...m,
            image: m.image || hit?.image,
            brand: m.brand || hit?.brand,
            variants: m.variants.length ? m.variants : hit?.variants || [],
          };
        })
      : mediaRow.models.map((m) => ({
          id: m.id,
          title: m.title,
          brand: m.brand,
          image: m.image,
          variants: m.variants,
        }));

  return {
    ...product,
    image: product.image || mediaRow.image,
    models,
  };
}
