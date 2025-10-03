import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  /* api = 'http://localhost:8080/' */
  api = 'https://ooctrader-8b6042370daf.herokuapp.com/'

  constructor() { }

  url() {
    return this.api
  }
}
