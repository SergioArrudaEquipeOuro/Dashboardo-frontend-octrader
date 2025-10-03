import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent04Component } from './dashboard-admin-content04.component';

describe('DashboardAdminContent04Component', () => {
  let component: DashboardAdminContent04Component;
  let fixture: ComponentFixture<DashboardAdminContent04Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent04Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent04Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
