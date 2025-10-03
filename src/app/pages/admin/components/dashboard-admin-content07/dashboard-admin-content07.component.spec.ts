import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent07Component } from './dashboard-admin-content07.component';

describe('DashboardAdminContent07Component', () => {
  let component: DashboardAdminContent07Component;
  let fixture: ComponentFixture<DashboardAdminContent07Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent07Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent07Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
