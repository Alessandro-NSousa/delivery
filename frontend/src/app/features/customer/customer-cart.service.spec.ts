import { TestBed } from '@angular/core/testing';

import { Product } from '../products/product.models';
import { CustomerCartService } from './customer-cart.service';

describe('CustomerCartService', () => {
  let service: CustomerCartService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomerCartService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('adds products and merges quantities for the same item', () => {
    const product = sampleProduct({ id: 'product-1', establishmentId: 'establishment-1', price: 32.9 });

    expect(service.addProduct(product)).toBe('added');
    expect(service.addProduct(product)).toBe('merged');

    expect(service.items()).toEqual([
      jasmine.objectContaining({ productId: 'product-1', quantity: 2, establishmentId: 'establishment-1' })
    ]);
    expect(service.itemCount()).toBe(2);
    expect(service.subtotal()).toBeCloseTo(65.8, 2);
  });

  it('blocks products from another establishment while the cart is active', () => {
    expect(service.addProduct(sampleProduct({ id: 'product-1', establishmentId: 'establishment-1' }))).toBe('added');

    expect(service.addProduct(sampleProduct({ id: 'product-2', establishmentId: 'establishment-2' }))).toBe('conflict');
    expect(service.items()).toHaveSize(1);
  });

  it('syncs current catalog prices and availability', () => {
    service.addProduct(sampleProduct({ id: 'product-1', establishmentId: 'establishment-1', price: 32.9 }));
    service.addProduct(sampleProduct({ id: 'product-2', establishmentId: 'establishment-1', price: 10 }));

    service.syncCatalog('establishment-1', [
      sampleProduct({ id: 'product-1', establishmentId: 'establishment-1', price: 35.5, available: false })
    ]);

    expect(service.items()).toEqual([
      jasmine.objectContaining({ productId: 'product-1', price: 35.5, available: false }),
      jasmine.objectContaining({ productId: 'product-2', available: false })
    ]);
    expect(service.hasUnavailableItems()).toBeTrue();
  });

  function sampleProduct(overrides: Partial<Product>): Product {
    return {
      id: overrides.id ?? 'product-1',
      establishmentId: overrides.establishmentId ?? 'establishment-1',
      name: overrides.name ?? 'X-Burger',
      description: overrides.description ?? 'Hamburguer artesanal',
      category: overrides.category ?? 'MAIN_COURSE',
      price: overrides.price ?? 32.9,
      imageUrl: overrides.imageUrl ?? 'https://images.delivery.local/x-burger.jpg',
      available: overrides.available ?? true,
      createdAt: overrides.createdAt ?? '2026-05-16T12:00:00Z',
      updatedAt: overrides.updatedAt ?? '2026-05-16T12:00:00Z'
    };
  }
});