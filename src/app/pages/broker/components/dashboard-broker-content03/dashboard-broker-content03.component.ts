import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Bot } from 'src/app/models/bot';
import { BotService } from 'src/app/services/bot.service';
import { OperacoesService } from 'src/app/services/operacoes.service';
import { UserService } from 'src/app/services/user.service';
import { take } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard-broker-content03',
  templateUrl: './dashboard-broker-content03.component.html',
  styleUrls: ['./dashboard-broker-content03.component.css']
})
export class DashboardBrokerContent03Component implements OnInit {
  
  constructor(
    
  ) {
    
  }

  ngOnInit(): void {
    
  }
  
}
