import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CreateCustomerAddressRequest, SavedCustomerAddress, UpdateCustomerAddressRequest } from './customer-address.models';

@Injectable({ providedIn: 'root' })
export class CustomerAddressApi {
  private readonly http = inject(HttpClient);

  listMine() {
    return this.http.get<SavedCustomerAddress[]>('/api/me/addresses');
  }

  create(request: CreateCustomerAddressRequest) {
    return this.http.post<SavedCustomerAddress>('/api/me/addresses', request);
  }

  update(addressId: string, request: UpdateCustomerAddressRequest) {
    return this.http.put<SavedCustomerAddress>(`/api/me/addresses/${addressId}`, request);
  }

  setDefault(addressId: string) {
    return this.http.patch<SavedCustomerAddress>(`/api/me/addresses/${addressId}/default`, {});
  }

  delete(addressId: string) {
    return this.http.delete<void>(`/api/me/addresses/${addressId}`);
  }
}