import { HttpErrorResponse } from '@angular/common/http';

import { ApiProblem } from './establishment.models';

export function readApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return 'Sua sessao nao esta autenticada. Entre como lojista para continuar.';
    }

    if (error.status === 403) {
      return 'Sua conta nao tem permissao para executar esta operacao.';
    }

    const apiProblem = error.error as ApiProblem | null;

    if (apiProblem?.errors?.length) {
      return apiProblem.errors.join(' | ');
    }

    if (apiProblem?.detail) {
      return apiProblem.detail;
    }
  }

  return fallback;
}