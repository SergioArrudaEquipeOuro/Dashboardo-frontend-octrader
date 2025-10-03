import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent05Component } from './dashboard-gerente-content05.component';

describe('DashboardGerenteContent05Component', () => {
  let component: DashboardGerenteContent05Component;
  let fixture: ComponentFixture<DashboardGerenteContent05Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent05Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent05Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
