import { Component, Input, OnInit } from '@angular/core';
import { Release } from 'src/app/models/release';
import { ReleaseService } from 'src/app/services/release.service';
import { Chart, registerables } from 'chart.js';
import * as moment from 'moment';
import { UserService } from 'src/app/services/user.service';
import { User } from 'src/app/models/user';
import { BotService } from 'src/app/services/bot.service';
import { Bot } from 'src/app/models/bot';

@Component({
  selector: 'app-dashboard-admin-content01',
  templateUrl: './dashboard-admin-content01.component.html',
  styleUrls: ['./dashboard-admin-content01.component.css']
})
export class DashboardAdminContent01Component implements OnInit {
  
  @Input() activeEnterprise: any;

  constructor(
    private releaseService: ReleaseService,
    private userService: UserService,
    private botService: BotService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {

  }

}
