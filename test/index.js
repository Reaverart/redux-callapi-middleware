import test from 'tape';
import sinon from 'sinon';
import createApiMiddleware, {
  CALL_API,
  CALL_API_PHASE,
  callApiPhases,
  actionWith,
} from '../src/index';

function sleep(ms, shouldResolve, response) {
  return new Promise((resolve, reject) => (
    shouldResolve ? resolve(response) : reject(response)
  ));
}

// test('Tests ara running', (t) => {
//   t.end();
// });

test('Calls fetch function', (t) => {
  const spy = sinon.spy();
  const apiMiddleware = createApiMiddleware({ callApi: spy });
  const doGetState = () => {};
  const doDispatch = () => {};
  const nextHandler = apiMiddleware({ getState: doGetState, dispatch: doDispatch });
  const doNext = () => {};
  const actionHandler = nextHandler(doNext);
  actionHandler({
    [CALL_API]: {
      types: ['REQUEST', 'SUCCESS', 'FAILURE'],
      endpoint: 'endpoint',
      options: {},
    },
  });
  console.log(spy.args);
  t.true(spy.calledOnce);
  t.end();
});
