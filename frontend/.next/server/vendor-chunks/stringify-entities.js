"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/stringify-entities";
exports.ids = ["vendor-chunks/stringify-entities"];
exports.modules = {

/***/ "(ssr)/./node_modules/stringify-entities/lib/constant/dangerous.js":
/*!*******************************************************************!*\
  !*** ./node_modules/stringify-entities/lib/constant/dangerous.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   dangerous: () => (/* binding */ dangerous)\n/* harmony export */ });\n/**\n * List of legacy (that don’t need a trailing `;`) named references which could,\n * depending on what follows them, turn into a different meaning\n *\n * @type {Array<string>}\n */\nconst dangerous = [\n  'cent',\n  'copy',\n  'divide',\n  'gt',\n  'lt',\n  'not',\n  'para',\n  'times'\n]\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi9jb25zdGFudC9kYW5nZXJvdXMuanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0EsZ0RBQWdEO0FBQ2hEO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2Zyb250ZW5kLy4vbm9kZV9tb2R1bGVzL3N0cmluZ2lmeS1lbnRpdGllcy9saWIvY29uc3RhbnQvZGFuZ2Vyb3VzLmpzP2UzMDQiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBMaXN0IG9mIGxlZ2FjeSAodGhhdCBkb27igJl0IG5lZWQgYSB0cmFpbGluZyBgO2ApIG5hbWVkIHJlZmVyZW5jZXMgd2hpY2ggY291bGQsXG4gKiBkZXBlbmRpbmcgb24gd2hhdCBmb2xsb3dzIHRoZW0sIHR1cm4gaW50byBhIGRpZmZlcmVudCBtZWFuaW5nXG4gKlxuICogQHR5cGUge0FycmF5PHN0cmluZz59XG4gKi9cbmV4cG9ydCBjb25zdCBkYW5nZXJvdXMgPSBbXG4gICdjZW50JyxcbiAgJ2NvcHknLFxuICAnZGl2aWRlJyxcbiAgJ2d0JyxcbiAgJ2x0JyxcbiAgJ25vdCcsXG4gICdwYXJhJyxcbiAgJ3RpbWVzJ1xuXVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/constant/dangerous.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/core.js":
/*!*****************************************************!*\
  !*** ./node_modules/stringify-entities/lib/core.js ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   core: () => (/* binding */ core)\n/* harmony export */ });\n/**\n * @typedef CoreOptions\n * @property {ReadonlyArray<string>} [subset=[]]\n *   Whether to only escape the given subset of characters.\n * @property {boolean} [escapeOnly=false]\n *   Whether to only escape possibly dangerous characters.\n *   Those characters are `\"`, `&`, `'`, `<`, `>`, and `` ` ``.\n *\n * @typedef FormatOptions\n * @property {(code: number, next: number, options: CoreWithFormatOptions) => string} format\n *   Format strategy.\n *\n * @typedef {CoreOptions & FormatOptions & import('./util/format-smart.js').FormatSmartOptions} CoreWithFormatOptions\n */\n\nconst defaultSubsetRegex = /[\"&'<>`]/g\nconst surrogatePairsRegex = /[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]/g\nconst controlCharactersRegex =\n  // eslint-disable-next-line no-control-regex, unicorn/no-hex-escape\n  /[\\x01-\\t\\v\\f\\x0E-\\x1F\\x7F\\x81\\x8D\\x8F\\x90\\x9D\\xA0-\\uFFFF]/g\nconst regexEscapeRegex = /[|\\\\{}()[\\]^$+*?.]/g\n\n/** @type {WeakMap<ReadonlyArray<string>, RegExp>} */\nconst subsetToRegexCache = new WeakMap()\n\n/**\n * Encode certain characters in `value`.\n *\n * @param {string} value\n * @param {CoreWithFormatOptions} options\n * @returns {string}\n */\nfunction core(value, options) {\n  value = value.replace(\n    options.subset\n      ? charactersToExpressionCached(options.subset)\n      : defaultSubsetRegex,\n    basic\n  )\n\n  if (options.subset || options.escapeOnly) {\n    return value\n  }\n\n  return (\n    value\n      // Surrogate pairs.\n      .replace(surrogatePairsRegex, surrogate)\n      // BMP control characters (C0 except for LF, CR, SP; DEL; and some more\n      // non-ASCII ones).\n      .replace(controlCharactersRegex, basic)\n  )\n\n  /**\n   * @param {string} pair\n   * @param {number} index\n   * @param {string} all\n   */\n  function surrogate(pair, index, all) {\n    return options.format(\n      (pair.charCodeAt(0) - 0xd800) * 0x400 +\n        pair.charCodeAt(1) -\n        0xdc00 +\n        0x10000,\n      all.charCodeAt(index + 2),\n      options\n    )\n  }\n\n  /**\n   * @param {string} character\n   * @param {number} index\n   * @param {string} all\n   */\n  function basic(character, index, all) {\n    return options.format(\n      character.charCodeAt(0),\n      all.charCodeAt(index + 1),\n      options\n    )\n  }\n}\n\n/**\n * A wrapper function that caches the result of `charactersToExpression` with a WeakMap.\n * This can improve performance when tooling calls `charactersToExpression` repeatedly\n * with the same subset.\n *\n * @param {ReadonlyArray<string>} subset\n * @returns {RegExp}\n */\nfunction charactersToExpressionCached(subset) {\n  let cached = subsetToRegexCache.get(subset)\n\n  if (!cached) {\n    cached = charactersToExpression(subset)\n    subsetToRegexCache.set(subset, cached)\n  }\n\n  return cached\n}\n\n/**\n * @param {ReadonlyArray<string>} subset\n * @returns {RegExp}\n */\nfunction charactersToExpression(subset) {\n  /** @type {Array<string>} */\n  const groups = []\n  let index = -1\n\n  while (++index < subset.length) {\n    groups.push(subset[index].replace(regexEscapeRegex, '\\\\$&'))\n  }\n\n  return new RegExp('(?:' + groups.join('|') + ')', 'g')\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi9jb3JlLmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0EsY0FBYyx1QkFBdUI7QUFDckM7QUFDQSxjQUFjLFNBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjLHdFQUF3RTtBQUN0RjtBQUNBO0FBQ0EsYUFBYSxtRkFBbUY7QUFDaEc7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQzs7QUFFaEMsV0FBVyx3Q0FBd0M7QUFDbkQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CLFdBQVcsdUJBQXVCO0FBQ2xDLGFBQWE7QUFDYjtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJEQUEyRCxLQUFLO0FBQ2hFO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGFBQWEsUUFBUTtBQUNyQixhQUFhLFFBQVE7QUFDckIsYUFBYSxRQUFRO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxhQUFhLFFBQVE7QUFDckIsYUFBYSxRQUFRO0FBQ3JCLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsdUJBQXVCO0FBQ2xDLGFBQWE7QUFDYjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLFdBQVcsdUJBQXVCO0FBQ2xDLGFBQWE7QUFDYjtBQUNBO0FBQ0EsYUFBYSxlQUFlO0FBQzVCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9mcm9udGVuZC8uL25vZGVfbW9kdWxlcy9zdHJpbmdpZnktZW50aXRpZXMvbGliL2NvcmUuanM/NjNkMCJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEB0eXBlZGVmIENvcmVPcHRpb25zXG4gKiBAcHJvcGVydHkge1JlYWRvbmx5QXJyYXk8c3RyaW5nPn0gW3N1YnNldD1bXV1cbiAqICAgV2hldGhlciB0byBvbmx5IGVzY2FwZSB0aGUgZ2l2ZW4gc3Vic2V0IG9mIGNoYXJhY3RlcnMuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtlc2NhcGVPbmx5PWZhbHNlXVxuICogICBXaGV0aGVyIHRvIG9ubHkgZXNjYXBlIHBvc3NpYmx5IGRhbmdlcm91cyBjaGFyYWN0ZXJzLlxuICogICBUaG9zZSBjaGFyYWN0ZXJzIGFyZSBgXCJgLCBgJmAsIGAnYCwgYDxgLCBgPmAsIGFuZCBgYCBgIGBgLlxuICpcbiAqIEB0eXBlZGVmIEZvcm1hdE9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7KGNvZGU6IG51bWJlciwgbmV4dDogbnVtYmVyLCBvcHRpb25zOiBDb3JlV2l0aEZvcm1hdE9wdGlvbnMpID0+IHN0cmluZ30gZm9ybWF0XG4gKiAgIEZvcm1hdCBzdHJhdGVneS5cbiAqXG4gKiBAdHlwZWRlZiB7Q29yZU9wdGlvbnMgJiBGb3JtYXRPcHRpb25zICYgaW1wb3J0KCcuL3V0aWwvZm9ybWF0LXNtYXJ0LmpzJykuRm9ybWF0U21hcnRPcHRpb25zfSBDb3JlV2l0aEZvcm1hdE9wdGlvbnNcbiAqL1xuXG5jb25zdCBkZWZhdWx0U3Vic2V0UmVnZXggPSAvW1wiJic8PmBdL2dcbmNvbnN0IHN1cnJvZ2F0ZVBhaXJzUmVnZXggPSAvW1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXS9nXG5jb25zdCBjb250cm9sQ2hhcmFjdGVyc1JlZ2V4ID1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXgsIHVuaWNvcm4vbm8taGV4LWVzY2FwZVxuICAvW1xceDAxLVxcdFxcdlxcZlxceDBFLVxceDFGXFx4N0ZcXHg4MVxceDhEXFx4OEZcXHg5MFxceDlEXFx4QTAtXFx1RkZGRl0vZ1xuY29uc3QgcmVnZXhFc2NhcGVSZWdleCA9IC9bfFxcXFx7fSgpW1xcXV4kKyo/Ll0vZ1xuXG4vKiogQHR5cGUge1dlYWtNYXA8UmVhZG9ubHlBcnJheTxzdHJpbmc+LCBSZWdFeHA+fSAqL1xuY29uc3Qgc3Vic2V0VG9SZWdleENhY2hlID0gbmV3IFdlYWtNYXAoKVxuXG4vKipcbiAqIEVuY29kZSBjZXJ0YWluIGNoYXJhY3RlcnMgaW4gYHZhbHVlYC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7Q29yZVdpdGhGb3JtYXRPcHRpb25zfSBvcHRpb25zXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29yZSh2YWx1ZSwgb3B0aW9ucykge1xuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoXG4gICAgb3B0aW9ucy5zdWJzZXRcbiAgICAgID8gY2hhcmFjdGVyc1RvRXhwcmVzc2lvbkNhY2hlZChvcHRpb25zLnN1YnNldClcbiAgICAgIDogZGVmYXVsdFN1YnNldFJlZ2V4LFxuICAgIGJhc2ljXG4gIClcblxuICBpZiAob3B0aW9ucy5zdWJzZXQgfHwgb3B0aW9ucy5lc2NhcGVPbmx5KSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICByZXR1cm4gKFxuICAgIHZhbHVlXG4gICAgICAvLyBTdXJyb2dhdGUgcGFpcnMuXG4gICAgICAucmVwbGFjZShzdXJyb2dhdGVQYWlyc1JlZ2V4LCBzdXJyb2dhdGUpXG4gICAgICAvLyBCTVAgY29udHJvbCBjaGFyYWN0ZXJzIChDMCBleGNlcHQgZm9yIExGLCBDUiwgU1A7IERFTDsgYW5kIHNvbWUgbW9yZVxuICAgICAgLy8gbm9uLUFTQ0lJIG9uZXMpLlxuICAgICAgLnJlcGxhY2UoY29udHJvbENoYXJhY3RlcnNSZWdleCwgYmFzaWMpXG4gIClcblxuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhaXJcbiAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBhbGxcbiAgICovXG4gIGZ1bmN0aW9uIHN1cnJvZ2F0ZShwYWlyLCBpbmRleCwgYWxsKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm9ybWF0KFxuICAgICAgKHBhaXIuY2hhckNvZGVBdCgwKSAtIDB4ZDgwMCkgKiAweDQwMCArXG4gICAgICAgIHBhaXIuY2hhckNvZGVBdCgxKSAtXG4gICAgICAgIDB4ZGMwMCArXG4gICAgICAgIDB4MTAwMDAsXG4gICAgICBhbGwuY2hhckNvZGVBdChpbmRleCArIDIpLFxuICAgICAgb3B0aW9uc1xuICAgIClcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY2hhcmFjdGVyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleFxuICAgKiBAcGFyYW0ge3N0cmluZ30gYWxsXG4gICAqL1xuICBmdW5jdGlvbiBiYXNpYyhjaGFyYWN0ZXIsIGluZGV4LCBhbGwpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mb3JtYXQoXG4gICAgICBjaGFyYWN0ZXIuY2hhckNvZGVBdCgwKSxcbiAgICAgIGFsbC5jaGFyQ29kZUF0KGluZGV4ICsgMSksXG4gICAgICBvcHRpb25zXG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogQSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgY2FjaGVzIHRoZSByZXN1bHQgb2YgYGNoYXJhY3RlcnNUb0V4cHJlc3Npb25gIHdpdGggYSBXZWFrTWFwLlxuICogVGhpcyBjYW4gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aGVuIHRvb2xpbmcgY2FsbHMgYGNoYXJhY3RlcnNUb0V4cHJlc3Npb25gIHJlcGVhdGVkbHlcbiAqIHdpdGggdGhlIHNhbWUgc3Vic2V0LlxuICpcbiAqIEBwYXJhbSB7UmVhZG9ubHlBcnJheTxzdHJpbmc+fSBzdWJzZXRcbiAqIEByZXR1cm5zIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIGNoYXJhY3RlcnNUb0V4cHJlc3Npb25DYWNoZWQoc3Vic2V0KSB7XG4gIGxldCBjYWNoZWQgPSBzdWJzZXRUb1JlZ2V4Q2FjaGUuZ2V0KHN1YnNldClcblxuICBpZiAoIWNhY2hlZCkge1xuICAgIGNhY2hlZCA9IGNoYXJhY3RlcnNUb0V4cHJlc3Npb24oc3Vic2V0KVxuICAgIHN1YnNldFRvUmVnZXhDYWNoZS5zZXQoc3Vic2V0LCBjYWNoZWQpXG4gIH1cblxuICByZXR1cm4gY2FjaGVkXG59XG5cbi8qKlxuICogQHBhcmFtIHtSZWFkb25seUFycmF5PHN0cmluZz59IHN1YnNldFxuICogQHJldHVybnMge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gY2hhcmFjdGVyc1RvRXhwcmVzc2lvbihzdWJzZXQpIHtcbiAgLyoqIEB0eXBlIHtBcnJheTxzdHJpbmc+fSAqL1xuICBjb25zdCBncm91cHMgPSBbXVxuICBsZXQgaW5kZXggPSAtMVxuXG4gIHdoaWxlICgrK2luZGV4IDwgc3Vic2V0Lmxlbmd0aCkge1xuICAgIGdyb3Vwcy5wdXNoKHN1YnNldFtpbmRleF0ucmVwbGFjZShyZWdleEVzY2FwZVJlZ2V4LCAnXFxcXCQmJykpXG4gIH1cblxuICByZXR1cm4gbmV3IFJlZ0V4cCgnKD86JyArIGdyb3Vwcy5qb2luKCd8JykgKyAnKScsICdnJylcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/core.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/index.js":
/*!******************************************************!*\
  !*** ./node_modules/stringify-entities/lib/index.js ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   stringifyEntities: () => (/* binding */ stringifyEntities),\n/* harmony export */   stringifyEntitiesLight: () => (/* binding */ stringifyEntitiesLight)\n/* harmony export */ });\n/* harmony import */ var _core_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core.js */ \"(ssr)/./node_modules/stringify-entities/lib/core.js\");\n/* harmony import */ var _util_format_smart_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./util/format-smart.js */ \"(ssr)/./node_modules/stringify-entities/lib/util/format-smart.js\");\n/* harmony import */ var _util_format_basic_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./util/format-basic.js */ \"(ssr)/./node_modules/stringify-entities/lib/util/format-basic.js\");\n/**\n * @typedef {import('./core.js').CoreOptions & import('./util/format-smart.js').FormatSmartOptions} Options\n * @typedef {import('./core.js').CoreOptions} LightOptions\n */\n\n\n\n\n\n/**\n * Encode special characters in `value`.\n *\n * @param {string} value\n *   Value to encode.\n * @param {Options} [options]\n *   Configuration.\n * @returns {string}\n *   Encoded value.\n */\nfunction stringifyEntities(value, options) {\n  return (0,_core_js__WEBPACK_IMPORTED_MODULE_0__.core)(value, Object.assign({format: _util_format_smart_js__WEBPACK_IMPORTED_MODULE_1__.formatSmart}, options))\n}\n\n/**\n * Encode special characters in `value` as hexadecimals.\n *\n * @param {string} value\n *   Value to encode.\n * @param {LightOptions} [options]\n *   Configuration.\n * @returns {string}\n *   Encoded value.\n */\nfunction stringifyEntitiesLight(value, options) {\n  return (0,_core_js__WEBPACK_IMPORTED_MODULE_0__.core)(value, Object.assign({format: _util_format_basic_js__WEBPACK_IMPORTED_MODULE_2__.formatBasic}, options))\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0EsYUFBYSx1RkFBdUY7QUFDcEcsYUFBYSxpQ0FBaUM7QUFDOUM7O0FBRThCO0FBQ29CO0FBQ0E7O0FBRWxEO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQjtBQUNBLFdBQVcsU0FBUztBQUNwQjtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ087QUFDUCxTQUFTLDhDQUFJLHVCQUF1QixRQUFRLDhEQUFXLENBQUM7QUFDeEQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CO0FBQ0EsV0FBVyxjQUFjO0FBQ3pCO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDTztBQUNQLFNBQVMsOENBQUksdUJBQXVCLFFBQVEsOERBQVcsQ0FBQztBQUN4RCIsInNvdXJjZXMiOlsid2VicGFjazovL2Zyb250ZW5kLy4vbm9kZV9tb2R1bGVzL3N0cmluZ2lmeS1lbnRpdGllcy9saWIvaW5kZXguanM/YjJkZiJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEB0eXBlZGVmIHtpbXBvcnQoJy4vY29yZS5qcycpLkNvcmVPcHRpb25zICYgaW1wb3J0KCcuL3V0aWwvZm9ybWF0LXNtYXJ0LmpzJykuRm9ybWF0U21hcnRPcHRpb25zfSBPcHRpb25zXG4gKiBAdHlwZWRlZiB7aW1wb3J0KCcuL2NvcmUuanMnKS5Db3JlT3B0aW9uc30gTGlnaHRPcHRpb25zXG4gKi9cblxuaW1wb3J0IHtjb3JlfSBmcm9tICcuL2NvcmUuanMnXG5pbXBvcnQge2Zvcm1hdFNtYXJ0fSBmcm9tICcuL3V0aWwvZm9ybWF0LXNtYXJ0LmpzJ1xuaW1wb3J0IHtmb3JtYXRCYXNpY30gZnJvbSAnLi91dGlsL2Zvcm1hdC1iYXNpYy5qcydcblxuLyoqXG4gKiBFbmNvZGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGB2YWx1ZWAuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKiAgIFZhbHVlIHRvIGVuY29kZS5cbiAqIEBwYXJhbSB7T3B0aW9uc30gW29wdGlvbnNdXG4gKiAgIENvbmZpZ3VyYXRpb24uXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICogICBFbmNvZGVkIHZhbHVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5RW50aXRpZXModmFsdWUsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGNvcmUodmFsdWUsIE9iamVjdC5hc3NpZ24oe2Zvcm1hdDogZm9ybWF0U21hcnR9LCBvcHRpb25zKSlcbn1cblxuLyoqXG4gKiBFbmNvZGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGB2YWx1ZWAgYXMgaGV4YWRlY2ltYWxzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICogICBWYWx1ZSB0byBlbmNvZGUuXG4gKiBAcGFyYW0ge0xpZ2h0T3B0aW9uc30gW29wdGlvbnNdXG4gKiAgIENvbmZpZ3VyYXRpb24uXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICogICBFbmNvZGVkIHZhbHVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5RW50aXRpZXNMaWdodCh2YWx1ZSwgb3B0aW9ucykge1xuICByZXR1cm4gY29yZSh2YWx1ZSwgT2JqZWN0LmFzc2lnbih7Zm9ybWF0OiBmb3JtYXRCYXNpY30sIG9wdGlvbnMpKVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/index.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/util/format-basic.js":
/*!******************************************************************!*\
  !*** ./node_modules/stringify-entities/lib/util/format-basic.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   formatBasic: () => (/* binding */ formatBasic)\n/* harmony export */ });\n/**\n * The smallest way to encode a character.\n *\n * @param {number} code\n * @returns {string}\n */\nfunction formatBasic(code) {\n  return '&#x' + code.toString(16).toUpperCase() + ';'\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL2Zvcm1hdC1iYXNpYy5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CLGFBQWE7QUFDYjtBQUNPO0FBQ1AscURBQXFEO0FBQ3JEIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vZnJvbnRlbmQvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL2Zvcm1hdC1iYXNpYy5qcz8wMjljIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhlIHNtYWxsZXN0IHdheSB0byBlbmNvZGUgYSBjaGFyYWN0ZXIuXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGNvZGVcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRCYXNpYyhjb2RlKSB7XG4gIHJldHVybiAnJiN4JyArIGNvZGUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyAnOydcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/util/format-basic.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/util/format-smart.js":
/*!******************************************************************!*\
  !*** ./node_modules/stringify-entities/lib/util/format-smart.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   formatSmart: () => (/* binding */ formatSmart)\n/* harmony export */ });\n/* harmony import */ var _to_hexadecimal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./to-hexadecimal.js */ \"(ssr)/./node_modules/stringify-entities/lib/util/to-hexadecimal.js\");\n/* harmony import */ var _to_decimal_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./to-decimal.js */ \"(ssr)/./node_modules/stringify-entities/lib/util/to-decimal.js\");\n/* harmony import */ var _to_named_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./to-named.js */ \"(ssr)/./node_modules/stringify-entities/lib/util/to-named.js\");\n/**\n * @typedef FormatSmartOptions\n * @property {boolean} [useNamedReferences=false]\n *   Prefer named character references (`&amp;`) where possible.\n * @property {boolean} [useShortestReferences=false]\n *   Prefer the shortest possible reference, if that results in less bytes.\n *   **Note**: `useNamedReferences` can be omitted when using `useShortestReferences`.\n * @property {boolean} [omitOptionalSemicolons=false]\n *   Whether to omit semicolons when possible.\n *   **Note**: This creates what HTML calls “parse errors” but is otherwise still valid HTML — don’t use this except when building a minifier.\n *   Omitting semicolons is possible for certain named and numeric references in some cases.\n * @property {boolean} [attribute=false]\n *   Create character references which don’t fail in attributes.\n *   **Note**: `attribute` only applies when operating dangerously with\n *   `omitOptionalSemicolons: true`.\n */\n\n\n\n\n\n/**\n * Configurable ways to encode a character yielding pretty or small results.\n *\n * @param {number} code\n * @param {number} next\n * @param {FormatSmartOptions} options\n * @returns {string}\n */\nfunction formatSmart(code, next, options) {\n  let numeric = (0,_to_hexadecimal_js__WEBPACK_IMPORTED_MODULE_0__.toHexadecimal)(code, next, options.omitOptionalSemicolons)\n  /** @type {string|undefined} */\n  let named\n\n  if (options.useNamedReferences || options.useShortestReferences) {\n    named = (0,_to_named_js__WEBPACK_IMPORTED_MODULE_1__.toNamed)(\n      code,\n      next,\n      options.omitOptionalSemicolons,\n      options.attribute\n    )\n  }\n\n  // Use the shortest numeric reference when requested.\n  // A simple algorithm would use decimal for all code points under 100, as\n  // those are shorter than hexadecimal:\n  //\n  // * `&#99;` vs `&#x63;` (decimal shorter)\n  // * `&#100;` vs `&#x64;` (equal)\n  //\n  // However, because we take `next` into consideration when `omit` is used,\n  // And it would be possible that decimals are shorter on bigger values as\n  // well if `next` is hexadecimal but not decimal, we instead compare both.\n  if (\n    (options.useShortestReferences || !named) &&\n    options.useShortestReferences\n  ) {\n    const decimal = (0,_to_decimal_js__WEBPACK_IMPORTED_MODULE_2__.toDecimal)(code, next, options.omitOptionalSemicolons)\n\n    if (decimal.length < numeric.length) {\n      numeric = decimal\n    }\n  }\n\n  return named &&\n    (!options.useShortestReferences || named.length < numeric.length)\n    ? named\n    : numeric\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL2Zvcm1hdC1zbWFydC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQTtBQUNBLGNBQWMsU0FBUztBQUN2Qiw4Q0FBOEM7QUFDOUMsY0FBYyxTQUFTO0FBQ3ZCO0FBQ0E7QUFDQSxjQUFjLFNBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0EsY0FBYyxTQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBOztBQUVpRDtBQUNSO0FBQ0o7O0FBRXJDO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxvQkFBb0I7QUFDL0IsYUFBYTtBQUNiO0FBQ087QUFDUCxnQkFBZ0IsaUVBQWE7QUFDN0IsYUFBYSxrQkFBa0I7QUFDL0I7O0FBRUE7QUFDQSxZQUFZLHFEQUFPO0FBQ25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsWUFBWTtBQUN6QixjQUFjLFlBQVk7QUFDMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQix5REFBUzs7QUFFN0I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2Zyb250ZW5kLy4vbm9kZV9tb2R1bGVzL3N0cmluZ2lmeS1lbnRpdGllcy9saWIvdXRpbC9mb3JtYXQtc21hcnQuanM/OWUzZSJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEB0eXBlZGVmIEZvcm1hdFNtYXJ0T3B0aW9uc1xuICogQHByb3BlcnR5IHtib29sZWFufSBbdXNlTmFtZWRSZWZlcmVuY2VzPWZhbHNlXVxuICogICBQcmVmZXIgbmFtZWQgY2hhcmFjdGVyIHJlZmVyZW5jZXMgKGAmYW1wO2ApIHdoZXJlIHBvc3NpYmxlLlxuICogQHByb3BlcnR5IHtib29sZWFufSBbdXNlU2hvcnRlc3RSZWZlcmVuY2VzPWZhbHNlXVxuICogICBQcmVmZXIgdGhlIHNob3J0ZXN0IHBvc3NpYmxlIHJlZmVyZW5jZSwgaWYgdGhhdCByZXN1bHRzIGluIGxlc3MgYnl0ZXMuXG4gKiAgICoqTm90ZSoqOiBgdXNlTmFtZWRSZWZlcmVuY2VzYCBjYW4gYmUgb21pdHRlZCB3aGVuIHVzaW5nIGB1c2VTaG9ydGVzdFJlZmVyZW5jZXNgLlxuICogQHByb3BlcnR5IHtib29sZWFufSBbb21pdE9wdGlvbmFsU2VtaWNvbG9ucz1mYWxzZV1cbiAqICAgV2hldGhlciB0byBvbWl0IHNlbWljb2xvbnMgd2hlbiBwb3NzaWJsZS5cbiAqICAgKipOb3RlKio6IFRoaXMgY3JlYXRlcyB3aGF0IEhUTUwgY2FsbHMg4oCccGFyc2UgZXJyb3Jz4oCdIGJ1dCBpcyBvdGhlcndpc2Ugc3RpbGwgdmFsaWQgSFRNTCDigJQgZG9u4oCZdCB1c2UgdGhpcyBleGNlcHQgd2hlbiBidWlsZGluZyBhIG1pbmlmaWVyLlxuICogICBPbWl0dGluZyBzZW1pY29sb25zIGlzIHBvc3NpYmxlIGZvciBjZXJ0YWluIG5hbWVkIGFuZCBudW1lcmljIHJlZmVyZW5jZXMgaW4gc29tZSBjYXNlcy5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2F0dHJpYnV0ZT1mYWxzZV1cbiAqICAgQ3JlYXRlIGNoYXJhY3RlciByZWZlcmVuY2VzIHdoaWNoIGRvbuKAmXQgZmFpbCBpbiBhdHRyaWJ1dGVzLlxuICogICAqKk5vdGUqKjogYGF0dHJpYnV0ZWAgb25seSBhcHBsaWVzIHdoZW4gb3BlcmF0aW5nIGRhbmdlcm91c2x5IHdpdGhcbiAqICAgYG9taXRPcHRpb25hbFNlbWljb2xvbnM6IHRydWVgLlxuICovXG5cbmltcG9ydCB7dG9IZXhhZGVjaW1hbH0gZnJvbSAnLi90by1oZXhhZGVjaW1hbC5qcydcbmltcG9ydCB7dG9EZWNpbWFsfSBmcm9tICcuL3RvLWRlY2ltYWwuanMnXG5pbXBvcnQge3RvTmFtZWR9IGZyb20gJy4vdG8tbmFtZWQuanMnXG5cbi8qKlxuICogQ29uZmlndXJhYmxlIHdheXMgdG8gZW5jb2RlIGEgY2hhcmFjdGVyIHlpZWxkaW5nIHByZXR0eSBvciBzbWFsbCByZXN1bHRzLlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb2RlXG4gKiBAcGFyYW0ge251bWJlcn0gbmV4dFxuICogQHBhcmFtIHtGb3JtYXRTbWFydE9wdGlvbnN9IG9wdGlvbnNcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTbWFydChjb2RlLCBuZXh0LCBvcHRpb25zKSB7XG4gIGxldCBudW1lcmljID0gdG9IZXhhZGVjaW1hbChjb2RlLCBuZXh0LCBvcHRpb25zLm9taXRPcHRpb25hbFNlbWljb2xvbnMpXG4gIC8qKiBAdHlwZSB7c3RyaW5nfHVuZGVmaW5lZH0gKi9cbiAgbGV0IG5hbWVkXG5cbiAgaWYgKG9wdGlvbnMudXNlTmFtZWRSZWZlcmVuY2VzIHx8IG9wdGlvbnMudXNlU2hvcnRlc3RSZWZlcmVuY2VzKSB7XG4gICAgbmFtZWQgPSB0b05hbWVkKFxuICAgICAgY29kZSxcbiAgICAgIG5leHQsXG4gICAgICBvcHRpb25zLm9taXRPcHRpb25hbFNlbWljb2xvbnMsXG4gICAgICBvcHRpb25zLmF0dHJpYnV0ZVxuICAgIClcbiAgfVxuXG4gIC8vIFVzZSB0aGUgc2hvcnRlc3QgbnVtZXJpYyByZWZlcmVuY2Ugd2hlbiByZXF1ZXN0ZWQuXG4gIC8vIEEgc2ltcGxlIGFsZ29yaXRobSB3b3VsZCB1c2UgZGVjaW1hbCBmb3IgYWxsIGNvZGUgcG9pbnRzIHVuZGVyIDEwMCwgYXNcbiAgLy8gdGhvc2UgYXJlIHNob3J0ZXIgdGhhbiBoZXhhZGVjaW1hbDpcbiAgLy9cbiAgLy8gKiBgJiM5OTtgIHZzIGAmI3g2MztgIChkZWNpbWFsIHNob3J0ZXIpXG4gIC8vICogYCYjMTAwO2AgdnMgYCYjeDY0O2AgKGVxdWFsKVxuICAvL1xuICAvLyBIb3dldmVyLCBiZWNhdXNlIHdlIHRha2UgYG5leHRgIGludG8gY29uc2lkZXJhdGlvbiB3aGVuIGBvbWl0YCBpcyB1c2VkLFxuICAvLyBBbmQgaXQgd291bGQgYmUgcG9zc2libGUgdGhhdCBkZWNpbWFscyBhcmUgc2hvcnRlciBvbiBiaWdnZXIgdmFsdWVzIGFzXG4gIC8vIHdlbGwgaWYgYG5leHRgIGlzIGhleGFkZWNpbWFsIGJ1dCBub3QgZGVjaW1hbCwgd2UgaW5zdGVhZCBjb21wYXJlIGJvdGguXG4gIGlmIChcbiAgICAob3B0aW9ucy51c2VTaG9ydGVzdFJlZmVyZW5jZXMgfHwgIW5hbWVkKSAmJlxuICAgIG9wdGlvbnMudXNlU2hvcnRlc3RSZWZlcmVuY2VzXG4gICkge1xuICAgIGNvbnN0IGRlY2ltYWwgPSB0b0RlY2ltYWwoY29kZSwgbmV4dCwgb3B0aW9ucy5vbWl0T3B0aW9uYWxTZW1pY29sb25zKVxuXG4gICAgaWYgKGRlY2ltYWwubGVuZ3RoIDwgbnVtZXJpYy5sZW5ndGgpIHtcbiAgICAgIG51bWVyaWMgPSBkZWNpbWFsXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWVkICYmXG4gICAgKCFvcHRpb25zLnVzZVNob3J0ZXN0UmVmZXJlbmNlcyB8fCBuYW1lZC5sZW5ndGggPCBudW1lcmljLmxlbmd0aClcbiAgICA/IG5hbWVkXG4gICAgOiBudW1lcmljXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/util/format-smart.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/util/to-decimal.js":
/*!****************************************************************!*\
  !*** ./node_modules/stringify-entities/lib/util/to-decimal.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   toDecimal: () => (/* binding */ toDecimal)\n/* harmony export */ });\nconst decimalRegex = /\\d/\n\n/**\n * Configurable ways to encode characters as decimal references.\n *\n * @param {number} code\n * @param {number} next\n * @param {boolean|undefined} omit\n * @returns {string}\n */\nfunction toDecimal(code, next, omit) {\n  const value = '&#' + String(code)\n  return omit && next && !decimalRegex.test(String.fromCharCode(next))\n    ? value\n    : value + ';'\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL3RvLWRlY2ltYWwuanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxtQkFBbUI7QUFDOUIsYUFBYTtBQUNiO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9mcm9udGVuZC8uL25vZGVfbW9kdWxlcy9zdHJpbmdpZnktZW50aXRpZXMvbGliL3V0aWwvdG8tZGVjaW1hbC5qcz8yMmIyIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGRlY2ltYWxSZWdleCA9IC9cXGQvXG5cbi8qKlxuICogQ29uZmlndXJhYmxlIHdheXMgdG8gZW5jb2RlIGNoYXJhY3RlcnMgYXMgZGVjaW1hbCByZWZlcmVuY2VzLlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb2RlXG4gKiBAcGFyYW0ge251bWJlcn0gbmV4dFxuICogQHBhcmFtIHtib29sZWFufHVuZGVmaW5lZH0gb21pdFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvRGVjaW1hbChjb2RlLCBuZXh0LCBvbWl0KSB7XG4gIGNvbnN0IHZhbHVlID0gJyYjJyArIFN0cmluZyhjb2RlKVxuICByZXR1cm4gb21pdCAmJiBuZXh0ICYmICFkZWNpbWFsUmVnZXgudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHQpKVxuICAgID8gdmFsdWVcbiAgICA6IHZhbHVlICsgJzsnXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/util/to-decimal.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/util/to-hexadecimal.js":
/*!********************************************************************!*\
  !*** ./node_modules/stringify-entities/lib/util/to-hexadecimal.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   toHexadecimal: () => (/* binding */ toHexadecimal)\n/* harmony export */ });\nconst hexadecimalRegex = /[\\dA-Fa-f]/\n\n/**\n * Configurable ways to encode characters as hexadecimal references.\n *\n * @param {number} code\n * @param {number} next\n * @param {boolean|undefined} omit\n * @returns {string}\n */\nfunction toHexadecimal(code, next, omit) {\n  const value = '&#x' + code.toString(16).toUpperCase()\n  return omit && next && !hexadecimalRegex.test(String.fromCharCode(next))\n    ? value\n    : value + ';'\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL3RvLWhleGFkZWNpbWFsLmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CLFdBQVcsbUJBQW1CO0FBQzlCLGFBQWE7QUFDYjtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vZnJvbnRlbmQvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL3RvLWhleGFkZWNpbWFsLmpzPzU5MTYiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgaGV4YWRlY2ltYWxSZWdleCA9IC9bXFxkQS1GYS1mXS9cblxuLyoqXG4gKiBDb25maWd1cmFibGUgd2F5cyB0byBlbmNvZGUgY2hhcmFjdGVycyBhcyBoZXhhZGVjaW1hbCByZWZlcmVuY2VzLlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb2RlXG4gKiBAcGFyYW0ge251bWJlcn0gbmV4dFxuICogQHBhcmFtIHtib29sZWFufHVuZGVmaW5lZH0gb21pdFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4YWRlY2ltYWwoY29kZSwgbmV4dCwgb21pdCkge1xuICBjb25zdCB2YWx1ZSA9ICcmI3gnICsgY29kZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKVxuICByZXR1cm4gb21pdCAmJiBuZXh0ICYmICFoZXhhZGVjaW1hbFJlZ2V4LnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0KSlcbiAgICA/IHZhbHVlXG4gICAgOiB2YWx1ZSArICc7J1xufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/util/to-hexadecimal.js\n");

/***/ }),

/***/ "(ssr)/./node_modules/stringify-entities/lib/util/to-named.js":
/*!**************************************************************!*\
  !*** ./node_modules/stringify-entities/lib/util/to-named.js ***!
  \**************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   toNamed: () => (/* binding */ toNamed)\n/* harmony export */ });\n/* harmony import */ var character_entities_legacy__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! character-entities-legacy */ \"(ssr)/./node_modules/character-entities-legacy/index.js\");\n/* harmony import */ var character_entities_html4__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! character-entities-html4 */ \"(ssr)/./node_modules/character-entities-html4/index.js\");\n/* harmony import */ var _constant_dangerous_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constant/dangerous.js */ \"(ssr)/./node_modules/stringify-entities/lib/constant/dangerous.js\");\n\n\n\n\nconst own = {}.hasOwnProperty\n\n/**\n * `characterEntitiesHtml4` but inverted.\n *\n * @type {Record<string, string>}\n */\nconst characters = {}\n\n/** @type {string} */\nlet key\n\nfor (key in character_entities_html4__WEBPACK_IMPORTED_MODULE_0__.characterEntitiesHtml4) {\n  if (own.call(character_entities_html4__WEBPACK_IMPORTED_MODULE_0__.characterEntitiesHtml4, key)) {\n    characters[character_entities_html4__WEBPACK_IMPORTED_MODULE_0__.characterEntitiesHtml4[key]] = key\n  }\n}\n\nconst notAlphanumericRegex = /[^\\dA-Za-z]/\n\n/**\n * Configurable ways to encode characters as named references.\n *\n * @param {number} code\n * @param {number} next\n * @param {boolean|undefined} omit\n * @param {boolean|undefined} attribute\n * @returns {string}\n */\nfunction toNamed(code, next, omit, attribute) {\n  const character = String.fromCharCode(code)\n\n  if (own.call(characters, character)) {\n    const name = characters[character]\n    const value = '&' + name\n\n    if (\n      omit &&\n      character_entities_legacy__WEBPACK_IMPORTED_MODULE_1__.characterEntitiesLegacy.includes(name) &&\n      !_constant_dangerous_js__WEBPACK_IMPORTED_MODULE_2__.dangerous.includes(name) &&\n      (!attribute ||\n        (next &&\n          next !== 61 /* `=` */ &&\n          notAlphanumericRegex.test(String.fromCharCode(next))))\n    ) {\n      return value\n    }\n\n    return value + ';'\n  }\n\n  return ''\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc3RyaW5naWZ5LWVudGl0aWVzL2xpYi91dGlsL3RvLW5hbWVkLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBaUU7QUFDRjtBQUNiOztBQUVsRCxjQUFjOztBQUVkO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBOztBQUVBLFdBQVcsUUFBUTtBQUNuQjs7QUFFQSxZQUFZLDRFQUFzQjtBQUNsQyxlQUFlLDRFQUFzQjtBQUNyQyxlQUFlLDRFQUFzQjtBQUNyQztBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxtQkFBbUI7QUFDOUIsV0FBVyxtQkFBbUI7QUFDOUIsYUFBYTtBQUNiO0FBQ087QUFDUDs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE1BQU0sOEVBQXVCO0FBQzdCLE9BQU8sNkRBQVM7QUFDaEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEscUJBQXFCO0FBQ3JCOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9mcm9udGVuZC8uL25vZGVfbW9kdWxlcy9zdHJpbmdpZnktZW50aXRpZXMvbGliL3V0aWwvdG8tbmFtZWQuanM/MWUxYiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2NoYXJhY3RlckVudGl0aWVzTGVnYWN5fSBmcm9tICdjaGFyYWN0ZXItZW50aXRpZXMtbGVnYWN5J1xuaW1wb3J0IHtjaGFyYWN0ZXJFbnRpdGllc0h0bWw0fSBmcm9tICdjaGFyYWN0ZXItZW50aXRpZXMtaHRtbDQnXG5pbXBvcnQge2Rhbmdlcm91c30gZnJvbSAnLi4vY29uc3RhbnQvZGFuZ2Vyb3VzLmpzJ1xuXG5jb25zdCBvd24gPSB7fS5oYXNPd25Qcm9wZXJ0eVxuXG4vKipcbiAqIGBjaGFyYWN0ZXJFbnRpdGllc0h0bWw0YCBidXQgaW52ZXJ0ZWQuXG4gKlxuICogQHR5cGUge1JlY29yZDxzdHJpbmcsIHN0cmluZz59XG4gKi9cbmNvbnN0IGNoYXJhY3RlcnMgPSB7fVxuXG4vKiogQHR5cGUge3N0cmluZ30gKi9cbmxldCBrZXlcblxuZm9yIChrZXkgaW4gY2hhcmFjdGVyRW50aXRpZXNIdG1sNCkge1xuICBpZiAob3duLmNhbGwoY2hhcmFjdGVyRW50aXRpZXNIdG1sNCwga2V5KSkge1xuICAgIGNoYXJhY3RlcnNbY2hhcmFjdGVyRW50aXRpZXNIdG1sNFtrZXldXSA9IGtleVxuICB9XG59XG5cbmNvbnN0IG5vdEFscGhhbnVtZXJpY1JlZ2V4ID0gL1teXFxkQS1aYS16XS9cblxuLyoqXG4gKiBDb25maWd1cmFibGUgd2F5cyB0byBlbmNvZGUgY2hhcmFjdGVycyBhcyBuYW1lZCByZWZlcmVuY2VzLlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb2RlXG4gKiBAcGFyYW0ge251bWJlcn0gbmV4dFxuICogQHBhcmFtIHtib29sZWFufHVuZGVmaW5lZH0gb21pdFxuICogQHBhcmFtIHtib29sZWFufHVuZGVmaW5lZH0gYXR0cmlidXRlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9OYW1lZChjb2RlLCBuZXh0LCBvbWl0LCBhdHRyaWJ1dGUpIHtcbiAgY29uc3QgY2hhcmFjdGVyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKVxuXG4gIGlmIChvd24uY2FsbChjaGFyYWN0ZXJzLCBjaGFyYWN0ZXIpKSB7XG4gICAgY29uc3QgbmFtZSA9IGNoYXJhY3RlcnNbY2hhcmFjdGVyXVxuICAgIGNvbnN0IHZhbHVlID0gJyYnICsgbmFtZVxuXG4gICAgaWYgKFxuICAgICAgb21pdCAmJlxuICAgICAgY2hhcmFjdGVyRW50aXRpZXNMZWdhY3kuaW5jbHVkZXMobmFtZSkgJiZcbiAgICAgICFkYW5nZXJvdXMuaW5jbHVkZXMobmFtZSkgJiZcbiAgICAgICghYXR0cmlidXRlIHx8XG4gICAgICAgIChuZXh0ICYmXG4gICAgICAgICAgbmV4dCAhPT0gNjEgLyogYD1gICovICYmXG4gICAgICAgICAgbm90QWxwaGFudW1lcmljUmVnZXgudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHQpKSkpXG4gICAgKSB7XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUgKyAnOydcbiAgfVxuXG4gIHJldHVybiAnJ1xufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/stringify-entities/lib/util/to-named.js\n");

/***/ })

};
;