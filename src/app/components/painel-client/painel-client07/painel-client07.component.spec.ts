import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient07Component } from './painel-client07.component';

describe('PainelClient07Component', () => {
  let component: PainelClient07Component;
  let fixture: ComponentFixture<PainelClient07Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient07Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient07Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
