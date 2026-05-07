import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CreateProductRequest, Product } from './product.models';

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly http = inject(HttpClient);

  listByEstablishment(establishmentId: string) {
    return this.http.get<Product[]>(`/api/public/establishments/${establishmentId}/products`);
  }

  create(establishmentId: string, request: CreateProductRequest) {
    return this.http.post<Product>(`/api/establishments/${establishmentId}/products`, request);
  }
}