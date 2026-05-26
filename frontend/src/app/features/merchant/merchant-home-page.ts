import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

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
import { CreateProductRequest, Product, ProductCategory, productCategoryOptions } from '../products/product.models';
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
          <h1>Gerencie lojas e cardapio.</h1>
          <p>Use esta area para manter seus estabelecimentos e publicar produtos.</p>
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
            <form class="panel form-panel" [formGroup]="establishmentForm" (ngSubmit)="submitEstablishment()">
              <div class="section-heading">
                <div>
                  <p class="label">Cadastro</p>
                  <h2>Nova loja</h2>
                </div>
                <span class="chip">{{ establishments().length }} lojas</span>
              </div>

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
                    <small>Informe um CNPJ valido.</small>
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
                Ao informar o CEP, tentamos preencher rua, bairro, cidade e UF automaticamente. Numero e complemento
                seguem manuais.
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

            <form class="panel form-panel" [formGroup]="productForm" (ngSubmit)="submitProduct()">
              <div class="section-heading">
                <div>
                  <p class="label">Catalogo</p>
                  <h2>Novo produto</h2>
                </div>
                <span class="chip alt">{{ products().length }} itens</span>
              </div>

              @if (establishments().length === 0) {
                <div class="empty-box">
                  <p>Cadastre sua primeira loja antes de publicar produtos.</p>
                </div>
              } @else {
                <div class="form-grid">
                  <label class="full-width">
                    <span>Estabelecimento</span>
                    <select #establishmentSelect [value]="selectedEstablishmentId() ?? ''" (change)="selectEstablishment(establishmentSelect.value)">
                      @for (establishment of establishments(); track establishment.id) {
                        <option [value]="establishment.id">{{ establishment.tradeName }}</option>
                      }
                    </select>
                  </label>

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

                <button class="submit-button" type="submit" [disabled]="isSubmittingProduct()">
                  {{ isSubmittingProduct() ? 'Publicando produto...' : 'Publicar produto' }}
                </button>
              }
            </form>
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
              <p class="label section-gap">Cardapio da loja</p>

              @if (selectedEstablishment(); as establishment) {
                <h2>{{ establishment.tradeName }}</h2>
                <p>{{ establishment.openingHours }}</p>

                @if (isProductsLoading()) {
                  <p>Atualizando produtos...</p>
                } @else if (products().length === 0) {
                  <p>Esta loja ainda nao tem itens publicados.</p>
                } @else {
                  <div class="product-preview-list">
                    @for (product of products(); track product.id) {
                      <article class="product-preview">
                        <div>
                          <p class="label inner">{{ productCategoryName(product.category) }}</p>
                          <strong>{{ product.name }}</strong>
                        </div>
                        <span>{{ formatPrice(product.price) }}</span>
                      </article>
                    }
                  </div>
                }
              } @else {
                <h2>Selecione uma loja</h2>
                <p>Escolha um estabelecimento para visualizar os produtos publicados.</p>
              }
            </div>

            <div>
              <div class="orders-header">
                <p class="label section-gap">Pedidos recebidos</p>
                @if (selectedEstablishment()) {
                  <span class="chip alt">{{ orders().length }} pedidos</span>
                }
              </div>

              @if (selectedEstablishment(); as establishment) {
                <h2>{{ establishment.tradeName }}</h2>
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

                        <p class="order-address">{{ formatDeliveryAddress(order.deliveryAddress) }}</p>

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
                <h2>Selecione uma loja</h2>
                <p>Escolha um estabelecimento para acompanhar os pedidos recebidos.</p>
              }
            </div>

            <a routerLink="/cliente" class="secondary-link">Abrir area do cliente</a>
          </aside>
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

    .session-email {
      font-weight: 600;
    }

    .selection-list,
    .product-preview-list,
    .order-list {
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

    .order-meta,
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

    @media (max-width: 900px) {
      .hero-card,
      .layout-grid,
      .form-grid {
        grid-template-columns: 1fr;
      }

      .section-heading,
      .side-header,
      .orders-header,
      .order-head,
      .order-meta,
      .order-item-row,
      .order-action-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `
})
export class MerchantHomePage {
  private readonly formBuilder = inject(FormBuilder);
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
  readonly currentAccount = this.authSession.currentAccount;
  readonly isSessionBusy = this.authSession.isLoading;
  readonly establishments = signal<Establishment[]>([]);
  readonly selectedEstablishmentId = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly canManageCatalog = computed(() => this.currentAccount()?.profile === 'MERCHANT');
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
      this.establishmentErrorMessage.set('Entre com uma conta de lojista para cadastrar estabelecimentos.');
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
          this.establishmentSuccessMessage.set(
            `${establishment.tradeName} cadastrado com sucesso e pronto para receber produtos.`
          );
          this.establishmentForm.reset(initialEstablishmentFormValue);
          this.clearZipCodeLookupFeedback();
          this.loadEstablishments(establishment.id);
        },
        error: (error: unknown) => {
          this.establishmentErrorMessage.set(
            readApiErrorMessage(error, 'Nao foi possivel cadastrar o estabelecimento agora.')
          );
        }
      });
  }

  submitProduct() {
    if (!this.canManageCatalog()) {
      this.productErrorMessage.set('Entre com uma conta de lojista para publicar produtos.');
      return;
    }

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const establishmentId = this.selectedEstablishmentId();
    if (!establishmentId) {
      this.productErrorMessage.set('Selecione um estabelecimento para publicar o produto.');
      return;
    }

    this.isSubmittingProduct.set(true);
    this.productSuccessMessage.set('');
    this.productErrorMessage.set('');

    this.productApi
      .create(establishmentId, this.toProductRequest())
      .pipe(
        finalize(() => this.isSubmittingProduct.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (product) => {
          this.productSuccessMessage.set(`${product.name} publicado com sucesso no cardapio.`);
          this.productForm.reset(initialProductFormValue);
          this.loadProducts(establishmentId);
        },
        error: (error: unknown) => {
          this.productErrorMessage.set(readApiErrorMessage(error, 'Nao foi possivel publicar o produto agora.'));
        }
      });
  }

  selectEstablishment(establishmentId: string) {
    if (!establishmentId) {
      return;
    }

    this.clearOrderFeedback();
    this.selectedEstablishmentId.set(establishmentId);
    this.loadSelectedEstablishmentWorkspace(establishmentId);
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
          this.orderSuccessMessage.set(
            `Pedido #${this.shortOrderId(updatedOrder.id)} atualizado para ${this.orderStatusLabel(updatedOrder.status)}.`
          );
          this.orders.update((orders) => orders.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)));
        },
        error: (error: unknown) => {
          this.orderErrorMessage.set(readApiErrorMessage(error, 'Nao foi possivel atualizar o status do pedido agora.'));
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
      .listByEstablishment(establishmentId)
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
          this.orders.set([]);
        }
      });
  }

  private syncSelection(establishments: Establishment[], preferredEstablishmentId?: string) {
    if (establishments.length === 0) {
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

  private clearOrderFeedback() {
    this.orderSuccessMessage.set('');
    this.orderErrorMessage.set('');
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