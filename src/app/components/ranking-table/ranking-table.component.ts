import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { RankingRow } from '../../core/models/ranking.model';

@Component({
  selector: 'app-ranking-table',
  imports: [TranslatePipe],
  templateUrl: './ranking-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RankingTableComponent {
  readonly rows = input.required<RankingRow[]>();
}
