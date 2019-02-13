## 1.0.5

### Performance

* **scrolling:** rollback to debounceTime on scrolling (was actually worse performance with complex content)

## 1.0.4

### Fixed

* **cleanup:** cancels delayed recalc of item height if component is destroyed

### Performance

* **scrolling:** moved to auditTime instead of debounceTime for faster data requests on scrolling

## 1.0.3

### Fixed

* **item size:** now correctly calculates item size if there is at least one item

## 1.0.2

### Fixed

* **package:** revert to earlier ng-packagr

## 1.0.1

### Compatibility

* **dependencies:** updated angular semvers to accomodate for 7

# **1.0.0**

### Fixed

* **indefinite auto-scroll:** refactored content container to prevent indefinite auto-scrolling

## 0.10.4

### Fixed

* **hidden element container size:** tries to interval-recalculate item and container size when elements are technically visible but have no size yet due to 3rd party frameworks (e.g. when in a not currently shown tab)

## 0.10.3

### Added

* **debugMode:** adding vlDebugMode flag for logging some operations

## 0.10.2

### Fixed

* **hidden element size:** tries to interval-recalculate item size when elements are technically visible but have no size yet due to 3rd party frameworks (e.g. when in a not currently shown tab)

## 0.10.1

### Fixed

* **lazy count jittering:** now shouldn't re-request on any count change if cache considered stable enough

# 0.10.0

### Breaking Changes

* **@angular:** now aligned to @angular framework 6.0.0

## 0.9.25

### Changed

* **vlBatchSize:** allow smaller values (min 5 now)

## 0.9.24

### Changed

* **change detection:** more reactive internally (less manual change detection)

## 0.9.23

### Fixed

* **change detection:** prevent manual change detection when destroyed

## 0.9.21

### Fixed

* **vlHeight:** manual change detection on vlHeight change

## 0.9.2

### Performance

* **manual change detection:** detached from angular change detection

## 0.9.19

### Fixed

* **lazy count change:** sometimes content didn't update on count increase

### Performance

* **scroll debounce time:** changed from 200ms to 100ms for quicker visual response
* **less relayouting:** caching scrollTop after scroll events to prevent more relayouting
* **changing test array size:** array resize now done in worker (cleaner perf testing results)

## 0.9.18

### Fixed

* **element height:** delay calculation a bit (should help with auto-wrapped flex content)
* **window resize:** listens to window resize event and triggers element height calculation

## 0.9.17

### Performance

* **initial load:** initial lazy loaded data should appear faster now

## 0.9.15

### Added

* **project:** changelog

### Performance

* **scrolling:** added performance hints to scroll container and content container
