import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel04Component } from './admin-painel04.component';

describe('AdminPainel04Component', () => {
  let component: AdminPainel04Component;
  let fixture: ComponentFixture<AdminPainel04Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel04Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel04Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
