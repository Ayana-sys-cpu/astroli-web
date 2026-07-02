import '@testing-library/jest-dom';

// jsdom doesn't implement scrollIntoView — components that auto-scroll a
// message list call it in an effect, which would otherwise throw in every test.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
