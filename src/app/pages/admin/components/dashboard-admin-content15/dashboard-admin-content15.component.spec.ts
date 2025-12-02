import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent15Component } from './dashboard-admin-content15.component';

describe('DashboardAdminContent15Component', () => {
  let component: DashboardAdminContent15Component;
  let fixture: ComponentFixture<DashboardAdminContent15Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent15Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent15Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
