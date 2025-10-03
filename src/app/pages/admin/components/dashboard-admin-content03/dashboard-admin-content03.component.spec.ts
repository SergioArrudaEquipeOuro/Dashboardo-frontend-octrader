import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent03Component } from './dashboard-admin-content03.component';

describe('DashboardAdminContent03Component', () => {
  let component: DashboardAdminContent03Component;
  let fixture: ComponentFixture<DashboardAdminContent03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
