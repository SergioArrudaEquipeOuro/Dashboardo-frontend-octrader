import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent05Component } from './dashboard-client-content05.component';

describe('DashboardClientContent05Component', () => {
  let component: DashboardClientContent05Component;
  let fixture: ComponentFixture<DashboardClientContent05Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent05Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
