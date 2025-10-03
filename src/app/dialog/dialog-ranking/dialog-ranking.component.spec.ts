import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogRankingComponent } from './dialog-ranking.component';

describe('DialogRankingComponent', () => {
  let component: DialogRankingComponent;
  let fixture: ComponentFixture<DialogRankingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogRankingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogRankingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
