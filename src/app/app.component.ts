import { Component, OnInit } from '@angular/core';
import { StockService } from './services/stock.service';
import { element } from 'protractor';
import { map } from 'rxjs/operator/map';

import { Observable, Subject } from 'rxjs/Rx';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  symbol: string = undefined;
  title = 'app';
  theme = 'dark';
  errMsg: string;
  multi: any[] = []
  stocks: string[] = [];
  public update: Subject<any>;


  view: any[] = [900, 500];

  // options
  loading: boolean = undefined;
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Period';
  showYAxisLabel = true;
  yAxisLabel = 'Stock Price';

  colorScheme = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };

  // line, area
  autoScale = true;

  constructor(public stockService: StockService) {
    this.update = <Subject<any>>stockService
      .connect('ws://localhost:40510/')
      .map((response: MessageEvent) => {
        console.log(response.data)
        return JSON.parse(response.data)
      });

    this.update.subscribe(msg => {
      if (msg.type == 'add') {
        this.renderStock(msg.symbol)
        this.stocks.push(msg.symbol)
      }
      if (msg.type == 'delete') {
        let newArray = JSON.parse(JSON.stringify(this.multi));
        for (let i = 0; i < newArray.length; i++) {
          if (newArray[i].name == msg.symbol) {
            newArray.splice(i, 1)
            this.multi = newArray;
            break
          }
        }
        for (let i = 0; i < this.stocks.length; i++) {
          if (this.stocks[i] == msg.symbol) {
            this.stocks.splice(i, 1)
            break
          }
        }
      }
      console.log("Response from websocket: " + JSON.stringify(msg));
    });

  }

  ngOnInit() {
    this.multi = []
    this.stockService.getStocks()
      .subscribe(
        data => {
          this.stocks = data;
          for (let element of data)
            this.renderStock(element)
        },
        error => {
          this.loading = false;
          console.log(error);
        });
  }

  renderStock(stock) {
    this.stockService.getStockInfo(stock)
      .subscribe(
        data => {
          if (!data['Meta Data']) {
            this.errMsg = 'Wrong symbol or too many requests'
            return
          }
          let newStock = {
            "name": data['Meta Data']['2. Symbol'],
            "series": [
            ]
          }
          for (let element in data['Time Series (Daily)']) {
            let newElem = {};
            newElem['value'] = parseFloat(data['Time Series (Daily)'][element]['4. close']);
            newElem['name'] = element;
            newStock['series'].push(newElem);
          }
          newStock['series'].reverse()
          let newArray = JSON.parse(JSON.stringify(this.multi));
          newArray.push(newStock);
          this.multi = newArray;

        },
        error => {
          this.loading = false;
          console.log(error);
        });

  }

  addStock() {
    this.errMsg = undefined;
    this.loading = true;
    this.symbol = this.symbol.toUpperCase()
    if (this.symbol) {
      this.stockService.getStockInfo(this.symbol)
        .subscribe(
          data => {
            if (!data['Meta Data']) {
              this.errMsg = 'Wrong symbol or too many requests'
              this.loading = false;
              return
            }
            if (this.stocks.includes(this.symbol)) {
              this.errMsg = 'This symbol is already presented'
              this.loading = false;
              return
            }

            this.stockService.addStock(this.symbol)
              .subscribe(
                ok => {
                  this.symbol = '';
                  this.loading = false;
                  // this.stocks.push(this.symbol)
                  // this.symbol = '';
                  // let newStock = {
                  //   "name": data['Meta Data']['2. Symbol'],
                  //   "series": [
                  //   ]
                  // }
                  // for (let element in data['Time Series (Daily)']) {
                  //   let newElem = {};
                  //   newElem['value'] = parseFloat(data['Time Series (Daily)'][element]['4. close']);
                  //   newElem['name'] = element;
                  //   newStock['series'].push(newElem);
                  // }
                  // newStock['series'].reverse()
                  // let newArray = JSON.parse(JSON.stringify(this.multi));
                  // newArray.push(newStock);
                  // this.multi = newArray;

                },
                error => {
                  this.loading = false;
                  console.log(error);
                });
          },
          error => {
            this.loading = false;
            console.log(error);
          });
    }
  }

  deleteStock(symbol) {
    this.stockService.deleteStock(symbol)
      .subscribe(
        data => {
          this.loading = false;
          console.log('stock deleted')
        },
        error => {
          this.loading = false;
          console.log(error);
        });
  }




}
