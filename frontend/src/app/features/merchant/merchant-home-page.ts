import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FeedbackModalService } from '../../app-feedback-modal.service';
import {
  cnpjPattern,
  digitsOnly,
  formatCnpj,
  formatPhoneNumber,
  formatStateCode,
  formatZipCode,
  phonePattern,
  stateCodePattern,
  zipCodePattern
} from '../../form-input-masks';
import { AuthSessionService } from '../account/auth-session.service';
import { CurrentAccount } from '../account/current-account.models';
import { readApiErrorMessage } from '../establishments/api-error';
import { EstablishmentApi } from '../establishments/establishment-api';
import {
  CreateEstablishmentRequest,
  Establishment,
  EstablishmentCategory,
  establishmentCategoryOptions
} from '../establishments/establishment.models';
import { OrderApi } from '../orders/order-api';
import {
  DeliveryAddress,
  nextMerchantOrderActionLabel,
  nextMerchantOrderStatus,
  Order,
  OrderPaymentMethod,
  OrderStatus,
  orderStatusLabel as describeOrderStatus,
  paymentMethodOptions
} from '../orders/order.models';
import { ProductApi } from '../products/product-api';
import {
  CreateProductRequest,
  Product,
  ProductCategory,
  productCategoryOptions,
  UpdateProductRequest
} from '../products/product.models';
import { ViaCepApi } from '../customer/via-cep-api';

const initialEstablishmentFormValue = {
  tradeName: '',
  corporateName: '',
  cnpj: '',
  phone: '',
  email: '',
  category: 'RESTAURANT' as EstablishmentCategory,
  openingHours: 'Seg-Dom 18:00-23:00',
  zipCode: '',
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
  complement: ''
};

const initialProductFormValue = {
  name: '',
  description: '',
  category: 'MAIN_COURSE' as ProductCategory,
  price: 0,
  imageUrl: '',
  available: true
};

const productCategoryLabels = new Map(productCategoryOptions.map((option) => [option.value, option.label]));
const paymentMethodLabels = new Map(paymentMethodOptions.map((option) => [option.value, option.label]));
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

type EstablishmentFormField = keyof typeof initialEstablishmentFormValue;
type ProductFormField = keyof typeof initialProductFormValue;
type EstablishmentMaskedField = 'cnpj' | 'phone' | 'zipCode' | 'state';

@Component({
  selector: 'app-merchant-home-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page-shell">
      <a routerLink="/" class="back-link">Voltar ao inicio</a>

      <header class="hero-card">
        <div>
          <p class="eyebrow">Painel do lojista</p>
          <h1>Gerencie pedidos, cardapio e operacao.</h1>
          <p>Os pedidos recebidos ficam no centro do fluxo, com cardapio e expansao da operacao logo em seguida.</p>
        </div>

        <div class="mini-board">
          <span>{{ currentAccount()?.displayName ?? 'Sessao nao identificada' }}</span>
          <span>{{ currentAccount()?.email ?? 'Autenticacao necessaria' }}</span>
          <span>{{ currentAccount()?.profile === 'MERCHANT' ? 'Perfil MERCHANT' : 'Sem acesso de lojista' }}</span>
        </div>
      </header>

      @if (accessMessage()) {
        <section class="feedback access">{{ accessMessage() }}</section>
      }

      @if (establishmentSuccessMessage()) {
        <section class="feedback success">{{ establishmentSuccessMessage() }}</section>
      }

      @if (establishmentErrorMessage()) {
        <section class="feedback error">{{ establishmentErrorMessage() }}</section>
      }

      @if (productSuccessMessage()) {
        <section class="feedback success">{{ productSuccessMessage() }}</section>
      }

      @if (productErrorMessage()) {
        <section class="feedback error">{{ productErrorMessage() }}</section>
      }

      @if (orderSuccessMessage()) {
        <section class="feedback success">{{ orderSuccessMessage() }}</section>
      }

      @if (orderErrorMessage()) {
        <section class="feedback error">{{ orderErrorMessage() }}</section>
      }

      @if (isWorkspaceLoading()) {
        <section class="panel blocked-panel">
          <p class="label">Carregando</p>
          <h2>Preparando o painel do lojista.</h2>
        </section>
      } @else if (!canManageCatalog()) {
        <section class="panel blocked-panel">
          <p class="label">Acesso necessario</p>
          <h2>Entre com uma conta de lojista.</h2>
          <p>
            O backend exige autenticacao com perfil MERCHANT para listar suas lojas, cadastrar estabelecimentos e
            publicar produtos.
          </p>

          <div class="blocked-actions">
            @if (currentAccount()) {
              <button type="button" class="primary-link" (click)="logout()" [disabled]="isSessionBusy()">
                Encerrar sessao atual
              </button>
            } @else {
              <button type="button" class="primary-link" (click)="loginAsMerchant()" [disabled]="isSessionBusy()">
                Entrar como lojista
              </button>
            }

            <a routerLink="/cliente" class="secondary-link">Abrir area do cliente</a>
          </div>
        </section>
      } @else {
        <section class="layout-grid">
          <div class="form-stack">
            <section class="panel operations-panel">
              <div class="section-heading">
                <div>
                  <p class="label">Operacao atual</p>
                  <h2>{{ selectedEstablishment()?.tradeName ?? 'Selecione uma loja' }}</h2>
                </div>
                <span class="chip alt">{{ selectedEstablishment() ? orders().length + ' pedidos' : establishments().length + ' lojas' }}</span>
              </div>

              <p class="operations-copy">
                @if (selectedEstablishment()) {
                  Priorize os pedidos recebidos e a manutencao do cardapio desta loja. O cadastro de nova unidade
                  continua disponivel abaixo, como acao secundaria.
                } @else if (establishments().length === 0) {
                  Cadastre sua primeira loja para liberar a operacao diaria. Depois disso, este painel passa a
                  destacar pedidos e cardapio.
                } @else {
                  Escolha uma loja para acompanhar pedidos recebidos e manter o cardapio publicado.
                }
              </p>

              <div class="operations-metrics">
                <article class="metric-card">
                  <span class="label inner">Lojas</span>
                  <strong class="metric-value">{{ establishments().length }}</strong>
                  <p>Unidades vinculadas a esta conta.</p>
                </article>

                <article class="metric-card">
                  <span class="label inner">Pedidos</span>
                  <strong class="metric-value">{{ selectedEstablishment() ? orders().length : '--' }}</strong>
                  <p>{{ selectedEstablishment() ? 'Recebidos pela loja selecionada.' : 'Selecione uma loja para ver a fila.' }}</p>
                </article>

                <article class="metric-card">
                  <span class="label inner">Cardapio</span>
                  <strong class="metric-value">{{ selectedEstablishment() ? products().length : '--' }}</strong>
                  <p>{{ selectedEstablishment() ? 'Itens publicados no momento.' : 'Escolha uma loja para revisar os itens.' }}</p>
                </article>
              </div>
            </section>

            <section class="panel form-panel">
              <div class="orders-header">
                <div>
                  <p class="label">Pedidos recebidos</p>
                  <h2>{{ selectedEstablishment()?.tradeName ?? 'Selecione uma loja' }}</h2>
                </div>
                @if (selectedEstablishment()) {
                  <span class="chip alt">{{ orders().length }} pedidos</span>
                }
              </div>

              @if (selectedEstablishment(); as establishment) {
                <p class="orders-summary">Acompanhe os pedidos recebidos e avance o fluxo operacional da loja.</p>

                @if (ordersErrorMessage()) {
                  <p class="catalog-error">{{ ordersErrorMessage() }}</p>
                } @else if (isOrdersLoading()) {
                  <p>Carregando pedidos recebidos...</p>
                } @else if (orders().length === 0) {
                  <p>Nenhum pedido recebido para esta loja ainda.</p>
                } @else {
                  <div class="order-list">
                    @for (order of orders(); track order.id) {
                      <article class="order-card">
                        <div class="order-head">
                          <div>
                            <p class="label inner">Pedido #{{ shortOrderId(order.id) }}</p>
                            <strong>{{ formatPrice(order.totalAmount) }}</strong>
                          </div>
                          <span class="status-chip">{{ orderStatusLabel(order.status) }}</span>
                        </div>

                        <div class="order-meta">
                          <span>{{ paymentMethodLabel(order.paymentMethod) }}</span>
                          <span>{{ formatDateTime(order.createdAt) }}</span>
                        </div>

                        @if (order.customer; as customer) {
                          <div class="order-customer">
                            <div>
                              <p class="label inner">Cliente</p>
                              <strong>{{ customer.displayName }}</strong>
                            </div>
                            <a class="customer-contact" [href]="'mailto:' + customer.email">{{ customer.email }}</a>
                          </div>
                        }

                        <p class="order-address">Entrega em {{ formatDeliveryAddress(order.deliveryAddress) }}</p>

                        <div class="order-items">
                          @for (item of order.items; track item.productId) {
                            <div class="order-item-row">
                              <span>{{ item.quantity }}x {{ item.productName }}</span>
                              <strong>{{ formatPrice(item.lineTotal) }}</strong>
                            </div>
                          }
                        </div>

                        @if (order.paymentMethod === 'CASH_ON_DELIVERY') {
                          <p class="order-note">
                            {{ order.changeRequired ? 'Pagamento na entrega com troco solicitado.' : 'Pagamento na entrega sem troco.' }}
                          </p>
                        }

                        <div class="order-action-row">
                          @if (nextOrderActionLabel(order); as actionLabel) {
                            <button
                              type="button"
                              class="primary-link"
                              (click)="advanceOrder(order)"
                              [disabled]="pendingOrderActionId() === order.id"
                            >
                              {{ pendingOrderActionId() === order.id ? 'Atualizando...' : actionLabel }}
                            </button>
                          } @else {
                            <span class="order-finished">Fluxo encerrado neste pedido.</span>
                          }
                        </div>
                      </article>
                    }
                  </div>
                }
              } @else {
                <p class="orders-summary">Escolha um estabelecimento para acompanhar os pedidos recebidos.</p>
              }
            </section>

            <section class="panel catalog-panel">
              <div class="section-heading catalog-heading">
                <div>
                  <p class="label">Cardapio</p>
                  <h2>{{ selectedEstablishment()?.tradeName ?? 'Selecione uma loja' }}</h2>
                  <p class="catalog-copy">
                    @if (selectedEstablishment()) {
                      Gerencie os produtos publicados, altere o formato de visualizacao e retire itens da vitrine sem
                      apagar o historico.
                    } @else {
                      Escolha uma loja para visualizar e administrar os produtos cadastrados.
                    }
                  </p>
                </div>

                <div class="catalog-actions">
                  <div class="view-toggle" role="group" aria-label="Modo de exibicao do catalogo">
                    <button
                      type="button"
                      class="view-toggle-button"
                      [class.active]="catalogViewMode() === 'cards'"
                      aria-label="Exibir produtos em cards"
                      (click)="setCatalogView('cards')"
                    >
                      <span class="view-icon grid" aria-hidden="true"></span>
                    </button>

                    <button
                      type="button"
                      class="view-toggle-button"
                      [class.active]="catalogViewMode() === 'list'"
                      aria-label="Exibir produtos em lista"
                      (click)="setCatalogView('list')"
                    >
                      <span class="view-icon list" aria-hidden="true"></span>
                    </button>
                  </div>

                  <button type="button" class="primary-link" (click)="openCreateProductModal()" [disabled]="!selectedEstablishment()">
                    Novo produto
                  </button>
                </div>
              </div>

              @if (selectedEstablishment()) {
                <div class="catalog-status-strip">
                  <span class="chip alt">{{ products().length }} itens no historico</span>
                  <span class="chip">{{ activeProductsCount() }} ativos</span>
                  <span class="chip neutral">{{ inactiveProductsCount() }} fora da vitrine</span>
                </div>
              }

              @if (!selectedEstablishment()) {
                <div class="empty-box">
                  <p>Selecione uma loja para abrir o gerenciamento do cardapio.</p>
                </div>
              } @else if (isProductsLoading()) {
                <div class="empty-box">
                  <p>Atualizando produtos da loja selecionada...</p>
                </div>
              } @else if (orderedProducts().length === 0) {
                <div class="empty-box catalog-empty-box">
                  <p>Esta loja ainda nao tem produtos cadastrados.</p>
                  <button type="button" class="primary-link" (click)="openCreateProductModal()">Adicionar primeiro produto</button>
                </div>
              } @else if (catalogViewMode() === 'cards') {
                <div class="merchant-product-grid">
                  @for (product of orderedProducts(); track product.id) {
                    <article class="merchant-product-card" [class.inactive]="!product.available">
                      <img class="merchant-product-image" [src]="product.imageUrl" [alt]="product.name" loading="lazy" />

                      <div class="merchant-product-copy">
                        <div class="card-head">
                          <div>
                            <p class="label inner">{{ productCategoryName(product.category) }}</p>
                            <h3>{{ product.name }}</h3>
                          </div>
                          <span class="status-chip" [class.neutral-status]="!product.available">
                            {{ product.available ? 'Ativo' : 'No historico' }}
                          </span>
                        </div>

                        <p>{{ product.description }}</p>

                        <div class="merchant-product-meta">
                          <strong>{{ formatPrice(product.price) }}</strong>
                          <span>Atualizado em {{ formatDateTime(product.updatedAt) }}</span>
                        </div>

                        <div class="product-admin-actions">
                          <button type="button" class="secondary-button" (click)="openEditProductModal(product)">Editar</button>
                          <button
                            type="button"
                            class="ghost-danger-button"
                            (click)="deactivateProduct(product)"
                            [disabled]="!product.available || pendingProductActionId() === product.id"
                          >
                            {{ pendingProductActionId() === product.id ? 'Removendo...' : product.available ? 'Excluir' : 'No historico' }}
                          </button>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <div class="merchant-product-list">
                  @for (product of orderedProducts(); track product.id) {
                    <article class="merchant-product-row" [class.inactive]="!product.available">
                      <div class="merchant-product-row-main">
                        <div class="merchant-product-row-head">
                          <div>
                            <p class="label inner">{{ productCategoryName(product.category) }}</p>
                            <h3>{{ product.name }}</h3>
                          </div>
                          <span class="status-chip" [class.neutral-status]="!product.available">
                            {{ product.available ? 'Ativo' : 'No historico' }}
                          </span>
                        </div>

                        <p>{{ product.description }}</p>

                        <div class="merchant-product-meta list-meta">
                          <strong>{{ formatPrice(product.price) }}</strong>
                          <span>Atualizado em {{ formatDateTime(product.updatedAt) }}</span>
                        </div>
                      </div>

                      <div class="product-admin-actions row-actions">
                        <button type="button" class="secondary-button" (click)="openEditProductModal(product)">Editar</button>
                        <button
                          type="button"
                          class="ghost-danger-button"
                          (click)="deactivateProduct(product)"
                          [disabled]="!product.available || pendingProductActionId() === product.id"
                        >
                          {{ pendingProductActionId() === product.id ? 'Removendo...' : product.available ? 'Excluir' : 'No historico' }}
                        </button>
                      </div>
                    </article>
                  }
                </div>
              }
            </section>

            <details class="panel secondary-workflow" [attr.open]="establishments().length === 0 ? '' : null">
              <summary class="workflow-summary">
                <div>
                  <p class="label">Expansao</p>
                  <h2>Cadastrar nova loja</h2>
                </div>
                <span class="chip">{{ establishments().length }} lojas</span>
              </summary>

              <p class="helper-text secondary-copy">
                Abra uma nova unidade quando precisar ampliar a operacao. CNPJ ja cadastrado na base e recusado
                automaticamente.
              </p>

              <form class="form-panel secondary-workflow-form" [formGroup]="establishmentForm" (ngSubmit)="submitEstablishment()">
                <div class="form-grid">
                  <label>
                    <span>Nome fantasia</span>
                    <input formControlName="tradeName" placeholder="Ex.: Lanche Bom" />
                    @if (establishmentFieldInvalid('tradeName')) {
                      <small>Informe o nome fantasia.</small>
                    }
                  </label>

                  <label>
                    <span>Razao social</span>
                    <input formControlName="corporateName" placeholder="Ex.: Lanche Bom LTDA" />
                    @if (establishmentFieldInvalid('corporateName')) {
                      <small>Informe a razao social.</small>
                    }
                  </label>

                  <label>
                    <span>CNPJ</span>
                    <input
                      formControlName="cnpj"
                      inputmode="numeric"
                      maxlength="18"
                      placeholder="Ex.: 12.345.678/0001-90"
                      (input)="applyEstablishmentMask('cnpj')"
                    />
                    @if (establishmentFieldInvalid('cnpj')) {
                      <small>{{ establishmentForm.controls.cnpj.hasError('duplicated') ? 'Este CNPJ ja esta cadastrado na base.' : 'Informe um CNPJ valido.' }}</small>
                    }
                  </label>

                  <label>
                    <span>Telefone</span>
                    <input
                      formControlName="phone"
                      inputmode="tel"
                      autocomplete="tel-national"
                      maxlength="15"
                      placeholder="Ex.: (11) 99999-9999"
                      (input)="applyEstablishmentMask('phone')"
                    />
                    @if (establishmentFieldInvalid('phone')) {
                      <small>Informe um telefone com DDD.</small>
                    }
                  </label>

                  <label>
                    <span>E-mail</span>
                    <input formControlName="email" type="email" placeholder="contato@loja.com" />
                    @if (establishmentFieldInvalid('email')) {
                      <small>Informe um e-mail valido.</small>
                    }
                  </label>

                  <label>
                    <span>Categoria</span>
                    <select formControlName="category">
                      @for (category of categories; track category.value) {
                        <option [value]="category.value">{{ category.label }}</option>
                      }
                    </select>
                  </label>

                  <label class="full-width">
                    <span>Horario de funcionamento</span>
                    <input formControlName="openingHours" placeholder="Ex.: Seg-Dom 18:00-23:30" />
                    @if (establishmentFieldInvalid('openingHours')) {
                      <small>Informe o horario de funcionamento.</small>
                    }
                  </label>
                </div>

                <div class="section-heading secondary">
                  <div>
                    <p class="label">Endereco</p>
                    <h2>Dados de operacao</h2>
                  </div>
                </div>

                <div class="form-grid">
                  <label>
                    <span class="field-label">CEP <span class="required-indicator" aria-hidden="true">*</span></span>
                    <input
                      formControlName="zipCode"
                      inputmode="numeric"
                      autocomplete="postal-code"
                      maxlength="9"
                      placeholder="Ex.: 01310-930"
                      (input)="applyEstablishmentMask('zipCode')"
                      (blur)="lookupZipCode()"
                    />
                    @if (establishmentFieldInvalid('zipCode')) {
                      <small>Informe um CEP com 8 digitos.</small>
                    }
                  </label>

                  <label>
                    <span class="field-label">Rua <span class="required-indicator" aria-hidden="true">*</span></span>
                    <input formControlName="street" placeholder="Rua ou avenida" />
                    @if (establishmentFieldInvalid('street')) {
                      <small>Informe a rua.</small>
                    }
                  </label>

                  <label>
                    <span class="field-label">Numero <span class="required-indicator" aria-hidden="true">*</span></span>
                    <input formControlName="number" placeholder="Numero" />
                    @if (establishmentFieldInvalid('number')) {
                      <small>Informe o numero.</small>
                    }
                  </label>

                  <label>
                    <span class="field-label">Bairro <span class="required-indicator" aria-hidden="true">*</span></span>
                    <input formControlName="district" placeholder="Bairro" />
                    @if (establishmentFieldInvalid('district')) {
                      <small>Informe o bairro.</small>
                    }
                  </label>

                  <label>
                    <span class="field-label">Cidade <span class="required-indicator" aria-hidden="true">*</span></span>
                    <input formControlName="city" placeholder="Cidade" />
                    @if (establishmentFieldInvalid('city')) {
                      <small>Informe a cidade.</small>
                    }
                  </label>

                  <label>
                    <span class="field-label">UF <span class="required-indicator" aria-hidden="true">*</span></span>
                    <input formControlName="state" maxlength="2" placeholder="SP" (input)="applyEstablishmentMask('state')" />
                    @if (establishmentFieldInvalid('state')) {
                      <small>Informe a UF com 2 letras.</small>
                    }
                  </label>

                  <label class="full-width">
                    <span>Complemento</span>
                    <input formControlName="complement" placeholder="Opcional" />
                  </label>
                </div>

                <p class="helper-text">
                  Ao informar o CEP, tentamos preencher rua, bairro, cidade e UF automaticamente. Numero e
                  complemento seguem manuais.
                </p>

                @if (isZipCodeLookupLoading()) {
                  <section class="feedback info">Consultando CEP no ViaCEP...</section>
                } @else if (zipCodeLookupMessage()) {
                  <section
                    class="feedback"
                    [class.error]="zipCodeLookupKind() === 'error'"
                    [class.success]="zipCodeLookupKind() === 'success'"
                  >
                    {{ zipCodeLookupMessage() }}
                  </section>
                }

                <button class="submit-button" type="submit" [disabled]="isSubmittingEstablishment()">
                  {{ isSubmittingEstablishment() ? 'Cadastrando...' : 'Cadastrar estabelecimento' }}
                </button>
              </form>
            </details>
          </div>

          <aside class="panel side-panel">
            <div class="side-header">
              <div>
                <p class="label">Sessao ativa</p>
                <h2>{{ currentAccount()?.displayName }}</h2>
              </div>

              <button type="button" class="secondary-button" (click)="reloadWorkspace()" [disabled]="isCatalogLoading()">
                {{ isCatalogLoading() ? 'Atualizando...' : 'Atualizar' }}
              </button>
            </div>

            <p class="session-email">{{ currentAccount()?.email }}</p>

            <div>
              <p class="label section-gap">Minhas lojas</p>

              @if (catalogErrorMessage()) {
                <p class="catalog-error">{{ catalogErrorMessage() }}</p>
              } @else if (isCatalogLoading()) {
                <p>Carregando estabelecimentos...</p>
              } @else if (establishments().length === 0) {
                <p>Nenhuma loja cadastrada para esta conta.</p>
              } @else {
                <div class="selection-list">
                  @for (establishment of establishments(); track establishment.id) {
                    <button
                      type="button"
                      class="selection-item"
                      [class.active]="establishment.id === selectedEstablishmentId()"
                      (click)="selectEstablishment(establishment.id)"
                    >
                      <strong>{{ establishment.tradeName }}</strong>
                      <span>{{ establishment.address.city }}/{{ establishment.address.state }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <div>
              <p class="label section-gap">Resumo do cardapio</p>

              @if (selectedEstablishment(); as establishment) {
                <h2>{{ establishment.tradeName }}</h2>
                <p>{{ activeProductsCount() }} itens ativos e {{ inactiveProductsCount() }} mantidos no historico.</p>

                @if (orderedProducts().length === 0) {
                  <p>Cadastre o primeiro produto para iniciar o catalogo desta loja.</p>
                } @else {
                  <div class="product-preview-list">
                    @for (product of orderedProducts().slice(0, 3); track product.id) {
                      <article class="product-preview" [class.inactive-preview]="!product.available">
                        <div>
                          <p class="label inner">{{ productCategoryName(product.category) }}</p>
                          <strong>{{ product.name }}</strong>
                        </div>
                        <span>{{ product.available ? 'Ativo' : 'Historico' }}</span>
                      </article>
                    }
                  </div>
                }
              } @else {
                <h2>Selecione uma loja</h2>
                <p>Escolha um estabelecimento para abrir o resumo do catalogo.</p>
              }
            </div>

            <a routerLink="/cliente" class="secondary-link">Abrir area do cliente</a>
          </aside>
        </section>
      }

      @if (isProductModalOpen()) {
        <section class="modal-shell" role="dialog" aria-modal="true" (click)="closeProductModal()">
          <article class="modal-card" (click)="$event.stopPropagation()">
            <div class="section-heading">
              <div>
                <p class="label">{{ productModalMode() === 'create' ? 'Novo item' : 'Editar item' }}</p>
                <h2>{{ productModalMode() === 'create' ? 'Adicionar produto' : 'Editar produto' }}</h2>
                <p>{{ selectedEstablishment()?.tradeName ?? 'Loja nao selecionada' }}</p>
              </div>

              <button type="button" class="secondary-button" (click)="closeProductModal()">Fechar</button>
            </div>

            <form class="form-panel modal-form" [formGroup]="productForm" (ngSubmit)="submitProduct()">
              <div class="form-grid">
                <label>
                  <span>Nome do item</span>
                  <input formControlName="name" placeholder="Ex.: X-Burger" />
                  @if (productFieldInvalid('name')) {
                    <small>Informe o nome do produto.</small>
                  }
                </label>

                <label>
                  <span>Categoria</span>
                  <select formControlName="category">
                    @for (category of productCategories; track category.value) {
                      <option [value]="category.value">{{ category.label }}</option>
                    }
                  </select>
                </label>

                <label class="full-width">
                  <span>Descricao</span>
                  <input formControlName="description" placeholder="Detalhe ingredientes, tamanho ou porcao" />
                  @if (productFieldInvalid('description')) {
                    <small>Informe a descricao do produto.</small>
                  }
                </label>

                <label>
                  <span>Preco</span>
                  <input formControlName="price" type="number" min="0.01" step="0.01" placeholder="32.90" />
                  @if (productFieldInvalid('price')) {
                    <small>Informe um preco maior que zero.</small>
                  }
                </label>

                <label>
                  <span>Imagem</span>
                  <input formControlName="imageUrl" placeholder="https://.../produto.jpg" />
                  @if (productFieldInvalid('imageUrl')) {
                    <small>Informe a URL da imagem.</small>
                  }
                </label>

                <label class="toggle-field full-width">
                  <input formControlName="available" type="checkbox" />
                  <span>Disponivel para venda agora</span>
                </label>
              </div>

              <div class="modal-actions">
                <button type="button" class="secondary-button" (click)="closeProductModal()">Cancelar</button>
                <button class="submit-button" type="submit" [disabled]="isSubmittingProduct()">
                  {{
                    isSubmittingProduct()
                      ? productModalMode() === 'create'
                        ? 'Salvando...'
                        : 'Atualizando...'
                      : productModalMode() === 'create'
                        ? 'Salvar produto'
                        : 'Atualizar produto'
                  }}
                </button>
              </div>
            </form>
          </article>
        </section>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      padding: 24px;
    }

    .page-shell {
      max-width: 1120px;
      margin: 0 auto;
      display: grid;
      gap: 20px;
    }

    .back-link {
      width: fit-content;
      text-decoration: none;
      color: #1d5c46;
      font-weight: 700;
    }

    .hero-card,
    .panel {
      border-radius: 24px;
      padding: 24px;
      background: rgba(255, 251, 245, 0.88);
      border: 1px solid rgba(23, 49, 38, 0.08);
      box-shadow: 0 20px 48px rgba(70, 56, 33, 0.1);
    }

    .hero-card {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
      gap: 20px;
      background: linear-gradient(135deg, rgba(213, 239, 226, 0.96), rgba(249, 253, 250, 0.92));
    }

    .eyebrow,
    .label {
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.78rem;
      font-weight: 700;
      color: #1d5c46;
    }

    h1,
    h2 {
      margin: 0 0 12px;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      color: #173126;
      line-height: 1;
    }

    h1 {
      font-size: clamp(2.3rem, 5vw, 4.2rem);
      max-width: 9ch;
    }

    h2 {
      font-size: 1.8rem;
    }

    p {
      margin: 0;
      color: #3f5144;
      line-height: 1.6;
    }

    .mini-board {
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .mini-board span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.72);
      color: #173126;
      font-weight: 700;
      text-align: center;
      padding: 0 14px;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
      gap: 20px;
      align-items: start;
    }

    .operations-panel {
      display: grid;
      gap: 18px;
      background: linear-gradient(145deg, rgba(244, 250, 247, 0.96), rgba(255, 251, 245, 0.9));
    }

    .operations-copy {
      font-size: 1rem;
    }

    .operations-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .catalog-panel {
      display: grid;
      gap: 18px;
    }

    .catalog-heading {
      align-items: flex-start;
    }

    .catalog-copy {
      max-width: 62ch;
    }

    .catalog-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .view-toggle {
      display: inline-flex;
      gap: 8px;
      padding: 4px;
      border-radius: 999px;
      background: rgba(23, 49, 38, 0.08);
    }

    .view-toggle-button {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 999px;
      background: transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .view-toggle-button.active {
      background: #173126;
    }

    .view-icon {
      display: block;
      width: 18px;
      height: 18px;
    }

    .view-icon.grid {
      background:
        linear-gradient(#173126 0 0) left top / 7px 7px no-repeat,
        linear-gradient(#173126 0 0) right top / 7px 7px no-repeat,
        linear-gradient(#173126 0 0) left bottom / 7px 7px no-repeat,
        linear-gradient(#173126 0 0) right bottom / 7px 7px no-repeat;
    }

    .view-toggle-button.active .view-icon.grid {
      background:
        linear-gradient(#f7f1e6 0 0) left top / 7px 7px no-repeat,
        linear-gradient(#f7f1e6 0 0) right top / 7px 7px no-repeat,
        linear-gradient(#f7f1e6 0 0) left bottom / 7px 7px no-repeat,
        linear-gradient(#f7f1e6 0 0) right bottom / 7px 7px no-repeat;
    }

    .view-icon.list {
      background:
        linear-gradient(#173126 0 0) center top / 18px 3px no-repeat,
        linear-gradient(#173126 0 0) center / 18px 3px no-repeat,
        linear-gradient(#173126 0 0) center bottom / 18px 3px no-repeat;
    }

    .view-toggle-button.active .view-icon.list {
      background:
        linear-gradient(#f7f1e6 0 0) center top / 18px 3px no-repeat,
        linear-gradient(#f7f1e6 0 0) center / 18px 3px no-repeat,
        linear-gradient(#f7f1e6 0 0) center bottom / 18px 3px no-repeat;
    }

    .catalog-status-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .chip.neutral {
      background: rgba(68, 82, 71, 0.1);
      color: #445247;
    }

    .metric-card {
      display: grid;
      gap: 8px;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(23, 49, 38, 0.08);
      background: rgba(255, 255, 255, 0.74);
    }

    .metric-value {
      color: #173126;
      font-size: clamp(1.8rem, 3vw, 2.4rem);
      line-height: 1;
    }

    .feedback {
      padding: 14px 18px;
      border-radius: 18px;
      font-weight: 600;
    }

    .success {
      background: rgba(29, 92, 70, 0.1);
      color: #1d5c46;
      border: 1px solid rgba(29, 92, 70, 0.18);
    }

    .error {
      background: rgba(161, 49, 49, 0.1);
      color: #7a1f1f;
      border: 1px solid rgba(161, 49, 49, 0.18);
    }

    .access {
      background: rgba(24, 68, 102, 0.1);
      color: #144466;
      border: 1px solid rgba(24, 68, 102, 0.18);
    }

    .info {
      background: rgba(125, 79, 47, 0.1);
      color: #7d4f2f;
      border: 1px solid rgba(125, 79, 47, 0.18);
    }

    .form-stack,
    .form-panel,
    .side-panel {
      display: grid;
      gap: 20px;
    }

    .secondary-workflow {
      padding: 0;
      overflow: hidden;
    }

    .secondary-workflow[open] .workflow-summary {
      border-bottom: 1px solid rgba(23, 49, 38, 0.08);
    }

    .secondary-copy,
    .secondary-workflow-form {
      padding-left: 24px;
      padding-right: 24px;
    }

    .secondary-copy {
      padding-top: 20px;
    }

    .secondary-workflow-form {
      padding-bottom: 24px;
    }

    .workflow-summary {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      cursor: pointer;
      list-style: none;
      padding: 24px;
    }

    .workflow-summary::-webkit-details-marker {
      display: none;
    }

    .workflow-summary::after {
      content: 'Expandir';
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #7d4f2f;
    }

    .secondary-workflow[open] .workflow-summary::after {
      content: 'Recolher';
    }

    .section-heading,
    .side-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .secondary {
      padding-top: 8px;
      border-top: 1px solid rgba(23, 49, 38, 0.08);
    }

    .blocked-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .chip,
    .primary-link,
    .secondary-link,
    .secondary-button,
    .submit-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      min-height: 44px;
      padding: 0 18px;
      font-weight: 700;
      text-decoration: none;
      font: inherit;
    }

    .chip {
      min-height: 36px;
      padding: 0 14px;
      background: rgba(29, 92, 70, 0.12);
      color: #1d5c46;
    }

    .chip.alt {
      background: rgba(125, 79, 47, 0.1);
      color: #7d4f2f;
    }

    .primary-link {
      border: none;
      background: #173126;
      color: #f7f1e6;
      cursor: pointer;
    }

    .secondary-link,
    .secondary-button {
      border: none;
      background: rgba(23, 49, 38, 0.08);
      color: #173126;
      cursor: pointer;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    label {
      display: grid;
      gap: 8px;
      color: #173126;
      font-weight: 600;
    }

    label span {
      font-size: 0.95rem;
    }

    .field-label {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .required-indicator {
      color: #b42318;
      font-weight: 800;
      line-height: 1;
    }

    input,
    select {
      min-height: 48px;
      border-radius: 16px;
      border: 1px solid rgba(23, 49, 38, 0.14);
      background: rgba(255, 255, 255, 0.78);
      padding: 0 14px;
      font: inherit;
      color: #173126;
    }

    input:focus,
    select:focus {
      outline: 2px solid rgba(29, 92, 70, 0.18);
      border-color: #1d5c46;
    }

    small {
      color: #9a3030;
      font-weight: 600;
    }

    .helper-text {
      font-size: 0.95rem;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .submit-button {
      border: none;
      background: #173126;
      color: #f7f1e6;
      cursor: pointer;
    }

    .submit-button[disabled],
    .secondary-button[disabled],
    .primary-link[disabled] {
      opacity: 0.7;
      cursor: progress;
    }

    .toggle-field {
      grid-template-columns: auto 1fr;
      align-items: center;
    }

    .toggle-field input {
      min-height: auto;
      width: 18px;
      height: 18px;
      margin: 0;
    }

    .empty-box {
      padding: 18px;
      border-radius: 18px;
      background: rgba(125, 79, 47, 0.08);
      color: #6b4630;
    }

    .catalog-empty-box {
      display: grid;
      gap: 12px;
      justify-items: start;
    }

    .session-email {
      font-weight: 600;
    }

    .selection-list,
    .product-preview-list,
    .order-list,
    .merchant-product-list {
      display: grid;
      gap: 12px;
    }

    .selection-item,
    .product-preview {
      display: grid;
      gap: 6px;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid rgba(23, 49, 38, 0.08);
      background: rgba(255, 255, 255, 0.68);
    }

    .selection-item {
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: #173126;
    }

    .selection-item span,
    .product-preview span {
      color: #3f5144;
    }

    .selection-item.active {
      border-color: rgba(29, 92, 70, 0.24);
      background: rgba(213, 239, 226, 0.72);
    }

    .product-preview {
      grid-template-columns: 1fr auto;
      align-items: center;
    }

    .inactive-preview {
      opacity: 0.72;
    }

    .merchant-product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .merchant-product-card,
    .merchant-product-row {
      border-radius: 18px;
      border: 1px solid rgba(23, 49, 38, 0.08);
      background: rgba(255, 255, 255, 0.74);
    }

    .merchant-product-card {
      display: grid;
      overflow: hidden;
    }

    .merchant-product-card.inactive,
    .merchant-product-row.inactive {
      opacity: 0.76;
    }

    .merchant-product-image {
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      background: rgba(23, 49, 38, 0.06);
    }

    .merchant-product-copy,
    .merchant-product-row-main {
      display: grid;
      gap: 12px;
      padding: 18px;
    }

    .merchant-product-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      color: #445247;
      font-size: 0.92rem;
    }

    .merchant-product-meta strong {
      color: #173126;
      font-size: 1rem;
    }

    .merchant-product-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px;
    }

    .merchant-product-row-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }

    .list-meta {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .product-admin-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .row-actions {
      justify-content: flex-end;
      align-self: stretch;
      align-items: center;
    }

    .ghost-danger-button {
      border: 1px solid rgba(161, 49, 49, 0.18);
      background: rgba(161, 49, 49, 0.08);
      color: #7a1f1f;
      border-radius: 999px;
      min-height: 44px;
      padding: 0 18px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .ghost-danger-button[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .orders-header,
    .order-head,
    .order-meta,
    .order-item-row,
    .order-action-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .orders-summary {
      margin-bottom: 12px;
    }

    .order-card {
      display: grid;
      gap: 12px;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(23, 49, 38, 0.08);
      background: rgba(255, 255, 255, 0.72);
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(29, 92, 70, 0.12);
      color: #1d5c46;
      font-size: 0.84rem;
      font-weight: 700;
      text-align: center;
    }

    .status-chip.neutral-status {
      background: rgba(68, 82, 71, 0.12);
      color: #445247;
    }

    .order-meta,
    .order-customer,
    .order-address,
    .order-note,
    .order-finished {
      color: #3f5144;
      font-size: 0.95rem;
    }

    .order-meta,
    .order-item-row {
      font-size: 0.92rem;
    }

    .order-customer {
      display: grid;
      gap: 6px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(29, 92, 70, 0.08);
    }

    .order-customer strong {
      color: #173126;
    }

    .customer-contact {
      color: #1d5c46;
      font-weight: 600;
      text-decoration: none;
      word-break: break-word;
    }

    .customer-contact:hover {
      text-decoration: underline;
    }

    .order-items {
      display: grid;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid rgba(23, 49, 38, 0.08);
    }

    .order-item-row strong,
    .order-head strong {
      color: #173126;
    }

    .inner {
      margin-bottom: 6px;
    }

    .catalog-error {
      color: #7a1f1f;
      font-weight: 600;
    }

    .section-gap {
      margin-bottom: 12px;
    }

    .blocked-panel {
      display: grid;
      gap: 16px;
      max-width: 760px;
    }

    .modal-shell {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(19, 32, 26, 0.42);
      backdrop-filter: blur(6px);
    }

    .modal-card {
      width: min(100%, 760px);
      max-height: calc(100vh - 48px);
      overflow: auto;
      border-radius: 24px;
      padding: 24px;
      background: rgba(255, 251, 245, 0.98);
      border: 1px solid rgba(23, 49, 38, 0.08);
      box-shadow: 0 24px 70px rgba(23, 49, 38, 0.18);
    }

    .modal-form {
      margin-top: 20px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    @media (max-width: 900px) {
      .hero-card,
      .layout-grid,
      .form-grid,
      .operations-metrics {
        grid-template-columns: 1fr;
      }

      .section-heading,
      .side-header,
      .catalog-heading,
      .orders-header,
      .order-head,
      .order-meta,
      .order-item-row,
      .order-action-row,
      .merchant-product-meta,
      .merchant-product-row,
      .merchant-product-row-head,
      .modal-actions {
        align-items: flex-start;
        flex-direction: column;
      }

      .catalog-actions,
      .row-actions {
        justify-content: flex-start;
      }
    }
  `
})
export class MerchantHomePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly feedbackModal = inject(FeedbackModalService);
  private readonly authSession = inject(AuthSessionService);
  private readonly establishmentApi = inject(EstablishmentApi);
  private readonly orderApi = inject(OrderApi);
  private readonly productApi = inject(ProductApi);
  private readonly viaCepApi = inject(ViaCepApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = establishmentCategoryOptions;
  readonly productCategories = productCategoryOptions;
  readonly isWorkspaceLoading = signal(true);
  readonly isSubmittingEstablishment = signal(false);
  readonly isSubmittingProduct = signal(false);
  readonly isCatalogLoading = signal(false);
  readonly isProductsLoading = signal(false);
  readonly isOrdersLoading = signal(false);
  readonly establishmentSuccessMessage = signal('');
  readonly establishmentErrorMessage = signal('');
  readonly productSuccessMessage = signal('');
  readonly productErrorMessage = signal('');
  readonly orderSuccessMessage = signal('');
  readonly orderErrorMessage = signal('');
  readonly catalogErrorMessage = signal('');
  readonly ordersErrorMessage = signal('');
  readonly accessMessage = signal('');
  readonly zipCodeLookupMessage = signal('');
  readonly zipCodeLookupKind = signal<'error' | 'success'>('success');
  readonly isZipCodeLookupLoading = signal(false);
  readonly pendingOrderActionId = signal<string | null>(null);
  readonly pendingProductActionId = signal<string | null>(null);
  readonly isProductModalOpen = signal(false);
  readonly productModalMode = signal<'create' | 'edit'>('create');
  readonly editingProductId = signal<string | null>(null);
  readonly catalogViewMode = signal<'cards' | 'list'>('cards');
  readonly currentAccount = this.authSession.currentAccount;
  readonly isSessionBusy = this.authSession.isLoading;
  readonly establishments = signal<Establishment[]>([]);
  readonly selectedEstablishmentId = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly canManageCatalog = computed(() => this.currentAccount()?.profile === 'MERCHANT');
  readonly activeProductsCount = computed(() => this.products().filter((product) => product.available).length);
  readonly inactiveProductsCount = computed(() => this.products().filter((product) => !product.available).length);
  readonly orderedProducts = computed(() =>
    [...this.products()].sort(
      (left, right) => Number(right.available) - Number(left.available) || left.name.localeCompare(right.name, 'pt-BR')
    )
  );
  readonly selectedEstablishment = computed(
    () => this.establishments().find((establishment) => establishment.id === this.selectedEstablishmentId()) ?? null
  );

  readonly establishmentForm = this.formBuilder.nonNullable.group({
    tradeName: [initialEstablishmentFormValue.tradeName, [Validators.required]],
    corporateName: [initialEstablishmentFormValue.corporateName, [Validators.required]],
    cnpj: [initialEstablishmentFormValue.cnpj, [Validators.required, Validators.pattern(cnpjPattern)]],
    phone: [initialEstablishmentFormValue.phone, [Validators.required, Validators.pattern(phonePattern)]],
    email: [initialEstablishmentFormValue.email, [Validators.required, Validators.email]],
    category: [initialEstablishmentFormValue.category, [Validators.required]],
    openingHours: [initialEstablishmentFormValue.openingHours, [Validators.required]],
    zipCode: [initialEstablishmentFormValue.zipCode, [Validators.required, Validators.pattern(zipCodePattern)]],
    street: [initialEstablishmentFormValue.street, [Validators.required]],
    number: [initialEstablishmentFormValue.number, [Validators.required]],
    district: [initialEstablishmentFormValue.district, [Validators.required]],
    city: [initialEstablishmentFormValue.city, [Validators.required]],
    state: [initialEstablishmentFormValue.state, [Validators.required, Validators.pattern(stateCodePattern)]],
    complement: [initialEstablishmentFormValue.complement]
  });

  readonly productForm = this.formBuilder.nonNullable.group({
    name: [initialProductFormValue.name, [Validators.required]],
    description: [initialProductFormValue.description, [Validators.required]],
    category: [initialProductFormValue.category, [Validators.required]],
    price: [initialProductFormValue.price, [Validators.required, Validators.min(0.01)]],
    imageUrl: [initialProductFormValue.imageUrl, [Validators.required]],
    available: [initialProductFormValue.available]
  });

  constructor() {
    this.establishmentForm.controls.cnpj.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearDuplicatedCnpjError();
    });

    this.establishmentForm.controls.zipCode.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearZipCodeLookupFeedback();
    });

    this.loadWorkspace();
  }

  reloadWorkspace() {
    this.loadWorkspace(this.selectedEstablishmentId() ?? undefined);
  }

  loginAsMerchant() {
    this.authSession.loginAs('MERCHANT', '/estabelecimento');
  }

  logout() {
    void this.authSession.logout();
  }

  applyEstablishmentMask(field: EstablishmentMaskedField) {
    switch (field) {
      case 'cnpj':
        this.updateEstablishmentMaskedField(field, formatCnpj);
        return;
      case 'phone':
        this.updateEstablishmentMaskedField(field, formatPhoneNumber);
        return;
      case 'zipCode':
        this.updateEstablishmentMaskedField(field, formatZipCode);
        return;
      case 'state':
        this.updateEstablishmentMaskedField(field, formatStateCode);
        return;
    }
  }

  submitEstablishment() {
    if (!this.canManageCatalog()) {
      this.setEstablishmentError('Entre com uma conta de lojista para cadastrar estabelecimentos.');
      return;
    }

    if (this.establishmentForm.invalid) {
      this.establishmentForm.markAllAsTouched();
      return;
    }

    this.isSubmittingEstablishment.set(true);
    this.establishmentSuccessMessage.set('');
    this.establishmentErrorMessage.set('');

    this.establishmentApi
      .create(this.toEstablishmentRequest())
      .pipe(
        finalize(() => this.isSubmittingEstablishment.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (establishment) => {
          this.setEstablishmentSuccess(`${establishment.tradeName} cadastrado com sucesso e pronto para receber produtos.`);
          this.establishmentForm.reset(initialEstablishmentFormValue);
          this.clearZipCodeLookupFeedback();
          this.loadEstablishments(establishment.id);
        },
        error: (error: unknown) => {
          const message = readApiErrorMessage(error, 'Nao foi possivel cadastrar o estabelecimento agora.');
          if (this.isDuplicatedCnpjMessage(message)) {
            this.markDuplicatedCnpjError();
          }
          this.setEstablishmentError(message);
        }
      });
  }

  submitProduct() {
    if (!this.canManageCatalog()) {
      this.setProductError('Entre com uma conta de lojista para publicar produtos.');
      return;
    }

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const establishmentId = this.selectedEstablishmentId();
    if (!establishmentId) {
      this.setProductError('Selecione um estabelecimento para publicar o produto.');
      return;
    }

    this.isSubmittingProduct.set(true);
    this.productSuccessMessage.set('');
    this.productErrorMessage.set('');

    const productId = this.editingProductId();
    const request = this.toProductRequest();
    const action = productId
      ? this.productApi.update(establishmentId, productId, request)
      : this.productApi.create(establishmentId, request);

    action
      .pipe(
        finalize(() => this.isSubmittingProduct.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (product) => {
          this.setProductSuccess(
            productId
              ? `${product.name} atualizado com sucesso no cardapio.`
              : `${product.name} publicado com sucesso no cardapio.`
          );
          this.closeProductModal();
          this.loadProducts(establishmentId);
        },
        error: (error: unknown) => {
          this.setProductError(readApiErrorMessage(error, 'Nao foi possivel publicar o produto agora.'));
        }
      });
  }

  selectEstablishment(establishmentId: string) {
    if (!establishmentId) {
      return;
    }

    this.closeProductModal();
    this.clearOrderFeedback();
    this.selectedEstablishmentId.set(establishmentId);
    this.loadSelectedEstablishmentWorkspace(establishmentId);
  }

  setCatalogView(view: 'cards' | 'list') {
    this.catalogViewMode.set(view);
  }

  openCreateProductModal() {
    if (!this.selectedEstablishmentId()) {
      this.setProductError('Selecione um estabelecimento para cadastrar o produto.');
      return;
    }

    this.productModalMode.set('create');
    this.editingProductId.set(null);
    this.productForm.reset(initialProductFormValue);
    this.productErrorMessage.set('');
    this.isProductModalOpen.set(true);
  }

  openEditProductModal(product: Product) {
    this.productModalMode.set('edit');
    this.editingProductId.set(product.id);
    this.productForm.setValue({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
      available: product.available
    });
    this.productErrorMessage.set('');
    this.isProductModalOpen.set(true);
  }

  closeProductModal() {
    this.isProductModalOpen.set(false);
    this.productModalMode.set('create');
    this.editingProductId.set(null);
    this.productForm.reset(initialProductFormValue);
  }

  deactivateProduct(product: Product) {
    const establishmentId = this.selectedEstablishmentId();
    if (!establishmentId || !product.available) {
      return;
    }

    this.pendingProductActionId.set(product.id);
    this.productSuccessMessage.set('');
    this.productErrorMessage.set('');

    this.productApi
      .deactivate(establishmentId, product.id)
      .pipe(
        finalize(() => this.pendingProductActionId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updatedProduct) => {
          this.products.update((products) =>
            products.map((item) =>
              item.id === product.id ? { ...item, ...(updatedProduct ?? {}), available: false } : item
            )
          );
          this.setProductSuccess(`${product.name} removido da vitrine e mantido no historico.`);
        },
        error: (error: unknown) => {
          this.setProductError(readApiErrorMessage(error, 'Nao foi possivel remover o produto da vitrine agora.'));
        }
      });
  }

  lookupZipCode() {
    const zipCode = digitsOnly(this.establishmentForm.controls.zipCode.value);

    if (!zipCode) {
      this.clearZipCodeLookupFeedback();
      return;
    }

    if (zipCode.length !== 8) {
      this.establishmentForm.controls.zipCode.markAsTouched();
      return;
    }

    if (this.isZipCodeLookupLoading()) {
      return;
    }

    this.isZipCodeLookupLoading.set(true);
    this.viaCepApi
      .lookup(zipCode)
      .pipe(
        finalize(() => this.isZipCodeLookupLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (address) => {
          if (!address) {
            this.zipCodeLookupKind.set('error');
            this.zipCodeLookupMessage.set('Nao encontramos esse CEP no ViaCEP. Complete o endereco manualmente.');
            return;
          }

          this.establishmentForm.patchValue(
            {
              zipCode: formatZipCode(address.zipCode),
              street: address.street,
              district: address.district,
              city: address.city,
              state: formatStateCode(address.state)
            },
            { emitEvent: false }
          );
          this.zipCodeLookupKind.set('success');
          this.zipCodeLookupMessage.set('Rua, bairro, cidade e UF foram preenchidos pelo CEP. Confira numero e complemento.');
        },
        error: () => {
          this.zipCodeLookupKind.set('error');
          this.zipCodeLookupMessage.set('Nao foi possivel consultar o CEP agora. Confira o endereco manualmente.');
        }
      });
  }

  advanceOrder(order: Order) {
    const nextStatus = nextMerchantOrderStatus(order);

    if (!nextStatus) {
      return;
    }

    this.pendingOrderActionId.set(order.id);
    this.clearOrderFeedback();

    this.orderApi
      .updateStatus(order.id, nextStatus)
      .pipe(
        finalize(() => this.pendingOrderActionId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updatedOrder) => {
          this.setOrderSuccess(
            `Pedido #${this.shortOrderId(updatedOrder.id)} atualizado para ${this.orderStatusLabel(updatedOrder.status)}.`
          );
          this.orders.update((orders) => orders.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)));
        },
        error: (error: unknown) => {
          this.setOrderError(readApiErrorMessage(error, 'Nao foi possivel atualizar o status do pedido agora.'));
        }
      });
  }

  establishmentFieldInvalid(fieldName: EstablishmentFormField) {
    const control = this.establishmentForm.controls[fieldName];
    return control.invalid && (control.touched || control.dirty);
  }

  productFieldInvalid(fieldName: ProductFormField) {
    const control = this.productForm.controls[fieldName];
    return control.invalid && (control.touched || control.dirty);
  }

  productCategoryName(category: Product['category']) {
    return productCategoryLabels.get(category) ?? category;
  }

  paymentMethodLabel(paymentMethod: OrderPaymentMethod) {
    return paymentMethodLabels.get(paymentMethod) ?? paymentMethod;
  }

  orderStatusLabel(status: OrderStatus) {
    return describeOrderStatus(status);
  }

  nextOrderActionLabel(order: Pick<Order, 'status' | 'paymentMethod'>) {
    return nextMerchantOrderActionLabel(order);
  }

  shortOrderId(orderId: string) {
    return orderId.slice(0, 8);
  }

  formatDateTime(value: string) {
    return dateTimeFormatter.format(new Date(value));
  }

  formatDeliveryAddress(address: DeliveryAddress) {
    const streetLine = `${address.street}, ${address.number}`;
    const complement = address.complement ? ` · ${address.complement}` : '';
    return `${streetLine} - ${address.district}, ${address.city}/${address.state}${complement}`;
  }

  formatPrice(price: number) {
    return brlFormatter.format(price);
  }

  private loadWorkspace(preferredEstablishmentId?: string) {
    this.isWorkspaceLoading.set(true);
    this.accessMessage.set('');
    this.catalogErrorMessage.set('');

    this.authSession
      .refresh()
      .pipe(
        finalize(() => this.isWorkspaceLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (account) => {
          if (!account) {
            this.establishments.set([]);
            this.selectedEstablishmentId.set(null);
            this.products.set([]);
            this.orders.set([]);
            this.accessMessage.set(
              this.authSession.feedbackMessage() ||
                'Sessao de lojista necessaria para gerenciar estabelecimentos e produtos.'
            );
            return;
          }

          if (account.profile !== 'MERCHANT') {
            this.establishments.set([]);
            this.selectedEstablishmentId.set(null);
            this.products.set([]);
            this.orders.set([]);
            this.accessMessage.set('Sua sessao atual nao possui perfil de lojista.');
            return;
          }

          this.loadEstablishments(preferredEstablishmentId);
        }
      });
  }

  private loadEstablishments(preferredEstablishmentId?: string) {
    this.isCatalogLoading.set(true);
    this.catalogErrorMessage.set('');

    this.establishmentApi
      .listMine()
      .pipe(
        finalize(() => this.isCatalogLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (establishments) => {
          this.establishments.set(establishments);
          this.syncSelection(establishments, preferredEstablishmentId);
        },
        error: (error: unknown) => {
          const message = readApiErrorMessage(error, 'Nao foi possivel carregar os estabelecimentos da conta.');
          this.catalogErrorMessage.set(message);
          this.feedbackModal.showError();
          this.establishments.set([]);
          this.selectedEstablishmentId.set(null);
          this.products.set([]);
          this.orders.set([]);
        }
      });
  }

  private loadProducts(establishmentId: string) {
    this.isProductsLoading.set(true);
    this.catalogErrorMessage.set('');

    this.productApi
      .listMineByEstablishment(establishmentId)
      .pipe(
        finalize(() => this.isProductsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (products) => {
          this.products.set(products);
        },
        error: (error: unknown) => {
          this.catalogErrorMessage.set(readApiErrorMessage(error, 'Nao foi possivel carregar o cardapio agora.'));
          this.feedbackModal.showError();
          this.products.set([]);
        }
      });
  }

  private loadOrders(establishmentId: string) {
    this.isOrdersLoading.set(true);
    this.ordersErrorMessage.set('');

    this.orderApi
      .listMine(establishmentId)
      .pipe(
        finalize(() => this.isOrdersLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
        },
        error: (error: unknown) => {
          this.ordersErrorMessage.set(readApiErrorMessage(error, 'Nao foi possivel carregar os pedidos recebidos agora.'));
          this.feedbackModal.showError();
          this.orders.set([]);
        }
      });
  }

  private syncSelection(establishments: Establishment[], preferredEstablishmentId?: string) {
    if (establishments.length === 0) {
      this.closeProductModal();
      this.selectedEstablishmentId.set(null);
      this.products.set([]);
      this.orders.set([]);
      return;
    }

    const currentSelection = preferredEstablishmentId ?? this.selectedEstablishmentId();
    const selectedExists = currentSelection
      ? establishments.some((establishment) => establishment.id === currentSelection)
      : false;
    const nextSelection = selectedExists ? currentSelection : establishments[0].id;

    if (nextSelection) {
      this.selectedEstablishmentId.set(nextSelection);
      this.loadSelectedEstablishmentWorkspace(nextSelection);
    }
  }

  private loadSelectedEstablishmentWorkspace(establishmentId: string) {
    this.loadProducts(establishmentId);
    this.loadOrders(establishmentId);
  }

  private clearZipCodeLookupFeedback() {
    this.zipCodeLookupMessage.set('');
    this.zipCodeLookupKind.set('success');
  }

  private clearDuplicatedCnpjError() {
    const control = this.establishmentForm.controls.cnpj;

    if (!control.hasError('duplicated')) {
      return;
    }

    const errors = { ...(control.errors ?? {}) };
    delete errors['duplicated'];
    control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  private clearOrderFeedback() {
    this.orderSuccessMessage.set('');
    this.orderErrorMessage.set('');
  }

  private markDuplicatedCnpjError() {
    const control = this.establishmentForm.controls.cnpj;
    control.setErrors({ ...(control.errors ?? {}), duplicated: true });
    control.markAsTouched();
  }

  private isDuplicatedCnpjMessage(message: string) {
    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes('cnpj') && (normalizedMessage.includes('cadastrado') || normalizedMessage.includes('duplic'));
  }

  private setEstablishmentSuccess(message: string) {
    this.establishmentSuccessMessage.set(message);
    this.feedbackModal.showSuccess(message);
  }

  private setEstablishmentError(message: string) {
    this.establishmentErrorMessage.set(message);
    this.feedbackModal.showError();
  }

  private setProductSuccess(message: string) {
    this.productSuccessMessage.set(message);
    this.feedbackModal.showSuccess(message);
  }

  private setProductError(message: string) {
    this.productErrorMessage.set(message);
    this.feedbackModal.showError();
  }

  private setOrderSuccess(message: string) {
    this.orderSuccessMessage.set(message);
    this.feedbackModal.showSuccess(message);
  }

  private setOrderError(message: string) {
    this.orderErrorMessage.set(message);
    this.feedbackModal.showError();
  }

  private updateEstablishmentMaskedField(
    field: EstablishmentMaskedField,
    formatter: (value: string) => string
  ) {
    const control = this.establishmentForm.controls[field];
    const formattedValue = formatter(control.value);

    if (control.value !== formattedValue) {
      control.setValue(formattedValue, { emitEvent: false });
    }
  }

  private toEstablishmentRequest(): CreateEstablishmentRequest {
    const value = this.establishmentForm.getRawValue();

    return {
      tradeName: value.tradeName.trim(),
      corporateName: value.corporateName.trim(),
      cnpj: digitsOnly(value.cnpj),
      phone: digitsOnly(value.phone),
      email: value.email.trim(),
      category: value.category,
      openingHours: value.openingHours.trim(),
      address: {
        zipCode: digitsOnly(value.zipCode),
        street: value.street.trim(),
        number: value.number.trim(),
        district: value.district.trim(),
        city: value.city.trim(),
        state: formatStateCode(value.state),
        complement: value.complement.trim() || null
      }
    };
  }

  private toProductRequest(): CreateProductRequest {
    const value = this.productForm.getRawValue();

    return {
      name: value.name.trim(),
      description: value.description.trim(),
      category: value.category,
      price: Number(value.price),
      imageUrl: value.imageUrl.trim(),
      available: value.available
    };
  }
}