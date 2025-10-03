import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelAdm03Component } from './painel-adm03.component';

describe('PainelAdm03Component', () => {
  let component: PainelAdm03Component;
  let fixture: ComponentFixture<PainelAdm03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelAdm03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelAdm03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
