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
  let to = Math.ceil(from + (factorCachePre + 1 + factorCachePost) * batchSize);
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
  static INSTANCE_COUNTER = 0;

  constructor(
    private readonly ngZone: NgZone,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) { }

  private readonly INSTANCE_ID = ++VirtListComponent.INSTANCE_COUNTER;
  private readonly done$ = new DoneSubject();
  private readonly curScrollTop$ = new BehaviorSubject(0);
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

  readonly containerHeight$ = new BehaviorSubject(toPixels(0));
  readonly maxHeight$ = new BehaviorSubject('auto');
  readonly paddingTop$ = new BehaviorSubject(toPixels(0));

  items: any[] = [];

  @ViewChild('scroller') private vcScroller: ElementRef;
  @ViewChild('content') private vcContent: ElementRef;

  @Input() vlDebugMode = false;

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
      this.subsDoRequest = value.pipe(debounceTime(0), takeUntil(this.done$)).subscribe(() => {
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
      this.curScrollTop$,
      this.triggerCalcBatch$,
      this.triggerCalcPage$,
      this.triggerCalcItemHeight$,
      this.triggerCalcContainerHeight$,
      this.triggerSetData$,
      this.containerHeight$,
      this.maxHeight$,
      this.paddingTop$,
    ].forEach(ii => ii.complete());
    if (this.vlDebugMode) { this.log('destroyed'); }
  }

  @HostListener('window:resize') onWindowResize() {
    this.triggerCalcItemHeight$.next();
  }

  ngOnInit() {
    if (this.vlDebugMode) { this.log('init'); }

    this.triggerCalcItemHeight$.pipe(debounceTime(100)).subscribe(() => {
      if (this.vcContent.nativeElement.children.length > 1) {
        if (this.vlDebugMode) { this.log('item height calculating'); }
        const newHeight = calcElementHeight(this.vcContent.nativeElement.children.item(0));
        if (newHeight === 0) {
          // AR: we have an item but can't get size, let's try again (bad for performance but no way to tell when it will become visible otherwise)
          interval(1000).pipe(takeUntil(this.triggerCalcItemHeight$)).subscribe(_ => this.triggerCalcItemHeight$.next());
        }
        if (newHeight !== this.curItemHeight) {
          if (this.vlDebugMode) { this.log(`item height change ${this.curItemHeight} => ${newHeight}`); }
          this.curItemHeight = newHeight;
          this.triggerCalcContainerHeight$.next();
          this.triggerCalcBatch$.next();
        }
      }
    });

    this.triggerCalcContainerHeight$.subscribe(() => {
      if (this.vlDebugMode) { this.log('container height calculating'); }
      const newHeight = toPixels(this.curItemHeight * this.curCount);
      if (newHeight !== this.containerHeight$.value || !this.curItemHeight && this.curCount) {
        if (this.vlDebugMode) { this.log(`container height change ${this.containerHeight$.value} => ${newHeight}`); }
        this.containerHeight$.next(newHeight);
        this.triggerCalcBatch$.next();
      }
    });

    this.triggerCalcBatch$.pipe(debounceTime(0)).subscribe(this.calcBatch);
    this.triggerCalcPage$.pipe(debounceTime(0)).subscribe(this.calcPage);

    this.triggerSetData$.subscribe(slice => {
      this.curShown = slice;
      this.items = this.curShown.items || [];
      if (this.vlDebugMode) { this.log(`got data slice with ${this.items.length} item(s)`); }
      this.changeDetectorRef.markForCheck();
      this.paddingTop$.next(toPixels((this.curShown.from || 0) * this.curItemHeight));
      this.triggerCalcItemHeight$.next();
    });

    this.curScrollTop$.pipe(debounceTime(MS_SCROLL_DEBOUNCE), takeUntil(this.done$)).subscribe(() => this.ngZone.run(() => this.triggerCalcBatch$.next()));
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      fromEvent(this.vcScroller.nativeElement, 'scroll')
        .pipe(map((_: Event) => _.srcElement.scrollTop || 0), takeUntil(this.done$))
        .subscribe(_ => this.curScrollTop$.next(_));
    });
  }

  private calcBatch = () => {
    this.curBatchIndex = this.curItemHeight ? Math.round(this.curScrollTop$.value / (this.curBatchSize * this.curItemHeight)) : 0;
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

  private log = (val: string) => typeof val === 'string' && val.length ? console.log(`ddVirtList ${this.INSTANCE_ID}: ${val}`) : {};

}
