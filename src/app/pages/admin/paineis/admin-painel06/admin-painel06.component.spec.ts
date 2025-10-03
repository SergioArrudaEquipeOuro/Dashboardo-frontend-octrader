import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel06Component } from './admin-painel06.component';

describe('AdminPainel06Component', () => {
  let component: AdminPainel06Component;
  let fixture: ComponentFixture<AdminPainel06Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel06Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
