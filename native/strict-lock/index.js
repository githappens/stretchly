// Thin loader for the compiled addon. The .node sits at a fixed path relative
// to this file in both dev and packaged (asar.unpacked) layouts, so we require
// it directly rather than via `bindings` (no dependency, no fs heuristics).
// The app side (app/utils/strictModeLock.js) guards on platform/availability,
// so any load failure surfaces there.
const { join } = require('path')
module.exports = require(join(__dirname, 'build', 'Release', 'strict_lock.node'))
