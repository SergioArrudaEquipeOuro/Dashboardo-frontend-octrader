import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerenteContent07Component } from './dashboard-gerente-content07.component';

describe('DashboardGerenteContent07Component', () => {
  let component: DashboardGerenteContent07Component;
  let fixture: ComponentFixture<DashboardGerenteContent07Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardGerenteContent07Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardGerenteContent07Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
