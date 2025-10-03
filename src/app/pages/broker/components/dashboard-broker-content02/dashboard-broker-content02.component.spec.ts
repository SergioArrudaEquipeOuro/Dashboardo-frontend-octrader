import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBrokerContent02Component } from './dashboard-broker-content02.component';

describe('DashboardBrokerContent02Component', () => {
  let component: DashboardBrokerContent02Component;
  let fixture: ComponentFixture<DashboardBrokerContent02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardBrokerContent02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardBrokerContent02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
