import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent05Component } from './dashboard-admin-content05.component';

describe('DashboardAdminContent05Component', () => {
  let component: DashboardAdminContent05Component;
  let fixture: ComponentFixture<DashboardAdminContent05Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent05Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
