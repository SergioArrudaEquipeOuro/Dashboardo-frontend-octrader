import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent04Component } from './dashboard-broker-content04.component';

describe('DashboardBrokerContent04Component', () => {
  let component: DashboardBrokerContent04Component;
  let fixture: ComponentFixture<DashboardBrokerContent04Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent04Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent04Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
