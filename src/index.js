export const CALL_API = Symbol('Call API');
export const CALL_API_PHASE = Symbol('Call API phase');

const REQUEST = 'REQUEST';
const SUCCESS = 'SUCCESS';
const FAILURE = 'FAILURE';

export const callApiPhases = {
  REQUEST,
  SUCCESS,
  FAILURE,
};

export const actionWith = (actionType, args, payload) => {
  let nextAction;
  if (typeof actionType === 'function') {
    nextAction = actionType(...args, payload);
  } else {
    // convert strings or symbols to FSA object
    if (typeof actionType === 'string' || typeof actionType === 'symbol') {
      nextAction = { type: actionType };
    } else {
      nextAction = actionType;
    }

    if (payload) {
      nextAction.payload = payload;
    }
  }
  // backward compatibility
  if (payload instanceof Error) {
    nextAction.error = true;
  }

  let phase;
  if (payload === undefined) {
    phase = REQUEST;
  } else if (payload instanceof Error) {
    phase = FAILURE;
  } else if (payload !== undefined) {
    phase = SUCCESS;
  }
  nextAction[CALL_API_PHASE] = phase;

  return nextAction;
};

const normalizeParams = (item, apiAction, getState) => {
  if (typeof item === 'function') {
    return item(apiAction, getState());
  }
  return item;
};

const prepareRequests = (data) => {
  let { batch } = data;
  const batchMode = Array.isArray(batch);
  if (!batchMode) {
    const { endpoint, options } = data;
    batch = [{ endpoint, options }];
  }
  return { batch, batchMode };
};

const normalizeRequests = (requestsOptions, args) => (
  requestsOptions.map(request => ({
    endpoint: normalizeParams(request.endpoint, ...args),
    options: normalizeParams(request.options, ...args),
  }))
);

const performRequests = (requests, callApi) => (
  requests.map(({ endpoint, options }) => callApi(endpoint, options))
);

const makeRequestsQueue = (callApi, queue) => (
  (apiAction, getState, responses) => (
    queue.reduce((memo, item, i) => (
      memo.then((res) => {
        const requestData = item(apiAction, getState, responses);
        const { batch } = prepareRequests(requestData);
        let requests = normalizeRequests(batch, [apiAction, getState]);
        requests = performRequests(requests, callApi);
        return Promise.all(requests).then(queueRes => res.concat(queueRes));
      })
    ), Promise.resolve(responses))
  )
);

export const createMiddleware = ({
  callApi,
}) => (
  ({ dispatch, getState }) => next => (action) => {
    if (!action[CALL_API]) {
      return next(action);
    }
    const apiAction = action[CALL_API];

    // action types
    const types = apiAction.type
      ? Array(3).fill(apiAction.type)
      : apiAction.types;
    const [requestType, successType, failureType] = types;

    const { queue } = apiAction;
    const queueMode = Array.isArray(queue);
    const { batch, batchMode } = prepareRequests(apiAction);
    const requests = normalizeRequests(batch, [apiAction, getState]);

    // dispatch request type
    dispatch(actionWith(
      requestType, [apiAction, getState()]
    ));

    const promises = performRequests(requests, callApi);

    return Promise.all(promises)
      .then(responses => (
        queueMode
          ? makeRequestsQueue(callApi, queue)(apiAction, getState, responses)
          : responses
      ))
      .then(
        responses => dispatch(actionWith(
          successType, [apiAction, getState()], (batchMode || queueMode) ? responses : responses[0]
        )),
        error => dispatch(actionWith(
          failureType, [apiAction, getState()], error
        ))
      );
  }
);

export default createMiddleware;
