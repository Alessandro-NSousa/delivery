import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, from, map, tap } from 'rxjs';

import { AccountProfile, CurrentAccount } from './current-account.models';

const loginIntentStorageKey = 'delivery.auth.login-intent';

interface LoginIntent {
  profile: AccountProfile;
  redirectPath: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  readonly currentAccount = signal<CurrentAccount | null>(null);
  readonly isLoading = signal(false);
  readonly feedbackMessage = signal('');
  readonly feedbackKind = signal<'info' | 'error'>('info');
  readonly isAuthenticated = computed(() => this.currentAccount() !== null);
  readonly currentProfile = computed(() => this.currentAccount()?.profile ?? null);
  readonly currentArea = computed(() => {
    const profile = this.currentProfile();

    return profile ? this.defaultRedirectPath(profile) : '/';
  });

  refresh() {
    this.isLoading.set(true);
    this.clearFeedback();

    return from(this.readCurrentAccount()).pipe(
      tap(({ account, message, kind }) => {
        this.currentAccount.set(account);

        if (message) {
          this.setFeedback(message, kind);
          return;
        }

        if (account) {
          this.handleLoginIntent(account);
        }
      }),
      map(({ account }) => account),
      finalize(() => this.isLoading.set(false))
    );
  }

  loginAs(profile: AccountProfile, redirectPath = this.defaultRedirectPath(profile)) {
    const account = this.currentAccount();

    if (account) {
      if (account.profile !== profile) {
        this.setFeedback(
          `Sua sessao atual esta com perfil ${account.profile}. Encerre a sessao e entre com a conta esperada para acessar a area de ${this.profileLabel(profile)}.`,
          'error'
        );
        void this.router.navigateByUrl(this.defaultRedirectPath(account.profile));
        return;
      }

      this.clearFeedback();
      void this.router.navigateByUrl(redirectPath);
      return;
    }

    this.writeLoginIntent({ profile, redirectPath });
    this.clearFeedback();
    this.document.defaultView?.location.assign(`/oauth2/authorization/auth0?profile=${profile}`);
  }

  async logout(redirectPath = '/') {
    const browser = this.document.defaultView;

    if (!browser) {
      return;
    }

    this.isLoading.set(true);
    this.clearFeedback();
    this.clearLoginIntent();

    try {
      const response = await browser.fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'manual'
      });

      if (!response.ok && !this.isExpectedUnauthenticatedResponse(response)) {
        throw new Error('logout-failed');
      }

      this.currentAccount.set(null);
      void this.router.navigateByUrl(redirectPath);
    } catch {
      this.setFeedback('Nao foi possivel encerrar a sessao agora.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFeedback() {
    this.feedbackMessage.set('');
    this.feedbackKind.set('info');
  }

  private handleLoginIntent(account: CurrentAccount) {
    const intent = this.consumeLoginIntent();

    if (!intent) {
      return;
    }

    if (account.profile !== intent.profile) {
      this.setFeedback(
        `A autenticacao retornou com perfil ${account.profile}. O backend define o perfil ativo da sessao; voce foi redirecionado para a area compativel.`,
        'error'
      );
      void this.router.navigateByUrl(this.defaultRedirectPath(account.profile));
      return;
    }

    void this.router.navigateByUrl(intent.redirectPath);
  }

  private async readCurrentAccount() {
    const browser = this.document.defaultView;

    if (!browser) {
      return { account: null, message: '', kind: 'info' as const };
    }

    try {
      const response = await browser.fetch('/api/me', {
        method: 'GET',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: {
          Accept: 'application/json'
        }
      });

      if (this.isExpectedUnauthenticatedResponse(response)) {
        return { account: null, message: '', kind: 'info' as const };
      }

      if (response.ok) {
        return {
          account: (await response.json()) as CurrentAccount,
          message: '',
          kind: 'info' as const
        };
      }

      return {
        account: null,
        message: await this.readCurrentAccountErrorMessage(response),
        kind: 'error' as const
      };
    } catch {
      return {
        account: null,
        message: 'Nao foi possivel verificar a sessao agora. Confirme se o backend local esta ativo.',
        kind: 'error' as const
      };
    }
  }

  private isExpectedUnauthenticatedResponse(response: Response) {
    return response.status === 401 || response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
  }

  private async readCurrentAccountErrorMessage(response: Response) {
    const fallback = 'Nao foi possivel verificar a sessao agora. Confirme se o backend local esta ativo.';
    const contentType = response.headers.get('content-type') ?? '';

    try {
      if (contentType.includes('application/json')) {
        const body = (await response.json()) as {
          detail?: string;
          message?: string;
          errors?: string[];
        };

        if (body.errors?.length) {
          return body.errors.join(' | ');
        }

        return body.detail ?? body.message ?? fallback;
      }

      const text = await response.text();
      return text.trim() || fallback;
    } catch {
      return fallback;
    }
  }

  private defaultRedirectPath(profile: AccountProfile) {
    return profile === 'MERCHANT' ? '/estabelecimento' : '/cliente';
  }

  private profileLabel(profile: AccountProfile) {
    return profile === 'MERCHANT' ? 'lojista' : 'cliente';
  }

  private writeLoginIntent(intent: LoginIntent) {
    this.document.defaultView?.sessionStorage.setItem(loginIntentStorageKey, JSON.stringify(intent));
  }

  private consumeLoginIntent() {
    const storage = this.document.defaultView?.sessionStorage;
    const serialized = storage?.getItem(loginIntentStorageKey);

    if (!storage || !serialized) {
      return null;
    }

    storage.removeItem(loginIntentStorageKey);

    try {
      const intent = JSON.parse(serialized) as Partial<LoginIntent>;

      if (
        (intent.profile === 'CUSTOMER' || intent.profile === 'MERCHANT') &&
        typeof intent.redirectPath === 'string' &&
        intent.redirectPath.startsWith('/')
      ) {
        return intent as LoginIntent;
      }
    } catch {
      return null;
    }

    return null;
  }

  private clearLoginIntent() {
    this.document.defaultView?.sessionStorage.removeItem(loginIntentStorageKey);
  }

  private setFeedback(message: string, kind: 'info' | 'error') {
    this.feedbackMessage.set(message);
    this.feedbackKind.set(kind);
  }
}