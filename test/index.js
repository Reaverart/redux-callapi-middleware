import test from 'tape';
import sinon from 'sinon';
import createApiMiddleware, {
  CALL_API,
  CALL_API_PHASE,
  CALL_API_SKIP_REQUEST,
  callApiPhases,
} from '../src/index';

function makeSleep(ms, shouldResolve, response, spy) {
  return (...args) => {
    if (spy) {
      spy(...args);
    }
    return new Promise((resolve, reject) => (
      setTimeout(() => (
        shouldResolve ? resolve(response) : reject(response)
      ), ms)
    ));
  };
}

test('Calls fetch function with given endpoint and options', (t) => {
  const spy = sinon.spy();
  const apiMiddleware = createApiMiddleware({ callApi: spy });
  const doGetState = () => {};
  const doDispatch = () => {};
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  const ENDPOINT = 'ENDPOINT';
  const OPTIONS = {};
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      endpoint: ENDPOINT,
      options: OPTIONS,
    },
  });
  t.true(spy.calledOnce);
  t.true(spy.calledWith(ENDPOINT, OPTIONS));
  t.end();
});

test('Calls fetch function and makes endpoint and options', (t) => {
  const spy = sinon.spy();
  const apiMiddleware = createApiMiddleware({ callApi: spy });
  const doGetState = () => {};
  const doDispatch = () => {};
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  const ENDPOINT = 'ENDPOINT';
  const OPTIONS = {};
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      endpoint: () => ENDPOINT,
      options: () => OPTIONS,
    },
  });
  t.true(spy.calledOnce);
  t.true(spy.calledWith(ENDPOINT, OPTIONS));
  t.end();
});

test('Calls batch requests', (t) => {
  const spy = sinon.spy();
  const apiMiddleware = createApiMiddleware({ callApi: spy });
  const doGetState = () => {};
  const doDispatch = () => {};
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  const ENDPOINT = 'ENDPOINT';
  const OPTIONS = {};
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      batch: [
        {
          endpoint: () => ENDPOINT,
          options: () => OPTIONS,
        },
        {
          endpoint: () => ENDPOINT,
          options: () => OPTIONS,
        },
      ],
    },
  });
  t.true(spy.calledTwice);
  t.true(spy.firstCall.calledWith(ENDPOINT, OPTIONS));
  t.true(spy.secondCall.calledWith(ENDPOINT, OPTIONS));
  t.end();
});

test('Dispatches request action', (t) => {
  const apiMiddleware = createApiMiddleware({ callApi: makeSleep(0, true, {}) });
  const doGetState = () => {};
  const doDispatch = sinon.spy();
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      endpoint: 'endpoint',
      options: {},
    },
  }).then(() => {
    t.true(doDispatch.firstCall.calledWith({
      type: 'REQUEST',
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});

test('Dispatches success action', (t) => {
  const RESPONSE = 'RESPONSE';
  const apiMiddleware = createApiMiddleware({ callApi: makeSleep(0, true, RESPONSE) });
  const doGetState = () => {};
  const doDispatch = sinon.spy();
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      endpoint: 'endpoint',
      options: {},
    },
  }).then(() => {
    t.true(doDispatch.secondCall.calledWith({
      type: 'SUCCESS',
      payload: RESPONSE,
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});

test('Dispatches failure action', (t) => {
  const RESPONSE = new Error();
  const apiMiddleware = createApiMiddleware({ callApi: makeSleep(0, false, RESPONSE) });
  const doGetState = () => {};
  const doDispatch = sinon.spy();
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      endpoint: 'endpoint',
      options: {},
    },
  }).then(() => {
    t.true(doDispatch.secondCall.calledWith({
      type: 'FAILURE',
      payload: RESPONSE,
      error: true,
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});

test('Dispatches single typed action with request and success action phase', (t) => {
  const ACTION_TYPE = 'ACTION_TYPE';
  const RESPONSE = 'RESPONSE';
  const apiMiddleware = createApiMiddleware({ callApi: makeSleep(0, true, RESPONSE) });
  const doGetState = () => {};
  const doDispatch = sinon.spy();
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  actionHandler({
    [CALL_API]: {
      type: ACTION_TYPE,
      endpoint: 'endpoint',
      options: {},
    },
  }).then(() => {
    t.true(doDispatch.firstCall.calledWith({
      type: ACTION_TYPE,
      [CALL_API_PHASE]: callApiPhases.REQUEST,
    }));
    t.true(doDispatch.secondCall.calledWith({
      type: ACTION_TYPE,
      [CALL_API_PHASE]: callApiPhases.SUCCESS,
      payload: RESPONSE,
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});

test('Dispatches single typed action with request and failure action phase', (t) => {
  const ACTION_TYPE = 'ACTION_TYPE';
  const RESPONSE = new Error();
  const apiMiddleware = createApiMiddleware({ callApi: makeSleep(0, false, RESPONSE) });
  const doGetState = () => {};
  const doDispatch = sinon.spy();
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  actionHandler({
    [CALL_API]: {
      type: ACTION_TYPE,
      endpoint: 'endpoint',
      options: {},
    },
  }).then(() => {
    t.true(doDispatch.firstCall.calledWith({
      type: ACTION_TYPE,
      [CALL_API_PHASE]: callApiPhases.REQUEST,
    }));
    t.true(doDispatch.secondCall.calledWith({
      type: ACTION_TYPE,
      [CALL_API_PHASE]: callApiPhases.FALIURE,
      payload: RESPONSE,
      error: true,
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});

test('Calls batch and queue requests', (t) => {
  const spy = sinon.spy();
  const apiMiddleware = createApiMiddleware({ callApi: makeSleep(300, true, 'RESPONSE', spy) });
  const doGetState = () => {};
  const doDispatch = (act) => act;
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  const ENDPOINT = 'ENDPOINT';
  const OPTIONS = {};

  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      batch: [
        {
          endpoint: () => ENDPOINT,
          options: () => OPTIONS,
        },
        {
          endpoint: () => ENDPOINT,
          options: () => OPTIONS,
        },
      ],
      queue: [
        () => ({
          batch: [
            {
              endpoint: () => ENDPOINT,
              options: () => OPTIONS,
            },
            {
              endpoint: () => ENDPOINT,
              options: () => OPTIONS,
            },
          ],
        }),
        () => ({
          [CALL_API_SKIP_REQUEST]: ['SKIP'],
        }),
        () => ({
          [CALL_API_SKIP_REQUEST]: true,
        }),
        () => ({
          endpoint: 'test',
          options: OPTIONS,
        }),
      ],
    },
  }).then((action) => {
    t.true(spy.callCount === 5);
    // t.true(action.payload);
    // t.true(spy.secondCall.calledWith(ENDPOINT, OPTIONS));
    t.end();
  })
});
