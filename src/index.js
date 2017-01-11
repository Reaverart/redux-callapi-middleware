export const CALL_API = Symbol('Call API');

const middleware = store => next => action => {
  if (!action[CALL_API])) {
    return next(action);
  }
};

export default middleware;
