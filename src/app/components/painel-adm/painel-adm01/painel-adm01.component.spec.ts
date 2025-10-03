import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelAdm01Component } from './painel-adm01.component';

describe('PainelAdm01Component', () => {
  let component: PainelAdm01Component;
  let fixture: ComponentFixture<PainelAdm01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelAdm01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelAdm01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
