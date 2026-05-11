import { DOCUMENT } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ErrorPageStateService } from './error-page-state.service';

@Component({
  selector: 'app-error-page',
  imports: [RouterLink],
  template: `
    <main class="page-shell">
      <section class="error-card">
        <p class="eyebrow">{{ code() || 'Erro de aplicacao' }}</p>
        <h1>{{ title() }}</h1>
        <p class="summary">{{ message() }}</p>

        @if (details()) {
          <pre class="details">{{ details() }}</pre>
        }

        <div class="actions">
          <a routerLink="/" class="primary-action" (click)="clearError()">Voltar ao inicio</a>
          <button type="button" class="secondary-action" (click)="reload()">Tentar novamente</button>
        </div>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      padding: 32px;
    }

    .page-shell {
      min-height: calc(100vh - 64px);
      display: grid;
      place-items: center;
    }

    .error-card {
      width: min(760px, 100%);
      display: grid;
      gap: 20px;
      padding: 32px;
      border-radius: 28px;
      background: rgba(255, 252, 247, 0.92);
      border: 1px solid rgba(23, 49, 38, 0.08);
      box-shadow: 0 24px 60px rgba(65, 53, 34, 0.12);
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      color: #7d4f2f;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      font-size: clamp(2.6rem, 6vw, 4rem);
      line-height: 0.96;
      color: #173126;
    }

    .summary {
      margin: 0;
      color: #3f5144;
      line-height: 1.7;
      font-size: 1.04rem;
      max-width: 58ch;
    }

    .details {
      margin: 0;
      overflow: auto;
      padding: 18px;
      border-radius: 20px;
      background: #173126;
      color: #f7f1e6;
      font: 0.92rem/1.55 'Cascadia Code', 'Consolas', monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .primary-action,
    .secondary-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 18px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
      font: inherit;
      cursor: pointer;
    }

    .primary-action {
      border: none;
      background: #173126;
      color: #f7f1e6;
    }

    .secondary-action {
      border: 1px solid rgba(23, 49, 38, 0.12);
      background: rgba(23, 49, 38, 0.06);
      color: #173126;
    }

    @media (max-width: 900px) {
      :host {
        padding: 20px;
      }

      .error-card {
        padding: 24px;
      }
    }
  `
})
export class ErrorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly errorPageState = inject(ErrorPageStateService);

  readonly title = computed(() => this.resolveValue('title', 'Algo saiu do fluxo esperado'));
  readonly message = computed(() => this.resolveValue('message', 'A aplicacao encontrou um erro inesperado.'));
  readonly details = computed(() => this.resolveValue('details', ''));
  readonly code = computed(() => this.resolveValue('code', ''));

  clearError() {
    this.errorPageState.clear();
  }

  reload() {
    this.clearError();
    this.document.defaultView?.location.reload();
  }

  private resolveValue(field: 'title' | 'message' | 'details' | 'code', fallback: string) {
    const routeValue = this.route.snapshot.data[field] as string | undefined;

    if (routeValue) {
      return routeValue;
    }

    return this.errorPageState.currentError()?.[field] ?? fallback;
  }
}