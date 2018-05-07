import { ChangeDetectorRef, Component } from '@angular/core';
import { Subject } from 'rxjs';
import { DataSlice } from './modules/virt-list';

const toRange = (count: number, optTo?: number) =>
  Array.from(Array(optTo ? optTo - count : count || 0), (ii, jj) => jj + (optTo ? count : 0));

@Component({
  selector: 'dd-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  readonly VL_SIZE = 1000000;
  vlData = <number[]>[];
  vlTrigger$ = new Subject();
  vlStream$ = new Subject<DataSlice>();

  private worker: Worker = null;

  constructor(readonly changeDetectorRef: ChangeDetectorRef) {
    try {
      this.worker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(ev) {
          postMessage(Array.from(Array(ev.data), (ii, jj) => jj));
        }
      `], { type: 'application/javascript' })));
      this.worker.onmessage = data => {
        this.vlData = data.data;
        changeDetectorRef.detectChanges();
      }
    } catch { }

    this.createDate(this.VL_SIZE);
  }

  onLazyRequestVlist = (request: DataSlice) => {
    this.vlStream$.next({ ...request, items: this.vlData.slice(request.from, request.to) });
  }

  trackBy(index: number, ii: number) {
    return index;
  }

  createDate(size: number) {
    if (this.worker) {
      this.worker.postMessage(size);
    } else {
      this.vlData = toRange(size);
    }
  }
}
