import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelAdm02Component } from './painel-adm02.component';

describe('PainelAdm02Component', () => {
  let component: PainelAdm02Component;
  let fixture: ComponentFixture<PainelAdm02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelAdm02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelAdm02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
