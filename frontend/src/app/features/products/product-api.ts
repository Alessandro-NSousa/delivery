import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CreateProductRequest, Product, UpdateProductRequest } from './product.models';

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly http = inject(HttpClient);

  listByEstablishment(establishmentId: string) {
    return this.http.get<Product[]>(`/api/public/establishments/${establishmentId}/products`);
  }

  listMineByEstablishment(establishmentId: string) {
    return this.http.get<Product[]>(`/api/me/establishments/${establishmentId}/products`);
  }

  create(establishmentId: string, request: CreateProductRequest) {
    return this.http.post<Product>(`/api/establishments/${establishmentId}/products`, request);
  }

  update(establishmentId: string, productId: string, request: UpdateProductRequest) {
    return this.http.put<Product>(`/api/establishments/${establishmentId}/products/${productId}`, request);
  }

  deactivate(establishmentId: string, productId: string) {
    return this.http.delete<Product>(`/api/establishments/${establishmentId}/products/${productId}`);
  }
}