import { TestBed } from '@angular/core/testing';

import { RendaFixaService } from './renda-fixa.service';

describe('RendaFixaService', () => {
  let service: RendaFixaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RendaFixaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
