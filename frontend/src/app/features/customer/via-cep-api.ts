import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

export interface ViaCepAddress {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ViaCepApi {
  private readonly http = inject(HttpClient);

  lookup(zipCode: string) {
    const normalizedZipCode = zipCode.replace(/\D/g, '');

    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${normalizedZipCode}/json/`).pipe(
      map((response) => {
        if (response.erro) {
          return null;
        }

        return {
          zipCode: normalizedZipCode,
          street: response.logradouro,
          district: response.bairro,
          city: response.localidade,
          state: response.uf
        } satisfies ViaCepAddress;
      })
    );
  }
}