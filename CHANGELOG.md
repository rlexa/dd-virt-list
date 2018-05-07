# 0.10.0

### Breaking Changes

* **@angular:** now aligned to @angular framework 6.0.0

# 0.9.25

### Changed

* **vlBatchSize:** allow smaller values (min 5 now)

# 0.9.24

### Changed

* **change detection:** more reactive internally (less manual change detection)

# 0.9.23

### Fixed

* **change detection:** prevent manual change detection when destroyed

# 0.9.21

### Fixed

* **vlHeight:** manual change detection on vlHeight change

# 0.9.2

### Performance

* **manual change detection:** detached from angular change detection

# 0.9.19

### Fixed

* **lazy count change:** sometimes content didn't update on count increase

### Performance

* **scroll debounce time:** changed from 200ms to 100ms for quicker visual response
* **less relayouting:** caching scrollTop after scroll events to prevent more relayouting
* **changing test array size:** array resize now done in worker (cleaner perf testing results)

# 0.9.18

### Fixed

* **element height:** delay calculation a bit (should help with auto-wrapped flex content)
* **window resize:** listens to window resize event and triggers element height calculation

# 0.9.17

### Performance

* **initial load:** initial lazy loaded data should appear faster now

# 0.9.15

### Added

* **project:** changelog

### Performance

* **scrolling:** added performance hints to scroll container and content container
