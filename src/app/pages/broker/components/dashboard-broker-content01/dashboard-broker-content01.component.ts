import { Component, Input, OnInit } from '@angular/core';
import { Release } from 'src/app/models/release';
import { ReleaseService } from 'src/app/services/release.service';
import { Chart, registerables } from 'chart.js';
import * as moment from 'moment';
import { UserService } from 'src/app/services/user.service';
import { User } from 'src/app/models/user';
import { BotService } from 'src/app/services/bot.service';
import { Bot } from 'src/app/models/bot';
import { Equipe } from 'src/app/models/equipe';
import { EquipeService } from 'src/app/services/equipe.service';
import { Contrato } from 'src/app/models/contrato';

@Component({
  selector: 'app-dashboard-broker-content01',
  templateUrl: './dashboard-broker-content01.component.html',
  styleUrls: ['./dashboard-broker-content01.component.css']
})
export class DashboardBrokerContent01Component implements OnInit {

  @Input() user: any;

  constructor(
    private releaseService: ReleaseService,
    private userService: UserService,
    private botService: BotService,
    private equipeService: EquipeService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {

  }
}
