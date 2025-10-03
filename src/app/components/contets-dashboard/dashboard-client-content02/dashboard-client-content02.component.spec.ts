import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent02Component } from './dashboard-client-content02.component';

describe('DashboardClientContent02Component', () => {
  let component: DashboardClientContent02Component;
  let fixture: ComponentFixture<DashboardClientContent02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
