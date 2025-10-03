import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent11Component } from './dashboard-admin-content11.component';

describe('DashboardAdminContent11Component', () => {
  let component: DashboardAdminContent11Component;
  let fixture: ComponentFixture<DashboardAdminContent11Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent11Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent11Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
