[Angular]: https://angular.io/ "Angular UI Framework"
[Source]: https://github.com/rlexa/dd-virt-list "Source Code"

# DdVirtList

DdVirtList ([Source]) is an [Angular] component for showing a virtual list for both large data arrays and lazy loaded chunks.

## Info

Embeds to be rendered items as `ng-content` and **expects all items to have the same height**.

## HowTo: Simple Data

Template:
```html
<dd-virt-list #elemVlist vlHeight="300px" [vlData]="data">
  <label *ngFor="let ii of elemVlist.items" [style.font-family]="'monospace'">{{ ii }}</label>
</dd-virt-list>
```
Code:
```ts
data = Array.from(Array(1000000), (ii, jj) => jj); // create array of numbers
```

## HowTo: Lazy Loading

Template:
```html
<dd-virt-list #elemVlist vlHeight="300px" [vlCount]="count" [vlLazyStream]="stream" (vlLazyRequest)="onLazy($event)">
  <label *ngFor="let ii of elemVlist.items" [style.font-family]="'monospace'">{{ ii }}</label>
</dd-virt-list>
```
Code:
```ts
stream = new Subject<{from: number, to: number, items: any[]}>();
onLazy = (request: {from: number, to: number}) =>
    // ... get lazy data page into 'data'
    this.stream.next({ ...request, items: data });
```

## API

| Setter | Default | Info |
| - | - | - |
| vlBatchSize | 30 | `number` Batch size hint used for page size calculation (min. 10). |
| vlHeight | 'auto' | `string` Height of the scrolling container (expects any valid CSS height). |
| vlChildrenPerRow | 0 | `number` If bigger than 0 then the content is expected to be a container of the actual list items (instead of being the list of items otherwise). |
| vlData | null | `any[]` For non-lazy data representation (auto-sets vlCount). |
| vlCount | 0 | `number` Set to total count for lazy data. |
| vlTrigger | null | `Observable` Can be used to trigger re-requesting data. |
| vlLazyStream | null | `Observable<{from: number, to: number, items: any[]}>` Used as source of lazy data. |
| vlDebugMode | false | `boolean` Logs some info when set to `true`. |

| Emitter |  Info |
| - | - |
| vlLazyRequest | `EventEmitter<{from: number, to: number, items: any[]}>` Lazy data request stream. |

| Getter |  Info |
| - | - |
| items | `any[]` Current items the component provides for rendering. |

## License

MIT
