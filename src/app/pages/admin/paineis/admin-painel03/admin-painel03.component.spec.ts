import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel03Component } from './admin-painel03.component';

describe('AdminPainel03Component', () => {
  let component: AdminPainel03Component;
  let fixture: ComponentFixture<AdminPainel03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
