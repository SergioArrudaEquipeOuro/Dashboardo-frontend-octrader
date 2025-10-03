import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent06Component } from './dashboard-broker-content06.component';

describe('DashboardBrokerContent06Component', () => {
  let component: DashboardBrokerContent06Component;
  let fixture: ComponentFixture<DashboardBrokerContent06Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent06Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
