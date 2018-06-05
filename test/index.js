import test from 'tape';
import sinon from 'sinon';
import createApiMiddleware, {
  CALL_API,
  CALL_API_PHASE,
  callApiPhases,
  actionWith,
} from '../src/index';

function makeSleep(ms, shouldResolve, response) {
  return () =>
    new Promise((resolve, reject) => (
      setTimeout(() => (
        shouldResolve ? resolve(response) : reject(response)
      ), ms)
    )
  );
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
      [CALL_API_PHASE]: callApiPhases.REQUEST,
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});

test('Dispatches success action', (t) => {
  const RESPONSE = {};
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
      [CALL_API_PHASE]: callApiPhases.SUCCESS,
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
      [CALL_API_PHASE]: callApiPhases.FAILURE,
      payload: RESPONSE,
      error: true,
    }));
    t.true(doDispatch.calledTwice);
    t.end();
  });
});
