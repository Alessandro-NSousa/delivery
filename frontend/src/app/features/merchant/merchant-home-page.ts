import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CurrentAccountApi } from '../account/current-account-api';
import { CurrentAccount } from '../account/current-account.models';
import { readApiErrorMessage } from '../establishments/api-error';
import { EstablishmentApi } from '../establishments/establishment-api';
import {
  CreateEstablishmentRequest,
  Establishment,
  EstablishmentCategory,
  establishmentCategoryOptions
} from '../establishments/establishment.models';
import { ProductApi } from '../products/product-api';
import { CreateProductRequest, Product, ProductCategory, productCategoryOptions } from '../products/product.models';

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
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type EstablishmentFormField = keyof typeof initialEstablishmentFormValue;
type ProductFormField = keyof typeof initialProductFormValue;

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
          <a routerLink="/cliente" class="secondary-link">Abrir area do cliente</a>
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
                  <input formControlName="cnpj" inputmode="numeric" placeholder="Somente 14 digitos" />
                  @if (establishmentFieldInvalid('cnpj')) {
                    <small>Informe um CNPJ com 14 digitos.</small>
                  }
                </label>

                <label>
                  <span>Telefone</span>
                  <input formControlName="phone" placeholder="Ex.: 11999999999" />
                  @if (establishmentFieldInvalid('phone')) {
                    <small>Informe um telefone para contato.</small>
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
                  <span>CEP</span>
                  <input formControlName="zipCode" inputmode="numeric" placeholder="Somente 8 digitos" />
                  @if (establishmentFieldInvalid('zipCode')) {
                    <small>Informe um CEP com 8 digitos.</small>
                  }
                </label>

                <label>
                  <span>Rua</span>
                  <input formControlName="street" placeholder="Rua ou avenida" />
                  @if (establishmentFieldInvalid('street')) {
                    <small>Informe a rua.</small>
                  }
                </label>

                <label>
                  <span>Numero</span>
                  <input formControlName="number" placeholder="Numero" />
                  @if (establishmentFieldInvalid('number')) {
                    <small>Informe o numero.</small>
                  }
                </label>

                <label>
                  <span>Bairro</span>
                  <input formControlName="district" placeholder="Bairro" />
                  @if (establishmentFieldInvalid('district')) {
                    <small>Informe o bairro.</small>
                  }
                </label>

                <label>
                  <span>Cidade</span>
                  <input formControlName="city" placeholder="Cidade" />
                  @if (establishmentFieldInvalid('city')) {
                    <small>Informe a cidade.</small>
                  }
                </label>

                <label>
                  <span>UF</span>
                  <input formControlName="state" maxlength="2" placeholder="SP" />
                  @if (establishmentFieldInvalid('state')) {
                    <small>Informe a UF com 2 letras.</small>
                  }
                </label>

                <label class="full-width">
                  <span>Complemento</span>
                  <input formControlName="complement" placeholder="Opcional" />
                </label>
              </div>

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

    .chip,
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
    .secondary-button[disabled] {
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
    .product-preview-list {
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
      .side-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `
})
export class MerchantHomePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly currentAccountApi = inject(CurrentAccountApi);
  private readonly establishmentApi = inject(EstablishmentApi);
  private readonly productApi = inject(ProductApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = establishmentCategoryOptions;
  readonly productCategories = productCategoryOptions;
  readonly isWorkspaceLoading = signal(true);
  readonly isSubmittingEstablishment = signal(false);
  readonly isSubmittingProduct = signal(false);
  readonly isCatalogLoading = signal(false);
  readonly isProductsLoading = signal(false);
  readonly establishmentSuccessMessage = signal('');
  readonly establishmentErrorMessage = signal('');
  readonly productSuccessMessage = signal('');
  readonly productErrorMessage = signal('');
  readonly catalogErrorMessage = signal('');
  readonly accessMessage = signal('');
  readonly currentAccount = signal<CurrentAccount | null>(null);
  readonly establishments = signal<Establishment[]>([]);
  readonly selectedEstablishmentId = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly canManageCatalog = computed(() => this.currentAccount()?.profile === 'MERCHANT');
  readonly selectedEstablishment = computed(
    () => this.establishments().find((establishment) => establishment.id === this.selectedEstablishmentId()) ?? null
  );

  readonly establishmentForm = this.formBuilder.nonNullable.group({
    tradeName: [initialEstablishmentFormValue.tradeName, [Validators.required]],
    corporateName: [initialEstablishmentFormValue.corporateName, [Validators.required]],
    cnpj: [initialEstablishmentFormValue.cnpj, [Validators.required, Validators.pattern(/^\d{14}$/)]],
    phone: [initialEstablishmentFormValue.phone, [Validators.required]],
    email: [initialEstablishmentFormValue.email, [Validators.required, Validators.email]],
    category: [initialEstablishmentFormValue.category, [Validators.required]],
    openingHours: [initialEstablishmentFormValue.openingHours, [Validators.required]],
    zipCode: [initialEstablishmentFormValue.zipCode, [Validators.required, Validators.pattern(/^\d{8}$/)]],
    street: [initialEstablishmentFormValue.street, [Validators.required]],
    number: [initialEstablishmentFormValue.number, [Validators.required]],
    district: [initialEstablishmentFormValue.district, [Validators.required]],
    city: [initialEstablishmentFormValue.city, [Validators.required]],
    state: [initialEstablishmentFormValue.state, [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
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
    this.loadWorkspace();
  }

  reloadWorkspace() {
    this.loadWorkspace(this.selectedEstablishmentId() ?? undefined);
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

    this.selectedEstablishmentId.set(establishmentId);
    this.loadProducts(establishmentId);
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

  formatPrice(price: number) {
    return brlFormatter.format(price);
  }

  private loadWorkspace(preferredEstablishmentId?: string) {
    this.isWorkspaceLoading.set(true);
    this.accessMessage.set('');
    this.catalogErrorMessage.set('');

    this.currentAccountApi
      .getCurrent()
      .pipe(
        finalize(() => this.isWorkspaceLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (account) => {
          this.currentAccount.set(account);

          if (account.profile !== 'MERCHANT') {
            this.establishments.set([]);
            this.selectedEstablishmentId.set(null);
            this.products.set([]);
            this.accessMessage.set('Sua sessao atual nao possui perfil de lojista.');
            return;
          }

          this.loadEstablishments(preferredEstablishmentId);
        },
        error: (error: unknown) => {
          this.currentAccount.set(null);
          this.establishments.set([]);
          this.selectedEstablishmentId.set(null);
          this.products.set([]);
          this.accessMessage.set(
            readApiErrorMessage(error, 'Sessao de lojista necessaria para gerenciar estabelecimentos e produtos.')
          );
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

  private syncSelection(establishments: Establishment[], preferredEstablishmentId?: string) {
    if (establishments.length === 0) {
      this.selectedEstablishmentId.set(null);
      this.products.set([]);
      return;
    }

    const currentSelection = preferredEstablishmentId ?? this.selectedEstablishmentId();
    const selectedExists = currentSelection
      ? establishments.some((establishment) => establishment.id === currentSelection)
      : false;
    const nextSelection = selectedExists ? currentSelection : establishments[0].id;

    if (nextSelection) {
      this.selectedEstablishmentId.set(nextSelection);
      this.loadProducts(nextSelection);
    }
  }

  private toEstablishmentRequest(): CreateEstablishmentRequest {
    const value = this.establishmentForm.getRawValue();

    return {
      tradeName: value.tradeName.trim(),
      corporateName: value.corporateName.trim(),
      cnpj: digitsOnly(value.cnpj),
      phone: value.phone.trim(),
      email: value.email.trim(),
      category: value.category,
      openingHours: value.openingHours.trim(),
      address: {
        zipCode: digitsOnly(value.zipCode),
        street: value.street.trim(),
        number: value.number.trim(),
        district: value.district.trim(),
        city: value.city.trim(),
        state: value.state.trim().toUpperCase(),
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

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}