import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent08Component } from './dashboard-gerente-content08.component';

describe('DashboardGerenteContent08Component', () => {
  let component: DashboardGerenteContent08Component;
  let fixture: ComponentFixture<DashboardGerenteContent08Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent08Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent08Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
