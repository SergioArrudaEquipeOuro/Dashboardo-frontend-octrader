import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent08Component } from './dashboard-broker-content08.component';

describe('DashboardBrokerContent08Component', () => {
  let component: DashboardBrokerContent08Component;
  let fixture: ComponentFixture<DashboardBrokerContent08Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent08Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent08Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
