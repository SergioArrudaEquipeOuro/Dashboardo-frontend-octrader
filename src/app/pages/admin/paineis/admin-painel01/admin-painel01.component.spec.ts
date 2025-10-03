import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel01Component } from './admin-painel01.component';

describe('AdminPainel01Component', () => {
  let component: AdminPainel01Component;
  let fixture: ComponentFixture<AdminPainel01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
