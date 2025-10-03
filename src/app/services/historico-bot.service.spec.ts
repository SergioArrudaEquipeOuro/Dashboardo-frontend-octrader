import { TestBed } from '@angular/core/testing';

import { HistoricoBotService } from './historico-bot.service';

describe('HistoricoBotService', () => {
  let service: HistoricoBotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistoricoBotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
