import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent03Component } from './dashboard-broker-content03.component';

describe('DashboardBrokerContent03Component', () => {
  let component: DashboardBrokerContent03Component;
  let fixture: ComponentFixture<DashboardBrokerContent03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
