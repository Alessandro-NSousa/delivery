import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthSessionService } from '../account/auth-session.service';
import { CurrentAccount } from '../account/current-account.models';
import { EstablishmentApi } from '../establishments/establishment-api';
import { Establishment } from '../establishments/establishment.models';
import { OrderApi } from '../orders/order-api';
import { Order } from '../orders/order.models';
import { ProductApi } from '../products/product-api';
import { Product } from '../products/product.models';
import { ViaCepApi } from '../customer/via-cep-api';
import { MerchantHomePage } from './merchant-home-page';

describe('MerchantHomePage', () => {
  const currentAccount = signal<CurrentAccount | null>({
    id: 'merchant-1',
    email: 'merchant@example.com',
    displayName: 'Merchant Example',
    profile: 'MERCHANT'
  });
  const authLoading = signal(false);

  const authSessionStub = {
    currentAccount,
    isLoading: authLoading,
    loginAs: jasmine.createSpy('loginAs'),
    logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
    refresh: jasmine.createSpy('refresh').and.callFake(() => of(currentAccount()))
  };

  const establishmentApiStub = {
    listMine: jasmine.createSpy('listMine').and.returnValue(of([sampleEstablishment()])),
    create: jasmine.createSpy('create').and.returnValue(of(sampleEstablishment()))
  };

  const productApiStub = {
    listMineByEstablishment: jasmine.createSpy('listMineByEstablishment').and.returnValue(of([sampleProduct()])),
    create: jasmine.createSpy('create').and.returnValue(of(sampleProduct())),
    update: jasmine.createSpy('update').and.callFake((_establishmentId: string, productId: string) =>
      of({ ...sampleProduct(), id: productId, name: 'X-Salada' })
    ),
    deactivate: jasmine.createSpy('deactivate').and.callFake(() => of({ ...sampleProduct(), available: false }))
  };

  const orderApiStub = {
    listMine: jasmine.createSpy('listMine').and.returnValue(of([sampleOrder()])),
    updateStatus: jasmine.createSpy('updateStatus').and.callFake((orderId: string, status: Order['status']) =>
      of({ ...sampleOrder(), id: orderId, status })
    )
  };

  const viaCepApiStub = {
    lookup: jasmine.createSpy('lookup').and.returnValue(of(null))
  };

  beforeEach(async () => {
    authSessionStub.loginAs.calls.reset();
    authSessionStub.logout.calls.reset();
    authSessionStub.refresh.calls.reset();
    establishmentApiStub.listMine.calls.reset();
    establishmentApiStub.create.calls.reset();
    productApiStub.listMineByEstablishment.calls.reset();
    productApiStub.create.calls.reset();
    productApiStub.update.calls.reset();
    productApiStub.deactivate.calls.reset();
    orderApiStub.listMine.calls.reset();
    orderApiStub.updateStatus.calls.reset();
    viaCepApiStub.lookup.calls.reset();

    currentAccount.set({
      id: 'merchant-1',
      email: 'merchant@example.com',
      displayName: 'Merchant Example',
      profile: 'MERCHANT'
    });
    authLoading.set(false);

    await TestBed.configureTestingModule({
      imports: [MerchantHomePage],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: authSessionStub },
        { provide: EstablishmentApi, useValue: establishmentApiStub },
        { provide: ProductApi, useValue: productApiStub },
        { provide: OrderApi, useValue: orderApiStub },
        { provide: ViaCepApi, useValue: viaCepApiStub }
      ]
    }).compileComponents();
  });

  it('loads received orders for the selected establishment', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    expect(orderApiStub.listMine).toHaveBeenCalledWith('establishment-1');
    expect(productApiStub.listMineByEstablishment).toHaveBeenCalledWith('establishment-1');
    expect(fixture.componentInstance.orders()).toHaveSize(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pedidos recebidos');
    expect(compiled.textContent).toContain('X-Burger');
  });

  it('keeps new store registration as a secondary workflow when the merchant already has stores', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const secondaryWorkflow = compiled.querySelector('details.secondary-workflow') as HTMLDetailsElement | null;

    expect(secondaryWorkflow).not.toBeNull();
    expect(secondaryWorkflow?.hasAttribute('open')).toBeFalse();
    expect(compiled.textContent?.indexOf('Pedidos recebidos')).toBeLessThan(compiled.textContent?.indexOf('Cadastrar nova loja') ?? Infinity);
    expect(compiled.textContent).toContain('CNPJ ja cadastrado na base');
  });

  it('opens the product form inside a modal for creating a new item', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openCreateProductModal();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.isProductModalOpen()).toBeTrue();
    expect(compiled.textContent).toContain('Adicionar produto');
  });

  it('updates an existing product through the merchant catalog modal', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openEditProductModal(component.orderedProducts()[0]);
    component.productForm.setValue({
      name: 'X-Salada',
      description: 'Pao, carne, queijo e salada',
      category: 'MAIN_COURSE',
      price: 35.5,
      imageUrl: 'https://images.delivery.local/x-salada.jpg',
      available: true
    });

    component.submitProduct();

    expect(productApiStub.update).toHaveBeenCalledWith('establishment-1', 'product-1', {
      name: 'X-Salada',
      description: 'Pao, carne, queijo e salada',
      category: 'MAIN_COURSE',
      price: 35.5,
      imageUrl: 'https://images.delivery.local/x-salada.jpg',
      available: true
    });
    expect(component.productSuccessMessage()).toContain('atualizado');
  });

  it('deactivates a product and keeps it visible in the catalog history', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.deactivateProduct(component.orderedProducts()[0]);

    expect(productApiStub.deactivate).toHaveBeenCalledWith('establishment-1', 'product-1');
    expect(component.products()).toHaveSize(1);
    expect(component.products()[0].available).toBeFalse();
  });

  it('advances the order to the next valid status', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const order = component.orders()[0];

    component.advanceOrder(order);

    expect(orderApiStub.updateStatus).toHaveBeenCalledWith('order-1', 'PAYMENT_PENDING');
    expect(component.orders()[0].status).toBe('PAYMENT_PENDING');
    expect(component.orderSuccessMessage()).toContain('Pedido #order-1');
  });

  it('autofills establishment address fields from ViaCEP and preserves manual fields', () => {
    viaCepApiStub.lookup.and.returnValue(
      of({
        zipCode: '01310930',
        street: 'Avenida Paulista',
        district: 'Bela Vista',
        city: 'Sao Paulo',
        state: 'SP'
      })
    );

    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.establishmentForm.patchValue({
      zipCode: '01310-930',
      number: '1500',
      complement: 'Loja 12'
    });

    component.lookupZipCode();

    expect(viaCepApiStub.lookup).toHaveBeenCalledWith('01310930');
    expect(component.establishmentForm.getRawValue()).toEqual({
      tradeName: '',
      corporateName: '',
      cnpj: '',
      phone: '',
      email: '',
      category: 'RESTAURANT',
      openingHours: 'Seg-Dom 18:00-23:00',
      zipCode: '01310-930',
      street: 'Avenida Paulista',
      number: '1500',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      complement: 'Loja 12'
    });
    expect(component.zipCodeLookupMessage()).toContain('preenchidos pelo CEP');
  });

  it('submits masked establishment fields with sanitized payload', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.establishmentForm.setValue({
      tradeName: 'Lanche Bom',
      corporateName: 'Lanche Bom LTDA',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 99999-9999',
      email: 'contato@lanchebom.com',
      category: 'SNACK_BAR',
      openingHours: 'Seg-Dom 18:00-23:30',
      zipCode: '01001-000',
      street: 'Rua A',
      number: '10',
      district: 'Centro',
      city: 'Sao Paulo',
      state: 'sp',
      complement: 'Loja 1'
    });

    component.submitEstablishment();

    expect(establishmentApiStub.create).toHaveBeenCalledWith({
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
      }
    });
  });

  it('renders required field indicators in establishment address labels', () => {
    const fixture = TestBed.createComponent(MerchantHomePage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.required-indicator')).toHaveSize(6);
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

  function sampleProduct(): Product {
    return {
      id: 'product-1',
      establishmentId: 'establishment-1',
      name: 'X-Burger',
      description: 'Pao, carne e queijo',
      category: 'MAIN_COURSE',
      price: 32.9,
      imageUrl: 'https://images.delivery.local/x-burger.jpg',
      available: true,
      createdAt: '2026-05-19T18:00:00Z',
      updatedAt: '2026-05-19T18:00:00Z'
    };
  }

  function sampleOrder(): Order {
    return {
      id: 'order-1',
      customerId: 'customer-1',
      establishmentId: 'establishment-1',
      status: 'PENDING_CONFIRMATION',
      paymentMethod: 'PIX',
      changeRequired: false,
      subtotalAmount: 65.8,
      totalAmount: 65.8,
      deliveryAddress: {
        zipCode: '01310930',
        street: 'Avenida Paulista',
        number: '1500',
        district: 'Bela Vista',
        city: 'Sao Paulo',
        state: 'SP',
        complement: 'Apto 91'
      },
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