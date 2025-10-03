import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient09Component } from './painel-client09.component';

describe('PainelClient09Component', () => {
  let component: PainelClient09Component;
  let fixture: ComponentFixture<PainelClient09Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient09Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient09Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
