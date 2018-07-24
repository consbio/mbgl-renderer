# Static Map Renderer using Mapbox GL

This package helps you create static map images using Mapbox GL. It currently provides:

-   a NodeJS API with a `render` function you can call directly with your map properties
-   a command line interface
-   an HTTP interface

One of the nifty features of this package is that you can use locally hosted mbtiles files
with your raster or vector tiles. This saves considerable time during rendering compared
to using map services over the web.

## Installation

This package is not yet posted and easily installable from npm, so you need to do a bit more work to get it setup:

1.  `git@github.com:consbio/mbgl-renderer.git`
2.  `cd mapbox-gl-static`
3.  `yarn install` (note: this might take a long time as the core dependency `mapbox-gl-native` needs to be compiled from source)
4.  if the above compilation fails due to not finding an available pre-compiled binary, try again with `npm install @mapbox/mapbox-gl-native --build-from-source`

You need to have your system setup to compile C/C++, and have `cmake` installed.

On Mac, you might need to install some dependencies. You might need to do one of the following:

-   setup XCode and its command line tools
-   install `cmake`
-   install the ruby gem `xcpretty` which requires installing a fairly recent version of ruby. You can intall `rvm` to help set up a controlled version of ruby, then `gem install xcpretty`

On a server, in addition to build tools, you need to install a GL environment.

We are currently working on defining a Dockerfile for this package to aid in setting it up.

## Usage

### NodeJS API:

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

### Command line interface:

```
  Usage: mbgl-render [options] <style.json> <img_filename> <width> <height>

  Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.

  Options:

    -V, --version                         output the version number
    -c, --center <longitude,latitude>     center of map (NO SPACES)
    -z, --zoom <n>                        Zoom level
    -b, --bounds <west,south,east,north>  Bounds (NO SPACES)
    -t, --tiles <mbtiles_path>            Directory containing local mbtiles files to render
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

To use local mbtiles tilesets:

```
mbgl-render tests/fixtures/example-style-mbtiles-source-vector.json test.png 1024 1024 -z 0 -c 0,0 -t tests/fixtures
```

### Static image server

You start this from the command line:

```
  Usage: mbgl-server [options]

  Start a server to render Mapbox GL map requests to images.

  Options:

    -V, --version               output the version number
    -p, --port <n>              Server port
    -t, --tiles <mbtiles_path>  Directory containing local mbtiles files to render
    -h, --help                  output usage information
```

To start this on port 8080 with local tiles in `tests/fixtures`:

```
mbgl-static-server -p 8080 -t tests/fixtures
```

You can also start this via `yarn start` but you must use the long parameter names `--port` instead of the short ones.

```
yarn start --port 8080 --tiles tests/fixtures
```

#### Making requests

In your client of choice, you can make either HTTP GET or POST requests.

##### GET requests:

`height` and `width` are integer values
`zoom` is a floating point value
`center` if provided must be a `longitude,latitude` with floating point values (NO spaces or brackets)
`bounds` if provided must be `west,south,east,north` with floating point values (NO spaces or brackets)

Your style JSON needs to be URL encoded:

```
http://localhost:8080/render?height=1024&width=1024&center=-80,-20&zoom=3&style=%7B%22version%22%3A8%2C%22sources%22%3A%7B%22land%22%3A%7B%22type%22%3A%22vector%22%2C%22url%22%3A%22mbtiles%3A%2F%2Fland%22%2C%22tileSize%22%3A256%7D%7D%2C%22layers%22%3A%5B%7B%22id%22%3A%22land%22%2C%22type%22%3A%22fill%22%2C%22source%22%3A%22land%22%2C%22source-layer%22%3A%22land%22%2C%22paint%22%3A%7B%22fill-color%22%3A%22%23AAAAAA%22%2C%22fill-opacity%22%3A1%7D%7D%5D%7D
```

If your style JSON points to local tilesets, you must have started the server up using those local tilesets.

##### POST requests:

You can do a POST request with all of the above parameters in the body of the request, and the style can be passed directly as JSON instead of URL encoded.

POST may be necessary where your style JSON file exceeds the maximum number of characters allowed in a GET request URL.

## Development

Use `yarn watch` to start up a filewatcher to recompile ES6 files in `src/` to ES5 files that are executable in Node in `dist/`. These are compiled using `babel`.

Tests are run using `jest`. Right now, our coverage is not great, and tests only exercise the core functionality of the render function.

To run tests:

```
yarn test
```

This uses the `pixelmatch` package to determine if output images match those that are expected. This may fail when rendered on different machines for reasons we have not completely sorted out, so don't necessarily be alarmed that tests are failing for you - check the outputs.

## Credits

-   Nik Molnar (https://github.com/nikmolnar) did much of the initial development that was used in this project
-   Brendan Ward (https://github.com/brendan-ward)
