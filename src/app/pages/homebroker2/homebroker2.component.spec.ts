import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Homebroker2Component } from './homebroker2.component';

describe('Homebroker2Component', () => {
  let component: Homebroker2Component;
  let fixture: ComponentFixture<Homebroker2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Homebroker2Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Homebroker2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
