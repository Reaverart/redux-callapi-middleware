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

export const createMiddleware = ({ status = checkStatus, parse = parseResponse }) => (
  ({ getState }) => next => (action) => {
    if (!action[CALL_API]) {
      return next(action);
    }

    const apiAction = action[CALL_API];

    // make request endpoint
    if (typeof apiAction.endpoint === 'function') {
      apiAction.endpoint = apiAction.endpoint(action, getState());
    }

    // make request opts
    if (typeof apiAction.options === 'function') {
      apiAction.options = apiAction.options(action, getState());
    }

    const { endpoint, options, types } = apiAction;

    // action types
    const [requestType, successType, failureType] = types;

    // dispatch request type
    next(actionWith(
      requestType, [apiAction, getState()]
    ));

    return fetch(endpoint, options)
      .then(status)
      .then(parse)
      .then(
        response => next(actionWith(
          successType, [apiAction, getState()], response
        )),
        error => next(actionWith(
          failureType, [apiAction, getState()], error
        ))
      );
  }
);

export default createMiddleware({});
