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
    if (typeof actionType === 'string') {
      nextAction = { type: actionType };
    } else {
      nextAction = actionType;
    }
    nextAction.payload = payload || nextAction.payload;
  }
  if (payload instanceof Error) {
    nextAction.error = true;
  }

  return nextAction;
};

const createMiddleware = ({ status = checkStatus, parse = parseResponse }) => (
  ({ getState }) => next => (action) => {
    if (!action[CALL_API]) {
      return next(action);
    }

    let { endpoint, options } = action[CALL_API];
    const { types } = action[CALL_API];

    // make request endpoint
    if (typeof endpoint === 'function') {
      endpoint = endpoint(action, getState());
    }

    // make request opts
    if (typeof options === 'function') {
      options = options(action, getState());
    }

    // action types
    const [requestType, successType, failureType] = types;

    // dispatch request type
    next(actionWith(
      requestType, [action, getState()]
    ));

    return fetch(endpoint, options)
      .then(status)
      .then(parse)
      .then(
        response => next(actionWith(
          successType, [action, getState()], response
        )),
        error => next(actionWith(
          failureType, [action, getState()], error
        ))
      );
  }
);

export default createMiddleware;
