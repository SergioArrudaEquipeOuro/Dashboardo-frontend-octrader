import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient11Component } from './painel-client11.component';

describe('PainelClient11Component', () => {
  let component: PainelClient11Component;
  let fixture: ComponentFixture<PainelClient11Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient11Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient11Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
