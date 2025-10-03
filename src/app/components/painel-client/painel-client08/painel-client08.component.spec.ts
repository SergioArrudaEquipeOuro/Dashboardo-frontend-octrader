import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient08Component } from './painel-client08.component';

describe('PainelClient08Component', () => {
  let component: PainelClient08Component;
  let fixture: ComponentFixture<PainelClient08Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient08Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient08Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
