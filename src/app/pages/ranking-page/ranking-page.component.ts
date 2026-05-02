import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardsRankingComponent } from '../../components/cards-ranking/cards-ranking.component';
import { RankingTableComponent } from '../../components/ranking-table/ranking-table.component';
import { ScorersRankingComponent } from '../../components/scorers-ranking/scorers-ranking.component';
import { ChampionshipStoreService } from '../../core/services/championship-store.service';
import { TranslatePipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-ranking-page',
  imports: [RankingTableComponent, ScorersRankingComponent, CardsRankingComponent, TranslatePipe],
  templateUrl: './ranking-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RankingPageComponent {
  constructor(protected readonly store: ChampionshipStoreService) {}
}
