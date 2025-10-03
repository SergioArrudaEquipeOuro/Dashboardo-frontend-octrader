import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent09Component } from './dashboard-broker-content09.component';

describe('DashboardBrokerContent09Component', () => {
  let component: DashboardBrokerContent09Component;
  let fixture: ComponentFixture<DashboardBrokerContent09Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent09Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent09Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
