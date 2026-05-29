import { DeliveryAddress } from '../orders/order.models';

export interface SavedCustomerAddress {
  id: string;
  label: string | null;
  defaultAddress: boolean;
  address: DeliveryAddress;
}

export interface CreateCustomerAddressRequest extends DeliveryAddress {
  label: string | null;
  defaultAddress: boolean;
}

export interface UpdateCustomerAddressRequest extends DeliveryAddress {
  label: string | null;
}