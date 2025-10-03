import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel07Component } from './admin-painel07.component';

describe('AdminPainel07Component', () => {
  let component: AdminPainel07Component;
  let fixture: ComponentFixture<AdminPainel07Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel07Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel07Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
