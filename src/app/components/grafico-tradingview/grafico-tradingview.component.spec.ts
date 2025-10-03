import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraficoTradingviewComponent } from './grafico-tradingview.component';

describe('GraficoTradingviewComponent', () => {
  let component: GraficoTradingviewComponent;
  let fixture: ComponentFixture<GraficoTradingviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraficoTradingviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GraficoTradingviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
