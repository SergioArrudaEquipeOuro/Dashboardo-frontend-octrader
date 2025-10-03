import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPainel02Component } from './admin-painel02.component';

describe('AdminPainel02Component', () => {
  let component: AdminPainel02Component;
  let fixture: ComponentFixture<AdminPainel02Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPainel02Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPainel02Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
