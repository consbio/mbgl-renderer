# Static Map Renderer using Mapbox GL

[![Build Status](https://travis-ci.org/consbio/mbgl-renderer.svg?branch=master)](https://travis-ci.org/consbio/mbgl-renderer)

[![Coverage Status](https://coveralls.io/repos/github/consbio/mbgl-renderer/badge.svg?branch=master)](https://coveralls.io/github/consbio/mbgl-renderer?branch=master)

Create static map images using Mapbox GL with a command line interface, an HTTP interface, and a NodeJS API.

## Features:

-   Render static maps using NodeJS with [mapbox-gl-native](https://github.com/mapbox/mapbox-gl-native)
-   Supports raster and vector tiles
-   Compatible with Mapbox tiles (don't forget attribution) and other hosted tile providers
-   Use locally hosted mbtiles
-   Add GeoJSON overlays to your maps
-   Supports high DPI rendering
-   Also available for use in Docker

[Blog post](https://medium.com/@brendan_ward/creating-a-static-map-renderer-using-the-mapbox-gl-native-nodejs-api-23db560b219e) describing the background and goals in a bit more detail.

One of the nifty features of this package is that you can use locally hosted mbtiles files
with your raster or vector tiles. This saves considerable time during rendering compared
to using map services over the web.

This package is intended to help with generating static maps for download or use in reports,
especially when combined with your own styles or overlays.

If you are only using hosted Mapbox styles and vector tiles, please use the [Mapbox Static API](https://www.mapbox.com/api-documentation/#static) instead; it is more full featured and more
appropriate for static Mapbox maps.

### Attribution

Please make sure to give appropriate attribution to the data sources and styles used in your maps,
in the manner that those providers specify.

If you use Mapbox styles or hosted tiles, make sure to include appropriate [attribution](https://www.mapbox.com/help/how-attribution-works/) in your output maps.

## Installation

`npm add mbgl-renderer`
or
`npm install mbgl-renderer`

### Supported versions of NodeJS:

-   8
-   10

Node 10 appears fully supported by the latest version of Mapbox GL. Originally, there were several issues when running on Node 10, causing segmentation faults and other errors. If you experience issues, we recommend using Node 8.

Only NodeJS versions with `@mapbox/mapbox-gl-native` binaries built by Mapbox are supported via `npm install`, otherwise you need to build `@mapbox/mapbox-gl-native` from source yourself. See [build instructions](https://github.com/mapbox/mapbox-gl-native/blob/master/platform/node/DEVELOPING.md) for more information.

On a server, in addition to build tools, you need to install a GL environment. See the `Dockerfile` and `entrypoint.sh` for an example setup.

## Usage

### Style JSON:

The primary input to every map rendering method below is a Mapbox GL Style JSON file.
For full reference on this format, please see the [Mapbox documentation](https://docs.mapbox.com/mapbox-gl-js/style-spec/).

### Labels

In order to use text labels, you need to include `glyphs` in your Style JSON (sibling of `sources`)

To use Mapbox hosted glyphs (a Mapbox token is required):

```json
"glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf"
```

You can also use [OpenMapTiles hosted glyphs](https://github.com/openmaptiles/fonts):

```json
"glyphs": "http://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
```

In either case, you must make sure that the font you specify is available from that provider.
See `tests/fixtures/example-style-geojson-label.json` for an example of adding labels based on coordinates specified in
GeoJSON.

### NodeJS API:

The following examples assume that you are using `babel` to provide ES6 features.

```
import render from 'mbgl-renderer'

import style from `tests/fixtures/example-style.json`
// style JSON file with MapBox style.  Can also be opened and read instead of imported.

const width = 512
const height = 256
const center = [-79.86, 32.68]
const zoom = 10

render(style, width, height, { zoom, center })
    .then((data) => {
        fs.writeFileSync('test.png', data)
    }))
```

You can also provide `bounds` instead of `center` and `zoom`:

```
const width = 512
const height = 256
const bounds = [-80.23, 32.678, -79.73, 32.891]

render(style, width, height, { bounds })
    .then((data) => {
        fs.writeFileSync('test.png', data)
    }))
```

If you provide `bounds` you can also provide `padding` to add
that many pixels to each side of the rendered image. These pixels
are padded to the inside of the image, meaning that the resulting
image matches the `width` and `height` you provide, but is zoomed
out to allow padding around the edges.

```
const width = 512
const height = 256
const bounds = [-80.23, 32.678, -79.73, 32.891]
const padding = 25

render(style, width, height, { bounds, padding })
    .then((data) => {
        fs.writeFileSync('test.png', data)
    }))
```

`padding` must be integers and not be greater than 1/2 of `width`
or `height`, whichever is smaller. You can provide a negative
padding to over-zoom the image.

You can also supply a pixel ratio for High DPI screens, typically > 1 (max of 31 has been tested):

```
const width = 512
const height = 256
const center = [-79.86, 32.68]
const zoom = 10
const ratio = 2

render(style, width, height, { zoom, center, ratio })
    .then((data) => {
        fs.writeFileSync('test.png', data)
    }))
```

You can also provide an alternative bearing (0-360) or pitch (0-60):

```
const width = 512
const height = 256
const center = [-79.86, 32.68]
const zoom = 10
const bearing = 90
const pitch = 30

render(style, width, height, { zoom, center, bearing, pitch })
    .then((data) => {
        fs.writeFileSync('test.png', data)
    }))

```

If your style includes a Mapbox hosted source (e.g., `"url": "mapbox://mapbox.mapbox-streets-v7"`),
you need to pass in your Mapbox access token as well:

```
render(style, width, height, { bounds, token: '<your access token>' })
    .then((data) => {
        fs.writeFileSync('test.png', data)
    }))
```

### Command line interface:

```
  Usage: mbgl-render <style.json> <img_filename> <width> <height> [options]

  Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.

  Options:

    -V, --version                         output the version number
    -c, --center <longitude,latitude>     center of map (NO SPACES)
    -z, --zoom <n>                        Zoom level
    -r, --ratio <n>                       Pixel ratio
    -b, --bounds <west,south,east,north>  Bounds (NO SPACES)
    --padding <padding>                   Number of pixels to add to the inside of each edge of the image.  Can only be used with bounds option.
    --bearing <degrees>                   Bearing in degrees (0-360)
    --pitch <degrees>                     Pitch in degrees (0-60)
    -t, --tiles <mbtiles_path>            Directory containing local mbtiles files to render
    --token <mapbox access token>         Mapbox access token (required for using Mapbox styles and sources)
    -h, --help                            output usage information
```

To render an image using center (NO spaces or brackets) and zoom:

```
mbgl-render tests/fixtures/example-style.json test.png 512 256 -c -79.86,32.68 -z 10
```

To render an image using bounds (NO spaces or brackets):

```
mbgl-render tests/fixtures/example-style.json test.png 512 256 -b -80.23,32.678,-79.73,32.891
```

To render an image using bounds and padding:

```
mbgl-render tests/fixtures/example-style.json test.png 512 256 -b -80.23,32.678,-79.73,32.891 --padding 25
```

To use local mbtiles tilesets:

```
mbgl-render tests/fixtures/example-style-mbtiles-source-vector.json test.png 1024 1024 -z 0 -c 0,0 -t tests/fixtures
```

To use an Mapbox hosted style (see attribution above!):

```
mbgl-render mapbox://styles/mapbox/outdoors-v10 test.png 1024 1024 -c 0,0 -z 0 --token <your mapbox token>
```

Note: support for Mapbox hosted styles is still considered experimental.

### Static image server

You start this from the command line:

```
  Usage: mbgl-server [options]

  Start a server to render Mapbox GL map requests to images.

  Options:

    -V, --version               output the version number
    -p, --port <n>              Server port
    -t, --tiles <mbtiles_path>  Directory containing local mbtiles files to render
    -v, --verbose               Enable request logging
    -h, --help                  output usage information
```

To start this on port 8080 with local tiles in `tests/fixtures`:

```
mbgl-static-server -p 8080 -t tests/fixtures
```

You can also start this via `npm start` but you must use the `--` spacer before passing argmuents:

```
npm start -- --port 8080 --tiles tests/fixtures
```

#### Making requests

In your client of choice, you can make either HTTP GET or POST requests.

##### GET requests:

`height` and `width` are integer values
`zoom` is a floating point value
`ratio` is an integer value
`center` if provided must be a `longitude,latitude` with floating point values (NO spaces or brackets)
`bounds` if provided must be `west,south,east,north` with floating point values (NO spaces or brackets)
`padding` if provided must be an integer value that is less than 1/2 of width or height, whichever is smaller. Can only be used with bounds.
`bearing is a floating point value (0-360)`pitch`is a floating point value (0-60)`token` if provided must a string
`images` is a JSON with image names as keys and image urls as values.

Images parameter is used when your style includes and `icon-image` property (e.g. festival.png). Server
will download the image from the url specified in this parameter and add it to the map
(e.g. {"festival.png": "http://images.com/festival.png"}). Only png images are supported for now.

Your style JSON needs to be URL encoded:

```
http://localhost:8080/render?height=1024&width=1024&center=-80,-20&zoom=3&style=%7B%22version%22%3A8%2C%22sources%22%3A%7B%22land%22%3A%7B%22type%22%3A%22vector%22%2C%22url%22%3A%22mbtiles%3A%2F%2Fland%22%2C%22tileSize%22%3A256%7D%7D%2C%22layers%22%3A%5B%7B%22id%22%3A%22land%22%2C%22type%22%3A%22fill%22%2C%22source%22%3A%22land%22%2C%22source-layer%22%3A%22land%22%2C%22paint%22%3A%7B%22fill-color%22%3A%22%23AAAAAA%22%2C%22fill-opacity%22%3A1%7D%7D%5D%7D
```

If your style JSON points to local tilesets, you must have started the server up using those local tilesets.

To test the server from the command line, for example with the excellent tool [`httpie`](https://httpie.org/) with the style file `tests/fixtures/example-style-mbtiles-source.json`:

```
http :8080/render width=400 height=400 zoom=0 center=0,0 style:=@tests/fixtures/example-style.json > /tmp/test.png
```

##### POST requests:

You can do a POST request with all of the above parameters in the body of the request, and the style can be passed directly as JSON instead of URL encoded.

POST may be necessary where your style JSON file exceeds the maximum number of characters allowed in a GET request URL.

## Development

Use `npm run watch` to start up a file watcher to recompile ES6 files in `src/` to ES5 files that are executable in Node in `dist/`. These are compiled using `babel`.

## Testing

Tests are run using `jest`. Right now, our coverage is not great and tests only exercise the core functionality of the render function.

Tests require a valid Mapbox API token. Set this in `.env.test` file in the root of the repository:

```
MAPBOX_API_TOKEN=<your token>
```

To run tests:

```
npm run test
```

This uses the `pixelmatch` package to determine if output images match those that are expected. This may fail when rendered on different machines for reasons we have not completely sorted out, so don't necessarily be alarmed that tests are failing for you - check the outputs.

## Docker

Pull the latest image from [Docker Hub](https://hub.docker.com/r/consbio/mbgl-renderer):

```
docker pull consbio/mbgl-renderer:latest
```

To run `mbgl-server` in the docker container on port 8080:

```
docker run --rm -p 8080:80 consbio/mbgl-renderer
```

Mount your local tiles directory to `/app/tiles` in the container to use these in the server or CLI:

```
docker run --rm -p 8080:80 -v $(pwd)/tests/fixtures:/app/tiles consbio/mbgl-renderer
```

### Build your own image:

Build your own docker container with name `<image_name>`:

```
docker build -t <image_name> -f docker/Dockerfile .
```

## Headless servers

In order to use this package on a headless server, you need to use `xvfb`. See `docker/Dockerfile` and `docker/entrypoint.sh` for the basic configuration.

## Changes

### NEXT

-   avoid nesting error messages

### 0.7.2

-   skip request logging for routes that do not exist (e.g., docker health check)

### 0.7.1

-   Fixed handling of `NaN` and `Infinity` in inputs for `bounds` and `center` (#58)

### 0.7.0

-   Added support for padding image bounds
-   Handle missing remote assets correctly (#49)
-   Added support for image sources (#52)
-   Added request logging (#54)

### 0.6.2

-   Fix bad handling of root path (#43)

### 0.6.1

-   Docker: fix missing `/app/tiles` directory if user does not bind in a tiles directory (resolves #40)

### 0.6.0

-   upgraded `mapbox-gl-native` to 5.0.0 (#35). NOTE: [fallback to source builds of `mapbox-gl-native` are no longer supported](https://github.com/mapbox/mapbox-gl-native/blob/master/platform/node/CHANGELOG.md#500).
-   warn rather than fail on missing tiles

### O.5.0

-   upgraded Docker to NodeJS 10
-   reduced size of Docker image and simplified Xvfb management
-   added support for `pitch` and `bearing` options during rendering (#31)

### 0.4.0

-   rendering now uses floating point zoom levels when `bounds` are provided as inputs
-   downgraded supported version of Node to 8, due to occasional segfaults: https://github.com/mapbox/mapbox-gl-native/issues/12252

Prior to `0.3.1`, there was a significant bug in rendering layers with transparency (#25).

## Credits

This project was made possible based on support from the South Atlantic Landscape Conservation Cooperative (http://www.southatlanticlcc.org/) and the Paulson Institute (http://www.paulsoninstitute.org/).

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://astutespruce.com"><img src="https://avatars2.githubusercontent.com/u/3375604?v=4" width="100px;" alt="Brendan Ward"/><br /><sub><b>Brendan Ward</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=brendan-ward" title="Code">💻</a> <a href="https://github.com/consbio/mbgl-renderer/commits?author=brendan-ward" title="Documentation">📖</a> <a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Abrendan-ward" title="Bug reports">🐛</a> <a href="#blog-brendan-ward" title="Blogposts">📝</a> <a href="https://github.com/consbio/mbgl-renderer/pulls?q=is%3Apr+reviewed-by%3Abrendan-ward" title="Reviewed Pull Requests">👀</a> <a href="#ideas-brendan-ward" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/nikmolnar"><img src="https://avatars1.githubusercontent.com/u/2422416?v=4" width="100px;" alt="Nik Molnar"/><br /><sub><b>Nik Molnar</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=nikmolnar" title="Code">💻</a> <a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Anikmolnar" title="Bug reports">🐛</a> <a href="#ideas-nikmolnar" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/ka7eh"><img src="https://avatars1.githubusercontent.com/u/4112646?v=4" width="100px;" alt="Kaveh"/><br /><sub><b>Kaveh</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Aka7eh" title="Bug reports">🐛</a> <a href="#ideas-ka7eh" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/bertrandmd"><img src="https://avatars0.githubusercontent.com/u/9257198?v=4" width="100px;" alt="bertrandmd"/><br /><sub><b>bertrandmd</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=bertrandmd" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/korpd"><img src="https://avatars1.githubusercontent.com/u/44464673?v=4" width="100px;" alt="Daniel Korp"/><br /><sub><b>Daniel Korp</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=korpd" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/kjkurtz"><img src="https://avatars2.githubusercontent.com/u/6036168?v=4" width="100px;" alt="Kyle Kurtz"/><br /><sub><b>Kyle Kurtz</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=kjkurtz" title="Code">💻</a></td>
    <td align="center"><a href="http://normanrz.com/"><img src="https://avatars1.githubusercontent.com/u/335438?v=4" width="100px;" alt="Norman Rzepka"/><br /><sub><b>Norman Rzepka</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=normanrz" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/submarcos"><img src="https://avatars3.githubusercontent.com/u/7448208?v=4" width="100px;" alt="J-E Castagnede"/><br /><sub><b>J-E Castagnede</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Asubmarcos" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://itsallinthega.me/"><img src="https://avatars3.githubusercontent.com/u/83251?v=4" width="100px;" alt="Jez Nicholson"/><br /><sub><b>Jez Nicholson</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Ajnicho02" title="Bug reports">🐛</a> <a href="#ideas-jnicho02" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/bob-gray"><img src="https://avatars0.githubusercontent.com/u/814812?v=4" width="100px;" alt="Bob Gray"/><br /><sub><b>Bob Gray</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Abob-gray" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/abraztsov"><img src="https://avatars3.githubusercontent.com/u/19175580?v=4" width="100px;" alt="Nikita Abraztsov"/><br /><sub><b>Nikita Abraztsov</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3Aabraztsov" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/LePetitTim"><img src="https://avatars1.githubusercontent.com/u/26329336?v=4" width="100px;" alt="Timothée Monty"/><br /><sub><b>Timothée Monty</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/issues?q=author%3ALePetitTim" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://stunkymonkey.de"><img src="https://avatars0.githubusercontent.com/u/1315818?v=4" width="100px;" alt="felix"/><br /><sub><b>felix</b></sub></a><br /><a href="https://github.com/consbio/mbgl-renderer/commits?author=Stunkymonkey" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
