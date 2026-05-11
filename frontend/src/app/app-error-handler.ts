import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ErrorPageStateService } from './features/error/error-page-state.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);
  private readonly errorPageState = inject(ErrorPageStateService);
  private isRedirecting = false;

  handleError(error: unknown): void {
    console.error(error);

    this.errorPageState.set({
      title: 'Algo saiu do fluxo esperado',
      message: 'A aplicacao encontrou um erro inesperado. Revise os detalhes e tente novamente.',
      details: this.normalizeError(error)
    });

    if (this.isRedirecting || this.router.url.startsWith('/erro')) {
      return;
    }

    this.isRedirecting = true;

    queueMicrotask(() => {
      void this.router.navigateByUrl('/erro').finally(() => {
        this.isRedirecting = false;
      });
    });
  }

  private normalizeError(error: unknown) {
    if (error instanceof Error) {
      return error.stack ?? error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return 'Nenhum detalhe adicional foi disponibilizado.';
    }
  }
}