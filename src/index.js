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

const normalize = (item, apiAction, getState) => {
  if (typeof item === 'function') {
    return item(apiAction, getState());
  }
  return item;
};

export const createMiddleware = ({
  callApi,
}) => (
  ({ dispatch, getState }) => next => (action) => {
    if (!action[CALL_API]) {
      return next(action);
    }

    const apiAction = action[CALL_API];
    let { batch } = apiAction;
    const { endpoint, options } = apiAction;
    const batchMode = Array.isArray(batch);

    if (!batchMode) {
      batch = [{ endpoint, options }];
    }
    // prepare requests params
    batch = batch.map(request => ({
      endpoint: normalize(request.endpoint, apiAction, getState),
      options: normalize(request.options, apiAction, getState),
    }));

    // action types
    const types = apiAction.type
      ? Array(3).fill(apiAction.type)
      : apiAction.types;

    const [requestType, successType, failureType] = types;

    // dispatch request type
    dispatch(actionWith(
      requestType, [apiAction, getState()]
    ));

    const promises = batch.map(request =>
      callApi(request.endpoint, request.options)
    );

    return Promise.all(promises)
      .then(
        responses => dispatch(actionWith(
          successType, [apiAction, getState()], batchMode ? responses : responses[0]
        )),
        error => dispatch(actionWith(
          failureType, [apiAction, getState()], error
        ))
      );
  }
);

export default createMiddleware;
