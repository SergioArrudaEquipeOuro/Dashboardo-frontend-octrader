import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient03Component } from './painel-client03.component';

describe('PainelClient03Component', () => {
  let component: PainelClient03Component;
  let fixture: ComponentFixture<PainelClient03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
