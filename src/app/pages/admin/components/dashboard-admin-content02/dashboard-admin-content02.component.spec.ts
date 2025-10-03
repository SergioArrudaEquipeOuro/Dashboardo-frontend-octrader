import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent02Component } from './dashboard-admin-content02.component';

describe('DashboardAdminContent02Component', () => {
  let component: DashboardAdminContent02Component;
  let fixture: ComponentFixture<DashboardAdminContent02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
