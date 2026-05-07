export type EstablishmentCategory =
  | 'RESTAURANT'
  | 'SNACK_BAR'
  | 'PIZZERIA'
  | 'BAKERY'
  | 'JAPANESE'
  | 'BRAZILIAN'
  | 'BURGER';

export interface EstablishmentAddress {
  zipCode: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  complement: string | null;
}

export interface Establishment {
  id: string;
  tradeName: string;
  corporateName: string;
  cnpj: string;
  phone: string;
  email: string;
  category: EstablishmentCategory;
  openingHours: string;
  address: EstablishmentAddress;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEstablishmentRequest {
  tradeName: string;
  corporateName: string;
  cnpj: string;
  phone: string;
  email: string;
  category: EstablishmentCategory;
  openingHours: string;
  address: EstablishmentAddress;
}

export interface ApiProblem {
  detail?: string;
  errors?: string[];
}

export const establishmentCategoryOptions: Array<{
  value: EstablishmentCategory;
  label: string;
}> = [
  { value: 'RESTAURANT', label: 'Restaurante' },
  { value: 'SNACK_BAR', label: 'Lanchonete' },
  { value: 'PIZZERIA', label: 'Pizzaria' },
  { value: 'BAKERY', label: 'Padaria' },
  { value: 'JAPANESE', label: 'Japonesa' },
  { value: 'BRAZILIAN', label: 'Brasileira' },
  { value: 'BURGER', label: 'Hamburgueria' }
];