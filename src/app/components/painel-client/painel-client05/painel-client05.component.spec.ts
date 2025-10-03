import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient05Component } from './painel-client05.component';

describe('PainelClient05Component', () => {
  let component: PainelClient05Component;
  let fixture: ComponentFixture<PainelClient05Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient05Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
