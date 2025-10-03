import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent06Component } from './dashboard-client-content06.component';

describe('DashboardClientContent06Component', () => {
  let component: DashboardClientContent06Component;
  let fixture: ComponentFixture<DashboardClientContent06Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent06Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
