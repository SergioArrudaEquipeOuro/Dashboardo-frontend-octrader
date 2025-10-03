import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent01Component } from './dashboard-broker-content01.component';

describe('DashboardBrokerContent01Component', () => {
  let component: DashboardBrokerContent01Component;
  let fixture: ComponentFixture<DashboardBrokerContent01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
