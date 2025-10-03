import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelBroker01Component } from './painel-broker01.component';

describe('PainelBroker01Component', () => {
  let component: PainelBroker01Component;
  let fixture: ComponentFixture<PainelBroker01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelBroker01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelBroker01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
