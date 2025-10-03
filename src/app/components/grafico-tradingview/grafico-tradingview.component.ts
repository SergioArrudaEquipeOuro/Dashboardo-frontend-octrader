import { Component, AfterViewInit, Input, OnDestroy } from '@angular/core';

declare const TradingView: any;

@Component({
  selector: 'app-grafico-tradingview',
  templateUrl: './grafico-tradingview.component.html',
  styleUrls: ['./grafico-tradingview.component.css']
})
export class GraficoTradingviewComponent implements AfterViewInit, OnDestroy {
  private intervalId: any;
  isLoading = true; // Estado inicial de carregamento

  constructor() {}

  @Input() height = "500px";
  @Input() width = "100%";
  @Input() maxwidth = "1800px";
  @Input() minwidth = "100%";
  @Input() autosize = true;
  @Input() symbol = "BTC";
  @Input() interval = "15";
  @Input() timezone = "Etc/UTC";
  @Input() theme = "light";
  @Input() stylGrafico = "1";
  @Input() locale = "en";
  @Input() enable_publishing = false;
  @Input() allow_symbol_change = true;
  @Input() container_id = "tradingview_6a568";
  @Input() background = "#ffffff";
  @Input() hide_legend = true;

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (typeof TradingView !== 'undefined') {
        this.initializeWidget();
        this.startUpdating();
      } else {
        console.error('TradingView script is not loaded.');
        this.loadTradingViewScript(); // Força carregamento do script caso não tenha sido carregado
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.stopUpdating();
  }

  private initializeWidget(): void {
    if (typeof TradingView === 'undefined') {
      console.error('TradingView não carregado. Tentando recarregar...');
      this.loadTradingViewScript();
      return;
    }

    const widgetOptions = {
      autosize: this.autosize,
      symbol: this.symbol,
      interval: this.interval,
      timezone: this.timezone,
      theme: this.theme,
      style: this.stylGrafico,
      locale: this.locale,
      enable_publishing: this.enable_publishing,
      allow_symbol_change: this.allow_symbol_change,
      container_id: this.container_id,
      backgroundColor: this.background,
      hide_legend: this.hide_legend,
      hide_top_toolbar: false,
    };

    const widget = new TradingView.widget(widgetOptions);

    if (widget && widget.onChartReady) {
      widget.onChartReady(() => {
        console.log('Gráfico carregado com sucesso.');
        this.isLoading = false; // Finaliza o carregamento
      });
    } else {
      console.error('Erro ao inicializar o TradingView. Verifique as configurações.');
      setTimeout(() => {
        this.isLoading = false; // Impede carregamento infinito caso falhe
      }, 5000);
    }
  }

  private loadTradingViewScript(): void {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = () => {
      console.log('Script TradingView carregado.');
      this.initializeWidget();
    };
    document.head.appendChild(script);
  }

  private startUpdating(): void {
    this.intervalId = setInterval(() => {
      this.updateChart();
    }, 10000);
  }

  private stopUpdating(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateChart(): void {
    if (TradingView && TradingView.widget && TradingView.widget[this.container_id]) {
      TradingView.widget[this.container_id].chart().executeActionById('reload');
    }
  }
}
