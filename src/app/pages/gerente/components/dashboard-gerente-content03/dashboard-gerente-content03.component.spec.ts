import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent03Component } from './dashboard-gerente-content03.component';

describe('DashboardGerenteContent03Component', () => {
  let component: DashboardGerenteContent03Component;
  let fixture: ComponentFixture<DashboardGerenteContent03Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent03Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent03Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
