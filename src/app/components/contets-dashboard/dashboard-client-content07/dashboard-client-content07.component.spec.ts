import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardClientContent07Component } from './dashboard-client-content07.component';

describe('DashboardClientContent07Component', () => {
  let component: DashboardClientContent07Component;
  let fixture: ComponentFixture<DashboardClientContent07Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardClientContent07Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardClientContent07Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
