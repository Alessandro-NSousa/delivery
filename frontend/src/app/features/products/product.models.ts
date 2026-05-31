export type ProductCategory = 'APPETIZER' | 'MAIN_COURSE' | 'DESSERT' | 'DRINK' | 'COMBO';

export interface Product {
  id: string;
  establishmentId: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  imageUrl: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  imageUrl: string;
  available: boolean;
}

export type UpdateProductRequest = CreateProductRequest;

export const productCategoryOptions: Array<{ value: ProductCategory; label: string }> = [
  { value: 'APPETIZER', label: 'Entrada' },
  { value: 'MAIN_COURSE', label: 'Prato principal' },
  { value: 'DESSERT', label: 'Sobremesa' },
  { value: 'DRINK', label: 'Bebida' },
  { value: 'COMBO', label: 'Combo' }
];