import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Etf, EtfCategory, EtfHistory, EtfStatus, EtfTransaction } from 'src/app/models/Etf';
import { EtfService } from 'src/app/services/etf.service';

@Component({
  selector: 'app-dashboard-gerente-content06',
  templateUrl: './dashboard-gerente-content06.component.html',
  styleUrls: ['./dashboard-gerente-content06.component.css']
})
export class DashboardGerenteContent06Component implements OnInit {

  constructor(private fb: FormBuilder, private etfService: EtfService) { }

  ngOnInit(): void {
  }
}
