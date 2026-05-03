import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Plus, Trash2, X } from 'lucide-angular';

const ARG_ID = 'team-297d8bba-6d29-4f43-9ba4-dd8b01296d5d';
const BRA_ID = 'team-9809bcde-a9b2-49be-a354-e7a0e5aa6ff7';
const FRA_ID = 'team-a22e72fd-2a2f-4766-ae97-bb335f7aa05b';
const POR_ID = 'team-2a88a8e4-808c-43b6-9a87-dd3eafbf6283';

function samplePlayers(teamId: string, code: string, names: string[]) {
  return names.map((name, i) => ({ id: `player-sample-${code}-${String(i + 1).padStart(2, '0')}`, teamId, name }));
}

const SAMPLE_STATE_JSON = JSON.stringify({
  version: 3,
  config: {
    name: 'World Cup',
    mode: 'both',
    league: { homeAndAway: false, pointsWin: 3, pointsDraw: 1, pointsLoss: 0 },
    cup: { homeAndAway: true, singleElimination: true, uniqueFinalMatch: false, drawTiebreaker: 'penalties' },
    discipline: { yellowCardsThreshold: 2, yellowSuspensionGames: 1, redCardsThreshold: 1, redSuspensionGames: 1 },
    rankingCriteria: [
      { field: 'points', direction: 'desc' }, { field: 'victories', direction: 'desc' },
      { field: 'goalDifference', direction: 'desc' }, { field: 'goalsFor', direction: 'desc' }
    ]
  },
  teams: [
    { id: ARG_ID, name: 'Argentina', displayName: 'ARG', flag: '🇦🇷', color: '#71b3e5' },
    { id: BRA_ID, name: 'Brasil',    displayName: 'BRA', flag: '🇧🇷', color: '#c2d71d' },
    { id: FRA_ID, name: 'França',    displayName: 'FRA', flag: '🇫🇷', color: '#1d4ed8' },
    { id: POR_ID, name: 'Portugal',  displayName: 'POR', flag: '🇵🇹', color: '#d71d1d' }
  ],
  players: [
    ...samplePlayers(ARG_ID, 'ARG', [
      'Walter Benítez','Juan Foyth','Nicolás Tagliafico','Lisandro Martínez','Leandro Paredes',
      'Leonardo Balerdi','Rodrigo De Paul','Enzo Fernández','Julián Alvarez','Lionel Messi',
      'Thiago Almada','Gerónimo Rulli','Cristian Romero','Exequiel Palacios','Nicolás González',
      'Nahuel Molina','Gonzalo Montiel','Marcos Acuña','Nicolás Otamendi','Alexis Mac Allister',
      'Giovani Lo Celso','Lautaro Martínez','Emiliano Martínez','Paulo Dybala','Alejandro Garnacho',
      'Germán Pezzella'
    ]),
    ...samplePlayers(BRA_ID, 'BRA', [
      'Weverton','Danilo','Alexsandro','Marquinhos','Bruno Guimarães',
      'Douglas Luiz','Joelinton','Éderson','João Pedro','Neymar Jr',
      'Raphinha','Bento','Yan Couto','Gabriel Magalhães','Caio Henrique',
      'Carlos Augusto','André','Gabriel Martinelli','Luiz Henrique','Savinho',
      'Igor Jesus','Lucas Perri','David Neres','Lucas Paquetá','Gerson',
      'Evanilson'
    ]),
    ...samplePlayers(FRA_ID, 'FRA', [
      'Brice Samba','Benjamin Pavard','Lucas Digne','Dayot Upamecano','Jules Koundé',
      'Eduardo Camavinga','Ousmane Dembélé','Aurélien Tchouaméni','Marcus Thuram','Kylian Mbappé',
      'Michael Olise','Randal Kolo Muani','Kouadio Koné','Adrien Rabiot','Ibrahima Konaté',
      'Mike Maignan','William Saliba','Warren Zaïre-Emery','Matteo Guendouzi','Bradley Barcola',
      'Jonathan Clauss','Théo Hernández','Lucas Chevalier','Désiré Doué','N\'Golo Kanté',
      'Youssouf Fofana'
    ]),
    ...samplePlayers(POR_ID, 'POR', [
      'Diogo Costa','Nélson Semedo','Rúben Dias','António Silva','Diogo Dalot',
      'João Palhinha','Cristiano Ronaldo','Bruno Fernandes','Gonçalo Ramos','Bernardo Silva',
      'João Félix','José Sá','Tomás Araújo','Gonçalo Inácio','João Neves',
      'Francisco Trincão','Rafael Leão','Pedro Neto','Nuno Mendes','João Cancelo',
      'Rúben Neves','Rui Silva','Vitinha','Matheus Nunes','Geovany Quenda',
      'Francisco Conceição'
    ])
  ],
  fixturesByCompetition: { league: [], cup: [] }
});
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
    LucideAngularModule,
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
  protected readonly plusIcon = Plus;
  protected readonly pencilIcon = Pencil;
  protected readonly trashIcon = Trash2;
  protected readonly closeIcon = X;

  protected readonly activeTab = signal<'settings' | 'teams' | 'players' | 'data'>('settings');
  protected readonly teamModalOpen = signal(false);
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
  protected readonly sampleDataConfirmOpen = signal(false);
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

    this.cancelEditTeam();
  }

  protected openAddTeamModal(): void {
    this.editingTeamId.set(null);
    this.createTeamName.set('');
    this.createTeamDisplayName.set('');
    this.createTeamFlag.set('');
    this.createTeamColor.set('#1d4ed8');
    this.teamModalOpen.set(true);
  }

  protected startEditTeam(team: Team): void {
    this.editingTeamId.set(team.id);
    this.editingTeamName.set(team.name);
    this.editingTeamDisplayName.set(team.displayName ?? '');
    this.editingTeamFlag.set(team.flag ?? '');
    this.editingTeamColor.set(team.color ?? '#1d4ed8');
    this.teamModalOpen.set(true);
  }

  protected cancelEditTeam(): void {
    this.editingTeamId.set(null);
    this.editingTeamName.set('');
    this.editingTeamDisplayName.set('');
    this.editingTeamFlag.set('');
    this.editingTeamColor.set('#1d4ed8');
    this.teamModalOpen.set(false);
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
    this.toast.show(this.i18n.translate('toast.teamUpdated'), 'success');
    this.cancelEditTeam();
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

  protected loadSampleData(): void {
    const result = this.store.importState(SAMPLE_STATE_JSON);
    this.sampleDataConfirmOpen.set(false);
    if (result.ok) {
      this.toast.show(this.i18n.translate('toast.sampleDataLoaded'), 'success');
    } else {
      this.toast.show(this.i18n.translate('toast.importFailed', { errors: (result.errors ?? []).join(', ') }), 'error');
    }
  }
}
