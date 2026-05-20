import { EstablishmentAddress } from '../establishments/establishment.models';

export type OrderStatus = 'PENDING_CONFIRMATION';

export type OrderPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'CASH_ON_DELIVERY';

export type DeliveryAddress = EstablishmentAddress;

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  establishmentId: string;
  items: CreateOrderItemRequest[];
  paymentMethod: OrderPaymentMethod;
  changeRequired: boolean;
  deliveryAddress: DeliveryAddress;
}

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  establishmentId: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  changeRequired: boolean;
  subtotalAmount: number;
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export const paymentMethodOptions: Array<{ value: OrderPaymentMethod; label: string }> = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartao de credito' },
  { value: 'CASH_ON_DELIVERY', label: 'Pagamento na entrega' }
];