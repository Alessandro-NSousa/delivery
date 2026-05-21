import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CreateOrderRequest, Order, OrderStatus } from './order.models';

@Injectable({ providedIn: 'root' })
export class OrderApi {
  private readonly http = inject(HttpClient);

  create(request: CreateOrderRequest) {
    return this.http.post<Order>('/api/orders', request);
  }

  listMine(establishmentId?: string) {
    const params = establishmentId ? new HttpParams().set('establishmentId', establishmentId) : undefined;

    return this.http.get<Order[]>('/api/me/orders', { params });
  }

  updateStatus(orderId: string, status: OrderStatus) {
    return this.http.patch<Order>(`/api/me/orders/${orderId}/status`, { status });
  }
}