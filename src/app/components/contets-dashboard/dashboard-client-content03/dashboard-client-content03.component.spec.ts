import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent03Component } from './dashboard-client-content03.component';

describe('DashboardClientContent03Component', () => {
  let component: DashboardClientContent03Component;
  let fixture: ComponentFixture<DashboardClientContent03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
