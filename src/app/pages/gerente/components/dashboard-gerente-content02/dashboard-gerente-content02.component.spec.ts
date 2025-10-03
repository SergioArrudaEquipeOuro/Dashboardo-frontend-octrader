import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent02Component } from './dashboard-gerente-content02.component';

describe('DashboardGerenteContent02Component', () => {
  let component: DashboardGerenteContent02Component;
  let fixture: ComponentFixture<DashboardGerenteContent02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
