redux-callapi-middleware
====================
Redux CallAPI Middleware to make API calls in generic and declarative way. Allows to batch multiple API calls and intercept responses.

## Contents

1. [Example](#example)
2. [Usage and Docs](#usage-and-docs)
  1. [Installation](#installation)
  2. [Create middleware](#create-middleware)
  3. [Action creator](#action-creator)
  4. [Lifecycle](#lifecycle)
  5. [Dispatched FSAs](#dispatched-fsas)
3. [FAQ](faq)
4. [Acknowledgements](acknowledgements)
5. [License](License)

## Example
This is the simplest form, nothing wrong here, but take a look at [create middleware](#create-middleware) and [action creator](#action-creator) sections if you need customization, its quite flexible.
### Single typed action
```js
// actions file
import { CALL_API } from `redux-callapi-middleware`;

export const callApi = () => ({
  [CALL_API]: {
    type: ACTION_TYPE,
    endpoint: 'http://yourdomain.com/api/posts',
    options: {
      method: 'GET'
    }
  }
});
// somewhere
import { callApi } from 'actions';
dispatch(callApi());

```
This will dispatch *request* FSA before request:

```js
{ type: ACTION_TYPE, [CALL_API_PHASE]: REQUEST }
```

If everything is fine it will dispatch *success* FSA on request response:

```js
{
  type: ACTION_TYPE,
  payload: payload,
  [CALL_API_PHASE]: SUCCESS
}
```

Otherwise it will dispatch *failure* FSA:

```js
{
  type: ACTION_TYPE,
  payload: error,
  [CALL_API_PHASE]: FAILURE
  error: true
}
```

### Different action type

```js
// actions file
import { CALL_API } from `redux-callapi-middleware`;

export const callApi = () => ({
  [CALL_API]: {
    types: ['REQUEST', 'SUCCESS', 'FAILURE'],
    endpoint: 'http://yourdomain.com/api/posts',
    options: {
      method: 'GET'
    }
  }
});

// somewhere
import { callApi } from 'actions';
dispatch(callApi());
```

This will dispatch *request* FSA before request:

```js
{ type: 'REQUEST' }
```

If everything is fine it will dispatch *success* FSA on request response:

```js
{
  type: 'SUCCESS',
  payload: payload
}
```

Otherwise it will dispatch *failure* FSA:

```js
{
  type: 'FAILURE',
  payload: error,
  error: true
}
```

## Usage and Docs

### Installation

1. Install `redux-callapi-middleware` through [npm](https://www.npmjs.com/package/redux-callapi-middleware):

  ```js
  $ npm install redux-callapi-middleware --save
  ```
2. Add middleware with redux `applyMiddleware()`:

  ```js
  import { createStore, applyMiddleware } from 'redux';
  import apiMiddleware from 'redux-callapi-middleware';
  import reducers from './reducers';

  const store = createStore(
    reducers,
    applyMiddleware(apiMiddleware)
  );
  ```

### Create middleware

Middleware exposes `createMiddleware` function which accepts object with `callApi` function.
So you can pass any fetch implementation you wish with any response interceptors.

```js
import { createMiddleware } from 'redux-callapi-middleware';
import fetch from 'isomorphic-fetch';

const apiMiddleware = createMiddleware({ callApi: fetch });
```

Or with interceptors

```js
import { createMiddleware } from 'redux-callapi-middleware';
import fetch from 'isomorphic-fetch';

const onSuccess = (response) => {
  if (!response.ok) {
    throw new Error('Error');
  }
  return response;
}

const callApi = (url, options) => fetch(url, options).then(onSuccess);

const apiMiddleware = createMiddleware({ callApi });
```

### Action creator

Action creator should return an object with `[CALL_API]` property with `batch`, `endpoint`, `options` and `types` fields. See [example](#example).

#### `[CALL_API].batch`

An API endpoints to batch call. `Array` of `Objects` contains `endpoint` and `options` fields in same format as `[CALL_API].endpoint` and `[CALL_API].options`.
```js
batch: [
  { endpoint1, options1 },
  { endpoint2, options2 },
],
```

#### `[CALL_API].endpoint`

An API endpoint to call. Used if batch is not populated. String or function which receives state and returns string.
```js
endpoint: 'someurl',
```
```js
// calculate url from state
endpoint: (apiAction, state) => 'someurl',
```

#### `[CALL_API].options`

Request options object. Used if batch is not populated. Object or function which receives state and returns object.
It uses [`isomorphic-fetch`](https://github.com/matthew-andrews/isomorphic-fetch) under the hood, so any valid options for [fetch](https://fetch.spec.whatwg.org), like `body`, `credentials`, `headers` and etc.
```js
options: { 'method': 'PUT'},
```
```js
// calculate options from state
options: (apiAction, state) => { 'method': 'PUT'},
```

#### `[CALL_API].types`

Array of actions to dispatch as middleware output. It might be strings or symbols or FSA's or functions which should return FSA's or mix of them.
So its fine to have following structure in `[CALL_API].types`:

```js
[
  (action, state) => ({
    type: 'REQUEST',
    payload: { isFetching: true }
  }),
  { type: 'SUCCESS' },
  'FAILURE'
]
```

#### `[CALL_API].type`

Action type to dispatch as middleware output. It will be the same type for REQUEST, SUCCESS and FAILURE actions, but phase of action will be attached to an action under special `[CALL_API_PHASE]` property (all the info in [`0.5.0 release notes`](https://github.com/Reaverart/redux-callapi-middleware/releases/tag/0.5.0)), i.e.:

```js
{
  type: ACTION_TYPE,
  [CALL_API_PHASE]: REQUEST || SUCCESS || FAILURE
}
```

### How it works

1. Checks if action has `[CALL_API]`. If no it stops and dispatches action to next middleware.
2. Builds request endpoint and options. There might be error handling in future.
3. Dispatches to next middleware *request* FSA from first item of `[CALL_API].types`.
4. Performs API call by request params.
5. Checks response status with `checkStatus` function (see [create middleware](#create-middleware)). If succeed it will try to parse response with `parseResponse` function (see [create middleware](#create-middleware)) and will dispatch *success* FSA from second item of `[CALL_API].types`. Otherwise, it will dispatch *failure* FSA from third item of `[CALL_API].types`.

### Dispatched FSAs

The `[CALL_API].types` array can hold 4 kind of actions types:
  * `strings` - will be converted to FSA `object`.
  * `symbols` - same as strings.
  * `object` - it should be valid FSA `object`.
    ```js
      {
        type: 'REQUEST',
        payload: {
          page: 5
        }
      }
    ```
  * `function` - most flexible way it will receive 3 arguments: `[CALL_API]` object, state and payload. But it should return valid FSA `object`.
    ```js
      (apiAction, state, payload) => ({
        type: 'SUCCESS',
        payload
      })
    ```

#### Request FSA

Not receives payload as FSA property or function argument from middleware. (There is no payload at this moment)

#### Success FSA

Receives response as payload, it will be converted to json or text by middleware.

#### Failure FSA

Receives error as payload, response attached to `error.response` property. FSA also have error flag set to true.

## FAQ

1. Usage with thunk (dont forget to put api middleware *after* thunk in middleware chain):

  ```js
  import { CALL_API } from `redux-callapi-middleware`;

  const callApi = () => (
    (dispatch, getState) =>
      // do anything you need here

      return dispatch({
        [CALL_API]: {
          types: ['REQUEST', 'SUCCESS', 'FAILURE'],
          endpoint: 'http://yourdomain.com/api/posts',
          options: {
            method: 'GET'
          }
        }
      })
  )
  ```

2. Need a meta property in FSA?

  ```js
  {
    [CALL_API]: {
      types: [{
        type: 'REQUEST',
        meta: 'anything'
      },
      (apiAction, state, payload) => (
        {
          type: 'SUCCESS',
          payload,
          meta: payload.meta
        }
      ), {
        type: 'FAILURE',
        meta: 'anything'
      }],
      endpoint: 'http://yourdomain.com/api/posts',
      options: {
        method: 'GET'
      }
    }
  }
  ```

3. Need a payload function? Use `function` action type in `[CALL_API].types` and build own FSA.
  ```js
  {
    [CALL_API]: {
      types: [
        'REQUEST',
        'SUCCESS',
        // lets pass failure type as function
        (apiAction, state, error) => {
          // do anything you need but return FSA object
          const payload = formatErrorPayload(error)
          return {
            type: 'FAILURE',
            meta: 'anything',
            payload
          };
      }],
      endpoint: 'http://yourdomain.com/api/posts',
      options: {
        method: 'GET'
      }
    }
  }
  ```

4. Need a `promise` as output action?

Not supported, but might work with [redux-promise](https://github.com/acdlite/redux-promise).

5. Difference with [redux-api-middleware](https://github.com/agraboso/redux-api-middleware)?
  1. It dispatches errors only with *error* type
  2. It not dispatches "programmatic" errors, like errors on endpoint generation.
  3. It gives more control with functions as actions types
  4. Not supports promises, but take look to [redux-promise](https://github.com/acdlite/redux-promise).
  5. Allows to batch API calls

6. Want to have base URL?

Write a wrapper around your callApi action creator.

7. Want to check custom headers or have custom parse response?

See [create middleware](#create-middleware)

8. Wish to have custom error handling?

See [create middleware](#create-middleware)

## Acknowledgements

Originally inspired and extracted from [Dan Abramov](https://github.com/gaearon) the [real-world](https://github.com/rackt/redux/blob/master/examples/real-world/middleware/api.js) sample in the [redux](https://github.com/rackt/redux) repository. Thanks to all developers and contributors.

## License

The MIT License (MIT)
Copyright (c) 2017 Artur Charaev
