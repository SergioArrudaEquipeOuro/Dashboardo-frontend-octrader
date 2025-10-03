import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent01Component } from './dashboard-admin-content01.component';

describe('DashboardAdminContent01Component', () => {
  let component: DashboardAdminContent01Component;
  let fixture: ComponentFixture<DashboardAdminContent01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
