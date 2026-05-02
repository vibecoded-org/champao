import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { Check, FileUp, LucideAngularModule, Plus, Trash2, X } from 'lucide-angular';
import { Player } from '../../core/models/player.model';
import { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-players-management',
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './scorers-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScorersManagementComponent {
  protected readonly i18n = inject(I18nService);
  readonly teams = input.required<Team[]>();
  readonly players = input.required<Player[]>();
  readonly playerGoals = input.required<Record<string, number>>();

  readonly addPlayer = output<{ teamId: string; name: string }>();
  readonly renamePlayer = output<{ playerId: string; name: string }>();
  readonly removePlayer = output<string>();

  protected readonly importIcon = FileUp;
  protected readonly addIcon = Plus;
  protected readonly saveIcon = Check;
  protected readonly trashIcon = Trash2;
  protected readonly closeIcon = X;
  protected readonly activeTeamId = signal<string | null>(null);
  protected readonly importModalOpen = signal(false);
  protected readonly importText = signal('');

  protected playersForTeam(teamId: string): Player[] {
    return this.players().filter((player) => player.teamId === teamId);
  }

  protected readonly activeTeam = computed(() => {
    const teamId = this.activeTeamId();
    const teams = this.teams();
    if (!teamId) {
      return teams[0] ?? null;
    }
    return teams.find((team) => team.id === teamId) ?? teams[0] ?? null;
  });

  protected setActiveTeam(teamId: string): void {
    this.activeTeamId.set(teamId);
  }

  protected openImportModal(): void {
    this.importText.set('');
    this.importModalOpen.set(true);
  }

  protected closeImportModal(): void {
    this.importModalOpen.set(false);
    this.importText.set('');
  }

  protected updateImportText(value: string): void {
    this.importText.set(value);
  }


  protected importLineCount(): number {
    return this.importText()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length;
  }

  protected importPlayers(teamId: string): void {
    const players = this.importText()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const name of players) {
      this.addPlayer.emit({ teamId, name });
    }

    this.closeImportModal();
  }
}
