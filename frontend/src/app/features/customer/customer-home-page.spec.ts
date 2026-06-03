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
import { Product } from '../products/product.models';
import { CustomerAddressApi } from './customer-address-api';
import { SavedCustomerAddress } from './customer-address.models';
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

  const customerAddressApiStub = {
    listMine: jasmine.createSpy('listMine').and.returnValue(of([sampleSavedAddress()])),
    create: jasmine.createSpy('create').and.returnValue(of(sampleSavedAddress('address-2', null, false))),
    update: jasmine.createSpy('update').and.returnValue(of(sampleSavedAddress('address-1', 'Casa editada', true, sampleDeliveryAddress('200')))),
    setDefault: jasmine.createSpy('setDefault').and.returnValue(of(sampleSavedAddress('address-1', 'Casa', true))),
    delete: jasmine.createSpy('delete').and.returnValue(of(void 0))
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
    customerAddressApiStub.listMine.calls.reset();
    customerAddressApiStub.create.calls.reset();
    customerAddressApiStub.update.calls.reset();
    customerAddressApiStub.setDefault.calls.reset();
    customerAddressApiStub.delete.calls.reset();
    orderApiStub.create.calls.reset();
    viaCepApiStub.lookup.calls.reset();

    customerAddressApiStub.listMine.and.returnValue(of([sampleSavedAddress()]));
    customerAddressApiStub.create.and.returnValue(of(sampleSavedAddress('address-2', null, false)));
    customerAddressApiStub.update.and.returnValue(of(sampleSavedAddress('address-1', 'Casa editada', true, sampleDeliveryAddress('200'))));
    customerAddressApiStub.setDefault.and.returnValue(of(sampleSavedAddress('address-1', 'Casa', true)));
    customerAddressApiStub.delete.and.returnValue(of(void 0));
    customerCartStub.addProduct.and.returnValue('added');

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
        { provide: CustomerAddressApi, useValue: customerAddressApiStub },
        { provide: OrderApi, useValue: orderApiStub },
        { provide: ViaCepApi, useValue: viaCepApiStub }
      ]
    }).compileComponents();
  });

  it('loads saved addresses and selects the default address for checkout', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(customerAddressApiStub.listMine).toHaveBeenCalled();
    expect(component.selectedAddressId()).toBe('address-1');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Endereco selecionado');
    expect(compiled.textContent).toContain('Casa');
  });

  it('opens a confirmation modal when another establishment product conflicts with the current cart', () => {
    customerCartStub.addProduct.and.returnValue('conflict');

    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const product = sampleProduct();

    component.addToCart(product);
    fixture.detectChanges();

    expect(component.cartConflictProduct()).toEqual(product);
    expect(component.cartFeedbackMessage()).toContain('Sua sacola ja esta vinculada a Lanche Bom');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Esvaziar sacola para continuar?');
    expect(compiled.textContent).toContain('Pizza grande');
    expect(compiled.textContent).toContain('Deseja fazer isso agora?');
  });

  it('clears the cart and retries the requested product after confirmation', () => {
    customerCartStub.addProduct.and.returnValues('conflict', 'added');

    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const product = sampleProduct();

    component.addToCart(product);
    component.confirmCartReplacement();
    fixture.detectChanges();

    expect(customerCartStub.clear).toHaveBeenCalled();
    expect(customerCartStub.addProduct.calls.count()).toBe(2);
    expect(customerCartStub.addProduct.calls.argsFor(0)).toEqual([product]);
    expect(customerCartStub.addProduct.calls.argsFor(1)).toEqual([product]);
    expect(component.cartConflictProduct()).toBeNull();
    expect(component.cartFeedbackMessage()).toBe('Sacola esvaziada e Pizza grande adicionado a sacola.');
  });

  it('starts with the address section collapsed and expands on demand', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.isAddressSectionCollapsed()).toBeTrue();

    let compiled = fixture.nativeElement as HTMLElement;
    const expandButton = compiled.querySelector('button[aria-label="Expandir enderecos"]');

    expect(compiled.textContent).toContain('Endereco selecionado');
    expect(compiled.textContent).not.toContain('Cadastrar novo endereco');
    expect(expandButton).not.toBeNull();

    component.toggleAddressSection();
    fixture.detectChanges();

    expect(component.isAddressSectionCollapsed()).toBeFalse();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cadastrar novo endereco');
  });

  it('autofills the saved address form from ViaCEP and keeps manual fields for the user', () => {
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
    component.startNewAddress();
    component.addressForm.patchValue({
      zipCode: '01310-930',
      number: '1500',
      complement: 'Apto 91'
    });

    component.lookupZipCode();

    expect(viaCepApiStub.lookup).toHaveBeenCalledWith('01310930');
    expect(component.addressForm.patchValue).toBeDefined();
    expect(component.addressForm.getRawValue()).toEqual({
      label: '',
      zipCode: '01310-930',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      complement: 'Apto 91',
      defaultAddress: false
    });
    expect(component.zipCodeLookupMessage()).toContain('preenchidos pelo CEP');
  });

  it('creates a new saved address and selects it for the current checkout', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.startNewAddress();
    component.addressForm.setValue({
      label: '',
      zipCode: '01310-930',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'sp',
      complement: 'Apto 91',
      defaultAddress: false
    });

    component.saveAddress();

    expect(customerAddressApiStub.create).toHaveBeenCalledWith({
      label: null,
      zipCode: '01310930',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      complement: 'Apto 91',
      defaultAddress: false
    });
    expect(component.selectedAddressId()).toBe('address-2');
    expect(component.savedAddresses()).toHaveSize(2);
  });

  it('edits an existing saved address without changing the selected checkout address', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.startEditAddress('address-1');
    component.addressForm.patchValue({
      label: 'Casa editada',
      zipCode: '22222-000',
      street: 'Rua das Flores',
      number: '200',
      district: 'Centro',
      city: 'Rio de Janeiro',
      state: 'rj',
      complement: ''
    });

    component.saveAddress();

    expect(customerAddressApiStub.update).toHaveBeenCalledWith('address-1', {
      label: 'Casa editada',
      zipCode: '22222000',
      street: 'Rua das Flores',
      number: '200',
      district: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      complement: null
    });
    expect(component.selectedAddressId()).toBe('address-1');
    expect(component.savedAddresses()[0].label).toBe('Casa editada');
    expect(component.savedAddresses()[0].address.number).toBe('200');
  });

  it('removes the selected address and reloads the remaining default address', () => {
    customerAddressApiStub.listMine.and.returnValues(
      of([
        sampleSavedAddress('address-1', 'Casa', true),
        sampleSavedAddress('address-2', 'Trabalho', false, sampleDeliveryAddress('250'))
      ]),
      of([sampleSavedAddress('address-2', 'Trabalho', true, sampleDeliveryAddress('250'))])
    );

    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.deleteAddress('address-1');

    expect(customerAddressApiStub.delete).toHaveBeenCalledWith('address-1');
    expect(component.savedAddresses()).toHaveSize(1);
    expect(component.selectedAddressId()).toBe('address-2');
    expect(component.savedAddresses()[0].defaultAddress).toBeTrue();
  });

  it('submits the selected saved address and resets the payment form after success', () => {
    const fixture = TestBed.createComponent(CustomerHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.paymentForm.setValue({
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
    expect(component.paymentForm.getRawValue()).toEqual({
      paymentMethod: 'PIX',
      changeRequired: false
    });
  });

  function sampleSavedAddress(
    id = 'address-1',
    label: string | null = 'Casa',
    defaultAddress = true,
    address: DeliveryAddress = sampleDeliveryAddress()
  ): SavedCustomerAddress {
    return {
      id,
      label,
      defaultAddress,
      address
    };
  }

  function sampleProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: overrides.id ?? 'product-2',
      establishmentId: overrides.establishmentId ?? 'establishment-2',
      name: overrides.name ?? 'Pizza grande',
      description: overrides.description ?? 'Molho de tomate, queijo e oregano.',
      category: overrides.category ?? 'MAIN_COURSE',
      price: overrides.price ?? 42.5,
      imageUrl: overrides.imageUrl ?? 'https://images.delivery.local/pizza-grande.jpg',
      available: overrides.available ?? true,
      createdAt: overrides.createdAt ?? '2026-05-19T18:10:00Z',
      updatedAt: overrides.updatedAt ?? '2026-05-19T18:10:00Z'
    };
  }

  function sampleDeliveryAddress(number = '1500'): DeliveryAddress {
    return {
      zipCode: '01310930',
      street: 'Avenida Paulista',
      number,
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      complement: 'Apto 91'
    };
  }

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
      customer: {
        displayName: 'Customer Example',
        email: 'customer@example.com'
      },
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