import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, fromEvent, interval, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';

export interface DataSlice {
  from: number;
  to: number;
  items: any[];
}

class DoneSubject extends Subject<void> {
  done() {
    if (!this.isStopped) {
      this.next();
      this.complete();
    }
  }
}

const EMPTY_SLICE: DataSlice = { from: 0, to: 0, items: [] };
const MIN_BATCH_SIZE = 5;
const MS_SCROLL_DEBOUNCE = 100;

function calcElementHeight(element: HTMLElement) {
  let ret = 0;
  if (element) {
    const style = (typeof window.getComputedStyle === 'undefined') ? (<any>element).currentStyle : window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    ret = (rect ? rect.height : element.offsetHeight) + [style.marginTop, style.marginBottom, style.borderTopWidth, style.borderBottomWidth]
      .map(ii => parseInt(ii, 10))
      .reduce((acc, ii) => acc + (isNaN(ii) ? 0 : ii), 0);
  }
  return ret;
}

const toUnit = (value: number, unit: string) => value + unit;
const toPixels = (value: number) => toUnit(value, 'px');

function getFromTo(currentBatchIndex: number, batchSize: number, factorCachePre: number, factorCachePost: number) {
  let from = Math.floor((currentBatchIndex - factorCachePre) * batchSize);
  let to = Math.ceil((currentBatchIndex + 1 + factorCachePost) * batchSize);
  if (from < 0) {
    to -= from;
    from = 0;
  }
  return [from, to];
}

@Component({
  selector: 'dd-virt-list',
  templateUrl: './virt-list.component.html',
  styleUrls: ['./virt-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtListComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    private readonly ngZone: NgZone,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) { }

  private readonly done$ = new DoneSubject();
  private readonly triggerCalcBatch$ = new Subject();
  private readonly triggerCalcPage$ = new Subject();
  private readonly triggerCalcItemHeight$ = new Subject();
  private readonly triggerCalcContainerHeight$ = new Subject();
  private readonly triggerSetData$ = new Subject<DataSlice>();

  private subsDoRequest: Subscription = null;
  private subsLazyStream: Subscription = null;

  private curBatchSize = MIN_BATCH_SIZE * 3;
  private curBatchIndex = 0;
  private curItemHeight = 0;

  private curNonLazyData: any[] = [];
  private curCount = 0;
  private curCache: DataSlice = null;
  private curShown: DataSlice = null;
  private curLazyRequest: DataSlice = null;

  private curScrollTop = 0;

  readonly containerHeight$ = new BehaviorSubject(toPixels(0));
  readonly maxHeight$ = new BehaviorSubject('auto');
  readonly paddingTop$ = new BehaviorSubject(toPixels(0));

  items: any[] = [];

  @ViewChild('scroller') private vcScroller: ElementRef;
  @ViewChild('container') private vcContainer: ElementRef;

  @Input() set vlHeight(val: string) {
    val = val || 'auto';
    if (this.maxHeight$.value !== val) {
      this.maxHeight$.next(val);
    }
  }

  @Input() set vlBatchSize(value: number) {
    value = Math.max(+value, MIN_BATCH_SIZE);
    if (value !== this.curBatchSize) {
      this.curBatchSize = value;
      this.triggerCalcBatch$.next();
    }
  }

  @Input() set vlData(value: any[]) {
    value = value || [];
    if (value !== this.curNonLazyData) {
      this.curNonLazyData = value || [];
      this.vlCount = this.curNonLazyData.length;
      this.curCache = null;
      this.curShown = null;
      this.calcBatch();
      this.calcPage();
      this.triggerCalcBatch$.next();
    }
  }

  @Input() set vlCount(count: number) {
    count = Math.max(0, count || 0);
    if (count !== this.curCount) {
      this.curCount = count;
      if (!this.subsLazyStream || this.curCache && this.curCache.to - this.curCache.from > this.curCache.items.length) {
        this.curCache = null;
      }
      if (!this.subsLazyStream || this.curShown && this.curShown.to - this.curShown.from > this.curShown.items.length) {
        this.curShown = null;
      }
      this.triggerCalcContainerHeight$.next();
    }
  }

  @Input() set vlTrigger(value: Observable<any>) {
    if (this.subsDoRequest) {
      this.subsDoRequest.unsubscribe();
      this.subsDoRequest = null;
    }
    if (value instanceof Observable) {
      this.subsDoRequest = value.pipe(takeUntil(this.done$), debounceTime(0)).subscribe(() => {
        this.curLazyRequest = null;
        this.curCache = null;
        this.curShown = null;
        this.triggerCalcBatch$.next();
      });
    }
  }

  @Output() vlLazyRequest = new EventEmitter<DataSlice>();
  @Input() set vlLazyStream(value: Observable<DataSlice>) {
    if (this.subsLazyStream) {
      this.subsLazyStream.unsubscribe();
      this.subsLazyStream = null;
      this.curLazyRequest = null;
      this.curCache = null;
      this.curShown = null;
      this.triggerCalcBatch$.next();
    }
    if (value instanceof Observable) {
      this.subsLazyStream = value.pipe(takeUntil(this.done$)).subscribe(slice => {
        if (slice && this.curLazyRequest && this.curLazyRequest.from === slice.from && this.curLazyRequest.to === slice.to) {
          this.curCache = { ...this.curLazyRequest, items: slice.items || [] };
          this.curLazyRequest = null;
          this.calcPage();
          this.triggerCalcBatch$.next();
        }
      });
    }
  }

  ngOnDestroy() {
    this.done$.done();
    [
      this.triggerCalcBatch$,
      this.triggerCalcPage$,
      this.triggerCalcItemHeight$,
      this.triggerCalcContainerHeight$,
      this.triggerSetData$,
      this.containerHeight$,
      this.maxHeight$,
      this.paddingTop$,
    ].forEach(ii => ii.complete());
  }

  @HostListener('window:resize') onWindowResize() {
    this.triggerCalcItemHeight$.next();
  }

  ngOnInit() {
    this.triggerCalcItemHeight$.pipe(debounceTime(100)).subscribe(() => {
      if (this.vcContainer.nativeElement.children.length > 1) {
        const newHeight = calcElementHeight(this.vcContainer.nativeElement.children.item(1));
        if (newHeight !== this.curItemHeight) {
          this.curItemHeight = newHeight;
          if (this.curItemHeight === 0) {
            interval(1000).pipe(takeUntil(this.triggerCalcItemHeight$)).subscribe(_ => this.triggerCalcItemHeight$.next());
          } else {
            this.triggerCalcContainerHeight$.next();
            this.triggerCalcBatch$.next();
          }
        }
      }
    });

    this.triggerCalcContainerHeight$.subscribe(() => {
      const newHeight = toPixels(this.curItemHeight * this.curCount);
      if (newHeight !== this.containerHeight$.value || !this.curItemHeight && this.curCount) {
        this.containerHeight$.next(newHeight);
        this.triggerCalcBatch$.next();
      }
    });

    this.triggerCalcBatch$.pipe(debounceTime(0)).subscribe(this.calcBatch);
    this.triggerCalcPage$.pipe(debounceTime(0)).subscribe(this.calcPage);

    this.triggerSetData$.subscribe(slice => {
      this.curShown = slice;
      this.items = this.curShown.items || [];
      this.paddingTop$.next(toPixels((this.curShown.from || 0) * this.curItemHeight));
      this.triggerCalcItemHeight$.next();
      this.changeDetectorRef.markForCheck();
    });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      fromEvent(this.vcScroller.nativeElement, 'scroll')
        .pipe(
          takeUntil(this.done$),
          debounceTime(MS_SCROLL_DEBOUNCE),
          map(() => <number>(this.vcScroller.nativeElement.scrollTop || 0)))
        .subscribe(scrollTop => this.ngZone.run(() => {
          this.curScrollTop = scrollTop;
          this.triggerCalcBatch$.next();
        }));
    });

    this.triggerCalcBatch$.next();
  }

  private calcBatch = () => {
    this.curBatchIndex = this.curItemHeight ? Math.round(this.curScrollTop / (this.curBatchSize * this.curItemHeight)) : 0;
    this.triggerCalcPage$.next();
  }

  private calcPage = () => {
    let [from = 0, to = 0] = getFromTo(this.curBatchIndex, this.curBatchSize, 2, 2);
    if (!this.curShown || this.curShown.from !== from || this.curShown.to !== to) {
      if (to >= from) {
        const [fromMin = 0, toMin = 0] = getFromTo(this.curBatchIndex, this.curBatchSize, 1, 1);
        if (this.curCache && this.curCache.from <= fromMin && this.curCache.to >= toMin) {
          from = Math.max(from, this.curCache.from);
          to = Math.min(to, this.curCache.to);
          this.triggerSetData$.next({ from, to, items: this.curCache.items.slice(from - this.curCache.from, to - this.curCache.from) });
        } else {
          if (this.subsLazyStream) {
            if (!this.curLazyRequest || this.curLazyRequest.from > from || this.curLazyRequest.to < to) {
              this.curLazyRequest = { from, to, items: null };
              this.vlLazyRequest.next({ ...this.curLazyRequest });
            }
          } else {
            this.curCache = { from, to, items: this.curNonLazyData.slice(from, to) };
            this.triggerSetData$.next({ ...this.curCache });
          }
        }
      } else {
        this.curCache = null;
        this.triggerSetData$.next(EMPTY_SLICE);
      }
    }
  }

}
