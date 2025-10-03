import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent08Component } from './dashboard-admin-content08.component';

describe('DashboardAdminContent08Component', () => {
  let component: DashboardAdminContent08Component;
  let fixture: ComponentFixture<DashboardAdminContent08Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent08Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent08Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
