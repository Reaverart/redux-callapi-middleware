export const CALL_API = Symbol('Call API');
export const CALL_API_PHASE = Symbol('Call API phase');
export const CALL_API_SKIP_REQUEST = Symbol('Call API skip request');
export const CALL_API_SKIP_ACTION = Symbol('Call API skip action');

const REQUEST = 'REQUEST';
const SUCCESS = 'SUCCESS';
const FAILURE = 'FAILURE';

export const callApiPhases = {
  REQUEST,
  SUCCESS,
  FAILURE,
};

const actionTypeToFSA = (actionType) => {
  if (typeof actionType === 'string' || typeof actionType === 'symbol') {
    return { type: actionType };
  }
  return actionType;
};

export const actionWith = (actionType, args, payload) => {
  let nextAction;
  if (typeof actionType === 'function') {
    nextAction = actionType(...args, payload);
    // it might return CALL_API_SKIP_ACTION so need to wrap it into FSA
    nextAction = actionTypeToFSA(nextAction);
  } else {
    nextAction = actionTypeToFSA(actionType);

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
  } else {
    phase = SUCCESS;
  }
  nextAction[CALL_API_PHASE] = phase;

  return nextAction;
};

const normalizeSkip = (skip, apiAction, getState) => {
  switch (typeof skip) {
    case 'boolean':
      return CALL_API_SKIP_REQUEST;
    case 'function':
      return skip(apiAction, getState);
    default:
      return skip;
  }
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
    const { endpoint, options, [CALL_API_SKIP_REQUEST]: skipRequest } = data;
    batch = [{ endpoint, options, [CALL_API_SKIP_REQUEST]: skipRequest }];
  }
  return { batch, batchMode };
};

const normalizeRequests = (requestsOptions, args) => (
  requestsOptions.map((request) => {
    if (request[CALL_API_SKIP_REQUEST]) {
      return {
        [CALL_API_SKIP_REQUEST]: normalizeSkip(request[CALL_API_SKIP_REQUEST], ...args),
      };
    }
    return {
      endpoint: normalizeParams(request.endpoint, ...args),
      options: normalizeParams(request.options, ...args),
    };
  })
);

const performRequests = (requests, callApi) => (
  requests.map(({ endpoint, options, [CALL_API_SKIP_REQUEST]: resolveWith }) => (
    resolveWith === undefined
      ? callApi(endpoint, options)
      : Promise.resolve(resolveWith)
  ))
);

const dispatcher = (dispatch, action) => {
  if (action.type === CALL_API_SKIP_ACTION) {
    return false;
  }
  return dispatch(action);
};

const makeRequestsQueue = (callApi, queue) => (
  (apiAction, getState, responses) => (
    queue.reduce((memo, item, i) => (
      memo.then((res) => {
        const requestsData = item(apiAction, getState(), res);
        const { batch } = prepareRequests(requestsData);
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
    dispatcher(dispatch, actionWith(
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
        responses => dispatcher(dispatch, actionWith(
          successType, [apiAction, getState()], (batchMode || queueMode) ? responses : responses[0]
        )),
        error => dispatcher(dispatch, actionWith(
          failureType, [apiAction, getState()], error
        ))
      );
  }
);

export default createMiddleware;
