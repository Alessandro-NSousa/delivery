import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CreateOrderRequest, Order } from './order.models';

@Injectable({ providedIn: 'root' })
export class OrderApi {
  private readonly http = inject(HttpClient);

  create(request: CreateOrderRequest) {
    return this.http.post<Order>('/api/orders', request);
  }
}