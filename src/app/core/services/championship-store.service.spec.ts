import { TestBed } from '@angular/core/testing';
import { ChampionshipStoreService } from './championship-store.service';

describe('ChampionshipStoreService', () => {
  let service: ChampionshipStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChampionshipStoreService);
  });

  it('persists updates and can reset', () => {
    service.addTeam({ name: 'Team A' });
    expect(service.teams().length).toBe(1);

    const raw = localStorage.getItem('champao.state.v2');
    expect(raw).toContain('Team A');

    service.resetChampionship();
    expect(service.teams().length).toBe(0);
  });

  it('imports valid json and rejects invalid json', () => {
    const exportJson = service.exportState();
    const okResult = service.importState(exportJson);
    expect(okResult.ok).toBe(true);

    const badResult = service.importState('{"broken":true}');
    expect(badResult.ok).toBe(false);
  });
});
