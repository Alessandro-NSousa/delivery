import { EstablishmentAddress } from '../establishments/establishment.models';

export type OrderStatus =
  | 'PENDING_CONFIRMATION'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

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

export interface OrderCustomer {
  displayName: string;
  email: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer: OrderCustomer;
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

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Aguardando confirmacao da loja',
  PAYMENT_PENDING: 'Aguardando confirmacao de pagamento',
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
  PREPARING: 'Pedido em preparo',
  OUT_FOR_DELIVERY: 'Em rota de entrega',
  DELIVERED: 'Entrega confirmada'
};

type MerchantActionableOrderStatus = Exclude<OrderStatus, 'PENDING_CONFIRMATION'>;

const merchantNextStatusActionLabels: Record<MerchantActionableOrderStatus, string> = {
  PAYMENT_PENDING: 'Confirmar pedido',
  PAYMENT_CONFIRMED: 'Confirmar pagamento',
  PREPARING: 'Iniciar preparo',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Confirmar entrega'
};

export function orderStatusLabel(status: OrderStatus) {
  return orderStatusLabels[status] ?? status;
}

export function nextMerchantOrderStatus(
  order: Pick<Order, 'status' | 'paymentMethod'>
): MerchantActionableOrderStatus | null {
  if (order.status === 'PENDING_CONFIRMATION') {
    return order.paymentMethod === 'CASH_ON_DELIVERY' ? 'PREPARING' : 'PAYMENT_PENDING';
  }

  if (order.status === 'PAYMENT_PENDING') {
    return 'PAYMENT_CONFIRMED';
  }

  if (order.status === 'PAYMENT_CONFIRMED') {
    return 'PREPARING';
  }

  if (order.status === 'PREPARING') {
    return 'OUT_FOR_DELIVERY';
  }

  if (order.status === 'OUT_FOR_DELIVERY') {
    return 'DELIVERED';
  }

  return null;
}

export function nextMerchantOrderActionLabel(order: Pick<Order, 'status' | 'paymentMethod'>) {
  const nextStatus = nextMerchantOrderStatus(order);

  return nextStatus ? merchantNextStatusActionLabels[nextStatus] : null;
}