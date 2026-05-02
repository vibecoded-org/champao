import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Cog, LucideAngularModule, RefreshCw, X } from 'lucide-angular';
import { ChampionshipStoreService } from '../../core/services/championship-store.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  protected readonly cogIcon = Cog;
  protected readonly refreshIcon = RefreshCw;
  protected readonly closeIcon = X;
  protected readonly regenerateConfirmOpen = signal(false);
  protected readonly i18n = inject(I18nService);

  protected readonly navItems = [
    { label: 'nav.fixtures', path: '/fixtures' },
    { label: 'nav.ranking', path: '/ranking' }
  ];

  constructor(
    protected readonly store: ChampionshipStoreService,
    protected readonly toast: ToastService
  ) {}

  protected requestGenerateFixtures(): void {
    if (this.store.fixtures().length > 0) {
      this.regenerateConfirmOpen.set(true);
      return;
    }

    const result = this.store.generateFixtures(false);
    if (result.ok) {
      this.toast.show(this.i18n.translate('toast.fixturesGenerated'), 'success');
    } else {
      this.toast.show(this.i18n.translate('toast.fixturesGenerateFailed'), 'error');
    }
  }

  protected generateFixtures(force: boolean): void {
    const result = this.store.generateFixtures(force);
    if (result.ok) {
      this.toast.show(this.i18n.translate('toast.fixturesGenerated'), 'success');
    } else {
      this.toast.show(this.i18n.translate('toast.fixturesGenerateFailed'), 'error');
    }
    this.regenerateConfirmOpen.set(false);
  }
}
