import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainelClient06Component } from './painel-client06.component';

describe('PainelClient06Component', () => {
  let component: PainelClient06Component;
  let fixture: ComponentFixture<PainelClient06Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainelClient06Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainelClient06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
