import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent07Component } from './dashboard-broker-content07.component';

describe('DashboardBrokerContent07Component', () => {
  let component: DashboardBrokerContent07Component;
  let fixture: ComponentFixture<DashboardBrokerContent07Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent07Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent07Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
