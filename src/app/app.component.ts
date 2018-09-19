import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DataSlice } from './modules/virt-list';

const toRange = (count: number, optTo?: number) =>
  Array.from(Array(optTo ? optTo - count : count || 0), (ii, jj) => jj + (optTo ? count : 0));

@Component({
  selector: 'dd-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  constructor(readonly changeDetectorRef: ChangeDetectorRef) {
    try {
      this.worker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(ev) {
          postMessage(Array.from(Array(ev.data), (ii, jj) => jj));
        }
      `], { type: 'application/javascript' })));
      this.worker.onmessage = data => {
        this.vlData = data.data;
        this.vlData$.next(this.vlData);
        changeDetectorRef.detectChanges();
      }
    } catch { }
  }

  private worker: Worker = null;

  readonly VL_SIZE = 1000000;

  vlData = <number[]>[];

  vlData$ = new BehaviorSubject(<number[]>[]);
  vlDelayedShow$ = new BehaviorSubject(false);

  vlStream$ = new Subject<DataSlice>();

  vlTrigger$ = new Subject();

  ngOnInit() {
    this.vlData$.pipe(delay(1000)).subscribe(_ => this.vlDelayedShow$.next(!!_ && _.length > 0));
    this.createData(this.VL_SIZE);
  }

  onLazyRequestVlist = (request: DataSlice) => this.vlStream$.next({ ...request, items: this.vlData.slice(request.from, request.to) });

  trackBy = (index: number, ii: number) => index;

  createData = (size: number) => {
    this.vlDelayedShow$.next(false);
    if (this.worker) {
      this.worker.postMessage(size);
    } else {
      this.vlData = toRange(size);
      this.vlData$.next(this.vlData);
    }
  }
}
