import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';


import { baseURL } from './baseurl';

import * as Rx from 'rxjs/Rx';

@Injectable()
export class StockService {

  constructor(private http: HttpClient) { }


  private subject: Rx.Subject<MessageEvent>;

  public connect(url): Rx.Subject<MessageEvent> {
    if (!this.subject) {
      this.subject = this.create(url);
      console.log("Successfully connected: " + url);
    }
    return this.subject;
  }

  private create(url): Rx.Subject<MessageEvent> {
    let ws = new WebSocket(url);

    let observable = Rx.Observable.create(
      (obs: Rx.Observer<MessageEvent>) => {
        ws.onmessage = obs.next.bind(obs);
        ws.onerror = obs.error.bind(obs);
        ws.onclose = obs.complete.bind(obs);
        return ws.close.bind(ws);
      })
    let observer = {
      next: (data: Object) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      }
    }
    return Rx.Subject.create(observer, observable);
  }


  getStockInfo(symbol): Observable<any> {
    return this.http.get('https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=' + symbol + '&apikey=VNT0J0J6E3LS1CYK')
      .catch(error => {
        return Observable.throw(error.error.status);
      });
  };

  getStocks(): Observable<any> {
    return this.http.get(baseURL + 'symbols', { withCredentials: true })
      .catch(error => {
        return Observable.throw(error.error.status);
      });
  };


  addStock(symbol): Observable<any> {
    return this.http.post(baseURL + 'symbols', { 'symbol': symbol }, { withCredentials: true })
      .catch(error => {
        return Observable.throw(error.error.status);
      });
  };

  deleteStock(symbol): Observable<any> {
    return this.http.delete(baseURL + 'symbols/' + symbol)
      .catch(error => {
        return Observable.throw(error.error.status);
      });
  };

}
