import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent05Component } from './dashboard-broker-content05.component';

describe('DashboardBrokerContent05Component', () => {
  let component: DashboardBrokerContent05Component;
  let fixture: ComponentFixture<DashboardBrokerContent05Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent05Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
