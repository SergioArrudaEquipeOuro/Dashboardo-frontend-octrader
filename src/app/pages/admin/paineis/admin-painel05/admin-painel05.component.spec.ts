import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel05Component } from './admin-painel05.component';

describe('AdminPainel05Component', () => {
  let component: AdminPainel05Component;
  let fixture: ComponentFixture<AdminPainel05Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel05Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
