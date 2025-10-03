import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssingComponent } from './assing.component';

describe('AssingComponent', () => {
  let component: AssingComponent;
  let fixture: ComponentFixture<AssingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
