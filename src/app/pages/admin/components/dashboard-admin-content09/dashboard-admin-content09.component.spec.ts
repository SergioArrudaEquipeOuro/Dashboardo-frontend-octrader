import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent09Component } from './dashboard-admin-content09.component';

describe('DashboardAdminContent09Component', () => {
  let component: DashboardAdminContent09Component;
  let fixture: ComponentFixture<DashboardAdminContent09Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent09Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent09Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
