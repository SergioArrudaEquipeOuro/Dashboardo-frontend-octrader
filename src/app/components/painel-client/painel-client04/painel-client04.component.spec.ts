import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient04Component } from './painel-client04.component';

describe('PainelClient04Component', () => {
  let component: PainelClient04Component;
  let fixture: ComponentFixture<PainelClient04Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient04Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient04Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
