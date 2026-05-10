import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { CreateEstablishmentRequest, Establishment } from './establishment.models';

@Injectable({ providedIn: 'root' })
export class EstablishmentApi {
  private readonly http = inject(HttpClient);

  listPublic() {
    return this.http.get<Establishment[]>('/api/public/establishments');
  }

  listMine() {
    return this.http.get<Establishment[]>('/api/me/establishments');
  }

  create(request: CreateEstablishmentRequest) {
    return this.http.post<Establishment>('/api/establishments', request);
  }
}