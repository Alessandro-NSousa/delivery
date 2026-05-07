import { HttpErrorResponse } from '@angular/common/http';

import { ApiProblem } from './establishment.models';

export function readApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
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