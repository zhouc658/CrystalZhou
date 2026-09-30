const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const script = readFileSync('js/project.js', 'utf8');
const media = {matches: false, addEventListener(type, fn) { this.change = fn; }};
let plays = 0, pauses = 0;
const video = {play() { plays++; return Promise.resolve(); }, pause() { pauses++; }};
let notify;
const document = {hidden: false, querySelectorAll(selector) {
    assert.equal(selector, 'video[data-decorative-loop]');
    return [video];
}, addEventListener(type, fn) { this.visibility = fn; }};
class Observer {
    constructor(callback) { notify = callback; }
    observe(element) { assert.equal(element, video); }
}
vm.runInNewContext(script, {window: {matchMedia: () => media, IntersectionObserver: Observer}, document, IntersectionObserver: Observer});
assert.equal(plays, 0);
notify([{target: video, isIntersecting: true}]);
assert.equal(plays, 1);
notify([{target: video, isIntersecting: false}]);
assert.equal(pauses, 1);
media.matches = true;
notify([{target: video, isIntersecting: true}]);
assert.equal(plays, 1);
media.matches = false;
media.change();
assert.equal(plays, 2);
document.hidden = true;
document.visibility();
assert.equal(pauses, 3);
console.log('PASS: decorative loops play only when visible, pause offscreen/in background, and respect reduced motion.');
