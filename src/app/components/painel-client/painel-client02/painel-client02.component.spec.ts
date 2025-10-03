import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient02Component } from './painel-client02.component';

describe('PainelClient02Component', () => {
  let component: PainelClient02Component;
  let fixture: ComponentFixture<PainelClient02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
