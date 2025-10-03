import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent09Component } from './dashboard-gerente-content09.component';

describe('DashboardGerenteContent09Component', () => {
  let component: DashboardGerenteContent09Component;
  let fixture: ComponentFixture<DashboardGerenteContent09Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent09Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent09Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
