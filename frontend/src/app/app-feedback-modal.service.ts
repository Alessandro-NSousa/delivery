import { Injectable, signal } from '@angular/core';

export type FeedbackModalKind = 'success' | 'error';

interface FeedbackModalState {
  readonly kind: FeedbackModalKind;
  readonly title: string;
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackModalService {
  readonly current = signal<FeedbackModalState | null>(null);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  showSuccess(message: string, title = 'Operacao concluida') {
    this.show({
      kind: 'success',
      title,
      message
    });
  }

  showError(message = 'Algo deu errado. Tente novamente.', title = 'Operacao nao concluida') {
    this.show({
      kind: 'error',
      title,
      message
    });
  }

  close() {
    this.clearHideTimer();
    this.current.set(null);
  }

  private show(modal: FeedbackModalState) {
    this.clearHideTimer();
    this.current.set(modal);

    this.hideTimer = setTimeout(() => {
      this.current.set(null);
      this.hideTimer = null;
    }, 4500);
  }

  private clearHideTimer() {
    if (this.hideTimer === null) {
      return;
    }

    clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
}