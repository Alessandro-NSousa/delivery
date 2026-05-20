import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthSessionService } from '../account/auth-session.service';
import { CurrentAccount } from '../account/current-account.models';
import { EstablishmentApi } from '../establishments/establishment-api';
import { Establishment } from '../establishments/establishment.models';
import { CreateOrderRequest, DeliveryAddress, Order } from '../orders/order.models';
import { OrderApi } from '../orders/order-api';
import { ProductApi } from '../products/product-api';
import { CustomerCartService } from './customer-cart.service';
import { CustomerHomePage } from './customer-home-page';
import { ViaCepApi } from './via-cep-api';

describe('CustomerHomePage', () => {
  const currentAccount = signal<CurrentAccount | null>({
    id: 'customer-1',
    email: 'customer@example.com',
    displayName: 'Customer Example',
    profile: 'CUSTOMER'
  });
  const authLoading = signal(false);
  const cartItems = signal([
    {
      productId: 'product-1',
      establishmentId: 'establishment-1',
      name: 'X-Burger',
      price: 32.9,
      imageUrl: 'https://images.delivery.local/x-burger.jpg',
      quantity: 2,
      available: true
    }
  ]);
  const cartEstablishmentId = signal<string | null>('establishment-1');
  const cartItemCount = signal(2);
  const cartSubtotal = signal(65.8);
  const cartHasUnavailableItems = signal(false);

  const authSessionStub = {
    currentAccount,
    isLoading: authLoading,
    loginAs: jasmine.createSpy('loginAs'),
    logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
    refresh: jasmine.createSpy('refresh').and.returnValue(of(null))
  };

  const customerCartStub = {
    items: cartItems,
    establishmentId: cartEstablishmentId,
    itemCount: cartItemCount,
    subtotal: cartSubtotal,
    hasUnavailableItems: cartHasUnavailableItems,
    addProduct: jasmine.createSpy('addProduct'),
    setQuantity: jasmine.createSpy('setQuantity'),
    removeItem: jasmine.createSpy('removeItem'),
    clear: jasmine.createSpy('clear'),
    syncCatalog: jasmine.createSpy('syncCatalog')
  };

  const establishmentApiStub = {
    listPublic: jasmine.createSpy('listPublic').and.returnValue(of([sampleEstablishment()]))
  };

  const productApiStub = {
    listByEstablishment: jasmine.createSpy('listByEstablishment').and.returnValue(of([]))
  };

  const orderApiStub = {
    create: jasmine.createSpy('create').and.callFake((request: CreateOrderRequest) => of(sampleOrder(request.deliveryAddress)))
  };

  const viaCepApiStub = {
    lookup: jasmine.createSpy('lookup').and.returnValue(of(null))
  };

  beforeEach(async () => {
    authSessionStub.loginAs.calls.reset();
    authSessionStub.logout.calls.reset();
    authSessionStub.refresh.calls.reset();
    customerCartStub.addProduct.calls.reset();
    customerCartStub.setQuantity.calls.reset();
    customerCartStub.removeItem.calls.reset();
    customerCartStub.clear.calls.reset();
    customerCartStub.syncCatalog.calls.reset();
    establishmentApiStub.listPublic.calls.reset();
    productApiStub.listByEstablishment.calls.reset();
    orderApiStub.create.calls.reset();
    viaCepApiStub.lookup.calls.reset();

    currentAccount.set({
      id: 'customer-1',
      email: 'customer@example.com',
      displayName: 'Customer Example',
      profile: 'CUSTOMER'
    });
    authLoading.set(false);
    cartItems.set([
      {
        productId: 'product-1',
        establishmentId: 'establishment-1',
        name: 'X-Burger',
        price: 32.9,
        imageUrl: 'https://images.delivery.local/x-burger.jpg',
        quantity: 2,
        available: true
      }
    ]);
    cartEstablishmentId.set('establishment-1');
    cartItemCount.set(2);
    cartSubtotal.set(65.8);
    cartHasUnavailableItems.set(false);

    await TestBed.configureTestingModule({
      imports: [CustomerHomePage],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: authSessionStub },
        { provide: CustomerCartService, useValue: customerCartStub },
        { provide: EstablishmentApi, useValue: establishmentApiStub },
        { provide: ProductApi, useValue: productApiStub },
        { provide: OrderApi, useValue: orderApiStub },
        { provide: ViaCepApi, useValue: viaCepApiStub }
      ]
    }).compileComponents();
  });

  it('autofills address fields from ViaCEP and keeps manual fields for the user', () => {
    viaCepApiStub.lookup.and.returnValue(
      of({
        zipCode: '01310930',
        street: 'Avenida Paulista',
        district: 'Bela Vista',
        city: 'Sao Paulo',
        state: 'SP'
      })
    );

    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.checkoutForm.patchValue({
      zipCode: '01310-930',
      number: '1500',
      complement: 'Apto 91'
    });

    component.lookupZipCode();

    expect(viaCepApiStub.lookup).toHaveBeenCalledWith('01310930');
    expect(component.checkoutForm.patchValue).toBeDefined();
    expect(component.checkoutForm.getRawValue()).toEqual({
      zipCode: '01310930',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      complement: 'Apto 91',
      paymentMethod: 'PIX',
      changeRequired: false
    });
    expect(component.zipCodeLookupMessage()).toContain('preenchidos pelo CEP');
  });

  it('renders required field indicators in checkout labels', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.required-indicator')).toHaveSize(7);
  });

  it('submits the delivery address and resets the checkout form after success', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.checkoutForm.setValue({
      zipCode: '01310930',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'sp',
      complement: 'Apto 91',
      paymentMethod: 'CASH_ON_DELIVERY',
      changeRequired: true
    });

    component.submitOrder();

    expect(orderApiStub.create).toHaveBeenCalledWith({
      establishmentId: 'establishment-1',
      items: [{ productId: 'product-1', quantity: 2 }],
      paymentMethod: 'CASH_ON_DELIVERY',
      changeRequired: true,
      deliveryAddress: {
        zipCode: '01310930',
        street: 'Avenida Paulista',
        number: '1500',
        district: 'Bela Vista',
        city: 'Sao Paulo',
        state: 'SP',
        complement: 'Apto 91'
      }
    });
    expect(customerCartStub.clear).toHaveBeenCalled();
    expect(component.lastOrder()?.deliveryAddress.city).toBe('Sao Paulo');
    expect(component.checkoutForm.getRawValue()).toEqual({
      zipCode: '',
      street: '',
      number: '',
      district: '',
      city: '',
      state: '',
      complement: '',
      paymentMethod: 'PIX',
      changeRequired: false
    });
  });

  function sampleEstablishment(): Establishment {
    return {
      id: 'establishment-1',
      tradeName: 'Lanche Bom',
      corporateName: 'Lanche Bom LTDA',
      cnpj: '12345678000190',
      phone: '11999999999',
      email: 'contato@lanchebom.com',
      category: 'SNACK_BAR',
      openingHours: 'Seg-Dom 18:00-23:30',
      address: {
        zipCode: '01001000',
        street: 'Rua A',
        number: '10',
        district: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        complement: 'Loja 1'
      },
      createdAt: '2026-05-19T18:00:00Z',
      updatedAt: '2026-05-19T18:00:00Z'
    };
  }

  function sampleOrder(deliveryAddress: DeliveryAddress): Order {
    return {
      id: 'order-1',
      customerId: 'customer-1',
      establishmentId: 'establishment-1',
      status: 'PENDING_CONFIRMATION',
      paymentMethod: 'CASH_ON_DELIVERY',
      changeRequired: true,
      subtotalAmount: 65.8,
      totalAmount: 65.8,
      deliveryAddress,
      items: [
        {
          productId: 'product-1',
          productName: 'X-Burger',
          unitPrice: 32.9,
          quantity: 2,
          lineTotal: 65.8
        }
      ],
      createdAt: '2026-05-19T18:05:00Z',
      updatedAt: '2026-05-19T18:05:00Z'
    };
  }
});