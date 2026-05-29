import { Component, inject } from '@angular/core';

import { FeedbackModalService } from './app-feedback-modal.service';

@Component({
  selector: 'app-feedback-modal',
  template: `
    @if (feedbackModal.current(); as modal) {
      <section class="feedback-modal-shell" aria-live="polite" aria-atomic="true">
        <article class="feedback-modal" [class.error]="modal.kind === 'error'" [class.success]="modal.kind === 'success'">
          <div class="feedback-modal__badge" aria-hidden="true">
            {{ modal.kind === 'success' ? 'OK' : '!' }}
          </div>

          <div class="feedback-modal__content">
            <p class="feedback-modal__eyebrow">{{ modal.kind === 'success' ? 'Sucesso' : 'Erro' }}</p>
            <h2 class="feedback-modal__title">{{ modal.title }}</h2>
            <p class="feedback-modal__message">{{ modal.message }}</p>
          </div>

          <button type="button" class="feedback-modal__close" (click)="close()" aria-label="Fechar mensagem">
            Fechar
          </button>
        </article>
      </section>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1200;
    }

    .feedback-modal-shell {
      display: flex;
      justify-content: flex-end;
      padding: 24px;
    }

    .feedback-modal {
      pointer-events: auto;
      width: min(100%, 420px);
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 16px;
      align-items: start;
      padding: 18px;
      border-radius: 24px;
      border: 1px solid rgba(23, 49, 38, 0.08);
      background: rgba(255, 252, 247, 0.96);
      box-shadow: 0 28px 70px rgba(38, 30, 19, 0.18);
      backdrop-filter: blur(18px);
      animation: slide-in 180ms ease-out;
    }

    .feedback-modal.success {
      border-color: rgba(29, 92, 70, 0.22);
    }

    .feedback-modal.error {
      border-color: rgba(161, 49, 49, 0.22);
    }

    .feedback-modal__badge {
      min-width: 44px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: rgba(29, 92, 70, 0.12);
      color: #1d5c46;
    }

    .feedback-modal.error .feedback-modal__badge {
      background: rgba(161, 49, 49, 0.12);
      color: #7a1f1f;
    }

    .feedback-modal__content {
      display: grid;
      gap: 4px;
    }

    .feedback-modal__eyebrow,
    .feedback-modal__title,
    .feedback-modal__message {
      margin: 0;
    }

    .feedback-modal__eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.76rem;
      font-weight: 700;
      color: #7d4f2f;
    }

    .feedback-modal__title {
      color: #173126;
      font-size: 1.1rem;
      line-height: 1.2;
    }

    .feedback-modal__message {
      color: #445247;
      line-height: 1.5;
    }

    .feedback-modal__close {
      border: none;
      background: transparent;
      color: #5a675f;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 0;
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(-12px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .feedback-modal-shell {
        justify-content: stretch;
        padding: 16px;
      }

      .feedback-modal {
        width: 100%;
        grid-template-columns: auto 1fr;
      }

      .feedback-modal__close {
        grid-column: 1 / -1;
        justify-self: end;
      }
    }
  `
})
export class AppFeedbackModal {
  readonly feedbackModal = inject(FeedbackModalService);

  close() {
    this.feedbackModal.close();
  }
}