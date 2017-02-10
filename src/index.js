import fetch from 'isomorphic-fetch';

export const CALL_API = Symbol('Call API');

export const checkStatus = (response) => {
  if (!response.ok) {
    const error = new Error(response.statusText || response.status);
    error.response = response;
    throw error;
  }
  return response;
};

export const parseResponse = (response) => {
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.indexOf('json') !== -1) {
    return response.json();
  } else if (contentType.indexOf('text') !== -1) {
    return response.text();
  }
  // return raw response if unexpected content type
  return response;
};

const successInterceptor = (...args) => {
  const promise = Promise.resolve(...args);
  return promise.then(checkStatus).then(parseResponse);
};
const failureInterceptor = error => Promise.reject(error);

export const callApi = (endpoint, options, success, failure) => (
  fetch(endpoint, options).then(success, failure)
);

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
  if (payload instanceof Error) {
    nextAction.error = true;
  }

  return nextAction;
};

const normalize = (item, apiAction, getState) => {
  if (typeof item === 'function') {
    return item(apiAction, getState());
  }
  return item;
};

export const createMiddleware = ({
  responseSuccess = successInterceptor,
  responseFailure = failureInterceptor,
}) => (
  ({ getState }) => next => (action) => {
    if (!action[CALL_API]) {
      return next(action);
    }

    const apiAction = action[CALL_API];
    let { batch } = apiAction;
    const { endpoint, options, types } = apiAction;
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
    const [requestType, successType, failureType] = types;

    // dispatch request type
    next(actionWith(
      requestType, [apiAction, getState()]
    ));

    const promises = batch.map(request =>
      callApi(request.endpoint, request.options, responseSuccess, responseFailure)
    );

    return Promise.all(promises)
      .then(
        responses => next(actionWith(
          successType, [apiAction, getState()], batchMode ? responses : responses[0]
        )),
        error => next(actionWith(
          failureType, [apiAction, getState()], error
        ))
      );
  }
);

export default createMiddleware({});
