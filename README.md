# react-file-viewer

Extendable file viewer for web

Forked from https://github.com/plangrid/react-file-viewer

## Supported file formats:

- Images: png, jpeg, gif, bmp, including 360-degree images
- pdf
- csv
- xslx
- docx
- Video: mp4, webm
- Audio: mp3

## Usage

Note this module works best with react 16+. If you are using React < 16 you will likely need to use version 0.5. `npm install react-file-viewer@0.5.0`.

There is one main React component, `FileViewer`, that takes the following props:

`fileType` string: type of resource to be shown (one of the supported file
formats, eg `'png'`). Passing in an unsupported file type will result in displaying
an `unsupported file type` message (or a custom component).

`filePath` string: the url of the resource to be shown by the FileViewer.

`onError` function [optional]: function that will be called when there is an error in the file
viewer fetching or rendering the requested resource. This is a place where you can
pass a callback for a logging utility.

`errorComponent` react element [optional]: A component to render in case of error
instead of the default error component that comes packaged with react-file-viewer.

`unsupportedComponent` react element [optional]: A component to render in case
the file format is not supported.

To use a custom error component, you might do the following:

```
// MyApp.js
import React, { Component } from 'react';
import logger from 'logging-library';
import FileViewer from 'react-file-viewer';
import { CustomErrorComponent } from 'custom-error';

const file = 'http://example.com/image.png'
const type = 'png'

class MyComponent extends Component {
  render() {
    return (
      <FileViewer
        fileType={type}
        filePath={file}
        errorComponent={CustomErrorComponent}
        onError={this.onError}/>
    );
  }

  onError(e) {
    logger.logError(e, 'error in file-viewer');
  }
}
```

## Development

There is a demo app built into this library that can be used for development
purposes. It is by default served via webpack-dev-server.

### To start demo app

`yarn serve:dev` will start the webpack analyzer and serve `app.js` for debugging and playwright.

### Testing

Tests use Jest, Enzyme, and Playwright.

Run tests with:

```
yarn test:watch
```

This starts Jest in watch mode. To run a particular test file, while in watch mode
hit `p` and then type the path or name of the file.

Some tests use snapshots. If intended changes to a component cause snapshot tests
to fail, snapshot files need to be updated (stored in `__snapshots__` directories).
To do this run:

```
yarn jest --updateSnapshot
```

```
yarn test:e2e
```

This runs the playwright tests for the drivers. As certain drivers now rely on modern web API, playwright must be used to
simulate a real browser environment as this is still experimental within Jest's JSDOM.

### To run the linter

`yarn lint`

### Extending the file viewer

Adding supported file types is easy (and pull requests are welcome!). Say, for
example, you want to add support for `.rtf` files. First, you need to create a
"driver" for that file type. A driver is just a component that is capable of
rendering that file type. (See what exists now in `src/components/drivers`.) After
you've created the driver component and added it to `src/components/drivers`, you
simply need to import the component into `file-vewer.jsx` and add a switch clause
for `rtf` to the `getDriver` method. Ie:

```
case 'rtf':
  return RtfViewer;
```

### Viewing local changes in a secondary repo

If you are working on a feature branch and need to see changes introduced in that branch in another repo that using this library, here are the steps:

1. Run `yarn build` in this react-file-viewer repo
2. In the secondary repo, update `package.json` to point the trussworks/react-file-viewer declaration to your branch in the react-file-viewer repo:

```
"@trussworks/react-file-viewer": "git+https://github.com/trussworks react-file-viewer#your-branch-name"
```

3. In the secondary repo, reinstall frontend packages and then run the client.

4. When your react-file-viewer branch is merged into main, update the `package.json` in the secondary repo to declare the react-file-viewer libary normally

`"@trussworks/react-file-viewer": "git+https://github.com/trussworks react-file-viewer"`

## Roadmap

- [ ] Remove ignored linting rules and fix them
- [ ] Convert CSS to CSS modules
- [ ] Add support for custom controls components
- [ ] Convert to TypeScript
- [ ] Add caching to fetch wrapper?
- [ ] Fix re-render FileViewer if file changes
- [ ] Code split drivers to reduce bundle size
- [ ] Update PDF.JS & API & use worker loader
