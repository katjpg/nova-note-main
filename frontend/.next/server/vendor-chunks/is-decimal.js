"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-decimal";
exports.ids = ["vendor-chunks/is-decimal"];
exports.modules = {

/***/ "(ssr)/./node_modules/is-decimal/index.js":
/*!******************************************!*\
  !*** ./node_modules/is-decimal/index.js ***!
  \******************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   isDecimal: () => (/* binding */ isDecimal)\n/* harmony export */ });\n/**\n * Check if the given character code, or the character code at the first\n * character, is decimal.\n *\n * @param {string|number} character\n * @returns {boolean} Whether `character` is a decimal\n */\nfunction isDecimal(character) {\n  const code =\n    typeof character === 'string' ? character.charCodeAt(0) : character\n\n  return code >= 48 && code <= 57 /* 0-9 */\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaXMtZGVjaW1hbC9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLGVBQWU7QUFDMUIsYUFBYSxTQUFTO0FBQ3RCO0FBQ087QUFDUDtBQUNBOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9mcm9udGVuZC8uL25vZGVfbW9kdWxlcy9pcy1kZWNpbWFsL2luZGV4LmpzPzFiNGEiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gY2hhcmFjdGVyIGNvZGUsIG9yIHRoZSBjaGFyYWN0ZXIgY29kZSBhdCB0aGUgZmlyc3RcbiAqIGNoYXJhY3RlciwgaXMgZGVjaW1hbC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IGNoYXJhY3RlclxuICogQHJldHVybnMge2Jvb2xlYW59IFdoZXRoZXIgYGNoYXJhY3RlcmAgaXMgYSBkZWNpbWFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RlY2ltYWwoY2hhcmFjdGVyKSB7XG4gIGNvbnN0IGNvZGUgPVxuICAgIHR5cGVvZiBjaGFyYWN0ZXIgPT09ICdzdHJpbmcnID8gY2hhcmFjdGVyLmNoYXJDb2RlQXQoMCkgOiBjaGFyYWN0ZXJcblxuICByZXR1cm4gY29kZSA+PSA0OCAmJiBjb2RlIDw9IDU3IC8qIDAtOSAqL1xufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/is-decimal/index.js\n");

/***/ })

};
;