import { Injectable, signal } from '@angular/core';

export interface ErrorPageState {
  title: string;
  message: string;
  details?: string;
  code?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorPageStateService {
  readonly currentError = signal<ErrorPageState | null>(null);

  set(error: ErrorPageState) {
    this.currentError.set(error);
  }

  clear() {
    this.currentError.set(null);
  }
}