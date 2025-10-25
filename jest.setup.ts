import "@testing-library/jest-dom";
import "whatwg-fetch";

// Polyfill crypto.randomUUID if missing (jsdom < 20)
if (typeof global.crypto === "undefined") {
  global.crypto = {} as Crypto;
}
if (typeof global.crypto.randomUUID !== "function") {
  global.crypto.randomUUID = () => `test-${Math.random().toString(16).slice(2)}`;
}

// Polyfill WebSocket for tests (jest-websocket-mock will replace as needed)
if (typeof global.WebSocket === "undefined") {
  global.WebSocket = class {} as any;
}

beforeEach(() => {
  // Reset timers and any leftover mocks between tests
  jest.useRealTimers();
  jest.clearAllMocks();
});
