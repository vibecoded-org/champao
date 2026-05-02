import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BarChart2, Calendar, Cog, LucideAngularModule, RefreshCw, Trophy, X } from 'lucide-angular';
import { AppScope, CompetitionScope } from '../../core/models/championship.model';
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
  protected readonly chooseScopeForGenerationOpen = signal(false);
  protected readonly i18n = inject(I18nService);

  protected readonly navItems = [
    { label: 'nav.fixtures', path: '/fixtures', icon: Calendar },
    { label: 'nav.ranking', path: '/ranking', icon: BarChart2 },
    { label: 'nav.result', path: '/result', icon: Trophy }
  ];

  constructor(
    protected readonly store: ChampionshipStoreService,
    protected readonly toast: ToastService
  ) {}

  protected selectedScope(): AppScope {
    return this.store.appScope();
  }

  protected setScope(scope: AppScope): void {
    this.store.setAppScope(scope);
  }

  protected requestGenerateFixtures(): void {
    const scope = this.store.appScope();
    if (scope === 'total') {
      this.chooseScopeForGenerationOpen.set(true);
      return;
    }

    this.requestGenerateFixturesForScope(scope);
  }

  protected requestGenerateFixturesForScope(scope: CompetitionScope): void {
    if (this.store.hasFixtures(scope)) {
      this.regenerateConfirmOpen.set(true);
      return;
    }

    const result = this.store.generateFixtures(scope, false);
    if (result.ok) {
      this.toast.show(this.i18n.translate('toast.fixturesGenerated'), 'success');
    } else {
      this.toast.show(this.i18n.translate('toast.fixturesGenerateFailed'), 'error');
    }
  }

  protected generateFixtures(force: boolean): void {
    const scope = this.store.competitionScope();
    if (!scope) {
      this.regenerateConfirmOpen.set(false);
      return;
    }

    const result = this.store.generateFixtures(scope, force);
    if (result.ok) {
      this.toast.show(this.i18n.translate('toast.fixturesGenerated'), 'success');
    } else {
      this.toast.show(this.i18n.translate('toast.fixturesGenerateFailed'), 'error');
    }
    this.regenerateConfirmOpen.set(false);
  }

  protected chooseScopeAndGenerate(scope: CompetitionScope): void {
    this.store.setAppScope(scope);
    this.chooseScopeForGenerationOpen.set(false);
    this.requestGenerateFixturesForScope(scope);
  }
}
