import { TestBed } from '@angular/core/testing';

import { UtipService } from './utip.service';

describe('UtipService', () => {
  let service: UtipService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtipService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
