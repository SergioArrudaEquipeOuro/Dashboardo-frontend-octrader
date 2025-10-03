import { TestBed } from '@angular/core/testing';

import { KeyPassService } from './key-pass.service';

describe('KeyPassService', () => {
  let service: KeyPassService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KeyPassService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
