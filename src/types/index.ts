export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  available: boolean;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo: string;
  coverImage: string;
  categories: Category[];
  products: Product[];
  plan: "basic" | "pro";
  active: boolean;
  totalViews: number;
}

export type UserRole = "public" | "restaurant-admin" | "super-admin";
