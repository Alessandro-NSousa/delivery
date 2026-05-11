import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthSessionService } from '../account/auth-session.service';
import { readApiErrorMessage } from '../establishments/api-error';
import { EstablishmentApi } from '../establishments/establishment-api';
import { Establishment, establishmentCategoryOptions } from '../establishments/establishment.models';
import { ProductApi } from '../products/product-api';
import { Product, productCategoryOptions } from '../products/product.models';

const establishmentCategoryLabels = new Map(establishmentCategoryOptions.map((option) => [option.value, option.label]));
const productCategoryLabels = new Map(productCategoryOptions.map((option) => [option.value, option.label]));
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">MVP funcional</p>
          <h1>Central de operacao para testar o delivery.</h1>
          <p class="summary">
            A tela inicial mostra dados reais da API, deixa a entrada explicita como cliente ou lojista e centraliza o
            estado atual da sessao.
          </p>
        </div>

        <div class="actions-card">
          @if (currentAccount(); as account) {
            <p class="auth-label">Sessao ativa</p>
            <strong class="auth-title">{{ account.displayName }}</strong>
            <span class="auth-copy">{{ account.email }}</span>
            <span class="auth-badge">
              {{ account.profile === 'MERCHANT' ? 'Perfil lojista ativo' : 'Perfil cliente ativo' }}
            </span>
            <a [routerLink]="currentAreaLink()" class="primary-action">Abrir minha area</a>
            <button type="button" class="secondary-action" (click)="logout()" [disabled]="isSessionBusy()">
              Encerrar sessao
            </button>
          } @else {
            <p class="auth-label">Entrada explicita</p>
            <strong class="auth-title">Escolha como quer entrar.</strong>
            <span class="auth-copy">O backend continua definindo o perfil real da sessao apos o login.</span>
            <button type="button" class="primary-action" (click)="loginAsCustomer()" [disabled]="isSessionBusy()">
              Entrar como cliente
            </button>
            <button type="button" class="secondary-action" (click)="loginAsMerchant()" [disabled]="isSessionBusy()">
              Entrar como lojista
            </button>
          }

          <button type="button" class="ghost-action" (click)="reload()" [disabled]="isLoading()">
            {{ isLoading() ? 'Atualizando dados...' : 'Atualizar dados' }}
          </button>
        </div>
      </header>

      @if (sessionFeedbackMessage()) {
        <section class="feedback" [class.error]="sessionFeedbackKind() === 'error'" [class.info]="sessionFeedbackKind() !== 'error'">
          {{ sessionFeedbackMessage() }}
        </section>
      }

      @if (errorMessage()) {
        <section class="feedback error">{{ errorMessage() }}</section>
      }

      <section class="overview-grid">
        <article class="panel accent-warm">
          <p class="section-label">Lojas publicadas</p>
          <h2>{{ establishments().length }}</h2>
          <p>{{ isLoading() ? 'Consultando backend...' : 'Disponiveis para exploracao publica.' }}</p>
        </article>

        <article class="panel accent-light">
          <p class="section-label">Loja em foco</p>
          <h2>{{ selectedEstablishment()?.tradeName ?? 'Nenhuma loja selecionada' }}</h2>
          <p>{{ selectedLocation() }}</p>
        </article>

        <article class="panel accent-dark">
          <p class="section-label">Itens carregados</p>
          <h2>{{ products().length }}</h2>
          <p>{{ selectedEstablishment() ? 'Preview do cardapio atual da loja selecionada.' : 'Selecione uma loja.' }}</p>
        </article>
      </section>

      @if (isLoading()) {
        <section class="panel loading-panel">
          <p class="section-label">Sincronizando</p>
          <h2>Carregando dados do MVP.</h2>
        </section>
      } @else if (establishments().length === 0) {
        <section class="panel empty-state">
          <p class="section-label">Sem lojas publicadas</p>
          <h2>O catalogo ainda esta vazio.</h2>
          <p>Use o painel do lojista para cadastrar a primeira loja e voltar aqui para validar o fluxo publico.</p>
          <a routerLink="/estabelecimento" class="primary-action">Abrir painel do lojista</a>
        </section>
      } @else {
        <section class="workspace">
          <section class="panel stores-panel">
            <div class="section-head">
              <div>
                <p class="section-label">Lojas</p>
                <h2>Selecione uma operacao</h2>
              </div>
            </div>

            <div class="store-list">
              @for (establishment of establishments(); track establishment.id) {
                <button
                  type="button"
                  class="store-item"
                  [class.active]="establishment.id === selectedEstablishmentId()"
                  (click)="selectEstablishment(establishment.id)"
                >
                  <strong>{{ establishment.tradeName }}</strong>
                  <span>{{ categoryName(establishment.category) }}</span>
                  <small>{{ establishment.address.city }}/{{ establishment.address.state }}</small>
                </button>
              }
            </div>
          </section>

          @if (selectedEstablishment(); as establishment) {
            <section class="panel preview-panel">
              <div class="section-head preview-head">
                <div>
                  <p class="section-label">Preview</p>
                  <h2>{{ establishment.tradeName }}</h2>
                  <p>{{ establishment.openingHours }}</p>
                </div>

                <button type="button" class="ghost-action" (click)="reloadProducts()" [disabled]="areProductsLoading()">
                  {{ areProductsLoading() ? 'Atualizando...' : 'Atualizar cardapio' }}
                </button>
              </div>

              <dl class="details-grid">
                <div>
                  <dt>Endereco</dt>
                  <dd>{{ establishment.address.street }}, {{ establishment.address.number }} - {{ establishment.address.district }}</dd>
                </div>

                <div>
                  <dt>Contato</dt>
                  <dd>{{ establishment.phone }} · {{ establishment.email }}</dd>
                </div>
              </dl>

              @if (productErrorMessage()) {
                <section class="feedback error">{{ productErrorMessage() }}</section>
              }

              @if (areProductsLoading()) {
                <p>Atualizando produtos da loja...</p>
              } @else if (products().length === 0) {
                <p class="empty-copy">Esta loja ainda nao publicou produtos.</p>
              } @else {
                <div class="product-list">
                  @for (product of products(); track product.id) {
                    <article class="product-item">
                      <div>
                        <p class="section-label inner-label">{{ productCategoryName(product.category) }}</p>
                        <strong>{{ product.name }}</strong>
                        <p>{{ product.description }}</p>
                      </div>

                      <div class="product-meta">
                        <span class="status-chip" [class.unavailable]="!product.available">
                          {{ product.available ? 'Disponivel' : 'Indisponivel' }}
                        </span>
                        <strong>{{ formatPrice(product.price) }}</strong>
                      </div>
                    </article>
                  }
                </div>
              }

              <div class="panel-actions">
                <a routerLink="/cliente" class="primary-action">Abrir catalogo completo</a>
                <a routerLink="/estabelecimento" class="secondary-action">Abrir painel do lojista</a>
              </div>
            </section>
          }
        </section>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      padding: 32px;
    }

    .shell {
      max-width: 1180px;
      margin: 0 auto;
      display: grid;
      gap: 24px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
      gap: 24px;
      align-items: stretch;
    }

    .eyebrow,
    .section-label,
    dt {
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      color: #7d4f2f;
      font-weight: 700;
    }

    h1,
    h2 {
      margin: 0;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      line-height: 0.95;
      color: #173126;
    }

    h1 {
      font-size: clamp(3rem, 7vw, 5rem);
      max-width: 11ch;
    }

    h2 {
      font-size: clamp(2rem, 3vw, 2.8rem);
    }

    .summary,
    p,
    dd,
    small,
    .store-item span {
      color: #3f5144;
      line-height: 1.6;
    }

    .summary {
      max-width: 56ch;
      margin-top: 16px;
      font-size: 1.08rem;
    }

    .auth-label,
    .auth-title,
    .auth-copy,
    .auth-badge {
      color: #f7f1e6;
    }

    .auth-label {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      font-weight: 700;
      opacity: 0.8;
    }

    .auth-title {
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      font-size: 1.8rem;
      line-height: 1;
    }

    .auth-copy {
      line-height: 1.5;
    }

    .auth-badge {
      display: inline-flex;
      width: fit-content;
      min-height: 34px;
      align-items: center;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 0.84rem;
      font-weight: 700;
    }

    .panel,
    .actions-card {
      border-radius: 28px;
      padding: 28px;
      background: rgba(255, 252, 247, 0.82);
      border: 1px solid rgba(23, 49, 38, 0.08);
      box-shadow: 0 24px 60px rgba(65, 53, 34, 0.12);
      backdrop-filter: blur(16px);
    }

    .actions-card {
      display: grid;
      align-content: start;
      gap: 14px;
      background: linear-gradient(180deg, rgba(22, 60, 45, 0.98), rgba(28, 72, 54, 0.94));
    }

    .overview-grid,
    .workspace {
      display: grid;
      gap: 20px;
    }

    .overview-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .workspace {
      grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
      align-items: start;
    }

    .accent-warm {
      background: linear-gradient(180deg, rgba(255, 242, 223, 0.95), rgba(255, 250, 244, 0.9));
    }

    .accent-light {
      background: linear-gradient(180deg, rgba(252, 246, 234, 0.96), rgba(255, 253, 249, 0.92));
    }

    .accent-dark {
      background: linear-gradient(180deg, rgba(22, 60, 45, 0.98), rgba(28, 72, 54, 0.94));
    }

    .accent-dark h2,
    .accent-dark p,
    .accent-dark .section-label {
      color: #f7f1e6;
    }

    .primary-action,
    .secondary-action,
    .ghost-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 18px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
      font: inherit;
    }

    .primary-action {
      background: #173126;
      color: #f7f1e6;
      border: none;
    }

    .secondary-action,
    .ghost-action {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #f7f1e6;
    }

    .ghost-action {
      cursor: pointer;
    }

    .preview-panel .ghost-action,
    .empty-state .primary-action {
      width: fit-content;
    }

    .preview-panel .ghost-action {
      background: rgba(23, 49, 38, 0.08);
      border-color: transparent;
      color: #173126;
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

    .info {
      background: rgba(22, 60, 45, 0.08);
      color: #173126;
      border: 1px solid rgba(22, 60, 45, 0.14);
    }

    .section-head,
    .preview-head,
    .panel-actions {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }

    .store-list,
    .product-list {
      display: grid;
      gap: 12px;
    }

    .store-item,
    .product-item {
      display: grid;
      gap: 6px;
      padding: 16px 18px;
      border-radius: 20px;
      border: 1px solid rgba(23, 49, 38, 0.08);
      background: rgba(255, 255, 255, 0.68);
    }

    .store-item {
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: #173126;
    }

    .store-item.active {
      border-color: rgba(29, 92, 70, 0.24);
      background: rgba(213, 239, 226, 0.72);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin: 0;
    }

    .details-grid div {
      display: grid;
      gap: 6px;
    }

    dd {
      margin: 0;
    }

    .inner-label {
      margin-bottom: 6px;
    }

    .product-item {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }

    .product-meta {
      display: grid;
      justify-items: end;
      gap: 10px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      background: rgba(29, 92, 70, 0.12);
      color: #1d5c46;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .status-chip.unavailable {
      background: rgba(161, 49, 49, 0.12);
      color: #7a1f1f;
    }

    .loading-panel,
    .empty-state {
      display: grid;
      gap: 16px;
    }

    .empty-copy {
      font-weight: 600;
    }

    .ghost-action[disabled] {
      opacity: 0.7;
      cursor: progress;
    }

    @media (max-width: 900px) {
      :host {
        padding: 20px;
      }

      .hero,
      .overview-grid,
      .workspace,
      .details-grid {
        grid-template-columns: 1fr;
      }

      .preview-head,
      .panel-actions {
        align-items: flex-start;
        flex-direction: column;
      }

      .product-item {
        grid-template-columns: 1fr;
      }

      .product-meta {
        justify-items: start;
      }
    }
  `
})
export class HomePage {
  private readonly authSession = inject(AuthSessionService);
  private readonly establishmentApi = inject(EstablishmentApi);
  private readonly productApi = inject(ProductApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentAccount = this.authSession.currentAccount;
  readonly isSessionBusy = this.authSession.isLoading;
  readonly sessionFeedbackMessage = this.authSession.feedbackMessage;
  readonly sessionFeedbackKind = this.authSession.feedbackKind;
  readonly establishments = signal<Establishment[]>([]);
  readonly selectedEstablishmentId = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly areProductsLoading = signal(false);
  readonly errorMessage = signal('');
  readonly productErrorMessage = signal('');
  readonly selectedEstablishment = computed(
    () => this.establishments().find((establishment) => establishment.id === this.selectedEstablishmentId()) ?? null
  );
  readonly selectedLocation = computed(() => {
    const establishment = this.selectedEstablishment();

    if (!establishment) {
      return 'Selecione uma loja para visualizar o preview.';
    }

    return `${establishment.address.city}/${establishment.address.state}`;
  });
  readonly currentAreaLink = computed(() => this.authSession.currentArea());

  constructor() {
    this.loadEstablishments();
  }

  loginAsCustomer() {
    this.authSession.loginAs('CUSTOMER');
  }

  loginAsMerchant() {
    this.authSession.loginAs('MERCHANT');
  }

  logout() {
    void this.authSession.logout();
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
          this.errorMessage.set(
            readApiErrorMessage(error, 'Nao foi possivel carregar os dados publicos agora. Confirme se o backend local esta ativo.')
          );
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
          this.productErrorMessage.set(
            readApiErrorMessage(error, 'Nao foi possivel carregar o cardapio desta loja agora.')
          );
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