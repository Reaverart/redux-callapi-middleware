import middleware, {
  CALL_API,
} from '../src/index.js';

jest.mock('isomorphic-fetch', () => {
  return jest.fn(() => new Promise((resolve, reject) => {
    resolve()
  }));
});

describe('callapi middleware', () => {
  const doDispatch = () => {};
  const doGetState = () => {};
  const nextHandler = middleware({
    dispatch: doDispatch,
    getState: doGetState,
  });

  it('must return a function to handle next', () => {
    expect(typeof nextHandler).toBe('function');
    expect(nextHandler.length).toBe(1);
  });

  describe('handle next', () => {
    it('must return a function to handle action', () => {
      const actionHandler = nextHandler();
      expect(typeof actionHandler).toBe('function');
      expect(actionHandler.length).toBe(1);
    });

    describe('handle action', () => {
      // beforeEach(() => jest.unmock('isomorphic-fetch'));

      it('must call "next" with given action if it isnt a CALL_API action', () => {
        const next = jest.fn();
        const action = {};
        const actionHandler = nextHandler(next);
        actionHandler(action);
        expect(next).toHaveBeenCalledWith(action);
      });

      it('must return a promise object', () => {
        const next = jest.fn();
        const action = {
          [CALL_API]: {
            endpoint: 123,
            options: {},
            types: [],
          }
        };
        const actionHandler = nextHandler(next);
        const result = actionHandler(action);
        console.log(1, result);
        expect(typeof result.then).toBe('function')
      });
    });
  })
});
