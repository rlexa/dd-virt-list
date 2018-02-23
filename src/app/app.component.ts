import { Component } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { DataSlice } from './modules/virt-list';

const toRange = (count: number, optTo?: number) =>
  Array.from(Array(optTo ? optTo - count : count || 0), (ii, jj) => jj + (optTo ? count : 0));

@Component({
  selector: 'dd-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly toRange = toRange;

  readonly VL_SIZE = 1000000;
  vlData = toRange(this.VL_SIZE);
  vlTrigger = new Subject();
  vlStream = new Subject<DataSlice>();
  onLazyRequestVlist = (request: DataSlice) =>
    this.vlStream.next({ ...request, items: this.vlData.slice(request.from, request.to) });
}
