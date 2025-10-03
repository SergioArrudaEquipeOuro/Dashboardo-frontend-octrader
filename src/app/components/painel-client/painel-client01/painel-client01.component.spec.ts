import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient01Component } from './painel-client01.component';

describe('PainelClient01Component', () => {
  let component: PainelClient01Component;
  let fixture: ComponentFixture<PainelClient01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
