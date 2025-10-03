import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent04Component } from './dashboard-client-content04.component';

describe('DashboardClientContent04Component', () => {
  let component: DashboardClientContent04Component;
  let fixture: ComponentFixture<DashboardClientContent04Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent04Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent04Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
