import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent01Component } from './dashboard-gerente-content01.component';

describe('DashboardGerenteContent01Component', () => {
  let component: DashboardGerenteContent01Component;
  let fixture: ComponentFixture<DashboardGerenteContent01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
