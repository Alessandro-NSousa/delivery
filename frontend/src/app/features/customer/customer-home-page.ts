import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthSessionService } from '../account/auth-session.service';
import { CustomerCartService } from './customer-cart.service';
import { readApiErrorMessage } from '../establishments/api-error';
import { EstablishmentApi } from '../establishments/establishment-api';
import { Establishment, establishmentCategoryOptions } from '../establishments/establishment.models';
import { OrderApi } from '../orders/order-api';
import { Order, OrderPaymentMethod, paymentMethodOptions } from '../orders/order.models';
import { ProductApi } from '../products/product-api';
import { Product, productCategoryOptions } from '../products/product.models';

const establishmentCategoryLabels = new Map(establishmentCategoryOptions.map((option) => [option.value, option.label]));
const productCategoryLabels = new Map(productCategoryOptions.map((option) => [option.value, option.label]));
const paymentMethodLabels = new Map(paymentMethodOptions.map((option) => [option.value, option.label]));
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-customer-home-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page-shell">
      <a routerLink="/" class="back-link">Voltar ao inicio</a>

      <header class="hero-card">
        <div>
          <p class="eyebrow">Catalogo publico</p>
          <h1>Escolha uma loja e confira o cardapio.</h1>
          <p>Os dados desta tela vem da API publica de estabelecimentos e produtos.</p>
        </div>

        <div class="hero-metrics">
          <article class="metric-card">
            <span>Lojas</span>
            <strong>{{ establishments().length }}</strong>
          </article>

          <article class="metric-card">
            <span>Itens da loja</span>
            <strong>{{ products().length }}</strong>
          </article>

          <article class="metric-card">
            <span>Disponiveis</span>
            <strong>{{ availableProductsCount() }}</strong>
          </article>
        </div>
      </header>

      <section class="list-header">
        <div>
          <p class="label">Estabelecimentos</p>
          <h2>Disponiveis agora</h2>
        </div>
        <button type="button" class="refresh-button" (click)="reload()" [disabled]="isLoading()">
          {{ isLoading() ? 'Atualizando...' : 'Atualizar lista' }}
        </button>
      </section>

      @if (errorMessage()) {
        <section class="feedback error">{{ errorMessage() }}</section>
      }

      @if (isLoading()) {
        <section class="grid skeleton-grid">
          @for (card of [1, 2, 3]; track card) {
            <article class="panel skeleton-card"></article>
          }
        </section>
      } @else if (establishments().length === 0) {
        <section class="panel empty-state">
          <p class="label">Sem resultados</p>
          <h2>Nenhum estabelecimento foi cadastrado ainda.</h2>
          <p>Use o painel do lojista para cadastrar a primeira loja e volte aqui para conferir.</p>
          <a routerLink="/estabelecimento" class="primary-link">Abrir painel do lojista</a>
        </section>
      } @else {
        <section class="grid cards-grid">
          @for (establishment of establishments(); track establishment.id) {
            <article class="panel card" [class.active]="establishment.id === selectedEstablishmentId()">
              <div class="card-head">
                <div>
                  <p class="label">{{ categoryName(establishment.category) }}</p>
                  <h3>{{ establishment.tradeName }}</h3>
                </div>
                <span class="city-chip">{{ establishment.address.city }}/{{ establishment.address.state }}</span>
              </div>

              <p class="description">{{ establishment.openingHours }}</p>

              <dl>
                <div>
                  <dt>Endereco</dt>
                  <dd>{{ establishment.address.street }}, {{ establishment.address.number }} - {{ establishment.address.district }}</dd>
                </div>
                <div>
                  <dt>Contato</dt>
                  <dd>{{ establishment.phone }} · {{ establishment.email }}</dd>
                </div>
              </dl>

              <div class="card-actions">
                <button
                  type="button"
                  class="secondary-button"
                  [class.active]="establishment.id === selectedEstablishmentId()"
                  (click)="selectEstablishment(establishment.id)"
                >
                  {{ establishment.id === selectedEstablishmentId() ? 'Loja selecionada' : 'Ver cardapio' }}
                </button>
              </div>
            </article>
          }
        </section>

        @if (selectedEstablishment(); as establishment) {
          <section class="catalog-shell">
            <div class="catalog-header">
              <div>
                <p class="label">Cardapio ao vivo</p>
                <h2>{{ establishment.tradeName }}</h2>
                <p>
                  {{ establishment.address.city }}/{{ establishment.address.state }} · {{ establishment.openingHours }}
                </p>
              </div>
              <button
                type="button"
                class="refresh-button"
                (click)="reloadProducts()"
                [disabled]="areProductsLoading()"
              >
                {{ areProductsLoading() ? 'Atualizando cardapio...' : 'Atualizar cardapio' }}
              </button>
            </div>

            @if (productErrorMessage()) {
              <section class="feedback error">{{ productErrorMessage() }}</section>
            }

            @if (areProductsLoading()) {
              <section class="grid product-grid">
                @for (card of [1, 2, 3]; track card) {
                  <article class="panel skeleton-card"></article>
                }
              </section>
            } @else if (products().length === 0) {
              <section class="panel empty-state">
                <p class="label">Cardapio vazio</p>
                <h2>Esta loja ainda nao publicou produtos.</h2>
                <p>Escolha outra loja ou volte mais tarde para continuar explorando.</p>
              </section>
            } @else {
              <section class="grid product-grid">
                @for (product of products(); track product.id) {
                  <article class="panel product-card">
                    <img class="product-image" [src]="product.imageUrl" [alt]="product.name" loading="lazy" />

                    <div class="product-copy">
                      <div class="card-head">
                        <div>
                          <p class="label">{{ productCategoryName(product.category) }}</p>
                          <h3>{{ product.name }}</h3>
                        </div>
                        <span class="city-chip availability" [class.unavailable]="!product.available">
                          {{ product.available ? 'Disponivel' : 'Indisponivel' }}
                        </span>
                      </div>

                      <p>{{ product.description }}</p>

                      <div class="product-footer">
                        <strong class="price">{{ formatPrice(product.price) }}</strong>
                        <button
                          type="button"
                          class="secondary-button add-button"
                          (click)="addToCart(product)"
                          [disabled]="!product.available || isSubmittingOrder()"
                        >
                          {{ product.available ? 'Adicionar a sacola' : 'Indisponivel' }}
                        </button>
                      </div>
                    </div>
                  </article>
                }
              </section>
            }

            <section class="panel cart-panel">
              <div class="catalog-header">
                <div>
                  <p class="label">Checkout minimo</p>
                  <h2>Sacola</h2>
                  @if (cartEstablishment(); as cartEstablishment) {
                    <p>Itens atuais vinculados a {{ cartEstablishment.tradeName }}.</p>
                  } @else {
                    <p>Adicione produtos de uma unica loja para montar e enviar o pedido.</p>
                  }
                </div>

                @if (currentAccount()) {
                  <span class="city-chip">{{ currentAccount()?.profile === 'CUSTOMER' ? 'Sessao CUSTOMER ativa' : 'Sessao MERCHANT ativa' }}</span>
                }
              </div>

              @if (cartFeedbackMessage()) {
                <section
                  class="feedback"
                  [class.error]="cartFeedbackKind() === 'error'"
                  [class.success]="cartFeedbackKind() === 'success'"
                  [class.info]="cartFeedbackKind() === 'info'"
                >
                  {{ cartFeedbackMessage() }}
                </section>
              }

              @if (checkoutErrorMessage()) {
                <section class="feedback error">{{ checkoutErrorMessage() }}</section>
              }

              @if (checkoutSuccessMessage()) {
                <section class="feedback success">{{ checkoutSuccessMessage() }}</section>
              }

              @if (lastOrder(); as order) {
                <article class="order-confirmation">
                  <div>
                    <p class="label">Ultimo pedido enviado</p>
                    <h3>#{{ shortOrderId(order.id) }}</h3>
                    <p>{{ paymentMethodLabel(order.paymentMethod) }} · {{ formatPrice(order.totalAmount) }}</p>
                  </div>
                  <span class="city-chip">{{ orderStatusLabel(order.status) }}</span>
                </article>
              }

              @if (cartItems().length === 0) {
                <section class="empty-state compact">
                  <p class="label">Sacola vazia</p>
                  <h3>Escolha itens do cardapio para iniciar o checkout.</h3>
                  <p>
                    O backend agora recebe pedidos reais, mas o subtotal continua sendo recalculado na hora da confirmacao.
                  </p>
                </section>
              } @else {
                @if (cartEstablishmentId() && cartEstablishmentId() !== selectedEstablishmentId()) {
                  <section class="feedback info">
                    Sua sacola continua vinculada a outra loja. Volte para ela antes de adicionar novos itens ou apenas finalize o pedido atual.
                  </section>
                }

                @if (cartHasUnavailableItems()) {
                  <section class="feedback error">
                    A sacola possui itens indisponiveis ou fora do cardapio atual. Revise os itens antes de finalizar.
                  </section>
                }

                <section class="cart-items">
                  @for (item of cartItems(); track item.productId) {
                    <article class="cart-item">
                      <img class="cart-item-image" [src]="item.imageUrl" [alt]="item.name" loading="lazy" />

                      <div class="item-copy">
                        <div class="card-head compact-head">
                          <div>
                            <h3>{{ item.name }}</h3>
                            <p>{{ formatPrice(item.price) }} por unidade</p>
                          </div>
                          <span class="city-chip availability" [class.unavailable]="!item.available">
                            {{ item.available ? 'Disponivel' : 'Indisponivel' }}
                          </span>
                        </div>

                        <div class="item-actions">
                          <div class="quantity-stepper">
                            <button
                              type="button"
                              class="quantity-button"
                              (click)="updateCartItemQuantity(item.productId, item.quantity - 1)"
                              [disabled]="isSubmittingOrder()"
                            >
                              -
                            </button>
                            <span>{{ item.quantity }}</span>
                            <button
                              type="button"
                              class="quantity-button"
                              (click)="updateCartItemQuantity(item.productId, item.quantity + 1)"
                              [disabled]="isSubmittingOrder()"
                            >
                              +
                            </button>
                          </div>

                          <strong class="price">{{ formatPrice(item.price * item.quantity) }}</strong>

                          <button
                            type="button"
                            class="text-button"
                            (click)="removeCartItem(item.productId)"
                            [disabled]="isSubmittingOrder()"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </article>
                  }
                </section>

                <div class="cart-toolbar">
                  @if (cartEstablishmentId() && cartEstablishmentId() !== selectedEstablishmentId()) {
                    <button type="button" class="secondary-button" (click)="focusCartEstablishment()">
                      Voltar para a loja da sacola
                    </button>
                  }

                  <button type="button" class="text-button" (click)="clearCart()" [disabled]="isSubmittingOrder()">
                    Limpar sacola
                  </button>
                </div>

                <form class="checkout-form" [formGroup]="checkoutForm" (ngSubmit)="submitOrder()">
                  <label class="field">
                    <span>Forma de pagamento</span>
                    <select formControlName="paymentMethod">
                      @for (option of paymentMethods; track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  </label>

                  <label class="checkbox-row">
                    <input type="checkbox" formControlName="changeRequired" [disabled]="!isCashPaymentSelected()" />
                    <span>Precisa de troco na entrega</span>
                  </label>

                  @if (!isCashPaymentSelected()) {
                    <p class="helper-text">Troco so fica disponivel quando o pagamento for na entrega.</p>
                  }

                  <div class="checkout-summary">
                    <article>
                      <span>Itens</span>
                      <strong>{{ cartItemCount() }}</strong>
                    </article>

                    <article>
                      <span>Subtotal</span>
                      <strong>{{ formatPrice(cartSubtotal()) }}</strong>
                    </article>
                  </div>

                  <div class="checkout-actions">
                    @if (!currentAccount()) {
                      <button type="button" class="primary-link" (click)="loginAsCustomer()" [disabled]="isSessionBusy()">
                        Entrar como cliente
                      </button>
                      <p class="checkout-hint">A sacola fica preservada nesta aba enquanto o login acontece.</p>
                    } @else if (!canCheckout()) {
                      <button type="button" class="primary-link" (click)="logout()" [disabled]="isSessionBusy()">
                        Encerrar sessao atual
                      </button>
                      <p class="checkout-hint">O checkout exige um perfil CUSTOMER para concluir o pedido.</p>
                    } @else {
                      <button type="submit" class="primary-link" [disabled]="isSubmittingOrder() || cartHasUnavailableItems()">
                        {{ isSubmittingOrder() ? 'Enviando pedido...' : 'Finalizar pedido' }}
                      </button>
                      <p class="checkout-hint">O servidor recalcula preco e disponibilidade antes de confirmar.</p>
                    }
                  </div>
                </form>
              }
            </section>
          </section>
        }
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
      color: #7d4f2f;
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
      grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.75fr);
      gap: 20px;
      background: linear-gradient(135deg, rgba(255, 225, 192, 0.96), rgba(255, 248, 239, 0.9));
    }

    .hero-metrics {
      display: grid;
      gap: 12px;
    }

    .metric-card {
      display: grid;
      gap: 6px;
      padding: 18px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(23, 49, 38, 0.08);
    }

    .metric-card span {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      color: #7d4f2f;
      font-weight: 700;
    }

    .metric-card strong {
      font-size: 2rem;
      line-height: 1;
      color: #173126;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
    }

    .eyebrow,
    .label {
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.78rem;
      font-weight: 700;
      color: #7d4f2f;
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

    .grid {
      display: grid;
      gap: 18px;
    }

    .list-header,
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }

    .list-header h2,
    h3 {
      margin: 0;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      color: #173126;
    }

    .list-header h2 {
      font-size: 2rem;
    }

    h3 {
      font-size: 1.5rem;
    }

    .compact {
      min-height: 100%;
    }

    .cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .product-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .card,
    .empty-state,
    .product-card,
    .catalog-shell {
      display: grid;
      gap: 18px;
    }

    .card.active {
      border-color: rgba(29, 92, 70, 0.28);
      box-shadow: 0 20px 48px rgba(29, 92, 70, 0.14);
    }

    .description {
      font-weight: 600;
    }

    .catalog-shell {
      margin-top: 4px;
    }

    .catalog-header,
    .card-actions {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }

    dl,
    dl div {
      display: grid;
      gap: 6px;
      margin: 0;
    }

    dt {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      color: #7d4f2f;
      font-weight: 700;
    }

    dd {
      margin: 0;
      color: #3f5144;
    }

    .city-chip,
    .primary-link,
    .refresh-button,
    .secondary-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      min-height: 42px;
      padding: 0 16px;
      font-weight: 700;
    }

    .city-chip {
      background: rgba(29, 92, 70, 0.1);
      color: #1d5c46;
      white-space: nowrap;
    }

    .primary-link,
    .refresh-button,
    .secondary-button {
      border: none;
      background: #173126;
      color: #f7f1e6;
      text-decoration: none;
      cursor: pointer;
    }

    .secondary-button {
      background: rgba(23, 49, 38, 0.08);
      color: #173126;
    }

    .secondary-button.active {
      background: #173126;
      color: #f7f1e6;
    }

    .refresh-button[disabled] {
      opacity: 0.7;
      cursor: progress;
    }

    .feedback {
      padding: 14px 18px;
      border-radius: 18px;
      font-weight: 600;
    }

    .error {
      background: rgba(161, 49, 49, 0.1);
      color: #7a1f1f;
      border: 1px solid rgba(161, 49, 49, 0.18);
    }

    .skeleton-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .skeleton-card {
      min-height: 220px;
      background:
        linear-gradient(110deg, rgba(255, 255, 255, 0.5) 8%, rgba(255, 255, 255, 0.85) 18%, rgba(255, 255, 255, 0.5) 33%),
        rgba(255, 251, 245, 0.88);
      background-size: 200% 100%;
      animation: shimmer 1.1s linear infinite;
    }

    .product-card {
      padding: 0;
      overflow: hidden;
    }

    .product-image {
      width: 100%;
      height: 180px;
      object-fit: cover;
      background: linear-gradient(135deg, rgba(255, 225, 192, 0.96), rgba(255, 248, 239, 0.9));
    }

    .product-copy {
      display: grid;
      gap: 14px;
      padding: 20px;
    }

    .product-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .add-button {
      min-width: 172px;
    }

    .availability {
      background: rgba(29, 92, 70, 0.12);
    }

    .availability.unavailable {
      background: rgba(161, 49, 49, 0.12);
      color: #7a1f1f;
    }

    .price {
      font-size: 1.15rem;
      color: #173126;
    }

    .success {
      background: rgba(29, 92, 70, 0.12);
      color: #1d5c46;
      border: 1px solid rgba(29, 92, 70, 0.18);
    }

    .info {
      background: rgba(23, 49, 38, 0.08);
      color: #173126;
      border: 1px solid rgba(23, 49, 38, 0.12);
    }

    .cart-panel {
      margin-top: 6px;
    }

    .order-confirmation {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 18px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(23, 49, 38, 0.08);
    }

    .cart-items {
      display: grid;
      gap: 14px;
    }

    .cart-item {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      gap: 16px;
      padding: 18px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(23, 49, 38, 0.08);
    }

    .cart-item-image {
      width: 112px;
      height: 112px;
      object-fit: cover;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(255, 225, 192, 0.96), rgba(255, 248, 239, 0.9));
    }

    .item-copy {
      display: grid;
      gap: 14px;
      min-width: 0;
    }

    .compact-head {
      align-items: flex-start;
    }

    .item-actions,
    .cart-toolbar,
    .checkout-actions,
    .checkout-summary {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .quantity-stepper {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px;
      border-radius: 999px;
      background: rgba(23, 49, 38, 0.06);
    }

    .quantity-button {
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 50%;
      background: #173126;
      color: #f7f1e6;
      font-weight: 700;
      cursor: pointer;
    }

    .quantity-button[disabled],
    .primary-link[disabled],
    .secondary-button[disabled],
    .text-button[disabled],
    select[disabled],
    input[disabled] {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .text-button {
      border: none;
      background: transparent;
      color: #7d4f2f;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }

    .checkout-form {
      display: grid;
      gap: 16px;
      padding: 20px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(23, 49, 38, 0.08);
    }

    .field,
    .checkbox-row {
      display: grid;
      gap: 8px;
      color: #173126;
      font-weight: 600;
    }

    .checkbox-row {
      grid-template-columns: auto 1fr;
      align-items: center;
    }

    select {
      min-height: 46px;
      border-radius: 14px;
      border: 1px solid rgba(23, 49, 38, 0.12);
      padding: 0 14px;
      background: rgba(255, 251, 245, 0.96);
      color: #173126;
      font: inherit;
    }

    .helper-text,
    .checkout-hint {
      color: #5a6a61;
      font-size: 0.95rem;
    }

    .checkout-summary article {
      min-width: 160px;
      display: grid;
      gap: 6px;
      padding: 16px 18px;
      border-radius: 18px;
      background: rgba(255, 248, 239, 0.9);
      border: 1px solid rgba(23, 49, 38, 0.08);
    }

    .checkout-summary span {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      color: #7d4f2f;
      font-weight: 700;
    }

    .checkout-summary strong {
      font-size: 1.35rem;
      color: #173126;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
    }

    @keyframes shimmer {
      to {
        background-position-x: -200%;
      }
    }

    @media (max-width: 900px) {
      .hero-card,
      .list-header,
      .card-head,
      .catalog-header,
      .card-actions,
      .product-footer,
      .order-confirmation,
      .item-actions,
      .cart-toolbar,
      .checkout-actions,
      .checkout-summary {
        align-items: flex-start;
        flex-direction: column;
      }

      .cart-item {
        grid-template-columns: 1fr;
      }

      .cart-item-image {
        width: 100%;
        height: 180px;
      }

      .cards-grid,
      .product-grid,
      .skeleton-grid,
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class CustomerHomePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly cart = inject(CustomerCartService);
  private readonly establishmentApi = inject(EstablishmentApi);
  private readonly orderApi = inject(OrderApi);
  private readonly productApi = inject(ProductApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly paymentMethods = paymentMethodOptions;
  readonly currentAccount = this.authSession.currentAccount;
  readonly isSessionBusy = this.authSession.isLoading;
  readonly establishments = signal<Establishment[]>([]);
  readonly selectedEstablishmentId = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly products = signal<Product[]>([]);
  readonly areProductsLoading = signal(false);
  readonly productErrorMessage = signal('');
  readonly cartItems = this.cart.items;
  readonly cartItemCount = this.cart.itemCount;
  readonly cartSubtotal = this.cart.subtotal;
  readonly cartHasUnavailableItems = this.cart.hasUnavailableItems;
  readonly cartEstablishmentId = this.cart.establishmentId;
  readonly cartFeedbackMessage = signal('');
  readonly cartFeedbackKind = signal<'info' | 'error' | 'success'>('info');
  readonly checkoutErrorMessage = signal('');
  readonly checkoutSuccessMessage = signal('');
  readonly isSubmittingOrder = signal(false);
  readonly lastOrder = signal<Order | null>(null);
  readonly availableProductsCount = computed(() => this.products().filter((product) => product.available).length);
  readonly canCheckout = computed(() => this.currentAccount()?.profile === 'CUSTOMER');
  readonly selectedEstablishment = computed(
    () => this.establishments().find((establishment) => establishment.id === this.selectedEstablishmentId()) ?? null
  );
  readonly cartEstablishment = computed(
    () => this.establishments().find((establishment) => establishment.id === this.cartEstablishmentId()) ?? null
  );

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    paymentMethod: ['PIX' as OrderPaymentMethod],
    changeRequired: [false]
  });

  constructor() {
    this.checkoutForm.controls.paymentMethod.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paymentMethod) => {
      if (paymentMethod !== 'CASH_ON_DELIVERY' && this.checkoutForm.controls.changeRequired.value) {
        this.checkoutForm.controls.changeRequired.setValue(false);
      }
    });

    this.loadEstablishments();
  }

  reload() {
    this.loadEstablishments();
  }

  reloadProducts() {
    const establishmentId = this.selectedEstablishmentId();

    if (establishmentId) {
      this.loadProducts(establishmentId);
    }
  }

  addToCart(product: Product) {
    this.clearOrderFeedback();

    const result = this.cart.addProduct(product);
    if (result === 'added') {
      this.setCartFeedback(`${product.name} adicionado a sacola.`, 'success');
      return;
    }

    if (result === 'merged') {
      this.setCartFeedback(`Quantidade de ${product.name} atualizada na sacola.`, 'success');
      return;
    }

    if (result === 'unavailable') {
      this.setCartFeedback('Itens indisponiveis nao podem ser adicionados a sacola.', 'error');
      return;
    }

    const cartEstablishment = this.cartEstablishment();
    this.setCartFeedback(
      cartEstablishment
        ? `Sua sacola ja esta vinculada a ${cartEstablishment.tradeName}. Limpe a sacola ou finalize o pedido atual.`
        : 'Sua sacola ja contem itens de outra loja. Limpe a sacola ou finalize o pedido atual.',
      'error'
    );
  }

  updateCartItemQuantity(productId: string, quantity: number) {
    this.clearOrderFeedback();
    this.cart.setQuantity(productId, quantity);
  }

  removeCartItem(productId: string) {
    this.clearOrderFeedback();
    this.cart.removeItem(productId);
    this.setCartFeedback('Item removido da sacola.', 'info');
  }

  clearCart() {
    this.clearOrderFeedback();
    this.cart.clear();
    this.setCartFeedback('Sacola limpa.', 'info');
  }

  focusCartEstablishment() {
    const establishmentId = this.cartEstablishmentId();

    if (establishmentId) {
      this.selectEstablishment(establishmentId);
    }
  }

  loginAsCustomer() {
    this.authSession.loginAs('CUSTOMER', '/cliente');
  }

  logout() {
    void this.authSession.logout('/cliente');
  }

  isCashPaymentSelected() {
    return this.checkoutForm.controls.paymentMethod.value === 'CASH_ON_DELIVERY';
  }

  paymentMethodLabel(paymentMethod: OrderPaymentMethod) {
    return paymentMethodLabels.get(paymentMethod) ?? paymentMethod;
  }

  orderStatusLabel(status: Order['status']) {
    if (status === 'PENDING_CONFIRMATION') {
      return 'Aguardando confirmacao da loja';
    }

    return status;
  }

  shortOrderId(orderId: string) {
    return orderId.slice(0, 8);
  }

  submitOrder() {
    this.checkoutErrorMessage.set('');
    this.checkoutSuccessMessage.set('');

    const establishmentId = this.cartEstablishmentId();
    const items = this.cartItems();

    if (!establishmentId || items.length === 0) {
      this.checkoutErrorMessage.set('Adicione itens a sacola antes de finalizar o pedido.');
      return;
    }

    if (this.cartHasUnavailableItems()) {
      this.checkoutErrorMessage.set('Remova os itens indisponiveis da sacola antes de finalizar.');
      return;
    }

    if (!this.currentAccount()) {
      this.setCartFeedback('Entre como cliente para concluir o checkout.', 'info');
      this.loginAsCustomer();
      return;
    }

    if (!this.canCheckout()) {
      this.checkoutErrorMessage.set('Encerre a sessao atual e entre com um perfil CUSTOMER para finalizar o pedido.');
      return;
    }

    const formValue = this.checkoutForm.getRawValue();
    const changeRequired = formValue.paymentMethod === 'CASH_ON_DELIVERY' ? formValue.changeRequired : false;

    this.isSubmittingOrder.set(true);
    this.orderApi
      .create({
        establishmentId,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod: formValue.paymentMethod,
        changeRequired
      })
      .pipe(
        finalize(() => this.isSubmittingOrder.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (order) => {
          this.lastOrder.set(order);
          this.checkoutSuccessMessage.set(
            `Pedido #${this.shortOrderId(order.id)} enviado com sucesso. Total confirmado: ${this.formatPrice(order.totalAmount)}.`
          );
          this.setCartFeedback('Pedido enviado e sacola liberada para uma nova compra.', 'success');
          this.cart.clear();
          this.checkoutForm.reset({ paymentMethod: 'PIX', changeRequired: false });
        },
        error: (error: unknown) => {
          this.checkoutErrorMessage.set(this.readCheckoutErrorMessage(error));

          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.authSession.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
          }
        }
      });
  }

  selectEstablishment(establishmentId: string) {
    if (this.selectedEstablishmentId() === establishmentId && this.products().length > 0) {
      return;
    }

    this.selectedEstablishmentId.set(establishmentId);
    this.loadProducts(establishmentId);
  }

  categoryName(category: Establishment['category']) {
    return establishmentCategoryLabels.get(category) ?? category;
  }

  productCategoryName(category: Product['category']) {
    return productCategoryLabels.get(category) ?? category;
  }

  formatPrice(price: number) {
    return brlFormatter.format(price);
  }

  private loadEstablishments() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.establishmentApi
      .listPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (establishments) => {
          this.establishments.set(establishments);
          this.syncSelectedEstablishment(establishments);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(readApiErrorMessage(error, 'Nao foi possivel carregar os estabelecimentos agora.'));
          this.establishments.set([]);
          this.selectedEstablishmentId.set(null);
          this.products.set([]);
          this.isLoading.set(false);
        }
      });
  }

  private loadProducts(establishmentId: string) {
    this.areProductsLoading.set(true);
    this.productErrorMessage.set('');

    this.productApi
      .listByEstablishment(establishmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.cart.syncCatalog(establishmentId, products);
          this.areProductsLoading.set(false);
        },
        error: (error: unknown) => {
          this.productErrorMessage.set(readApiErrorMessage(error, 'Nao foi possivel carregar o cardapio agora.'));
          this.products.set([]);
          this.areProductsLoading.set(false);
        }
      });
  }

  private syncSelectedEstablishment(establishments: Establishment[]) {
    if (establishments.length === 0) {
      this.selectedEstablishmentId.set(null);
      this.products.set([]);
      return;
    }

    const currentSelection = this.selectedEstablishmentId();
    const selectedExists = currentSelection
      ? establishments.some((establishment) => establishment.id === currentSelection)
      : false;
    const nextSelection = selectedExists ? currentSelection : establishments[0].id;

    if (nextSelection) {
      this.selectedEstablishmentId.set(nextSelection);
      this.loadProducts(nextSelection);
    }
  }

  private readCheckoutErrorMessage(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Sua sessao nao esta autenticada. Entre como cliente para finalizar o pedido.';
      }

      if (error.status === 403) {
        return 'Sua conta atual nao pode finalizar pedidos. Use um perfil CUSTOMER.';
      }

      const apiProblem = error.error as { detail?: string; errors?: string[] } | null;
      if (apiProblem?.errors?.length) {
        return apiProblem.errors.join(' | ');
      }

      if (apiProblem?.detail) {
        return apiProblem.detail;
      }
    }

    return 'Nao foi possivel finalizar o pedido agora.';
  }

  private clearOrderFeedback() {
    this.checkoutErrorMessage.set('');
    this.checkoutSuccessMessage.set('');
    this.lastOrder.set(null);
  }

  private setCartFeedback(message: string, kind: 'info' | 'error' | 'success') {
    this.cartFeedbackMessage.set(message);
    this.cartFeedbackKind.set(kind);
  }
}