import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Product } from '../products/product.models';

const cartStorageKey = 'delivery.customer.cart';

export interface CustomerCartItem {
  productId: string;
  establishmentId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  available: boolean;
}

export type AddToCartResult = 'added' | 'merged' | 'conflict' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class CustomerCartService {
  private readonly document = inject(DOCUMENT);

  readonly items = signal<CustomerCartItem[]>(this.readItems());
  readonly establishmentId = computed(() => this.items()[0]?.establishmentId ?? null);
  readonly itemCount = computed(() => this.items().reduce((total, item) => total + item.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((total, item) => total + item.price * item.quantity, 0));
  readonly hasUnavailableItems = computed(() => this.items().some((item) => !item.available));

  addProduct(product: Product): AddToCartResult {
    if (!product.available) {
      return 'unavailable';
    }

    const activeEstablishmentId = this.establishmentId();
    if (activeEstablishmentId && activeEstablishmentId !== product.establishmentId) {
      return 'conflict';
    }

    const items = [...this.items()];
    const existingItem = items.find((item) => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      this.commit(items);
      return 'merged';
    }

    items.push({
      productId: product.id,
      establishmentId: product.establishmentId,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
      available: product.available
    });
    this.commit(items);
    return 'added';
  }

  setQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    this.commit(
      this.items().map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  removeItem(productId: string) {
    this.commit(this.items().filter((item) => item.productId !== productId));
  }

  clear() {
    this.commit([]);
  }

  syncCatalog(establishmentId: string, products: Product[]) {
    if (this.establishmentId() !== establishmentId) {
      return;
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    this.commit(
      this.items().map((item) => {
        if (item.establishmentId !== establishmentId) {
          return item;
        }

        const product = productsById.get(item.productId);
        if (!product) {
          return { ...item, available: false };
        }

        return {
          ...item,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          available: product.available
        };
      })
    );
  }

  private commit(items: CustomerCartItem[]) {
    this.items.set(items);
    this.writeItems(items);
  }

  private readItems() {
    const storage = this.document.defaultView?.sessionStorage;
    const serialized = storage?.getItem(cartStorageKey);

    if (!storage || !serialized) {
      return [];
    }

    try {
      const parsed = JSON.parse(serialized) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(this.isCartItem);
    } catch {
      return [];
    }
  }

  private writeItems(items: CustomerCartItem[]) {
    this.document.defaultView?.sessionStorage.setItem(cartStorageKey, JSON.stringify(items));
  }

  private isCartItem(value: unknown): value is CustomerCartItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<CustomerCartItem>;
    return (
      typeof candidate.productId === 'string' &&
      typeof candidate.establishmentId === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.price === 'number' &&
      typeof candidate.imageUrl === 'string' &&
      typeof candidate.quantity === 'number' &&
      typeof candidate.available === 'boolean'
    );
  }
}