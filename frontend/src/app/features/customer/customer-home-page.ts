import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../establishments/api-error';
import { EstablishmentApi } from '../establishments/establishment-api';
import { Establishment, establishmentCategoryOptions } from '../establishments/establishment.models';
import { ProductApi } from '../products/product-api';
import { Product, productCategoryOptions } from '../products/product.models';

const establishmentCategoryLabels = new Map(establishmentCategoryOptions.map((option) => [option.value, option.label]));
const productCategoryLabels = new Map(productCategoryOptions.map((option) => [option.value, option.label]));
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-customer-home-page',
  imports: [RouterLink],
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
                      <strong class="price">{{ formatPrice(product.price) }}</strong>
                    </div>
                  </article>
                }
              </section>
            }
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
      .card-actions {
        align-items: flex-start;
        flex-direction: column;
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
  private readonly establishmentApi = inject(EstablishmentApi);
  private readonly productApi = inject(ProductApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly establishments = signal<Establishment[]>([]);
  readonly selectedEstablishmentId = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly products = signal<Product[]>([]);
  readonly areProductsLoading = signal(false);
  readonly productErrorMessage = signal('');
  readonly availableProductsCount = computed(() => this.products().filter((product) => product.available).length);
  readonly selectedEstablishment = computed(
    () => this.establishments().find((establishment) => establishment.id === this.selectedEstablishmentId()) ?? null
  );

  constructor() {
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
}