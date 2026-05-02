import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { ChampionshipConfig, CompetitionMode } from '../../core/models/championship.model';

@Component({
  selector: 'app-championship-format-form',
  imports: [TranslatePipe],
  templateUrl: './championship-format-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChampionshipFormatFormComponent {
  readonly config = input.required<ChampionshipConfig>();
  readonly mode = input<CompetitionMode>('both');
  readonly leagueChange = output<{ homeAndAway: boolean; pointsWin: number; pointsDraw: number; pointsLoss: number }>();
  readonly cupChange = output<{ homeAndAway: boolean; singleElimination: boolean; uniqueFinalMatch: boolean; drawTiebreaker: 'away-goals' | 'penalties' }>();
  readonly disciplineChange = output<{
    yellowCardsThreshold: number;
    yellowSuspensionGames: number;
    redCardsThreshold: number;
    redSuspensionGames: number;
  }>();
}
