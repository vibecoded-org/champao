import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
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
  protected readonly bestAttack = computed(() => {
    const rows = this.store.rankingTable();
    if (rows.length === 0) {
      return null;
    }

    return rows.reduce((best, row) => (row.goalsFor > best.goalsFor ? row : best), rows[0]);
  });

  protected readonly bestDefense = computed(() => {
    const rows = this.store.rankingTable();
    if (rows.length === 0) {
      return null;
    }

    return rows.reduce((best, row) => (row.goalsAgainst < best.goalsAgainst ? row : best), rows[0]);
  });

  constructor(protected readonly store: ChampionshipStoreService) {}
}
