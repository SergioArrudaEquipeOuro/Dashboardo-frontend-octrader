import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent04Component } from './dashboard-gerente-content04.component';

describe('DashboardGerenteContent04Component', () => {
  let component: DashboardGerenteContent04Component;
  let fixture: ComponentFixture<DashboardGerenteContent04Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent04Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent04Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
