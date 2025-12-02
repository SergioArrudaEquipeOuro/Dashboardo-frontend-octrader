import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdmin15Component } from './dashboard-admin15.component';

describe('DashboardAdmin15Component', () => {
  let component: DashboardAdmin15Component;
  let fixture: ComponentFixture<DashboardAdmin15Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardAdmin15Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdmin15Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
