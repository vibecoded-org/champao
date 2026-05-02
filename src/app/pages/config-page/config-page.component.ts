import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChampionshipStoreService } from '../../core/services/championship-store.service';
import { ToastService } from '../../core/services/toast.service';
import { ChampionshipFormatFormComponent } from '../../components/championship-format-form/championship-format-form.component';
import { ImportExportPanelComponent } from '../../components/import-export-panel/import-export-panel.component';
import { RankingCriteriaFormComponent } from '../../components/ranking-criteria-form/ranking-criteria-form.component';
import { ScorersManagementComponent } from '../../components/scorers-management/scorers-management.component';
import { Team } from '../../core/models/team.model';
import { I18nService, type AppLanguage } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-config-page',
  imports: [
    FormsModule,
    ChampionshipFormatFormComponent,
    RankingCriteriaFormComponent,
    ScorersManagementComponent,
    ImportExportPanelComponent,
    TranslatePipe
  ],
  templateUrl: './config-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigPageComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly activeTab = signal<'settings' | 'teams' | 'players' | 'data'>('settings');
  protected readonly createTeamName = signal('');
  protected readonly createTeamDisplayName = signal('');
  protected readonly createTeamFlag = signal('');
  protected readonly createTeamColor = signal('#1d4ed8');

  protected readonly playerGoals = computed(() => {
    const goals: Record<string, number> = {};
    for (const player of this.store.players()) {
      goals[player.id] = this.store.playerGoals(player.id);
    }
    return goals;
  });

  protected readonly editingTeamId = signal<string | null>(null);
  protected readonly editingTeamName = signal('');
  protected readonly editingTeamDisplayName = signal('');
  protected readonly editingTeamFlag = signal('');
  protected readonly editingTeamColor = signal('#1d4ed8');

  protected readonly deleteTeamId = signal<string | null>(null);
  protected readonly deletePlayerId = signal<string | null>(null);
  protected readonly importFile = signal<File | null>(null);
  protected readonly importConfirmOpen = signal(false);
  protected readonly resetConfirmOpen = signal(false);
  protected readonly language = this.i18n.language;
  protected readonly availableLanguages = this.i18n.availableLanguages;

  constructor(
    protected readonly store: ChampionshipStoreService,
    private readonly toast: ToastService
  ) {}

  protected addTeam(team: Omit<Team, 'id'>): void {
    this.store.addTeam(team);
    this.toast.show(this.i18n.translate('toast.teamAdded'), 'success');
  }

  protected createTeam(): void {
    const name = this.createTeamName().trim();
    if (!name) {
      return;
    }

    this.addTeam({
      name,
      displayName: this.createTeamDisplayName().trim() || undefined,
      flag: this.createTeamFlag().trim() || undefined,
      color: this.createTeamColor().trim() || undefined
    });

    this.createTeamName.set('');
    this.createTeamDisplayName.set('');
    this.createTeamFlag.set('');
    this.createTeamColor.set('#1d4ed8');
  }

  protected startEditTeam(team: Team): void {
    this.editingTeamId.set(team.id);
    this.editingTeamName.set(team.name);
    this.editingTeamDisplayName.set(team.displayName ?? '');
    this.editingTeamFlag.set(team.flag ?? '');
    this.editingTeamColor.set(team.color ?? '#1d4ed8');
  }

  protected cancelEditTeam(): void {
    this.editingTeamId.set(null);
    this.editingTeamName.set('');
    this.editingTeamDisplayName.set('');
    this.editingTeamFlag.set('');
    this.editingTeamColor.set('#1d4ed8');
  }

  protected saveEditTeam(teamId: string): void {
    const name = this.editingTeamName().trim();
    if (!name) {
      return;
    }

    this.store.updateTeam(teamId, {
      name,
      displayName: this.editingTeamDisplayName().trim() || undefined,
      flag: this.editingTeamFlag().trim() || undefined,
      color: this.editingTeamColor().trim() || undefined
    });
    this.cancelEditTeam();
    this.toast.show(this.i18n.translate('toast.teamUpdated'), 'success');
  }

  protected confirmRemoveTeam(teamId: string): void {
    this.deleteTeamId.set(teamId);
  }

  protected removeTeam(): void {
    const teamId = this.deleteTeamId();
    if (!teamId) {
      return;
    }

    this.store.removeTeam(teamId);
    this.deleteTeamId.set(null);
    this.toast.show(this.i18n.translate('toast.teamRemoved'), 'success');
  }

  protected addPlayer(payload: { teamId: string; name: string }): void {
    if (!payload.name.trim()) {
      return;
    }
    this.store.addPlayer({ teamId: payload.teamId, name: payload.name.trim() });
    this.toast.show(this.i18n.translate('toast.playerAdded'), 'success');
  }

  protected renamePlayer(payload: { playerId: string; name: string }): void {
    if (!payload.name.trim()) {
      return;
    }
    this.store.updatePlayer(payload.playerId, payload.name.trim());
    this.toast.show(this.i18n.translate('toast.playerUpdated'), 'success');
  }

  protected confirmRemovePlayer(playerId: string): void {
    this.deletePlayerId.set(playerId);
  }

  protected removePlayer(): void {
    const playerId = this.deletePlayerId();
    if (!playerId) {
      return;
    }

    const deleted = this.store.removePlayer(playerId);
    this.deletePlayerId.set(null);
    this.toast.show(deleted ? this.i18n.translate('toast.playerRemoved') : this.i18n.translate('toast.playerDeleteBlocked'), deleted ? 'success' : 'warning');
  }

  protected exportState(): void {
    const json = this.store.exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `championship-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.toast.show(this.i18n.translate('toast.backupExported'), 'success');
  }

  protected requestImportState(file: File): void {
    this.importFile.set(file);
    this.importConfirmOpen.set(true);
  }

  protected async importStateFromFile(): Promise<void> {
    const file = this.importFile();
    if (!file) {
      return;
    }

    try {
      const json = await file.text();
      const result = this.store.importState(json);
      this.toast.show(result.ok ? this.i18n.translate('toast.stateImported') : this.i18n.translate('toast.importFailed', { errors: (result.errors ?? []).join(', ') }), result.ok ? 'success' : 'error');
    } catch {
      this.toast.show(this.i18n.translate('toast.failedReadFile'), 'error');
    } finally {
      this.importConfirmOpen.set(false);
      this.importFile.set(null);
    }
  }


  protected setLanguage(language: string): void {
    if (language === 'pt-BR' || language === 'en-US') {
      this.i18n.setLanguage(language as AppLanguage);
    }
  }

  protected reset(): void {
    this.store.resetChampionship();
    this.resetConfirmOpen.set(false);
    this.toast.show(this.i18n.translate('toast.championshipReset'), 'success');
  }
}
