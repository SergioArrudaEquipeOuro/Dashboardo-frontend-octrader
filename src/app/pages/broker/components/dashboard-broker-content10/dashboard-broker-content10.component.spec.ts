import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent10Component } from './dashboard-broker-content10.component';

describe('DashboardBrokerContent10Component', () => {
  let component: DashboardBrokerContent10Component;
  let fixture: ComponentFixture<DashboardBrokerContent10Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent10Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent10Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
