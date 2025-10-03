import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DasboardClientContent01Component } from './dasboard-client-content01.component';

describe('DasboardClientContent01Component', () => {
  let component: DasboardClientContent01Component;
  let fixture: ComponentFixture<DasboardClientContent01Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DasboardClientContent01Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DasboardClientContent01Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
