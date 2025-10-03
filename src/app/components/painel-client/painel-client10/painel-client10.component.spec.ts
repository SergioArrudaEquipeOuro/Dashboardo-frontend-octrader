import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient10Component } from './painel-client10.component';

describe('PainelClient10Component', () => {
  let component: PainelClient10Component;
  let fixture: ComponentFixture<PainelClient10Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient10Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient10Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
