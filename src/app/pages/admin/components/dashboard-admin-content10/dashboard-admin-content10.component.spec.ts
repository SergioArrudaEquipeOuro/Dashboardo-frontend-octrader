import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent10Component } from './dashboard-admin-content10.component';

describe('DashboardAdminContent10Component', () => {
  let component: DashboardAdminContent10Component;
  let fixture: ComponentFixture<DashboardAdminContent10Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent10Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent10Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
