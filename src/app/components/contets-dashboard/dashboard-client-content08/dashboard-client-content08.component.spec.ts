import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent08Component } from './dashboard-client-content08.component';

describe('DashboardClientContent08Component', () => {
  let component: DashboardClientContent08Component;
  let fixture: ComponentFixture<DashboardClientContent08Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent08Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent08Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
