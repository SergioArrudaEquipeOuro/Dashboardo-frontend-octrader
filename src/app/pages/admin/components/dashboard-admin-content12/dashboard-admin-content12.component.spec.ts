import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent12Component } from './dashboard-admin-content12.component';

describe('DashboardAdminContent12Component', () => {
  let component: DashboardAdminContent12Component;
  let fixture: ComponentFixture<DashboardAdminContent12Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent12Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent12Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
