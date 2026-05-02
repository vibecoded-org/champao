import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { CardsRankingRow } from '../../core/models/ranking.model';

@Component({
  selector: 'app-cards-ranking',
  imports: [TranslatePipe],
  templateUrl: './cards-ranking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardsRankingComponent {
  readonly rows = input.required<CardsRankingRow[]>();
}
