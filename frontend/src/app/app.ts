import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { AppFeedbackModal } from './app-feedback-modal';
import { AuthSessionService } from './features/account/auth-session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppFeedbackModal],
  template: '<router-outlet /><app-feedback-modal />',
  styleUrl: './app.scss'
})
export class App {
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.authSession.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
