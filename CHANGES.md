## Changes

### 0.9.0 (in development)

#### Breaking changes:

-   upgrade minimum supported NodeJS version to 16 (#101)

#### Enhancements

-   switch from `@mapbox/mapbox-gl-native` (no longer maintained) to `@maplibre/maplibre-gl-native` (actively maintained) (#101)
-   upgraded dependencies to latest (#102)
-   better use builtin support in `commander` for validating arguments
-   Publish Docker images to [Github Container Registry](https://github.com/consbio/mbgl-renderer/pkgs/container/mbgl-renderer) instead of Docker Hub (#103)

### 0.8.0

#### Enhancements

-   upgrade NodeJS version in Docker and use newer base OS
-   added ability to provide images that can be used for `icon-image`, `line-pattern`, `fill-pattern` properties in style

### 0.7.3

#### Enhancements

-   upgraded JS dependencies

#### Bug fixes

-   actually skip request logging for docker health check
-   avoid nesting error messages

#### Potentially breaking changes:

-   @mapbox/geo-viewport 0.4.1 included a fix for calculating center points, which
    causes a small change in the center and zoom level automatically calculated
    here when `bounds` are provided for rendering. If you depend on precise
    control over how `bounds` are used for rendering, please check the outputs
    after upgrading.

### 0.7.2

#### Enhancements

-   skip request logging for routes that do not exist (e.g., docker health check)

### 0.7.1

#### Bug fixes

-   Fixed handling of `NaN` and `Infinity` in inputs for `bounds` and `center` (#58)

### 0.7.0

#### Enhancements

-   Added support for padding image bounds
-   Added support for image sources (#52)
-   Added request logging (#54)

#### Bug fixes

-   Handle missing remote assets correctly (#49)

### 0.6.2

#### Bug fixes

-   Fix bad handling of root path (#43)

### 0.6.1

#### Bug fixes

-   Docker: fix missing `/app/tiles` directory if user does not bind in a tiles directory (resolves #40)

### 0.6.0

#### Enhancements

-   upgraded `mapbox-gl-native` to 5.0.0 (#35). NOTE: [fallback to source builds of `mapbox-gl-native` are no longer supported](https://github.com/mapbox/mapbox-gl-native/blob/master/platform/node/CHANGELOG.md#500).
-   warn rather than fail on missing tiles

### O.5.0

#### Enhancements

-   upgraded Docker to NodeJS 10
-   reduced size of Docker image and simplified Xvfb management
-   added support for `pitch` and `bearing` options during rendering (#31)

### 0.4.0

-   rendering now uses floating point zoom levels when `bounds` are provided as inputs

#### Bug fixes

-   downgraded supported version of Node to 8, due to occasional segfaults: https://github.com/mapbox/mapbox-gl-native/issues/12252

Prior to `0.3.1`, there was a significant bug in rendering layers with transparency (#25).
