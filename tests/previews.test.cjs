const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let notify, timer, plays = 0, pauses = 0;
const reduced = {matches: false, addEventListener(_, cb) { this.change = cb; }};
const slide = () => ({dataset: {}, complete: true, naturalWidth: 100, classList: {add(){}, remove(){}, toggle(){}}, setAttribute(){}});
const slides = [slide(), slide()]; slides[1].dataset.src = 'second.jpg';
const gallery = {matches: () => false, querySelectorAll: () => slides, closest: () => null};
const video = {matches: () => true, closest: () => null, muted: false, volume: 1, addEventListener(){}, play(){plays++;return Promise.resolve();}, pause(){pauses++;}, removeAttribute(){}, load(){}};
const document = {hidden: false, querySelectorAll: () => [gallery, video], addEventListener(_, cb){this.change=cb;}};
class Observer {constructor(cb){notify=cb;} observe(){}}
vm.runInNewContext(readFileSync('js/previews.js','utf8'), {document, window: {matchMedia: () => reduced, IntersectionObserver: Observer}, IntersectionObserver: Observer, setTimeout: cb => {timer=cb;return 1;}, clearTimeout: () => {timer=null;}});
assert.equal(plays,0); assert.equal(video.muted,true); assert.equal(video.volume,0);
notify([{target:gallery,isIntersecting:true}]); assert.equal(slides[1].src,'second.jpg'); assert.ok(timer);
notify([{target:gallery,isIntersecting:false}]); assert.equal(timer,null);
notify([{target:video,isIntersecting:true}]); assert.equal(plays,1);
document.hidden=true; document.change(); assert.ok(pauses>0);
document.hidden=false; reduced.matches=true; reduced.change(); assert.equal(plays,1); assert.equal(timer,null);
console.log('PASS: previews stay silent, load slides on demand, pause offscreen/in background, and honor reduced motion.');
