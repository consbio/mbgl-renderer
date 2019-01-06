# Static Map Renderer using Mapbox GL

This package helps you create static map images using Mapbox GL. It currently provides:

- a NodeJS API with a `render` function you can call directly with your map properties
- a command line interface
- an HTTP interface

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

`yarn add mbgl-renderer`

This depends on `mapbox-gl-js` which in most cases must be compiled from source.

You need to have your system setup to compile C/C++, and have `cmake` installed.

On Mac, you might need to install some dependencies. You might need to do one of the following:

- setup XCode and its command line tools
- install `cmake`
- install the ruby gem `xcpretty` which requires installing a fairly recent version of ruby. You can install `rvm` to help set up a controlled version of ruby, then `gem install xcpretty`

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
  Usage: mbgl-render [options] <style.json> <img_filename> <width> <height>

  Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.

  Options:

    -V, --version                         output the version number
    -c, --center <longitude,latitude>     center of map (NO SPACES)
    -z, --zoom <n>                        Zoom level
    -b, --bounds <west,south,east,north>  Bounds (NO SPACES)
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

## Docker

To build the docker container:

```
docker build -t mbgl-server -f docker/Dockerfile .
```

To run the docker container on port 8080:

```
docker run --rm -p 8080:80 mbgl-server
```

Mount your local tiles, if you want to use with your docker container:

```
docker run --rm -p 8080:80 -v$(pwd)/tests/fixtures:/app/tiles mbgl-server
```

## Credits

- Nik Molnar (https://github.com/nikmolnar)
- Brendan Ward (https://github.com/brendan-ward)

This project was made possible based on support from the South Atlantic Landscape Conservation Cooperative (http://www.southatlanticlcc.org/) and the Paulson Institute (http://www.paulsoninstitute.org/).
