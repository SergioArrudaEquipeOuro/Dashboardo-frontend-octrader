import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent06Component } from './dashboard-gerente-content06.component';

describe('DashboardGerenteContent06Component', () => {
  let component: DashboardGerenteContent06Component;
  let fixture: ComponentFixture<DashboardGerenteContent06Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent06Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent06Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
