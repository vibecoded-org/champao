import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { ScorerRankingRow } from '../../core/models/ranking.model';

@Component({
  selector: 'app-scorers-ranking',
  imports: [TranslatePipe],
  templateUrl: './scorers-ranking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScorersRankingComponent {
  readonly rows = input.required<ScorerRankingRow[]>();
}
