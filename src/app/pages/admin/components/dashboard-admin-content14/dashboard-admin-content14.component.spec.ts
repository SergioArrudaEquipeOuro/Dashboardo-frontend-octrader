import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent14Component } from './dashboard-admin-content14.component';

describe('DashboardAdminContent14Component', () => {
  let component: DashboardAdminContent14Component;
  let fixture: ComponentFixture<DashboardAdminContent14Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent14Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent14Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
