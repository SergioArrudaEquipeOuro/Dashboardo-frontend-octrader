import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent13Component } from './dashboard-admin-content13.component';

describe('DashboardAdminContent13Component', () => {
  let component: DashboardAdminContent13Component;
  let fixture: ComponentFixture<DashboardAdminContent13Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent13Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent13Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
