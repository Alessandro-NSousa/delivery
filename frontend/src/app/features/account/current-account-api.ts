import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CurrentAccount } from './current-account.models';

@Injectable({ providedIn: 'root' })
export class CurrentAccountApi {
  private readonly http = inject(HttpClient);

  getCurrent() {
    return this.http.get<CurrentAccount>('/api/me');
  }
}