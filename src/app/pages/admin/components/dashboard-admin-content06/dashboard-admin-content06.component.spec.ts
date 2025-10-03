import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdminContent06Component } from './dashboard-admin-content06.component';

describe('DashboardAdminContent06Component', () => {
  let component: DashboardAdminContent06Component;
  let fixture: ComponentFixture<DashboardAdminContent06Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdminContent06Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminContent06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
