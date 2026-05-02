import { TestBed } from '@angular/core/testing';
import { FixtureGeneratorService } from './fixture-generator.service';

describe('FixtureGeneratorService', () => {
  let service: FixtureGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FixtureGeneratorService);
  });

  it('generates league fixtures without duplicate pairing in single leg', () => {
    const fixtures = service.generateLeague(
      [
        { id: 't1', name: 'T1' },
        { id: 't2', name: 'T2' },
        { id: 't3', name: 'T3' },
        { id: 't4', name: 'T4' }
      ],
      false
    );

    expect(fixtures.length).toBe(6);
    const set = new Set(fixtures.map((item) => [item.homeTeamId, item.awayTeamId].sort().join(':')));
    expect(set.size).toBe(6);
  });
});
