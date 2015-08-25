(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],2:[function(require,module,exports){
var settings = require("../settings");
var _ = require("underscore");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  parkingSpaces: [],
  initialize: function () {
    _.bindAll(this,
      "stateLookForSpace",
      "stateDriveToColumn",
      "stateTurnRight",
      "stateTurnLeft",
      "stateDriveToSpace",
      "stateEnterParkingSpaceLeft",
      "stateEnterParkingSpaceRight",
      "stateBackingOutRight",
      "stateBackingOutLeft",
      "stateDriveUpToStopSign",
      "stateWaitAtStopSign",
      "stateDriveUpToTurnLeft",
      "stateDriveOutOfScreen",
      "startLeaving"
    );
    this.parkingSpaces = [];
    for (var iColumn = 0; iColumn < settings.columns; iColumn++) {
      for (var iRow = 0; iRow < settings.rows; iRow++) {
        if (!(iColumn === 1 && iRow === 2) &&
           !(iColumn === 2 && iRow === 2)) {
          this.parkingSpaces.push({
            row: iRow,
            column: iColumn,
            available: true,
          });
        }
      }
    }

  },
  updateCar: function (car) {
    car.stateUpdate(car);

  },
  stateLookForSpace: function (car) {
    var space = this.findParkingSpace();
    car.spaceTarget = space;
    car.stateUpdate = this.stateDriveToColumn;
    space.available = false;
    this.updateCar(car);
  },
  stateDriveToColumn: function (car) {
    var columnX = this.getLotDownX(car.spaceTarget);

    if (car.position.x < columnX - settings.turnRadius) {
      if (!collisionController.canMoveRight(car, car.velocity) &&
        car.stuckCount < 10) {
        car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.x += car.velocity;
      }
    } else {

      car.stateUpdate = this.stateTurnRight;
      car.nextStateUpdate = this.stateDriveToSpace;
      car.startRotation = car.rotation;
      car.desiredDx = settings.turnRadius;
      car.desiredDy = settings.turnRadius;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.rotationDirection = 1;
      car.desiredRotation = settings.carDownRotation;
    }
  },
  stateTurnRight: function (car) {
    if (Math.abs(car.rotation - car.desiredRotation) > .1) {
      car.rotation += settings.carRotationVelocity * car.rotationDirection;
      var rotPercent = 1 - (car.desiredRotation - car.rotation) /
      (car.desiredRotation - car.startRotation);
      car.position.x = car.startX + rotPercent * car.desiredDx;
      car.position.y = car.startY + rotPercent * car.desiredDy;
    } else {
      car.rotation = car.desiredRotation;
      car.stateUpdate = car.nextStateUpdate;
    }
  },
  stateTurnLeft: function (car) {
    if (Math.abs(car.rotation - car.desiredRotation) > .1) {
      car.rotation += settings.carRotationVelocity * car.rotationDirection;
      var rotPercent = 1 - (car.desiredRotation - car.rotation) /
      (car.desiredRotation - car.startRotation);
      car.position.x = car.startX + rotPercent * car.desiredDx;
      car.position.y = car.startY + rotPercent * car.desiredDy;

    } else {
      car.rotation = car.desiredRotation;
      car.stateUpdate = car.nextStateUpdate;
    }
  },
  stateDriveToSpace: function (car) {
    var spaceY = this.getSpaceY(car.spaceTarget);
    if (car.position.y < spaceY - settings.turnRadius) {
      if (!collisionController.canMoveDown(car, car.velocity)
       && car.stuckCount < 10) {
        car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.y += car.velocity;
      }

    } else {

      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      if (car.spaceTarget.column % 2 === 0) {
        car.desiredRotation = settings.carRightRotation;
        car.desiredDx = -settings.turnRadius;
        car.desiredDy = settings.turnRadius;
        car.rotationDirection = 1;
        car.stateUpdate = this.stateTurnRight;
        car.nextStateUpdate = this.stateEnterParkingSpaceRight;
      } else {
        car.desiredDx = settings.turnRadius;
        car.desiredDy = settings.turnRadius;
        car.desiredRotation = settings.carLeftRotation;
        car.rotationDirection = -1;
        car.stateUpdate = this.stateTurnLeft;
        car.nextStateUpdate = this.stateEnterParkingSpaceLeft;
      }
    }
  },
  stateEnterParkingSpaceLeft: function (car) {
    var targetX = this.getSpaceX(car.spaceTarget);
    if (car.position.x < targetX) {
      car.position.x += car.velocity;
    } else {
      car.isParked = true;
      console.log("car parked", car.spaceTarget);

    }
  },
  stateEnterParkingSpaceRight: function (car) {
    var targetX = this.getSpaceX(car.spaceTarget);
    if (car.position.x > targetX) {
      car.position.x -= car.velocity;
    } else {
      car.isParked = true;
      console.log("car parked", car.spaceTarget);

    }
  },
  startLeaving: function (car) {
    if (car.spaceTarget.column % 2 === 0) {
      car.stateUpdate = this.stateBackingOutLeft;
    } else {
      car.stateUpdate = this.stateBackingOutRight;
    }
    car.isParked = false;
  },
  stateBackingOutRight: function (car) {
    var targetX = this.getLotUpX(car.spaceTarget);
    if (car.position.x > targetX + settings.turnRadius) {
      car.position.x -= car.velocity;
    } else {
      car.spaceTarget.available = true;
      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.desiredDx = -settings.turnRadius;
      car.desiredDy = settings.turnRadius;
      car.desiredRotation = settings.carUpRotationNeg;
      car.rotationDirection = -1;
      car.stateUpdate = this.stateTurnLeft;
      car.nextStateUpdate = this.stateDriveUpToStopSign;
    }
  },
  stateBackingOutLeft: function (car) {
    var targetX = this.getLotUpX(car.spaceTarget);
    if (car.position.x < targetX - settings.turnRadius) {
      car.position.x += car.velocity;
    } else {
      car.spaceTarget.available = true;
      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.desiredDx = settings.turnRadius;
      car.desiredDy = settings.turnRadius;
      car.desiredRotation = settings.carUpRotation;
      car.rotationDirection = 1;
      car.stateUpdate = this.stateTurnRight;
      car.nextStateUpdate = this.stateDriveUpToStopSign;
    }
  },
  stateDriveUpToStopSign: function (car) {
    var targetY = settings.stopSignY;
    if (car.position.y > targetY) {
      if (!collisionController.canMoveUp(car, -car.velocity)
       && car.stuckCount < 10) {
          car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.y -= car.velocity;
      }

    } else {
      car.stopTime = (+ new Date) + 2000 * Math.random();
      car.stateUpdate = this.stateWaitAtStopSign;
    }
  },
  stateDriveUpToTurnLeft: function (car) {
    var targetY = settings.roadLeftY;
    if (car.position.y > targetY + settings.turnRadius) {
      if (!collisionController.canMoveUp(car, -car.velocity)
       && car.stuckCount < 10) {
          car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.y -= car.velocity;
      }
    } else {
      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.desiredDx = -settings.turnRadius * 2;
      car.desiredDy = settings.roadLeftY - car.startY;
      car.desiredRotation = settings.carRightRotationNeg;
      car.rotationDirection = -1;
      car.stateUpdate = this.stateTurnRight;
      car.nextStateUpdate = this.stateDriveOutOfScreen;
    }
  },
  stateWaitAtStopSign: function (car) {
    if (car.stopTime < (+ new Date)) {
      car.rotation = settings.carUpRotationNeg;
      car.stateUpdate = this.stateDriveUpToTurnLeft;
    }
  },
  stateDriveOutOfScreen: function (car) {
    var columnX = -100;

    if (car.position.x > columnX ) {
      if (!collisionController.canMoveLeft(car, car.velocity)) {
        return;
      } else {
        car.position.x -= car.velocity;
      }
    } else {
      car.readyToBeDestroyed = true;
    }
  },
  addCar: function (group) {
    var car = group.create(0,0, "sprites");
    car.frameName= "car" + (Math.floor(Math.random() * 4) + 1);
    car.anchor.x = 0.5;
    car.anchor.y = 0.5;
    car.isParked = false;
    car.stuckCount = 0;
    car.velocity = settings.carVelocity + Math.random() * settings.carRandomVelocityChange;
    car.objectType = "car"
    car.getBounds = function () {
      return {
        top: this.top + settings.carSpace*2,
        bottom: this.bottom - settings.carSpace*2,
        left: this.left + settings.carSpace,
        right: this.right - settings.carSpace,
      };
    };

    car.stateUpdate = this.stateLookForSpace;
    return car;
  },
  placeAtEntrance: function (car) {
    car.position.y = settings.roadRightY;
    car.position.x = -car.width;
  },
  moveCarToRandomSpace: function (car) {
    car.position.x = settings.spacesX[Math.floor(Math.random()* settings.columns)];
    car.position.y = settings.spaces1Y +
      Math.floor(Math.random() * settings.rows) * settings.spaceOffset ;
  },
  moveCarToSpace: function (car, space) {

    car.position.x = settings.spacesX[space.column];
    car.position.y = settings.spaces1Y +
      Math.floor(space.row) * settings.spaceOffset ;
    car.rotation = ((space.column + 1) % 2) * Math.PI;
    space.available = false;
  },
  parkCarInOpenSpace: function (car) {
    var space = this.findParkingSpace();
    car.isParked = true;
    this.moveCarToSpace(car, space);
    car.spaceTarget = space;
  },
  getLotDownX: function (space) {
    if (space.column < 2) {
      return settings.lot1DownX;
    } else {
      return settings.lot2DownX;
    }
  },
  getLotUpX: function (space) {
    if (space.column < 2) {
      return settings.lot1UpX;
    } else {
      return settings.lot2UpX;
    }
  },
  getSpaceY: function (space) {
    return settings.spaces1Y + space.row * settings.spaceOffset
  },
  getSpaceX: function (space) {
    return settings.spacesX[space.column];
  },
  findParkingSpace: function () {
    var openings = this.getOpenSpaces();
    var evaluate = _.min; //most people park closest to entrance
    if (Math.random() < 0.06) {
       evaluate = _.max; //some people park far away
    }
    return evaluate(openings, function (space) {
      return space.row
          + Math.abs(space.column - 1) + Math.random() * 10 ; //add some uncertainty about where to park

    });
  },
  getOpenSpaces: function () {
    return _.filter(this.parkingSpaces, {available: true})
  }
};

},{"../controllers/CollisionController":3,"../settings":6,"underscore":1}],3:[function(require,module,exports){
module.exports = {
  objects: [],
  add: function (object) {
    this.objects.push(object);
  },
  canMoveRight: function (object, x) {
    var objectBounds = object.getBounds();
    var testBounds = {
      top: object.top,
      bottom: object.top + 1,
      left: objectBounds.left + x,
      right: objectBounds.right + x

    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {

          if (object.objectType === "car"
          && testBounds.right < testObjectBounds.right) {

            return false;
          }
        }
    }
    return true;
  },
  canMoveLeft: function (object, x) {

    var objectBounds = object.getBounds();
    var testBounds = {
      top: object.top,
      bottom: object.top + 1,
      left: objectBounds.left - x,
      right: objectBounds.right - x

    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {

          if (object.objectType === "car"
          && testBounds.left > testObjectBounds.left) {

            return false;
          }
        }
    }
    return true;
  },
  canMoveDown: function (object, y) {
    var objectBounds = object.getBounds();
    var testBounds = {
      top: objectBounds.top + y,
      bottom: objectBounds.bottom + y,
      left: object.left,
      right: object.left
    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {
          if (object.objectType === "car"
          && testBounds.bottom < testObjectBounds.bottom) {

            return false;
          }
        }
    }
    return true;
  },
  canMoveUp: function (object, y) {

    var objectBounds = object.getBounds();
    var testBounds = {
      top: objectBounds.top + y,
      bottom: objectBounds.bottom + y,
      left: object.right ,
      right: object.right

    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {
          if (object.objectType === "car"
          && testBounds.top > testObjectBounds.top) {

            return false;
          }
        }
    }
    return true;
  },
  intersect: function (r1, r2) {
    return !(r2.left > r1.right ||
             r2.right < r1.left ||
             r2.top > r1.bottom ||
             r2.bottom < r1.top);
  }
}

},{}],4:[function(require,module,exports){
var settings = require("../settings");
var _ = require("underscore");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  monsterTypes: [
    "stateLeaveBehindNextCar",
    "statePushBetweenCar"
  ],
  initialize: function () {
    _.bindAll(this,
      "stateGetOutOfCar",
      "stateEnteredStore",
      "stateWalkToColumn",
      "stateWalkToColumnTop",
      "stateWalkToCrossWalk",
      "stateWalkIntoStore",
      "stateFinishShopping",
      "stateWalkDownCrosswalk",
      "stateWalkBackToColumn",
      "stateWalkDownToCar",
      "stateUnloadGroceries",
      "stateReturnCart",
      "stateReturnCartColumn",
      "stateReturnCartRow",
      "stateReturnCartIntoReturnArea",
      "stateLeavingReturnToCarY",
      "stateLeavingWalkToCarDoor",
      "stateLeaveBehindNextCar",
      "statePushBetweenCar",
      "statePushTowardsCartReturn",
      "stateRandomlyPush"
    );
  },
  stateGetOutOfCar: function (shopper) {

    shopper.person.visible = true;
    if (shopper.car.spaceTarget.column % 2 === 0) {
      shopper.person.x = shopper.car.x ;
      shopper.person.y = shopper.car.y + 30;
      shopper.person.rotation = settings.personDown
      shopper.nextTargetX = shopper.car.x + 60;
    } else {
      shopper.person.x = shopper.car.x ;
      shopper.person.y = shopper.car.y - 30;
      shopper.person.rotation = settings.personUp
      shopper.nextTargetX = shopper.car.x - 60;
    }
    shopper.stateUpdate = this.stateWalkToColumn;
  },
  stateEnteredStore: function (shopper) {
    shopper.person.visible = false;
    shopper.cart.visible = false;

    shopper.shoppingTime = (+new Date) + 10000 * Math.random();
    shopper.stateUpdate = this.stateFinishShopping;
  },
  stateFinishShopping: function (shopper) {
    if ((+ new Date) > shopper.shoppingTime) {
      shopper.cart.visible = true;
      shopper.cart.frameName ="cartFull";
      shopper.person.visible = true;
      this.moveCartAndPerson(shopper, shopper.person.x, 80, settings.personDown);
      shopper.stateUpdate = this.stateWalkDownCrosswalk;
    }
  },
  stateWalkDownCrosswalk: function (shopper) {
    var dy = shopper.person.y - settings.lotTop;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateWalkBackToColumn;
    } else {
      if (shopper.car.spaceTarget.column % 2 === 0) {
        shopper.nextTargetX = shopper.car.x + 60;
      } else {
        shopper.nextTargetX = shopper.car.x - 60;
      }
      this.moveCartAndPerson(shopper, shopper.person.x, shopper.person.y + settings.walkSpeed, settings.personDown);
    }
  },
  stateWalkBackToColumn: function (shopper) {
    var dx = shopper.person.x - shopper.nextTargetX;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateWalkDownToCar;
    } else if (dx > 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x - settings.walkSpeed,
        shopper.person.y,
        settings.personLeft);
    } else if (dx < 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x + settings.walkSpeed,
        shopper.person.y,
        settings.personRight);
    }
  },
  stateWalkDownToCar: function (shopper) {
    var dy = shopper.person.y - shopper.car.y;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.unloadCounter = 0;
      shopper.maxUnloadCounter = Math.random() * 100 + 100;
      shopper.stateUpdate = this.stateUnloadGroceries;
      if (shopper.car.x - shopper.person.x < 0) {
        shopper.person.x -= 5;
      } else {
        shopper.person.x += 5;
      }
    } else {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y + settings.walkSpeed,
        settings.personDown);
    }
  },
  stateUnloadGroceries: function (shopper) {
    shopper.unloadCounter++;
    if (shopper.unloadCounter > shopper.maxUnloadCounter) {
      shopper.stateUpdate = this.stateReturnCart;
      shopper.cart.frameName ="cart";
    } else {
      var direction = settings.personRight;
      if (shopper.car.x - shopper.person.x < 0) {
        direction = settings.personLeft;
      }
      if (shopper.unloadCounter % 20 < 10) {
        shopper.person.rotation = direction;
      } else {
        shopper.person.rotation = settings.personDown;
      }
    }
  },
  stateReturnCart: function (shopper) {
    if (shopper.person.isMonster) {
      shopper.stateUpdate = this[shopper.person.monsterType];
    } else {
      shopper.stateUpdate = this.stateReturnCartColumn;
    }
  },
  stateLeaveBehindNextCar: function (shopper) {
    if (shopper.monsterState === undefined) {
      shopper.monsterState = {
        targetY: shopper.person.y - 70
      }
    }
    var dy = shopper.person.y - shopper.monsterState.targetY;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateLeavingReturnToCarY;
      shopper.cart.rotation = Math.random() * Math.PI*2;
      shopper.cart.y += Math.random() * 10 - Math.random() * 5;
      shopper.cart.x += Math.random() * 10 - Math.random() * 5;
    } else {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y - settings.walkSpeed,
        settings.personUp);
    }

  },
  statePushBetweenCar: function (shopper) {
    if (shopper.monsterState === undefined) {
      shopper.monsterState = {
        targetY: shopper.car.y - 40,
        targetX: (shopper.car.spaceTarget.column % 2 == 0 ?
          shopper.car.x - 70 : shopper.car.x + 70),

      }
    }

    var dy = shopper.person.y - shopper.monsterState.targetY;
    var dx = shopper.person.x - shopper.monsterState.targetX;
    if (Math.abs(dy) <= settings.walkSpeed * 2
      && Math.abs(dx) <= settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateLeavingReturnToCarY;
      shopper.cart.rotation = Math.random() * Math.PI*2;
      shopper.cart.y += Math.random() * 10 - Math.random() * 5;
      shopper.cart.x += Math.random() * 10 - Math.random() * 5;
    } else if (Math.abs(dy) > settings.walkSpeed * 2) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y - settings.walkSpeed,
        settings.personUp);
    } else if (Math.abs(dx) > settings.walkSpeed * 2){
      var directionX = dx < 0 ? 1 : -1;
      var rotation= dx < 0 ? settings.personRight : settings.personLeft;
      this.moveCartAndPerson(
        shopper,
        shopper.person.x + settings.walkSpeed * directionX,
        shopper.person.y ,
        rotation);
    }
  },
  statePushTowardsCartReturn: function (shopper) {

  },
  stateRandomlyPush: function (shopper) {
    if (shopper.monsterStateInited === undefined) {
    }
  },
  stateReturnCartColumn: function (shopper) {
    var targetX = shopper.car.spaceTarget.column < 2?
      settings.lot1UpX + 20:
      settings.lot2DownX - 20;

    var dx = shopper.person.x - targetX;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateReturnCartRow;
      shopper.nextTargetY = settings.spaces1Y
      + settings.spaceOffset * 2
        + Math.random() * 30
        - Math.random() * 15;
    } else if (dx > 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x - settings.walkSpeed,
        shopper.person.y,
        settings.personLeft);
    } else {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x + settings.walkSpeed,
        shopper.person.y,
        settings.personRight);
    }
  },
  stateReturnCartRow: function (shopper) {
    var targetY = shopper.nextTargetY;

    var dy = shopper.person.y - targetY;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateReturnCartIntoReturnArea;
    } else if (dy > 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y - settings.walkSpeed,
        settings.personUp);
    } else if (dy < 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y + settings.walkSpeed,
        settings.personDown);
    }
  },
  stateReturnCartIntoReturnArea: function (shopper) {
    if (shopper.car.spaceTarget.column < 2) {
      shopper.cart.rotation = settings.personRight
      + Math.random() * 0.2 - Math.random() * 0.1;
      shopper.cart.x += (10 + Math.random() * 100);
    } else {
      shopper.cart.rotation = settings.personLeft
        + Math.random() * 0.2 - Math.random() * 0.1;
      shopper.cart.x -= (10 + Math.random() * 100);
    }
    shopper.stateUpdate = this.stateLeavingReturnToCarY;
  },
  stateLeavingReturnToCarY: function (shopper) {
    var targetY;
    if (shopper.car.spaceTarget.column % 2 === 0) {
      targetY = shopper.car.y + 30;
    } else {
      targetY = shopper.car.y - 30;
    }

    var dy = shopper.person.y - targetY;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
        shopper.stateUpdate = this.stateLeavingWalkToCarDoor;
    } else if (dy < 0) {
      shopper.person.y += settings.walkSpeed;
      shopper.person.rotation = settings.personDown;
    }else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }

  },
  stateLeavingWalkToCarDoor: function (shopper) {
    var dx = shopper.person.x - shopper.car.x;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.readyToLeave = true;
      shopper.person.visible = false;
    } else if (dx > 0) {
      shopper.person.x -= settings.walkSpeed;
      shopper.person.rotation = settings.personLeft;
    } else if (dx < 0) {
      shopper.person.x += settings.walkSpeed;
      shopper.person.rotation = settings.personRight;
    }

  },
  stateWalkToColumn: function (shopper) {
    var dx = shopper.person.x - shopper.nextTargetX;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateWalkToColumnTop;
    } else if (dx > 0) {
      shopper.person.x -= settings.walkSpeed;
      shopper.person.rotation = settings.personLeft;
    } else if (dx < 0) {
      shopper.person.x += settings.walkSpeed;
      shopper.person.rotation = settings.personRight;
    }
  },
  stateWalkToColumnTop: function (shopper) {
    var dy = shopper.person.y - settings.lotTop;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateWalkToCrossWalk;
    } else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }
  },
  stateWalkToCrossWalk: function (shopper) {
    var dx = shopper.person.x - 400;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateWalkIntoStore;
    } else if (dx > 0) {
      shopper.person.x -= settings.walkSpeed;
      shopper.person.rotation = settings.personLeft;
    } else if (dx < 0) {
      shopper.person.x += settings.walkSpeed;
      shopper.person.rotation = settings.personRight;
    }
  },
  stateWalkIntoStore: function (shopper) {
    var dy = shopper.person.y - 80;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateEnteredStore;
    } else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }
  },
  moveCartAndPerson: function (shopper, x, y, rotation) {
    shopper.person.x = x;
    shopper.person.y = y;
    shopper.person.rotation = rotation;

    shopper.cart.x = shopper.person.x;
    shopper.cart.y = shopper.person.y;
    shopper.cart.rotation = shopper.person.rotation;
  }
}

},{"../controllers/CollisionController":3,"../settings":6,"underscore":1}],5:[function(require,module,exports){
var Phaser = window.Phaser
var GameStates = require("states/GameStates");
var GameStateClazzes = require("states/GameStateClazzes");
var game = window.game = new Phaser.Game(800, 600, Phaser.AUTO, "game", null, true, false);
for (var state in GameStates) {
  if (GameStates.hasOwnProperty(state)) {
    game.state.add(GameStates[state], GameStateClazzes[state].clazz);
  }
}
game.state.start(GameStates.boot);

},{"states/GameStateClazzes":9,"states/GameStates":10}],6:[function(require,module,exports){
module.exports = {
  //car rotations
  carLeftRotation: 0,
  carRightRotation: Math.PI,
  carRightRotationNeg: -Math.PI,
  carDownRotation: Math.PI / 2,
  carUpRotation:  3*Math.PI / 2,
  carUpRotationNeg:  -Math.PI / 2,

  //car driving settings
  carVelocity: 5,
  carRandomVelocityChange: 2,
  carRotationVelocity: Math.PI/50,
  turnRadius: 25,

  //collision settings
  carSpace: -10,
  personSpace: 5,
  cartSpace: 5,

  //road and parking lot settings
  roadLeftY: 105,
  roadRightY: 155,
  stopSignY: 240,
  lot1DownX: 180,
  lot2DownX: 550,
  lot1UpX: 254,
  lot2UpX: 614,
  spacesX: [
    90,
    345,
    455,
    710
  ],
  spaces: 22,
  rows: 6,
  columns: 4,
  spaces1Y: 224,
  spaceOffset: 65,

  lotTop: 175,
  walkSpeed: .8,
  personLeft: 0,
  personRight: Math.PI,
  personUp: Math.PI/2,
  personDown: 3 * Math.PI/2,

  //people talking
  guiltySayings: [
    "I can't walk that far!",
    "They pay someone else to collect my cart!",
    "But I have kids in my car!",
    "It's too hot to return my cart.",
    "But, it was too far away!"
  ],
  innocentSayings: [
    "I would never leave my cart!",
    "I'm talking to management!",
    "I will never shop here again!",
    "Stop harassing me!",
    "I've been falsely accused! Again!"
  ]
}

},{}],7:[function(require,module,exports){
var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
    
    game.load.image("preloaderBackground", "assets/preloaderBackground.png");
		game.load.image("preloaderBar", "assets/preloaderBar.png");
  },
  create: function () {
    game.state.start(GameStates.load);
  },
}

},{"states/GameStates":10}],8:[function(require,module,exports){
var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
  },
  create: function () {
    var style = { font: "25px Arial", fill: "#FFFAD5", align: "center" };

    game.add.text(80, 150, "You harrased an innocent shopper, you're fired!", style);
    var scoreText = "You found " + window.monstersFound + " monsters.";
    if (window.monstersEscaped === 0 && window.monstersFound > 0) {
      scoreText += " You didn't let any monsters escape!";

    } else if (window.monstersEscaped > 0){
        scoreText += " But, you let " + window.monstersEscaped  +" monsters escape.";
    }

      game.add.text(80, 200, scoreText, style);

    game.add.text(80, 250, "Click to try again", style);

    game.add.text(80, 450, "Tip: Monsters don't return their carts.", style);

  },
  update: function () {
    if (game.input.activePointer.isDown)
       {
           game.state.start(GameStates.menu);
       }
  }
}

},{"states/GameStates":10}],9:[function(require,module,exports){
module.exports = {
  boot: {
    clazz: require("./Boot"),
  },
  load: {
    clazz: require("./Load")
  },
  menu: {
    clazz: require("./Menu")
  },
  play: {
    clazz: require("./Play")
  },
  gameOver: {
    clazz: require("./GameOver")
  },
};

},{"./Boot":7,"./GameOver":8,"./Load":11,"./Menu":12,"./Play":13}],10:[function(require,module,exports){
module.exports = {
  boot: "Boot",
  load: "Load",
  menu: "Menu",
  play: "Play",
  gameOver: "GameOver"
};

},{}],11:[function(require,module,exports){
var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
    game.add.text(80, 150, "loading...", {font: "30px Courier", fill: "#fffff"});

    game.background = this.add.sprite(0, 0, 'preloaderBackground');
    	game.preloadBar = this.add.sprite(300, 400, 'preloaderBar');
    	game.load.setPreloadSprite(game.preloadBar);
    game.time.advancedTiming = true;
    game.load.atlasJSONHash("sprites", "assets/sprites.png", "assets/sprites.json");

  },
  create: function () {
    game.state.start(GameStates.menu);
  }
}

},{"states/GameStates":10}],12:[function(require,module,exports){
var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
  },
  create: function () {
    var title = game.add.sprite(0,0, "sprites");
    title.frameName= "menuScreen";
    title.tint = 0xFFFAD5;
    //game.state.start(GameStates.play);
  },
  update: function () {
    if (game.input.activePointer.isDown)
       {
           game.state.start(GameStates.play);
       }
  }
}

},{"states/GameStates":10}],13:[function(require,module,exports){
var _ = require("underscore");
var GameStates = require("./GameStates");
var settings = require("../settings");
var carController = require("../controllers/CarController");
var shopperController = require("../controllers/ShopperController");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  shoppers: [],
  monstersFound: 0,
  monstersEscaped: 0,
  create: function () {
    _.bindAll(this, "checkIfHoverShopper")
    var background = game.add.sprite(0,0, "sprites");
    background.frameName= "backgroundCombined";
    carController.initialize();
    shopperController.initialize();
    this.gameObjectsLayer = game.add.group();
    this.accuseDialog = game.add.sprite(0,0, "sprites");
    this.accuseDialog.frameName = "accuseDialog";
    this.accuseDialog.anchor.x = 0.3;
    this.accuseDialog.visible = false;
    this.accuseDialog.anchor.y = -.2;

    this.monstersFound = 0;
    this.monstersEscaped = 0;
    this.shoppers = [];
    for (var i = 0; i < 5; i++) {
      this.addShopperInStore();
    }
  //  this.addShopper();
    window.Play = this;
    game.input.onDown.add(this.checkIfHitShopper, this);
    game.input.mouse.onMouseMove = this.checkIfHoverShopper;
  },
  update: function () {
    if (Math.random() < 0.005 && this.shoppers.length < settings.spaces) {
      this.addShopper();
    }

  var removeShoppers = [];
    _.each(this.shoppers, _.bind(function (shopper, index) {

      if (!shopper.car.isParked) {
          carController.updateCar(shopper.car);
      } else if (shopper.readyToLeave) {
        if (shopper.person.isMonster) {
          this.monstersEscaped ++;
        }
        carController.startLeaving(shopper.car);
      } else {
        this.updateShopper(shopper);
      }

      if (shopper.car.readyToBeDestroyed === true) {

        removeShoppers.push(index);
      }

    }, this));
    for ( var i = removeShoppers.length -1; i >= 0; i--) {
      console.log("shopper removed");

      this.shoppers[removeShoppers[i]].car.destroy();
      this.shoppers[removeShoppers[i]].person.destroy();
      this.shoppers.splice(removeShoppers[i], 1);

    }
  },
  render: function () {
    //game.debug.text(game.time.fps || "--", 2, 14, "#a7aebe");
    game.debug.text("Monsters found: " + this.monstersFound , 560, 24, "#FFFAD5");
    game.debug.text("Monsters escaped: " + this.monstersEscaped , 560, 40, "#FFFAD5");
  },
  updateShopper: function (shopper) {
    shopper.stateUpdate(shopper);
  },
  addShopper: function () {
    var shopper = this.createShopper(400, 60, -Math.PI/2);
    var car = carController.addCar(this.gameObjectsLayer);
    carController.placeAtEntrance(car);
    shopper.stateUpdate = shopperController.stateGetOutOfCar;

    shopper.car = car;
    collisionController.add(car);
    this.shoppers.push(shopper);
    return shopper;
  },
  addShopperInStore: function () {
    var shopper = this.addShopper();
    carController.parkCarInOpenSpace(shopper.car);
    shopper.stateUpdate = shopperController.stateEnteredStore;
  },

  createShopper: function (x, y, rotation) {
      var person = this.gameObjectsLayer.create(0,0, "sprites");
      person.frameName = "person" + (Math.floor(Math.random() * 3) + 1);
      person.anchor.x = 0;
      person.anchor.y = 0.5;
      person.scale.set(1.5, 1.5);
      person.visible = false;
      person.objectType = "person";
      person.hitArea = new Phaser.Rectangle(0, 0, 80, 80);
      person.getBounds = function () {
        return {
          top: this.top - settings.personSpace,
          bottom: this.bottom + settings.personSpace,
          left: this.left + settings.personSpace,
          right: this.right - settings.personSpace,
        };
      };
      collisionController.add(person);

      person.isMonster = Math.random() < .6;
      if (person.isMonster) {
        person.monsterType = shopperController.monsterTypes[Math.floor(Math.random() *shopperController.monsterTypes.length)]
      }

      var cart = this.gameObjectsLayer.create(0,0, "sprites");
      cart.frameName = "cart";
      cart.anchor.x = 1;
      cart.anchor.y = 0.5;
      cart.scale.set(1.2, 1.2);
      cart.visible = false;
      cart.objectType = "cart";
      cart.getBounds = function () {
        return {
          top: this.top - settings.cartSpace,
          bottom: this.bottom + settings.cartSpace,
          left: this.left + settings.cartSpace,
          right: this.right - settings.cartSpace,
        };
      };
      collisionController.add(cart);

      var shopper = {
        person: person,
        cart: cart,
        entranceTime: +new Date,
        shoppingTime: 2000 + Math.random() * 10000
      }
      this.moveShopper(shopper, x, y, rotation);
      person.shopper = shopper;
      return shopper;
  },
  checkIfHitShopper: function (evt) {
    var clickX = evt.position.x;
    var clickY = evt.position.y;
    _.each(this.shoppers, _.bind(function (shopper) {
      var x = shopper.person.x;
      var y = shopper.person.y;
      var dx = x - clickX;
      var dy = y - clickY;
      if (dx*dx + dy*dy < 1000) {
        this.accuseMonster(shopper.person);
      }
    }, this));
  },
  checkIfHoverShopper:  function (evt) {
    var clickX = evt.layerX;
    var clickY = evt.layerY;
    this.accuseDialog.visible = false;
    _.each(this.shoppers, _.bind(function (shopper) {
      var x = shopper.person.x;
      var y = shopper.person.y;
      var dx = x - clickX;
      var dy = y - clickY;
      if (dx*dx + dy*dy < 1000) {
        this.accuseDialog.visible = true;
        this.accuseDialog.x = shopper.person.x;
        this.accuseDialog.y = shopper.person.y;
      }
    }, this));
  },
  accuseMonster: function (person) {
    if (person.isMonster) {
      console.log("You found one!", person.monsterType );
      this.monstersFound ++;
      person.visible = false;
      person.shopper.cart.visible = false;
      person.shopper.car.visible = false;
      person.shopper.car.readyToBeDestroyed = true;
      person.shopper.car.spaceTarget.available = true;
      this.accuseDialog.visible = false;
    } else {
      window.monstersEscaped = this.monstersEscaped;
      window.monstersFound = this.monstersFound;
      game.state.start(GameStates.gameOver);
      console.log("You accused an innnocent person!");
    }
  },
  moveShopper: function (shopper, x, y, rotation) {
    shopper.person.position.x = x;
    shopper.person.position.y = y;
    shopper.person.rotation = rotation;
    shopper.cart.position.x = x;
    shopper.cart.position.y = y;
    shopper.cart.rotation = rotation;
  },
};

},{"../controllers/CarController":2,"../controllers/CollisionController":3,"../controllers/ShopperController":4,"../settings":6,"./GameStates":10,"underscore":1}]},{},[5])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwic3JjL2pzL2NvbnRyb2xsZXJzL0NhckNvbnRyb2xsZXIuanMiLCJzcmMvanMvY29udHJvbGxlcnMvQ29sbGlzaW9uQ29udHJvbGxlci5qcyIsInNyYy9qcy9jb250cm9sbGVycy9TaG9wcGVyQ29udHJvbGxlci5qcyIsInNyYy9qcy9nYW1lLmpzIiwic3JjL2pzL3NldHRpbmdzLmpzIiwic3JjL2pzL3N0YXRlcy9Cb290LmpzIiwic3JjL2pzL3N0YXRlcy9HYW1lT3Zlci5qcyIsInNyYy9qcy9zdGF0ZXMvR2FtZVN0YXRlQ2xhenplcy5qcyIsInNyYy9qcy9zdGF0ZXMvR2FtZVN0YXRlcy5qcyIsInNyYy9qcy9zdGF0ZXMvTG9hZC5qcyIsInNyYy9qcy9zdGF0ZXMvTWVudS5qcyIsInNyYy9qcy9zdGF0ZXMvUGxheS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVnREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjguM1xuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kLFxuICAgIG5hdGl2ZUNyZWF0ZSAgICAgICA9IE9iamVjdC5jcmVhdGU7XG5cbiAgLy8gTmFrZWQgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBzdXJyb2dhdGUtcHJvdG90eXBlLXN3YXBwaW5nLlxuICB2YXIgQ3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuOC4zJztcblxuICAvLyBJbnRlcm5hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gZWZmaWNpZW50IChmb3IgY3VycmVudCBlbmdpbmVzKSB2ZXJzaW9uXG4gIC8vIG9mIHRoZSBwYXNzZWQtaW4gY2FsbGJhY2ssIHRvIGJlIHJlcGVhdGVkbHkgYXBwbGllZCBpbiBvdGhlciBVbmRlcnNjb3JlXG4gIC8vIGZ1bmN0aW9ucy5cbiAgdmFyIG9wdGltaXplQ2IgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmIChjb250ZXh0ID09PSB2b2lkIDApIHJldHVybiBmdW5jO1xuICAgIHN3aXRjaCAoYXJnQ291bnQgPT0gbnVsbCA/IDMgOiBhcmdDb3VudCkge1xuICAgICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSk7XG4gICAgICB9O1xuICAgICAgY2FzZSAyOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIG90aGVyKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIG90aGVyKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBBIG1vc3RseS1pbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBjYWxsYmFja3MgdGhhdCBjYW4gYmUgYXBwbGllZFxuICAvLyB0byBlYWNoIGVsZW1lbnQgaW4gYSBjb2xsZWN0aW9uLCByZXR1cm5pbmcgdGhlIGRlc2lyZWQgcmVzdWx0IOKAlCBlaXRoZXJcbiAgLy8gaWRlbnRpdHksIGFuIGFyYml0cmFyeSBjYWxsYmFjaywgYSBwcm9wZXJ0eSBtYXRjaGVyLCBvciBhIHByb3BlcnR5IGFjY2Vzc29yLlxuICB2YXIgY2IgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCwgYXJnQ291bnQpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiBvcHRpbWl6ZUNiKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCk7XG4gICAgaWYgKF8uaXNPYmplY3QodmFsdWUpKSByZXR1cm4gXy5tYXRjaGVyKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG4gIF8uaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBjYih2YWx1ZSwgY29udGV4dCwgSW5maW5pdHkpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhc3NpZ25lciBmdW5jdGlvbnMuXG4gIHZhciBjcmVhdGVBc3NpZ25lciA9IGZ1bmN0aW9uKGtleXNGdW5jLCB1bmRlZmluZWRPbmx5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoIDwgMiB8fCBvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF0sXG4gICAgICAgICAgICBrZXlzID0ga2V5c0Z1bmMoc291cmNlKSxcbiAgICAgICAgICAgIGwgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoIXVuZGVmaW5lZE9ubHkgfHwgb2JqW2tleV0gPT09IHZvaWQgMCkgb2JqW2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIG5ldyBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIGFub3RoZXIuXG4gIHZhciBiYXNlQ3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KHByb3RvdHlwZSkpIHJldHVybiB7fTtcbiAgICBpZiAobmF0aXZlQ3JlYXRlKSByZXR1cm4gbmF0aXZlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBDdG9yO1xuICAgIEN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHZhciBwcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogPT0gbnVsbCA/IHZvaWQgMCA6IG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gSGVscGVyIGZvciBjb2xsZWN0aW9uIG1ldGhvZHMgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBjb2xsZWN0aW9uXG4gIC8vIHNob3VsZCBiZSBpdGVyYXRlZCBhcyBhbiBhcnJheSBvciBhcyBhbiBvYmplY3RcbiAgLy8gUmVsYXRlZDogaHR0cDovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtdG9sZW5ndGhcbiAgLy8gQXZvaWRzIGEgdmVyeSBuYXN0eSBpT1MgOCBKSVQgYnVnIG9uIEFSTS02NC4gIzIwOTRcbiAgdmFyIE1BWF9BUlJBWV9JTkRFWCA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIHZhciBnZXRMZW5ndGggPSBwcm9wZXJ0eSgnbGVuZ3RoJyk7XG4gIHZhciBpc0FycmF5TGlrZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGNvbGxlY3Rpb24pO1xuICAgIHJldHVybiB0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGxlbmd0aCA+PSAwICYmIGxlbmd0aCA8PSBNQVhfQVJSQVlfSU5ERVg7XG4gIH07XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyByYXcgb2JqZWN0cyBpbiBhZGRpdGlvbiB0byBhcnJheS1saWtlcy4gVHJlYXRzIGFsbFxuICAvLyBzcGFyc2UgYXJyYXktbGlrZXMgYXMgaWYgdGhleSB3ZXJlIGRlbnNlLlxuICBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIgaSwgbGVuZ3RoO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopKSB7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlcmF0ZWUob2JqW2ldLCBpLCBvYmopO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICByZXN1bHRzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIHJlZHVjaW5nIGZ1bmN0aW9uIGl0ZXJhdGluZyBsZWZ0IG9yIHJpZ2h0LlxuICBmdW5jdGlvbiBjcmVhdGVSZWR1Y2UoZGlyKSB7XG4gICAgLy8gT3B0aW1pemVkIGl0ZXJhdG9yIGZ1bmN0aW9uIGFzIHVzaW5nIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAvLyBpbiB0aGUgbWFpbiBmdW5jdGlvbiB3aWxsIGRlb3B0aW1pemUgdGhlLCBzZWUgIzE5OTEuXG4gICAgZnVuY3Rpb24gaXRlcmF0b3Iob2JqLCBpdGVyYXRlZSwgbWVtbywga2V5cywgaW5kZXgsIGxlbmd0aCkge1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgICBtZW1vID0gaXRlcmF0ZWUobWVtbywgb2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpIHtcbiAgICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgNCk7XG4gICAgICB2YXIga2V5cyA9ICFpc0FycmF5TGlrZShvYmopICYmIF8ua2V5cyhvYmopLFxuICAgICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICAgIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBpbml0aWFsIHZhbHVlIGlmIG5vbmUgaXMgcHJvdmlkZWQuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgbWVtbyA9IG9ialtrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleF07XG4gICAgICAgIGluZGV4ICs9IGRpcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvcihvYmosIGl0ZXJhdGVlLCBtZW1vLCBrZXlzLCBpbmRleCwgbGVuZ3RoKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGNyZWF0ZVJlZHVjZSgxKTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBjcmVhdGVSZWR1Y2UoLTEpO1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciBrZXk7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcbiAgICAgIGtleSA9IF8uZmluZEluZGV4KG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5ID0gXy5maW5kS2V5KG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGtleSAhPT0gdm9pZCAwICYmIGtleSAhPT0gLTEpIHJldHVybiBvYmpba2V5XTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubmVnYXRlKGNiKHByZWRpY2F0ZSkpLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAoIXByZWRpY2F0ZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAocHJlZGljYXRlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIGl0ZW0gKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZXNgIGFuZCBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGVzID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCBpdGVtLCBmcm9tSW5kZXgsIGd1YXJkKSB7XG4gICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ICE9ICdudW1iZXInIHx8IGd1YXJkKSBmcm9tSW5kZXggPSAwO1xuICAgIHJldHVybiBfLmluZGV4T2Yob2JqLCBpdGVtLCBmcm9tSW5kZXgpID49IDA7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBmdW5jID0gaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXTtcbiAgICAgIHJldHVybiBmdW5jID09IG51bGwgPyBmdW5jIDogZnVuYy5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVyKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVyKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHksXG4gICAgICAgIHZhbHVlLCBjb21wdXRlZDtcbiAgICBpZiAoaXRlcmF0ZWUgPT0gbnVsbCAmJiBvYmogIT0gbnVsbCkge1xuICAgICAgb2JqID0gaXNBcnJheUxpa2Uob2JqKSA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlID0gb2JqW2ldO1xuICAgICAgICBpZiAodmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCB8fCBjb21wdXRlZCA9PT0gLUluZmluaXR5ICYmIHJlc3VsdCA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA8IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSBJbmZpbml0eSAmJiByZXN1bHQgPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYSBjb2xsZWN0aW9uLCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHNldCA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBzZXQubGVuZ3RoO1xuICAgIHZhciBzaHVmZmxlZCA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwLCByYW5kOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKDAsIGluZGV4KTtcbiAgICAgIGlmIChyYW5kICE9PSBpbmRleCkgc2h1ZmZsZWRbaW5kZXhdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHNldFtpbmRleF07XG4gICAgfVxuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRlZS5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCB2YWx1ZSwga2V5KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldLnB1c2godmFsdWUpOyBlbHNlIHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICBpZiAoXy5oYXMocmVzdWx0LCBrZXkpKSByZXN1bHRba2V5XSsrOyBlbHNlIHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gaXNBcnJheUxpa2Uob2JqKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gU3BsaXQgYSBjb2xsZWN0aW9uIGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHtcbiAgICAgIChwcmVkaWNhdGUodmFsdWUsIGtleSwgb2JqKSA/IHBhc3MgOiBmYWlsKS5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgcmV0dXJuIF8uaW5pdGlhbChhcnJheSwgYXJyYXkubGVuZ3RoIC0gbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSAobiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIF8ucmVzdChhcnJheSwgTWF0aC5tYXgoMCwgYXJyYXkubGVuZ3RoIC0gbikpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgbiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgc3RyaWN0LCBzdGFydEluZGV4KSB7XG4gICAgdmFyIG91dHB1dCA9IFtdLCBpZHggPSAwO1xuICAgIGZvciAodmFyIGkgPSBzdGFydEluZGV4IHx8IDAsIGxlbmd0aCA9IGdldExlbmd0aChpbnB1dCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gaW5wdXRbaV07XG4gICAgICBpZiAoaXNBcnJheUxpa2UodmFsdWUpICYmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSkge1xuICAgICAgICAvL2ZsYXR0ZW4gY3VycmVudCBsZXZlbCBvZiBhcnJheSBvciBhcmd1bWVudHMgb2JqZWN0XG4gICAgICAgIGlmICghc2hhbGxvdykgdmFsdWUgPSBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBzdHJpY3QpO1xuICAgICAgICB2YXIgaiA9IDAsIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgb3V0cHV0Lmxlbmd0aCArPSBsZW47XG4gICAgICAgIHdoaWxlIChqIDwgbGVuKSB7XG4gICAgICAgICAgb3V0cHV0W2lkeCsrXSA9IHZhbHVlW2orK107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCkge1xuICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBmYWxzZSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGlmICghXy5pc0Jvb2xlYW4oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0ZWU7XG4gICAgICBpdGVyYXRlZSA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGl0ZXJhdGVlICE9IG51bGwpIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldLFxuICAgICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUgPyBpdGVyYXRlZSh2YWx1ZSwgaSwgYXJyYXkpIDogdmFsdWU7XG4gICAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgICAgaWYgKCFpIHx8IHNlZW4gIT09IGNvbXB1dGVkKSByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIHNlZW4gPSBjb21wdXRlZDtcbiAgICAgIH0gZWxzZSBpZiAoaXRlcmF0ZWUpIHtcbiAgICAgICAgaWYgKCFfLmNvbnRhaW5zKHNlZW4sIGNvbXB1dGVkKSkge1xuICAgICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFfLmNvbnRhaW5zKHJlc3VsdCwgdmFsdWUpKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKGZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBhcmdzTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IGFycmF5W2ldO1xuICAgICAgaWYgKF8uY29udGFpbnMocmVzdWx0LCBpdGVtKSkgY29udGludWU7XG4gICAgICBmb3IgKHZhciBqID0gMTsgaiA8IGFyZ3NMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIV8uY29udGFpbnMoYXJndW1lbnRzW2pdLCBpdGVtKSkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoaiA9PT0gYXJnc0xlbmd0aCkgcmVzdWx0LnB1c2goaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpe1xuICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuemlwKGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLy8gQ29tcGxlbWVudCBvZiBfLnppcC4gVW56aXAgYWNjZXB0cyBhbiBhcnJheSBvZiBhcnJheXMgYW5kIGdyb3Vwc1xuICAvLyBlYWNoIGFycmF5J3MgZWxlbWVudHMgb24gc2hhcmVkIGluZGljZXNcbiAgXy51bnppcCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIGxlbmd0aCA9IGFycmF5ICYmIF8ubWF4KGFycmF5LCBnZXRMZW5ndGgpLmxlbmd0aCB8fCAwO1xuICAgIHZhciByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IF8ucGx1Y2soYXJyYXksIGluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgobGlzdCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRvciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGZpbmRJbmRleCBhbmQgZmluZExhc3RJbmRleCBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoZGlyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIHZhciBpbmRleCA9IGRpciA+IDAgPyAwIDogbGVuZ3RoIC0gMTtcbiAgICAgIGZvciAoOyBpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSBkaXIpIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHJldHVybiBpbmRleDtcbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9O1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgaW5kZXggb24gYW4gYXJyYXktbGlrZSB0aGF0IHBhc3NlcyBhIHByZWRpY2F0ZSB0ZXN0XG4gIF8uZmluZEluZGV4ID0gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoMSk7XG4gIF8uZmluZExhc3RJbmRleCA9IGNyZWF0ZVByZWRpY2F0ZUluZGV4RmluZGVyKC0xKTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0ZWUob2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGdldExlbmd0aChhcnJheSk7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpO1xuICAgICAgaWYgKGl0ZXJhdGVlKGFycmF5W21pZF0pIDwgdmFsdWUpIGxvdyA9IG1pZCArIDE7IGVsc2UgaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBHZW5lcmF0b3IgZnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleE9mIGFuZCBsYXN0SW5kZXhPZiBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gY3JlYXRlSW5kZXhGaW5kZXIoZGlyLCBwcmVkaWNhdGVGaW5kLCBzb3J0ZWRJbmRleCkge1xuICAgIHJldHVybiBmdW5jdGlvbihhcnJheSwgaXRlbSwgaWR4KSB7XG4gICAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7XG4gICAgICBpZiAodHlwZW9mIGlkeCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAoZGlyID4gMCkge1xuICAgICAgICAgICAgaSA9IGlkeCA+PSAwID8gaWR4IDogTWF0aC5tYXgoaWR4ICsgbGVuZ3RoLCBpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxlbmd0aCA9IGlkeCA+PSAwID8gTWF0aC5taW4oaWR4ICsgMSwgbGVuZ3RoKSA6IGlkeCArIGxlbmd0aCArIDE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc29ydGVkSW5kZXggJiYgaWR4ICYmIGxlbmd0aCkge1xuICAgICAgICBpZHggPSBzb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpZHhdID09PSBpdGVtID8gaWR4IDogLTE7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbSAhPT0gaXRlbSkge1xuICAgICAgICBpZHggPSBwcmVkaWNhdGVGaW5kKHNsaWNlLmNhbGwoYXJyYXksIGksIGxlbmd0aCksIF8uaXNOYU4pO1xuICAgICAgICByZXR1cm4gaWR4ID49IDAgPyBpZHggKyBpIDogLTE7XG4gICAgICB9XG4gICAgICBmb3IgKGlkeCA9IGRpciA+IDAgPyBpIDogbGVuZ3RoIC0gMTsgaWR4ID49IDAgJiYgaWR4IDwgbGVuZ3RoOyBpZHggKz0gZGlyKSB7XG4gICAgICAgIGlmIChhcnJheVtpZHhdID09PSBpdGVtKSByZXR1cm4gaWR4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuIGl0ZW0gaW4gYW4gYXJyYXksXG4gIC8vIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBjcmVhdGVJbmRleEZpbmRlcigxLCBfLmZpbmRJbmRleCwgXy5zb3J0ZWRJbmRleCk7XG4gIF8ubGFzdEluZGV4T2YgPSBjcmVhdGVJbmRleEZpbmRlcigtMSwgXy5maW5kTGFzdEluZGV4KTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChzdG9wID09IG51bGwpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gc3RlcCB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgcmFuZ2UgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbGVuZ3RoOyBpZHgrKywgc3RhcnQgKz0gc3RlcCkge1xuICAgICAgcmFuZ2VbaWR4XSA9IHN0YXJ0O1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIERldGVybWluZXMgd2hldGhlciB0byBleGVjdXRlIGEgZnVuY3Rpb24gYXMgYSBjb25zdHJ1Y3RvclxuICAvLyBvciBhIG5vcm1hbCBmdW5jdGlvbiB3aXRoIHRoZSBwcm92aWRlZCBhcmd1bWVudHNcbiAgdmFyIGV4ZWN1dGVCb3VuZCA9IGZ1bmN0aW9uKHNvdXJjZUZ1bmMsIGJvdW5kRnVuYywgY29udGV4dCwgY2FsbGluZ0NvbnRleHQsIGFyZ3MpIHtcbiAgICBpZiAoIShjYWxsaW5nQ29udGV4dCBpbnN0YW5jZW9mIGJvdW5kRnVuYykpIHJldHVybiBzb3VyY2VGdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIHZhciBzZWxmID0gYmFzZUNyZWF0ZShzb3VyY2VGdW5jLnByb3RvdHlwZSk7XG4gICAgdmFyIHJlc3VsdCA9IHNvdXJjZUZ1bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgaWYgKF8uaXNPYmplY3QocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JpbmQgbXVzdCBiZSBjYWxsZWQgb24gYSBmdW5jdGlvbicpO1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4ZWN1dGVCb3VuZChmdW5jLCBib3VuZCwgY29udGV4dCwgdGhpcywgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gYm91bmQ7XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwLCBsZW5ndGggPSBib3VuZEFyZ3MubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheShsZW5ndGgpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBhcmdzW2ldID0gYm91bmRBcmdzW2ldID09PSBfID8gYXJndW1lbnRzW3Bvc2l0aW9uKytdIDogYm91bmRBcmdzW2ldO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCB0aGlzLCB0aGlzLCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGksIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsIGtleTtcbiAgICBpZiAobGVuZ3RoIDw9IDEpIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0gYXJndW1lbnRzW2ldO1xuICAgICAgb2JqW2tleV0gPSBfLmJpbmQob2JqW2tleV0sIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW9pemUgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBjYWNoZSA9IG1lbW9pemUuY2FjaGU7XG4gICAgICB2YXIgYWRkcmVzcyA9ICcnICsgKGhhc2hlciA/IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDoga2V5KTtcbiAgICAgIGlmICghXy5oYXMoY2FjaGUsIGFkZHJlc3MpKSBjYWNoZVthZGRyZXNzXSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBjYWNoZVthZGRyZXNzXTtcbiAgICB9O1xuICAgIG1lbW9pemUuY2FjaGUgPSB7fTtcbiAgICByZXR1cm4gbWVtb2l6ZTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBfLnBhcnRpYWwoXy5kZWxheSwgXywgMSk7XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcblxuICAgICAgaWYgKGxhc3QgPCB3YWl0ICYmIGxhc3QgPj0gMCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBpZiAoIXRpbWVvdXQpIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gXy5wYXJ0aWFsKHdyYXBwZXIsIGZ1bmMpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBuZWdhdGVkIHZlcnNpb24gb2YgdGhlIHBhc3NlZC1pbiBwcmVkaWNhdGUuXG4gIF8ubmVnYXRlID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciBzdGFydCA9IGFyZ3MubGVuZ3RoIC0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaSA9IHN0YXJ0O1xuICAgICAgdmFyIHJlc3VsdCA9IGFyZ3Nbc3RhcnRdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB3aGlsZSAoaS0tKSByZXN1bHQgPSBhcmdzW2ldLmNhbGwodGhpcywgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgb24gYW5kIGFmdGVyIHRoZSBOdGggY2FsbC5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgdXAgdG8gKGJ1dCBub3QgaW5jbHVkaW5nKSB0aGUgTnRoIGNhbGwuXG4gIF8uYmVmb3JlID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICB2YXIgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA+IDApIHtcbiAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aW1lcyA8PSAxKSBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IF8ucGFydGlhbChfLmJlZm9yZSwgMik7XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gS2V5cyBpbiBJRSA8IDkgdGhhdCB3b24ndCBiZSBpdGVyYXRlZCBieSBgZm9yIGtleSBpbiAuLi5gIGFuZCB0aHVzIG1pc3NlZC5cbiAgdmFyIGhhc0VudW1CdWcgPSAhe3RvU3RyaW5nOiBudWxsfS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKTtcbiAgdmFyIG5vbkVudW1lcmFibGVQcm9wcyA9IFsndmFsdWVPZicsICdpc1Byb3RvdHlwZU9mJywgJ3RvU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAncHJvcGVydHlJc0VudW1lcmFibGUnLCAnaGFzT3duUHJvcGVydHknLCAndG9Mb2NhbGVTdHJpbmcnXTtcblxuICBmdW5jdGlvbiBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cykge1xuICAgIHZhciBub25FbnVtSWR4ID0gbm9uRW51bWVyYWJsZVByb3BzLmxlbmd0aDtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBvYmouY29uc3RydWN0b3I7XG4gICAgdmFyIHByb3RvID0gKF8uaXNGdW5jdGlvbihjb25zdHJ1Y3RvcikgJiYgY29uc3RydWN0b3IucHJvdG90eXBlKSB8fCBPYmpQcm90bztcblxuICAgIC8vIENvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlLlxuICAgIHZhciBwcm9wID0gJ2NvbnN0cnVjdG9yJztcbiAgICBpZiAoXy5oYXMob2JqLCBwcm9wKSAmJiAhXy5jb250YWlucyhrZXlzLCBwcm9wKSkga2V5cy5wdXNoKHByb3ApO1xuXG4gICAgd2hpbGUgKG5vbkVudW1JZHgtLSkge1xuICAgICAgcHJvcCA9IG5vbkVudW1lcmFibGVQcm9wc1tub25FbnVtSWR4XTtcbiAgICAgIGlmIChwcm9wIGluIG9iaiAmJiBvYmpbcHJvcF0gIT09IHByb3RvW3Byb3BdICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSB7XG4gICAgICAgIGtleXMucHVzaChwcm9wKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3Mgb3duIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIC8vIEFoZW0sIElFIDwgOS5cbiAgICBpZiAoaGFzRW51bUJ1ZykgY29sbGVjdE5vbkVudW1Qcm9wcyhvYmosIGtleXMpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIGFsbCB0aGUgcHJvcGVydHkgbmFtZXMgb2YgYW4gb2JqZWN0LlxuICBfLmFsbEtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIG9iamVjdFxuICAvLyBJbiBjb250cmFzdCB0byBfLm1hcCBpdCByZXR1cm5zIGFuIG9iamVjdFxuICBfLm1hcE9iamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9ICBfLmtleXMob2JqKSxcbiAgICAgICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHRzID0ge30sXG4gICAgICAgICAgY3VycmVudEtleTtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY3VycmVudEtleSA9IGtleXNbaW5kZXhdO1xuICAgICAgICByZXN1bHRzW2N1cnJlbnRLZXldID0gaXRlcmF0ZWUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMpO1xuXG4gIC8vIEFzc2lnbnMgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIG93biBwcm9wZXJ0aWVzIGluIHRoZSBwYXNzZWQtaW4gb2JqZWN0KHMpXG4gIC8vIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvYXNzaWduKVxuICBfLmV4dGVuZE93biA9IF8uYXNzaWduID0gY3JlYXRlQXNzaWduZXIoXy5rZXlzKTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBrZXkgb24gYW4gb2JqZWN0IHRoYXQgcGFzc2VzIGEgcHJlZGljYXRlIHRlc3RcbiAgXy5maW5kS2V5ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaiksIGtleTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2tleV0sIGtleSwgb2JqKSkgcmV0dXJuIGtleTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqZWN0LCBvaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0ge30sIG9iaiA9IG9iamVjdCwgaXRlcmF0ZWUsIGtleXM7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChfLmlzRnVuY3Rpb24ob2l0ZXJhdGVlKSkge1xuICAgICAga2V5cyA9IF8uYWxsS2V5cyhvYmopO1xuICAgICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKG9pdGVyYXRlZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleXMgPSBmbGF0dGVuKGFyZ3VtZW50cywgZmFsc2UsIGZhbHNlLCAxKTtcbiAgICAgIGl0ZXJhdGVlID0gZnVuY3Rpb24odmFsdWUsIGtleSwgb2JqKSB7IHJldHVybiBrZXkgaW4gb2JqOyB9O1xuICAgICAgb2JqID0gT2JqZWN0KG9iaik7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IG9ialtrZXldO1xuICAgICAgaWYgKGl0ZXJhdGVlKHZhbHVlLCBrZXksIG9iaikpIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpdGVyYXRlZSkpIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5uZWdhdGUoaXRlcmF0ZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ubWFwKGZsYXR0ZW4oYXJndW1lbnRzLCBmYWxzZSwgZmFsc2UsIDEpLCBTdHJpbmcpO1xuICAgICAgaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHJldHVybiAhXy5jb250YWlucyhrZXlzLCBrZXkpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIF8ucGljayhvYmosIGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gY3JlYXRlQXNzaWduZXIoXy5hbGxLZXlzLCB0cnVlKTtcblxuICAvLyBDcmVhdGVzIGFuIG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gdGhlIGdpdmVuIHByb3RvdHlwZSBvYmplY3QuXG4gIC8vIElmIGFkZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgcHJvdmlkZWQgdGhlbiB0aGV5IHdpbGwgYmUgYWRkZWQgdG8gdGhlXG4gIC8vIGNyZWF0ZWQgb2JqZWN0LlxuICBfLmNyZWF0ZSA9IGZ1bmN0aW9uKHByb3RvdHlwZSwgcHJvcHMpIHtcbiAgICB2YXIgcmVzdWx0ID0gYmFzZUNyZWF0ZShwcm90b3R5cGUpO1xuICAgIGlmIChwcm9wcykgXy5leHRlbmRPd24ocmVzdWx0LCBwcm9wcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJucyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uaXNNYXRjaCA9IGZ1bmN0aW9uKG9iamVjdCwgYXR0cnMpIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhhdHRycyksIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICFsZW5ndGg7XG4gICAgdmFyIG9iaiA9IE9iamVjdChvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldIHx8ICEoa2V5IGluIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCByZWd1bGFyIGV4cHJlc3Npb25zLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb2VyY2VkIHRvIHN0cmluZ3MgZm9yIGNvbXBhcmlzb24gKE5vdGU6ICcnICsgL2EvaSA9PT0gJy9hL2knKVxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gJycgKyBhID09PSAnJyArIGI7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLlxuICAgICAgICAvLyBPYmplY3QoTmFOKSBpcyBlcXVpdmFsZW50IHRvIE5hTlxuICAgICAgICBpZiAoK2EgIT09ICthKSByZXR1cm4gK2IgIT09ICtiO1xuICAgICAgICAvLyBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gK2EgPT09IDAgPyAxIC8gK2EgPT09IDEgLyBiIDogK2EgPT09ICtiO1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICBjYXNlICdbb2JqZWN0IEJvb2xlYW5dJzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgICAvLyBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnMuIE5vdGUgdGhhdCBpbnZhbGlkIGRhdGVzIHdpdGggbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIC8vIG9mIGBOYU5gIGFyZSBub3QgZXF1aXZhbGVudC5cbiAgICAgICAgcmV0dXJuICthID09PSArYjtcbiAgICB9XG5cbiAgICB2YXIgYXJlQXJyYXlzID0gY2xhc3NOYW1lID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIGlmICghYXJlQXJyYXlzKSB7XG4gICAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gT2JqZWN0cyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVpdmFsZW50LCBidXQgYE9iamVjdGBzIG9yIGBBcnJheWBzXG4gICAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGFDdG9yICE9PSBiQ3RvciAmJiAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgYUN0b3IgaW5zdGFuY2VvZiBhQ3RvciAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuXG4gICAgLy8gSW5pdGlhbGl6aW5nIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIC8vIEl0J3MgZG9uZSBoZXJlIHNpbmNlIHdlIG9ubHkgbmVlZCB0aGVtIGZvciBvYmplY3RzIGFuZCBhcnJheXMgY29tcGFyaXNvbi5cbiAgICBhU3RhY2sgPSBhU3RhY2sgfHwgW107XG4gICAgYlN0YWNrID0gYlN0YWNrIHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PT0gYjtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG5cbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoYXJlQXJyYXlzKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIGxlbmd0aCA9IGEubGVuZ3RoO1xuICAgICAgaWYgKGxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgaWYgKCFlcShhW2xlbmd0aF0sIGJbbGVuZ3RoXSwgYVN0YWNrLCBiU3RhY2spKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgdmFyIGtleXMgPSBfLmtleXMoYSksIGtleTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMgYmVmb3JlIGNvbXBhcmluZyBkZWVwIGVxdWFsaXR5LlxuICAgICAgaWYgKF8ua2V5cyhiKS5sZW5ndGggIT09IGxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlclxuICAgICAgICBrZXkgPSBrZXlzW2xlbmd0aF07XG4gICAgICAgIGlmICghKF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSAmJiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopIHx8IF8uaXNBcmd1bWVudHMob2JqKSkpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIHJldHVybiBfLmtleXMob2JqKS5sZW5ndGggPT09IDA7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gIF8uZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSA8IDkpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmhhcyhvYmosICdjYWxsZWUnKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLiBXb3JrIGFyb3VuZCBzb21lIHR5cGVvZiBidWdzIGluIG9sZCB2OCxcbiAgLy8gSUUgMTEgKCMxNjIxKSwgYW5kIGluIFNhZmFyaSA4ICgjMTkyOSkuXG4gIGlmICh0eXBlb2YgLy4vICE9ICdmdW5jdGlvbicgJiYgdHlwZW9mIEludDhBcnJheSAhPSAnb2JqZWN0Jykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT09ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdGVlcy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIC8vIFByZWRpY2F0ZS1nZW5lcmF0aW5nIGZ1bmN0aW9ucy4gT2Z0ZW4gdXNlZnVsIG91dHNpZGUgb2YgVW5kZXJzY29yZS5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5ub29wID0gZnVuY3Rpb24oKXt9O1xuXG4gIF8ucHJvcGVydHkgPSBwcm9wZXJ0eTtcblxuICAvLyBHZW5lcmF0ZXMgYSBmdW5jdGlvbiBmb3IgYSBnaXZlbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgZ2l2ZW4gcHJvcGVydHkuXG4gIF8ucHJvcGVydHlPZiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT0gbnVsbCA/IGZ1bmN0aW9uKCl7fSA6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mXG4gIC8vIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXIgPSBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIGF0dHJzID0gXy5leHRlbmRPd24oe30sIGF0dHJzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gXy5pc01hdGNoKG9iaiwgYXR0cnMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdGVlKGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG4gICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xuICB9O1xuICB2YXIgdW5lc2NhcGVNYXAgPSBfLmludmVydChlc2NhcGVNYXApO1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgdmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuICAgIC8vIFJlZ2V4ZXMgZm9yIGlkZW50aWZ5aW5nIGEga2V5IHRoYXQgbmVlZHMgdG8gYmUgZXNjYXBlZFxuICAgIHZhciBzb3VyY2UgPSAnKD86JyArIF8ua2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBzdHJpbmcgPSBzdHJpbmcgPT0gbnVsbCA/ICcnIDogJycgKyBzdHJpbmc7XG4gICAgICByZXR1cm4gdGVzdFJlZ2V4cC50ZXN0KHN0cmluZykgPyBzdHJpbmcucmVwbGFjZShyZXBsYWNlUmVnZXhwLCBlc2NhcGVyKSA6IHN0cmluZztcbiAgICB9O1xuICB9O1xuICBfLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwKTtcbiAgXy51bmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIodW5lc2NhcGVNYXApO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHksIGZhbGxiYWNrKSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0ID09IG51bGwgPyB2b2lkIDAgOiBvYmplY3RbcHJvcGVydHldO1xuICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICB2YWx1ZSA9IGZhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgdmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihtYXRjaCkge1xuICAgIHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTtcbiAgfTtcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICAvLyBOQjogYG9sZFNldHRpbmdzYCBvbmx5IGV4aXN0cyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBzZXR0aW5ncywgb2xkU2V0dGluZ3MpIHtcbiAgICBpZiAoIXNldHRpbmdzICYmIG9sZFNldHRpbmdzKSBzZXR0aW5ncyA9IG9sZFNldHRpbmdzO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShlc2NhcGVyLCBlc2NhcGVDaGFyKTtcbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfSBlbHNlIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuXG4gICAgICAvLyBBZG9iZSBWTXMgbmVlZCB0aGUgbWF0Y2ggcmV0dXJuZWQgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBvZmZlc3QuXG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyAncmV0dXJuIF9fcDtcXG4nO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdmFyIGFyZ3VtZW50ID0gc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaic7XG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyBhcmd1bWVudCArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLiBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaW5zdGFuY2UgPSBfKG9iaik7XG4gICAgaW5zdGFuY2UuX2NoYWluID0gdHJ1ZTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKGluc3RhbmNlLCBvYmopIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgXy5lYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBfLmVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT09ICdzaGlmdCcgfHwgbmFtZSA9PT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0KHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gIF8ucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gUHJvdmlkZSB1bndyYXBwaW5nIHByb3h5IGZvciBzb21lIG1ldGhvZHMgdXNlZCBpbiBlbmdpbmUgb3BlcmF0aW9uc1xuICAvLyBzdWNoIGFzIGFyaXRobWV0aWMgYW5kIEpTT04gc3RyaW5naWZpY2F0aW9uLlxuICBfLnByb3RvdHlwZS52YWx1ZU9mID0gXy5wcm90b3R5cGUudG9KU09OID0gXy5wcm90b3R5cGUudmFsdWU7XG5cbiAgXy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJycgKyB0aGlzLl93cmFwcGVkO1xuICB9O1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufS5jYWxsKHRoaXMpKTtcbiIsInZhciBzZXR0aW5ncyA9IHJlcXVpcmUoXCIuLi9zZXR0aW5nc1wiKTtcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XG52YXIgY29sbGlzaW9uQ29udHJvbGxlciA9IHJlcXVpcmUoXCIuLi9jb250cm9sbGVycy9Db2xsaXNpb25Db250cm9sbGVyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGFya2luZ1NwYWNlczogW10sXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICBfLmJpbmRBbGwodGhpcyxcbiAgICAgIFwic3RhdGVMb29rRm9yU3BhY2VcIixcbiAgICAgIFwic3RhdGVEcml2ZVRvQ29sdW1uXCIsXG4gICAgICBcInN0YXRlVHVyblJpZ2h0XCIsXG4gICAgICBcInN0YXRlVHVybkxlZnRcIixcbiAgICAgIFwic3RhdGVEcml2ZVRvU3BhY2VcIixcbiAgICAgIFwic3RhdGVFbnRlclBhcmtpbmdTcGFjZUxlZnRcIixcbiAgICAgIFwic3RhdGVFbnRlclBhcmtpbmdTcGFjZVJpZ2h0XCIsXG4gICAgICBcInN0YXRlQmFja2luZ091dFJpZ2h0XCIsXG4gICAgICBcInN0YXRlQmFja2luZ091dExlZnRcIixcbiAgICAgIFwic3RhdGVEcml2ZVVwVG9TdG9wU2lnblwiLFxuICAgICAgXCJzdGF0ZVdhaXRBdFN0b3BTaWduXCIsXG4gICAgICBcInN0YXRlRHJpdmVVcFRvVHVybkxlZnRcIixcbiAgICAgIFwic3RhdGVEcml2ZU91dE9mU2NyZWVuXCIsXG4gICAgICBcInN0YXJ0TGVhdmluZ1wiXG4gICAgKTtcbiAgICB0aGlzLnBhcmtpbmdTcGFjZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpQ29sdW1uID0gMDsgaUNvbHVtbiA8IHNldHRpbmdzLmNvbHVtbnM7IGlDb2x1bW4rKykge1xuICAgICAgZm9yICh2YXIgaVJvdyA9IDA7IGlSb3cgPCBzZXR0aW5ncy5yb3dzOyBpUm93KyspIHtcbiAgICAgICAgaWYgKCEoaUNvbHVtbiA9PT0gMSAmJiBpUm93ID09PSAyKSAmJlxuICAgICAgICAgICAhKGlDb2x1bW4gPT09IDIgJiYgaVJvdyA9PT0gMikpIHtcbiAgICAgICAgICB0aGlzLnBhcmtpbmdTcGFjZXMucHVzaCh7XG4gICAgICAgICAgICByb3c6IGlSb3csXG4gICAgICAgICAgICBjb2x1bW46IGlDb2x1bW4sXG4gICAgICAgICAgICBhdmFpbGFibGU6IHRydWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgfSxcbiAgdXBkYXRlQ2FyOiBmdW5jdGlvbiAoY2FyKSB7XG4gICAgY2FyLnN0YXRlVXBkYXRlKGNhcik7XG5cbiAgfSxcbiAgc3RhdGVMb29rRm9yU3BhY2U6IGZ1bmN0aW9uIChjYXIpIHtcbiAgICB2YXIgc3BhY2UgPSB0aGlzLmZpbmRQYXJraW5nU3BhY2UoKTtcbiAgICBjYXIuc3BhY2VUYXJnZXQgPSBzcGFjZTtcbiAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlRHJpdmVUb0NvbHVtbjtcbiAgICBzcGFjZS5hdmFpbGFibGUgPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZUNhcihjYXIpO1xuICB9LFxuICBzdGF0ZURyaXZlVG9Db2x1bW46IGZ1bmN0aW9uIChjYXIpIHtcbiAgICB2YXIgY29sdW1uWCA9IHRoaXMuZ2V0TG90RG93blgoY2FyLnNwYWNlVGFyZ2V0KTtcblxuICAgIGlmIChjYXIucG9zaXRpb24ueCA8IGNvbHVtblggLSBzZXR0aW5ncy50dXJuUmFkaXVzKSB7XG4gICAgICBpZiAoIWNvbGxpc2lvbkNvbnRyb2xsZXIuY2FuTW92ZVJpZ2h0KGNhciwgY2FyLnZlbG9jaXR5KSAmJlxuICAgICAgICBjYXIuc3R1Y2tDb3VudCA8IDEwKSB7XG4gICAgICAgIGNhci5zdHVja0NvdW50Kys7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhci5zdHVja0NvdW50ID0gMDtcbiAgICAgICAgY2FyLnBvc2l0aW9uLnggKz0gY2FyLnZlbG9jaXR5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG5cbiAgICAgIGNhci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVUdXJuUmlnaHQ7XG4gICAgICBjYXIubmV4dFN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZURyaXZlVG9TcGFjZTtcbiAgICAgIGNhci5zdGFydFJvdGF0aW9uID0gY2FyLnJvdGF0aW9uO1xuICAgICAgY2FyLmRlc2lyZWREeCA9IHNldHRpbmdzLnR1cm5SYWRpdXM7XG4gICAgICBjYXIuZGVzaXJlZER5ID0gc2V0dGluZ3MudHVyblJhZGl1cztcbiAgICAgIGNhci5zdGFydFggPSBjYXIucG9zaXRpb24ueDtcbiAgICAgIGNhci5zdGFydFkgPSBjYXIucG9zaXRpb24ueTtcbiAgICAgIGNhci5yb3RhdGlvbkRpcmVjdGlvbiA9IDE7XG4gICAgICBjYXIuZGVzaXJlZFJvdGF0aW9uID0gc2V0dGluZ3MuY2FyRG93blJvdGF0aW9uO1xuICAgIH1cbiAgfSxcbiAgc3RhdGVUdXJuUmlnaHQ6IGZ1bmN0aW9uIChjYXIpIHtcbiAgICBpZiAoTWF0aC5hYnMoY2FyLnJvdGF0aW9uIC0gY2FyLmRlc2lyZWRSb3RhdGlvbikgPiAuMSkge1xuICAgICAgY2FyLnJvdGF0aW9uICs9IHNldHRpbmdzLmNhclJvdGF0aW9uVmVsb2NpdHkgKiBjYXIucm90YXRpb25EaXJlY3Rpb247XG4gICAgICB2YXIgcm90UGVyY2VudCA9IDEgLSAoY2FyLmRlc2lyZWRSb3RhdGlvbiAtIGNhci5yb3RhdGlvbikgL1xuICAgICAgKGNhci5kZXNpcmVkUm90YXRpb24gLSBjYXIuc3RhcnRSb3RhdGlvbik7XG4gICAgICBjYXIucG9zaXRpb24ueCA9IGNhci5zdGFydFggKyByb3RQZXJjZW50ICogY2FyLmRlc2lyZWREeDtcbiAgICAgIGNhci5wb3NpdGlvbi55ID0gY2FyLnN0YXJ0WSArIHJvdFBlcmNlbnQgKiBjYXIuZGVzaXJlZER5O1xuICAgIH0gZWxzZSB7XG4gICAgICBjYXIucm90YXRpb24gPSBjYXIuZGVzaXJlZFJvdGF0aW9uO1xuICAgICAgY2FyLnN0YXRlVXBkYXRlID0gY2FyLm5leHRTdGF0ZVVwZGF0ZTtcbiAgICB9XG4gIH0sXG4gIHN0YXRlVHVybkxlZnQ6IGZ1bmN0aW9uIChjYXIpIHtcbiAgICBpZiAoTWF0aC5hYnMoY2FyLnJvdGF0aW9uIC0gY2FyLmRlc2lyZWRSb3RhdGlvbikgPiAuMSkge1xuICAgICAgY2FyLnJvdGF0aW9uICs9IHNldHRpbmdzLmNhclJvdGF0aW9uVmVsb2NpdHkgKiBjYXIucm90YXRpb25EaXJlY3Rpb247XG4gICAgICB2YXIgcm90UGVyY2VudCA9IDEgLSAoY2FyLmRlc2lyZWRSb3RhdGlvbiAtIGNhci5yb3RhdGlvbikgL1xuICAgICAgKGNhci5kZXNpcmVkUm90YXRpb24gLSBjYXIuc3RhcnRSb3RhdGlvbik7XG4gICAgICBjYXIucG9zaXRpb24ueCA9IGNhci5zdGFydFggKyByb3RQZXJjZW50ICogY2FyLmRlc2lyZWREeDtcbiAgICAgIGNhci5wb3NpdGlvbi55ID0gY2FyLnN0YXJ0WSArIHJvdFBlcmNlbnQgKiBjYXIuZGVzaXJlZER5O1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGNhci5yb3RhdGlvbiA9IGNhci5kZXNpcmVkUm90YXRpb247XG4gICAgICBjYXIuc3RhdGVVcGRhdGUgPSBjYXIubmV4dFN0YXRlVXBkYXRlO1xuICAgIH1cbiAgfSxcbiAgc3RhdGVEcml2ZVRvU3BhY2U6IGZ1bmN0aW9uIChjYXIpIHtcbiAgICB2YXIgc3BhY2VZID0gdGhpcy5nZXRTcGFjZVkoY2FyLnNwYWNlVGFyZ2V0KTtcbiAgICBpZiAoY2FyLnBvc2l0aW9uLnkgPCBzcGFjZVkgLSBzZXR0aW5ncy50dXJuUmFkaXVzKSB7XG4gICAgICBpZiAoIWNvbGxpc2lvbkNvbnRyb2xsZXIuY2FuTW92ZURvd24oY2FyLCBjYXIudmVsb2NpdHkpXG4gICAgICAgJiYgY2FyLnN0dWNrQ291bnQgPCAxMCkge1xuICAgICAgICBjYXIuc3R1Y2tDb3VudCsrO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXIuc3R1Y2tDb3VudCA9IDA7XG4gICAgICAgIGNhci5wb3NpdGlvbi55ICs9IGNhci52ZWxvY2l0eTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG5cbiAgICAgIGNhci5zdGFydFJvdGF0aW9uID0gY2FyLnJvdGF0aW9uO1xuICAgICAgY2FyLnN0YXJ0WCA9IGNhci5wb3NpdGlvbi54O1xuICAgICAgY2FyLnN0YXJ0WSA9IGNhci5wb3NpdGlvbi55O1xuICAgICAgaWYgKGNhci5zcGFjZVRhcmdldC5jb2x1bW4gJSAyID09PSAwKSB7XG4gICAgICAgIGNhci5kZXNpcmVkUm90YXRpb24gPSBzZXR0aW5ncy5jYXJSaWdodFJvdGF0aW9uO1xuICAgICAgICBjYXIuZGVzaXJlZER4ID0gLXNldHRpbmdzLnR1cm5SYWRpdXM7XG4gICAgICAgIGNhci5kZXNpcmVkRHkgPSBzZXR0aW5ncy50dXJuUmFkaXVzO1xuICAgICAgICBjYXIucm90YXRpb25EaXJlY3Rpb24gPSAxO1xuICAgICAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlVHVyblJpZ2h0O1xuICAgICAgICBjYXIubmV4dFN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZUVudGVyUGFya2luZ1NwYWNlUmlnaHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXIuZGVzaXJlZER4ID0gc2V0dGluZ3MudHVyblJhZGl1cztcbiAgICAgICAgY2FyLmRlc2lyZWREeSA9IHNldHRpbmdzLnR1cm5SYWRpdXM7XG4gICAgICAgIGNhci5kZXNpcmVkUm90YXRpb24gPSBzZXR0aW5ncy5jYXJMZWZ0Um90YXRpb247XG4gICAgICAgIGNhci5yb3RhdGlvbkRpcmVjdGlvbiA9IC0xO1xuICAgICAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlVHVybkxlZnQ7XG4gICAgICAgIGNhci5uZXh0U3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlRW50ZXJQYXJraW5nU3BhY2VMZWZ0O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgc3RhdGVFbnRlclBhcmtpbmdTcGFjZUxlZnQ6IGZ1bmN0aW9uIChjYXIpIHtcbiAgICB2YXIgdGFyZ2V0WCA9IHRoaXMuZ2V0U3BhY2VYKGNhci5zcGFjZVRhcmdldCk7XG4gICAgaWYgKGNhci5wb3NpdGlvbi54IDwgdGFyZ2V0WCkge1xuICAgICAgY2FyLnBvc2l0aW9uLnggKz0gY2FyLnZlbG9jaXR5O1xuICAgIH0gZWxzZSB7XG4gICAgICBjYXIuaXNQYXJrZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5sb2coXCJjYXIgcGFya2VkXCIsIGNhci5zcGFjZVRhcmdldCk7XG5cbiAgICB9XG4gIH0sXG4gIHN0YXRlRW50ZXJQYXJraW5nU3BhY2VSaWdodDogZnVuY3Rpb24gKGNhcikge1xuICAgIHZhciB0YXJnZXRYID0gdGhpcy5nZXRTcGFjZVgoY2FyLnNwYWNlVGFyZ2V0KTtcbiAgICBpZiAoY2FyLnBvc2l0aW9uLnggPiB0YXJnZXRYKSB7XG4gICAgICBjYXIucG9zaXRpb24ueCAtPSBjYXIudmVsb2NpdHk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhci5pc1BhcmtlZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmxvZyhcImNhciBwYXJrZWRcIiwgY2FyLnNwYWNlVGFyZ2V0KTtcblxuICAgIH1cbiAgfSxcbiAgc3RhcnRMZWF2aW5nOiBmdW5jdGlvbiAoY2FyKSB7XG4gICAgaWYgKGNhci5zcGFjZVRhcmdldC5jb2x1bW4gJSAyID09PSAwKSB7XG4gICAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlQmFja2luZ091dExlZnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVCYWNraW5nT3V0UmlnaHQ7XG4gICAgfVxuICAgIGNhci5pc1BhcmtlZCA9IGZhbHNlO1xuICB9LFxuICBzdGF0ZUJhY2tpbmdPdXRSaWdodDogZnVuY3Rpb24gKGNhcikge1xuICAgIHZhciB0YXJnZXRYID0gdGhpcy5nZXRMb3RVcFgoY2FyLnNwYWNlVGFyZ2V0KTtcbiAgICBpZiAoY2FyLnBvc2l0aW9uLnggPiB0YXJnZXRYICsgc2V0dGluZ3MudHVyblJhZGl1cykge1xuICAgICAgY2FyLnBvc2l0aW9uLnggLT0gY2FyLnZlbG9jaXR5O1xuICAgIH0gZWxzZSB7XG4gICAgICBjYXIuc3BhY2VUYXJnZXQuYXZhaWxhYmxlID0gdHJ1ZTtcbiAgICAgIGNhci5zdGFydFJvdGF0aW9uID0gY2FyLnJvdGF0aW9uO1xuICAgICAgY2FyLnN0YXJ0WCA9IGNhci5wb3NpdGlvbi54O1xuICAgICAgY2FyLnN0YXJ0WSA9IGNhci5wb3NpdGlvbi55O1xuICAgICAgY2FyLmRlc2lyZWREeCA9IC1zZXR0aW5ncy50dXJuUmFkaXVzO1xuICAgICAgY2FyLmRlc2lyZWREeSA9IHNldHRpbmdzLnR1cm5SYWRpdXM7XG4gICAgICBjYXIuZGVzaXJlZFJvdGF0aW9uID0gc2V0dGluZ3MuY2FyVXBSb3RhdGlvbk5lZztcbiAgICAgIGNhci5yb3RhdGlvbkRpcmVjdGlvbiA9IC0xO1xuICAgICAgY2FyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZVR1cm5MZWZ0O1xuICAgICAgY2FyLm5leHRTdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVEcml2ZVVwVG9TdG9wU2lnbjtcbiAgICB9XG4gIH0sXG4gIHN0YXRlQmFja2luZ091dExlZnQ6IGZ1bmN0aW9uIChjYXIpIHtcbiAgICB2YXIgdGFyZ2V0WCA9IHRoaXMuZ2V0TG90VXBYKGNhci5zcGFjZVRhcmdldCk7XG4gICAgaWYgKGNhci5wb3NpdGlvbi54IDwgdGFyZ2V0WCAtIHNldHRpbmdzLnR1cm5SYWRpdXMpIHtcbiAgICAgIGNhci5wb3NpdGlvbi54ICs9IGNhci52ZWxvY2l0eTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FyLnNwYWNlVGFyZ2V0LmF2YWlsYWJsZSA9IHRydWU7XG4gICAgICBjYXIuc3RhcnRSb3RhdGlvbiA9IGNhci5yb3RhdGlvbjtcbiAgICAgIGNhci5zdGFydFggPSBjYXIucG9zaXRpb24ueDtcbiAgICAgIGNhci5zdGFydFkgPSBjYXIucG9zaXRpb24ueTtcbiAgICAgIGNhci5kZXNpcmVkRHggPSBzZXR0aW5ncy50dXJuUmFkaXVzO1xuICAgICAgY2FyLmRlc2lyZWREeSA9IHNldHRpbmdzLnR1cm5SYWRpdXM7XG4gICAgICBjYXIuZGVzaXJlZFJvdGF0aW9uID0gc2V0dGluZ3MuY2FyVXBSb3RhdGlvbjtcbiAgICAgIGNhci5yb3RhdGlvbkRpcmVjdGlvbiA9IDE7XG4gICAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlVHVyblJpZ2h0O1xuICAgICAgY2FyLm5leHRTdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVEcml2ZVVwVG9TdG9wU2lnbjtcbiAgICB9XG4gIH0sXG4gIHN0YXRlRHJpdmVVcFRvU3RvcFNpZ246IGZ1bmN0aW9uIChjYXIpIHtcbiAgICB2YXIgdGFyZ2V0WSA9IHNldHRpbmdzLnN0b3BTaWduWTtcbiAgICBpZiAoY2FyLnBvc2l0aW9uLnkgPiB0YXJnZXRZKSB7XG4gICAgICBpZiAoIWNvbGxpc2lvbkNvbnRyb2xsZXIuY2FuTW92ZVVwKGNhciwgLWNhci52ZWxvY2l0eSlcbiAgICAgICAmJiBjYXIuc3R1Y2tDb3VudCA8IDEwKSB7XG4gICAgICAgICAgY2FyLnN0dWNrQ291bnQrKztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FyLnN0dWNrQ291bnQgPSAwO1xuICAgICAgICBjYXIucG9zaXRpb24ueSAtPSBjYXIudmVsb2NpdHk7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgY2FyLnN0b3BUaW1lID0gKCsgbmV3IERhdGUpICsgMjAwMCAqIE1hdGgucmFuZG9tKCk7XG4gICAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlV2FpdEF0U3RvcFNpZ247XG4gICAgfVxuICB9LFxuICBzdGF0ZURyaXZlVXBUb1R1cm5MZWZ0OiBmdW5jdGlvbiAoY2FyKSB7XG4gICAgdmFyIHRhcmdldFkgPSBzZXR0aW5ncy5yb2FkTGVmdFk7XG4gICAgaWYgKGNhci5wb3NpdGlvbi55ID4gdGFyZ2V0WSArIHNldHRpbmdzLnR1cm5SYWRpdXMpIHtcbiAgICAgIGlmICghY29sbGlzaW9uQ29udHJvbGxlci5jYW5Nb3ZlVXAoY2FyLCAtY2FyLnZlbG9jaXR5KVxuICAgICAgICYmIGNhci5zdHVja0NvdW50IDwgMTApIHtcbiAgICAgICAgICBjYXIuc3R1Y2tDb3VudCsrO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXIuc3R1Y2tDb3VudCA9IDA7XG4gICAgICAgIGNhci5wb3NpdGlvbi55IC09IGNhci52ZWxvY2l0eTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY2FyLnN0YXJ0Um90YXRpb24gPSBjYXIucm90YXRpb247XG4gICAgICBjYXIuc3RhcnRYID0gY2FyLnBvc2l0aW9uLng7XG4gICAgICBjYXIuc3RhcnRZID0gY2FyLnBvc2l0aW9uLnk7XG4gICAgICBjYXIuZGVzaXJlZER4ID0gLXNldHRpbmdzLnR1cm5SYWRpdXMgKiAyO1xuICAgICAgY2FyLmRlc2lyZWREeSA9IHNldHRpbmdzLnJvYWRMZWZ0WSAtIGNhci5zdGFydFk7XG4gICAgICBjYXIuZGVzaXJlZFJvdGF0aW9uID0gc2V0dGluZ3MuY2FyUmlnaHRSb3RhdGlvbk5lZztcbiAgICAgIGNhci5yb3RhdGlvbkRpcmVjdGlvbiA9IC0xO1xuICAgICAgY2FyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZVR1cm5SaWdodDtcbiAgICAgIGNhci5uZXh0U3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlRHJpdmVPdXRPZlNjcmVlbjtcbiAgICB9XG4gIH0sXG4gIHN0YXRlV2FpdEF0U3RvcFNpZ246IGZ1bmN0aW9uIChjYXIpIHtcbiAgICBpZiAoY2FyLnN0b3BUaW1lIDwgKCsgbmV3IERhdGUpKSB7XG4gICAgICBjYXIucm90YXRpb24gPSBzZXR0aW5ncy5jYXJVcFJvdGF0aW9uTmVnO1xuICAgICAgY2FyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZURyaXZlVXBUb1R1cm5MZWZ0O1xuICAgIH1cbiAgfSxcbiAgc3RhdGVEcml2ZU91dE9mU2NyZWVuOiBmdW5jdGlvbiAoY2FyKSB7XG4gICAgdmFyIGNvbHVtblggPSAtMTAwO1xuXG4gICAgaWYgKGNhci5wb3NpdGlvbi54ID4gY29sdW1uWCApIHtcbiAgICAgIGlmICghY29sbGlzaW9uQ29udHJvbGxlci5jYW5Nb3ZlTGVmdChjYXIsIGNhci52ZWxvY2l0eSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FyLnBvc2l0aW9uLnggLT0gY2FyLnZlbG9jaXR5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjYXIucmVhZHlUb0JlRGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG4gIGFkZENhcjogZnVuY3Rpb24gKGdyb3VwKSB7XG4gICAgdmFyIGNhciA9IGdyb3VwLmNyZWF0ZSgwLDAsIFwic3ByaXRlc1wiKTtcbiAgICBjYXIuZnJhbWVOYW1lPSBcImNhclwiICsgKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpICsgMSk7XG4gICAgY2FyLmFuY2hvci54ID0gMC41O1xuICAgIGNhci5hbmNob3IueSA9IDAuNTtcbiAgICBjYXIuaXNQYXJrZWQgPSBmYWxzZTtcbiAgICBjYXIuc3R1Y2tDb3VudCA9IDA7XG4gICAgY2FyLnZlbG9jaXR5ID0gc2V0dGluZ3MuY2FyVmVsb2NpdHkgKyBNYXRoLnJhbmRvbSgpICogc2V0dGluZ3MuY2FyUmFuZG9tVmVsb2NpdHlDaGFuZ2U7XG4gICAgY2FyLm9iamVjdFR5cGUgPSBcImNhclwiXG4gICAgY2FyLmdldEJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogdGhpcy50b3AgKyBzZXR0aW5ncy5jYXJTcGFjZSoyLFxuICAgICAgICBib3R0b206IHRoaXMuYm90dG9tIC0gc2V0dGluZ3MuY2FyU3BhY2UqMixcbiAgICAgICAgbGVmdDogdGhpcy5sZWZ0ICsgc2V0dGluZ3MuY2FyU3BhY2UsXG4gICAgICAgIHJpZ2h0OiB0aGlzLnJpZ2h0IC0gc2V0dGluZ3MuY2FyU3BhY2UsXG4gICAgICB9O1xuICAgIH07XG5cbiAgICBjYXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlTG9va0ZvclNwYWNlO1xuICAgIHJldHVybiBjYXI7XG4gIH0sXG4gIHBsYWNlQXRFbnRyYW5jZTogZnVuY3Rpb24gKGNhcikge1xuICAgIGNhci5wb3NpdGlvbi55ID0gc2V0dGluZ3Mucm9hZFJpZ2h0WTtcbiAgICBjYXIucG9zaXRpb24ueCA9IC1jYXIud2lkdGg7XG4gIH0sXG4gIG1vdmVDYXJUb1JhbmRvbVNwYWNlOiBmdW5jdGlvbiAoY2FyKSB7XG4gICAgY2FyLnBvc2l0aW9uLnggPSBzZXR0aW5ncy5zcGFjZXNYW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSogc2V0dGluZ3MuY29sdW1ucyldO1xuICAgIGNhci5wb3NpdGlvbi55ID0gc2V0dGluZ3Muc3BhY2VzMVkgK1xuICAgICAgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogc2V0dGluZ3Mucm93cykgKiBzZXR0aW5ncy5zcGFjZU9mZnNldCA7XG4gIH0sXG4gIG1vdmVDYXJUb1NwYWNlOiBmdW5jdGlvbiAoY2FyLCBzcGFjZSkge1xuXG4gICAgY2FyLnBvc2l0aW9uLnggPSBzZXR0aW5ncy5zcGFjZXNYW3NwYWNlLmNvbHVtbl07XG4gICAgY2FyLnBvc2l0aW9uLnkgPSBzZXR0aW5ncy5zcGFjZXMxWSArXG4gICAgICBNYXRoLmZsb29yKHNwYWNlLnJvdykgKiBzZXR0aW5ncy5zcGFjZU9mZnNldCA7XG4gICAgY2FyLnJvdGF0aW9uID0gKChzcGFjZS5jb2x1bW4gKyAxKSAlIDIpICogTWF0aC5QSTtcbiAgICBzcGFjZS5hdmFpbGFibGUgPSBmYWxzZTtcbiAgfSxcbiAgcGFya0NhckluT3BlblNwYWNlOiBmdW5jdGlvbiAoY2FyKSB7XG4gICAgdmFyIHNwYWNlID0gdGhpcy5maW5kUGFya2luZ1NwYWNlKCk7XG4gICAgY2FyLmlzUGFya2VkID0gdHJ1ZTtcbiAgICB0aGlzLm1vdmVDYXJUb1NwYWNlKGNhciwgc3BhY2UpO1xuICAgIGNhci5zcGFjZVRhcmdldCA9IHNwYWNlO1xuICB9LFxuICBnZXRMb3REb3duWDogZnVuY3Rpb24gKHNwYWNlKSB7XG4gICAgaWYgKHNwYWNlLmNvbHVtbiA8IDIpIHtcbiAgICAgIHJldHVybiBzZXR0aW5ncy5sb3QxRG93blg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzZXR0aW5ncy5sb3QyRG93blg7XG4gICAgfVxuICB9LFxuICBnZXRMb3RVcFg6IGZ1bmN0aW9uIChzcGFjZSkge1xuICAgIGlmIChzcGFjZS5jb2x1bW4gPCAyKSB7XG4gICAgICByZXR1cm4gc2V0dGluZ3MubG90MVVwWDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNldHRpbmdzLmxvdDJVcFg7XG4gICAgfVxuICB9LFxuICBnZXRTcGFjZVk6IGZ1bmN0aW9uIChzcGFjZSkge1xuICAgIHJldHVybiBzZXR0aW5ncy5zcGFjZXMxWSArIHNwYWNlLnJvdyAqIHNldHRpbmdzLnNwYWNlT2Zmc2V0XG4gIH0sXG4gIGdldFNwYWNlWDogZnVuY3Rpb24gKHNwYWNlKSB7XG4gICAgcmV0dXJuIHNldHRpbmdzLnNwYWNlc1hbc3BhY2UuY29sdW1uXTtcbiAgfSxcbiAgZmluZFBhcmtpbmdTcGFjZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcGVuaW5ncyA9IHRoaXMuZ2V0T3BlblNwYWNlcygpO1xuICAgIHZhciBldmFsdWF0ZSA9IF8ubWluOyAvL21vc3QgcGVvcGxlIHBhcmsgY2xvc2VzdCB0byBlbnRyYW5jZVxuICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4wNikge1xuICAgICAgIGV2YWx1YXRlID0gXy5tYXg7IC8vc29tZSBwZW9wbGUgcGFyayBmYXIgYXdheVxuICAgIH1cbiAgICByZXR1cm4gZXZhbHVhdGUob3BlbmluZ3MsIGZ1bmN0aW9uIChzcGFjZSkge1xuICAgICAgcmV0dXJuIHNwYWNlLnJvd1xuICAgICAgICAgICsgTWF0aC5hYnMoc3BhY2UuY29sdW1uIC0gMSkgKyBNYXRoLnJhbmRvbSgpICogMTAgOyAvL2FkZCBzb21lIHVuY2VydGFpbnR5IGFib3V0IHdoZXJlIHRvIHBhcmtcblxuICAgIH0pO1xuICB9LFxuICBnZXRPcGVuU3BhY2VzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKHRoaXMucGFya2luZ1NwYWNlcywge2F2YWlsYWJsZTogdHJ1ZX0pXG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgb2JqZWN0czogW10sXG4gIGFkZDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHRoaXMub2JqZWN0cy5wdXNoKG9iamVjdCk7XG4gIH0sXG4gIGNhbk1vdmVSaWdodDogZnVuY3Rpb24gKG9iamVjdCwgeCkge1xuICAgIHZhciBvYmplY3RCb3VuZHMgPSBvYmplY3QuZ2V0Qm91bmRzKCk7XG4gICAgdmFyIHRlc3RCb3VuZHMgPSB7XG4gICAgICB0b3A6IG9iamVjdC50b3AsXG4gICAgICBib3R0b206IG9iamVjdC50b3AgKyAxLFxuICAgICAgbGVmdDogb2JqZWN0Qm91bmRzLmxlZnQgKyB4LFxuICAgICAgcmlnaHQ6IG9iamVjdEJvdW5kcy5yaWdodCArIHhcblxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMub2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRlc3RPYmplY3QgPSB0aGlzLm9iamVjdHNbaV07XG4gICAgICB2YXIgdGVzdE9iamVjdEJvdW5kcyA9IHRlc3RPYmplY3QuZ2V0Qm91bmRzKCk7XG4gICAgICBpZiAob2JqZWN0ICE9PSB0ZXN0T2JqZWN0ICYmIHRlc3RPYmplY3QudmlzaWJsZSAmJlxuICAgICAgICB0aGlzLmludGVyc2VjdCh0ZXN0Qm91bmRzLCB0ZXN0T2JqZWN0Qm91bmRzKSkge1xuXG4gICAgICAgICAgaWYgKG9iamVjdC5vYmplY3RUeXBlID09PSBcImNhclwiXG4gICAgICAgICAgJiYgdGVzdEJvdW5kcy5yaWdodCA8IHRlc3RPYmplY3RCb3VuZHMucmlnaHQpIHtcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgY2FuTW92ZUxlZnQ6IGZ1bmN0aW9uIChvYmplY3QsIHgpIHtcblxuICAgIHZhciBvYmplY3RCb3VuZHMgPSBvYmplY3QuZ2V0Qm91bmRzKCk7XG4gICAgdmFyIHRlc3RCb3VuZHMgPSB7XG4gICAgICB0b3A6IG9iamVjdC50b3AsXG4gICAgICBib3R0b206IG9iamVjdC50b3AgKyAxLFxuICAgICAgbGVmdDogb2JqZWN0Qm91bmRzLmxlZnQgLSB4LFxuICAgICAgcmlnaHQ6IG9iamVjdEJvdW5kcy5yaWdodCAtIHhcblxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMub2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRlc3RPYmplY3QgPSB0aGlzLm9iamVjdHNbaV07XG4gICAgICB2YXIgdGVzdE9iamVjdEJvdW5kcyA9IHRlc3RPYmplY3QuZ2V0Qm91bmRzKCk7XG4gICAgICBpZiAob2JqZWN0ICE9PSB0ZXN0T2JqZWN0ICYmIHRlc3RPYmplY3QudmlzaWJsZSAmJlxuICAgICAgICB0aGlzLmludGVyc2VjdCh0ZXN0Qm91bmRzLCB0ZXN0T2JqZWN0Qm91bmRzKSkge1xuXG4gICAgICAgICAgaWYgKG9iamVjdC5vYmplY3RUeXBlID09PSBcImNhclwiXG4gICAgICAgICAgJiYgdGVzdEJvdW5kcy5sZWZ0ID4gdGVzdE9iamVjdEJvdW5kcy5sZWZ0KSB7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGNhbk1vdmVEb3duOiBmdW5jdGlvbiAob2JqZWN0LCB5KSB7XG4gICAgdmFyIG9iamVjdEJvdW5kcyA9IG9iamVjdC5nZXRCb3VuZHMoKTtcbiAgICB2YXIgdGVzdEJvdW5kcyA9IHtcbiAgICAgIHRvcDogb2JqZWN0Qm91bmRzLnRvcCArIHksXG4gICAgICBib3R0b206IG9iamVjdEJvdW5kcy5ib3R0b20gKyB5LFxuICAgICAgbGVmdDogb2JqZWN0LmxlZnQsXG4gICAgICByaWdodDogb2JqZWN0LmxlZnRcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0ZXN0T2JqZWN0ID0gdGhpcy5vYmplY3RzW2ldO1xuICAgICAgdmFyIHRlc3RPYmplY3RCb3VuZHMgPSB0ZXN0T2JqZWN0LmdldEJvdW5kcygpO1xuICAgICAgaWYgKG9iamVjdCAhPT0gdGVzdE9iamVjdCAmJiB0ZXN0T2JqZWN0LnZpc2libGUgJiZcbiAgICAgICAgdGhpcy5pbnRlcnNlY3QodGVzdEJvdW5kcywgdGVzdE9iamVjdEJvdW5kcykpIHtcbiAgICAgICAgICBpZiAob2JqZWN0Lm9iamVjdFR5cGUgPT09IFwiY2FyXCJcbiAgICAgICAgICAmJiB0ZXN0Qm91bmRzLmJvdHRvbSA8IHRlc3RPYmplY3RCb3VuZHMuYm90dG9tKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGNhbk1vdmVVcDogZnVuY3Rpb24gKG9iamVjdCwgeSkge1xuXG4gICAgdmFyIG9iamVjdEJvdW5kcyA9IG9iamVjdC5nZXRCb3VuZHMoKTtcbiAgICB2YXIgdGVzdEJvdW5kcyA9IHtcbiAgICAgIHRvcDogb2JqZWN0Qm91bmRzLnRvcCArIHksXG4gICAgICBib3R0b206IG9iamVjdEJvdW5kcy5ib3R0b20gKyB5LFxuICAgICAgbGVmdDogb2JqZWN0LnJpZ2h0ICxcbiAgICAgIHJpZ2h0OiBvYmplY3QucmlnaHRcblxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMub2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRlc3RPYmplY3QgPSB0aGlzLm9iamVjdHNbaV07XG4gICAgICB2YXIgdGVzdE9iamVjdEJvdW5kcyA9IHRlc3RPYmplY3QuZ2V0Qm91bmRzKCk7XG4gICAgICBpZiAob2JqZWN0ICE9PSB0ZXN0T2JqZWN0ICYmIHRlc3RPYmplY3QudmlzaWJsZSAmJlxuICAgICAgICB0aGlzLmludGVyc2VjdCh0ZXN0Qm91bmRzLCB0ZXN0T2JqZWN0Qm91bmRzKSkge1xuICAgICAgICAgIGlmIChvYmplY3Qub2JqZWN0VHlwZSA9PT0gXCJjYXJcIlxuICAgICAgICAgICYmIHRlc3RCb3VuZHMudG9wID4gdGVzdE9iamVjdEJvdW5kcy50b3ApIHtcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgaW50ZXJzZWN0OiBmdW5jdGlvbiAocjEsIHIyKSB7XG4gICAgcmV0dXJuICEocjIubGVmdCA+IHIxLnJpZ2h0IHx8XG4gICAgICAgICAgICAgcjIucmlnaHQgPCByMS5sZWZ0IHx8XG4gICAgICAgICAgICAgcjIudG9wID4gcjEuYm90dG9tIHx8XG4gICAgICAgICAgICAgcjIuYm90dG9tIDwgcjEudG9wKTtcbiAgfVxufVxuIiwidmFyIHNldHRpbmdzID0gcmVxdWlyZShcIi4uL3NldHRpbmdzXCIpO1xudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcbnZhciBjb2xsaXNpb25Db250cm9sbGVyID0gcmVxdWlyZShcIi4uL2NvbnRyb2xsZXJzL0NvbGxpc2lvbkNvbnRyb2xsZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtb25zdGVyVHlwZXM6IFtcbiAgICBcInN0YXRlTGVhdmVCZWhpbmROZXh0Q2FyXCIsXG4gICAgXCJzdGF0ZVB1c2hCZXR3ZWVuQ2FyXCJcbiAgXSxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIF8uYmluZEFsbCh0aGlzLFxuICAgICAgXCJzdGF0ZUdldE91dE9mQ2FyXCIsXG4gICAgICBcInN0YXRlRW50ZXJlZFN0b3JlXCIsXG4gICAgICBcInN0YXRlV2Fsa1RvQ29sdW1uXCIsXG4gICAgICBcInN0YXRlV2Fsa1RvQ29sdW1uVG9wXCIsXG4gICAgICBcInN0YXRlV2Fsa1RvQ3Jvc3NXYWxrXCIsXG4gICAgICBcInN0YXRlV2Fsa0ludG9TdG9yZVwiLFxuICAgICAgXCJzdGF0ZUZpbmlzaFNob3BwaW5nXCIsXG4gICAgICBcInN0YXRlV2Fsa0Rvd25Dcm9zc3dhbGtcIixcbiAgICAgIFwic3RhdGVXYWxrQmFja1RvQ29sdW1uXCIsXG4gICAgICBcInN0YXRlV2Fsa0Rvd25Ub0NhclwiLFxuICAgICAgXCJzdGF0ZVVubG9hZEdyb2Nlcmllc1wiLFxuICAgICAgXCJzdGF0ZVJldHVybkNhcnRcIixcbiAgICAgIFwic3RhdGVSZXR1cm5DYXJ0Q29sdW1uXCIsXG4gICAgICBcInN0YXRlUmV0dXJuQ2FydFJvd1wiLFxuICAgICAgXCJzdGF0ZVJldHVybkNhcnRJbnRvUmV0dXJuQXJlYVwiLFxuICAgICAgXCJzdGF0ZUxlYXZpbmdSZXR1cm5Ub0NhcllcIixcbiAgICAgIFwic3RhdGVMZWF2aW5nV2Fsa1RvQ2FyRG9vclwiLFxuICAgICAgXCJzdGF0ZUxlYXZlQmVoaW5kTmV4dENhclwiLFxuICAgICAgXCJzdGF0ZVB1c2hCZXR3ZWVuQ2FyXCIsXG4gICAgICBcInN0YXRlUHVzaFRvd2FyZHNDYXJ0UmV0dXJuXCIsXG4gICAgICBcInN0YXRlUmFuZG9tbHlQdXNoXCJcbiAgICApO1xuICB9LFxuICBzdGF0ZUdldE91dE9mQ2FyOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuXG4gICAgc2hvcHBlci5wZXJzb24udmlzaWJsZSA9IHRydWU7XG4gICAgaWYgKHNob3BwZXIuY2FyLnNwYWNlVGFyZ2V0LmNvbHVtbiAlIDIgPT09IDApIHtcbiAgICAgIHNob3BwZXIucGVyc29uLnggPSBzaG9wcGVyLmNhci54IDtcbiAgICAgIHNob3BwZXIucGVyc29uLnkgPSBzaG9wcGVyLmNhci55ICsgMzA7XG4gICAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHNldHRpbmdzLnBlcnNvbkRvd25cbiAgICAgIHNob3BwZXIubmV4dFRhcmdldFggPSBzaG9wcGVyLmNhci54ICsgNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3BwZXIucGVyc29uLnggPSBzaG9wcGVyLmNhci54IDtcbiAgICAgIHNob3BwZXIucGVyc29uLnkgPSBzaG9wcGVyLmNhci55IC0gMzA7XG4gICAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHNldHRpbmdzLnBlcnNvblVwXG4gICAgICBzaG9wcGVyLm5leHRUYXJnZXRYID0gc2hvcHBlci5jYXIueCAtIDYwO1xuICAgIH1cbiAgICBzaG9wcGVyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZVdhbGtUb0NvbHVtbjtcbiAgfSxcbiAgc3RhdGVFbnRlcmVkU3RvcmU6IGZ1bmN0aW9uIChzaG9wcGVyKSB7XG4gICAgc2hvcHBlci5wZXJzb24udmlzaWJsZSA9IGZhbHNlO1xuICAgIHNob3BwZXIuY2FydC52aXNpYmxlID0gZmFsc2U7XG5cbiAgICBzaG9wcGVyLnNob3BwaW5nVGltZSA9ICgrbmV3IERhdGUpICsgMTAwMDAgKiBNYXRoLnJhbmRvbSgpO1xuICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlRmluaXNoU2hvcHBpbmc7XG4gIH0sXG4gIHN0YXRlRmluaXNoU2hvcHBpbmc6IGZ1bmN0aW9uIChzaG9wcGVyKSB7XG4gICAgaWYgKCgrIG5ldyBEYXRlKSA+IHNob3BwZXIuc2hvcHBpbmdUaW1lKSB7XG4gICAgICBzaG9wcGVyLmNhcnQudmlzaWJsZSA9IHRydWU7XG4gICAgICBzaG9wcGVyLmNhcnQuZnJhbWVOYW1lID1cImNhcnRGdWxsXCI7XG4gICAgICBzaG9wcGVyLnBlcnNvbi52aXNpYmxlID0gdHJ1ZTtcbiAgICAgIHRoaXMubW92ZUNhcnRBbmRQZXJzb24oc2hvcHBlciwgc2hvcHBlci5wZXJzb24ueCwgODAsIHNldHRpbmdzLnBlcnNvbkRvd24pO1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVXYWxrRG93bkNyb3Nzd2FsaztcbiAgICB9XG4gIH0sXG4gIHN0YXRlV2Fsa0Rvd25Dcm9zc3dhbGs6IGZ1bmN0aW9uIChzaG9wcGVyKSB7XG4gICAgdmFyIGR5ID0gc2hvcHBlci5wZXJzb24ueSAtIHNldHRpbmdzLmxvdFRvcDtcbiAgICBpZiAoTWF0aC5hYnMoZHkpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVXYWxrQmFja1RvQ29sdW1uO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc2hvcHBlci5jYXIuc3BhY2VUYXJnZXQuY29sdW1uICUgMiA9PT0gMCkge1xuICAgICAgICBzaG9wcGVyLm5leHRUYXJnZXRYID0gc2hvcHBlci5jYXIueCArIDYwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2hvcHBlci5uZXh0VGFyZ2V0WCA9IHNob3BwZXIuY2FyLnggLSA2MDtcbiAgICAgIH1cbiAgICAgIHRoaXMubW92ZUNhcnRBbmRQZXJzb24oc2hvcHBlciwgc2hvcHBlci5wZXJzb24ueCwgc2hvcHBlci5wZXJzb24ueSArIHNldHRpbmdzLndhbGtTcGVlZCwgc2V0dGluZ3MucGVyc29uRG93bik7XG4gICAgfVxuICB9LFxuICBzdGF0ZVdhbGtCYWNrVG9Db2x1bW46IGZ1bmN0aW9uIChzaG9wcGVyKSB7XG4gICAgdmFyIGR4ID0gc2hvcHBlci5wZXJzb24ueCAtIHNob3BwZXIubmV4dFRhcmdldFg7XG4gICAgaWYgKE1hdGguYWJzKGR4KSA8IHNldHRpbmdzLndhbGtTcGVlZCAqIDIpIHtcbiAgICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlV2Fsa0Rvd25Ub0NhcjtcbiAgICB9IGVsc2UgaWYgKGR4ID4gMCkge1xuICAgICAgdGhpcy5tb3ZlQ2FydEFuZFBlcnNvbihcbiAgICAgICAgc2hvcHBlcixcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueCAtIHNldHRpbmdzLndhbGtTcGVlZCxcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueSxcbiAgICAgICAgc2V0dGluZ3MucGVyc29uTGVmdCk7XG4gICAgfSBlbHNlIGlmIChkeCA8IDApIHtcbiAgICAgIHRoaXMubW92ZUNhcnRBbmRQZXJzb24oXG4gICAgICAgIHNob3BwZXIsXG4gICAgICAgIHNob3BwZXIucGVyc29uLnggKyBzZXR0aW5ncy53YWxrU3BlZWQsXG4gICAgICAgIHNob3BwZXIucGVyc29uLnksXG4gICAgICAgIHNldHRpbmdzLnBlcnNvblJpZ2h0KTtcbiAgICB9XG4gIH0sXG4gIHN0YXRlV2Fsa0Rvd25Ub0NhcjogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICB2YXIgZHkgPSBzaG9wcGVyLnBlcnNvbi55IC0gc2hvcHBlci5jYXIueTtcbiAgICBpZiAoTWF0aC5hYnMoZHkpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci51bmxvYWRDb3VudGVyID0gMDtcbiAgICAgIHNob3BwZXIubWF4VW5sb2FkQ291bnRlciA9IE1hdGgucmFuZG9tKCkgKiAxMDAgKyAxMDA7XG4gICAgICBzaG9wcGVyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZVVubG9hZEdyb2NlcmllcztcbiAgICAgIGlmIChzaG9wcGVyLmNhci54IC0gc2hvcHBlci5wZXJzb24ueCA8IDApIHtcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueCAtPSA1O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueCArPSA1O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1vdmVDYXJ0QW5kUGVyc29uKFxuICAgICAgICBzaG9wcGVyLFxuICAgICAgICBzaG9wcGVyLnBlcnNvbi54LFxuICAgICAgICBzaG9wcGVyLnBlcnNvbi55ICsgc2V0dGluZ3Mud2Fsa1NwZWVkLFxuICAgICAgICBzZXR0aW5ncy5wZXJzb25Eb3duKTtcbiAgICB9XG4gIH0sXG4gIHN0YXRlVW5sb2FkR3JvY2VyaWVzOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgIHNob3BwZXIudW5sb2FkQ291bnRlcisrO1xuICAgIGlmIChzaG9wcGVyLnVubG9hZENvdW50ZXIgPiBzaG9wcGVyLm1heFVubG9hZENvdW50ZXIpIHtcbiAgICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlUmV0dXJuQ2FydDtcbiAgICAgIHNob3BwZXIuY2FydC5mcmFtZU5hbWUgPVwiY2FydFwiO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gc2V0dGluZ3MucGVyc29uUmlnaHQ7XG4gICAgICBpZiAoc2hvcHBlci5jYXIueCAtIHNob3BwZXIucGVyc29uLnggPCAwKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IHNldHRpbmdzLnBlcnNvbkxlZnQ7XG4gICAgICB9XG4gICAgICBpZiAoc2hvcHBlci51bmxvYWRDb3VudGVyICUgMjAgPCAxMCkge1xuICAgICAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IGRpcmVjdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNob3BwZXIucGVyc29uLnJvdGF0aW9uID0gc2V0dGluZ3MucGVyc29uRG93bjtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHN0YXRlUmV0dXJuQ2FydDogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICBpZiAoc2hvcHBlci5wZXJzb24uaXNNb25zdGVyKSB7XG4gICAgICBzaG9wcGVyLnN0YXRlVXBkYXRlID0gdGhpc1tzaG9wcGVyLnBlcnNvbi5tb25zdGVyVHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlUmV0dXJuQ2FydENvbHVtbjtcbiAgICB9XG4gIH0sXG4gIHN0YXRlTGVhdmVCZWhpbmROZXh0Q2FyOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgIGlmIChzaG9wcGVyLm1vbnN0ZXJTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzaG9wcGVyLm1vbnN0ZXJTdGF0ZSA9IHtcbiAgICAgICAgdGFyZ2V0WTogc2hvcHBlci5wZXJzb24ueSAtIDcwXG4gICAgICB9XG4gICAgfVxuICAgIHZhciBkeSA9IHNob3BwZXIucGVyc29uLnkgLSBzaG9wcGVyLm1vbnN0ZXJTdGF0ZS50YXJnZXRZO1xuICAgIGlmIChNYXRoLmFicyhkeSkgPCBzZXR0aW5ncy53YWxrU3BlZWQgKiAyKSB7XG4gICAgICBzaG9wcGVyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZUxlYXZpbmdSZXR1cm5Ub0Nhclk7XG4gICAgICBzaG9wcGVyLmNhcnQucm90YXRpb24gPSBNYXRoLnJhbmRvbSgpICogTWF0aC5QSSoyO1xuICAgICAgc2hvcHBlci5jYXJ0LnkgKz0gTWF0aC5yYW5kb20oKSAqIDEwIC0gTWF0aC5yYW5kb20oKSAqIDU7XG4gICAgICBzaG9wcGVyLmNhcnQueCArPSBNYXRoLnJhbmRvbSgpICogMTAgLSBNYXRoLnJhbmRvbSgpICogNTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tb3ZlQ2FydEFuZFBlcnNvbihcbiAgICAgICAgc2hvcHBlcixcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueCxcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueSAtIHNldHRpbmdzLndhbGtTcGVlZCxcbiAgICAgICAgc2V0dGluZ3MucGVyc29uVXApO1xuICAgIH1cblxuICB9LFxuICBzdGF0ZVB1c2hCZXR3ZWVuQ2FyOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgIGlmIChzaG9wcGVyLm1vbnN0ZXJTdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzaG9wcGVyLm1vbnN0ZXJTdGF0ZSA9IHtcbiAgICAgICAgdGFyZ2V0WTogc2hvcHBlci5jYXIueSAtIDQwLFxuICAgICAgICB0YXJnZXRYOiAoc2hvcHBlci5jYXIuc3BhY2VUYXJnZXQuY29sdW1uICUgMiA9PSAwID9cbiAgICAgICAgICBzaG9wcGVyLmNhci54IC0gNzAgOiBzaG9wcGVyLmNhci54ICsgNzApLFxuXG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGR5ID0gc2hvcHBlci5wZXJzb24ueSAtIHNob3BwZXIubW9uc3RlclN0YXRlLnRhcmdldFk7XG4gICAgdmFyIGR4ID0gc2hvcHBlci5wZXJzb24ueCAtIHNob3BwZXIubW9uc3RlclN0YXRlLnRhcmdldFg7XG4gICAgaWYgKE1hdGguYWJzKGR5KSA8PSBzZXR0aW5ncy53YWxrU3BlZWQgKiAyXG4gICAgICAmJiBNYXRoLmFicyhkeCkgPD0gc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVMZWF2aW5nUmV0dXJuVG9DYXJZO1xuICAgICAgc2hvcHBlci5jYXJ0LnJvdGF0aW9uID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkqMjtcbiAgICAgIHNob3BwZXIuY2FydC55ICs9IE1hdGgucmFuZG9tKCkgKiAxMCAtIE1hdGgucmFuZG9tKCkgKiA1O1xuICAgICAgc2hvcHBlci5jYXJ0LnggKz0gTWF0aC5yYW5kb20oKSAqIDEwIC0gTWF0aC5yYW5kb20oKSAqIDU7XG4gICAgfSBlbHNlIGlmIChNYXRoLmFicyhkeSkgPiBzZXR0aW5ncy53YWxrU3BlZWQgKiAyKSB7XG4gICAgICB0aGlzLm1vdmVDYXJ0QW5kUGVyc29uKFxuICAgICAgICBzaG9wcGVyLFxuICAgICAgICBzaG9wcGVyLnBlcnNvbi54LFxuICAgICAgICBzaG9wcGVyLnBlcnNvbi55IC0gc2V0dGluZ3Mud2Fsa1NwZWVkLFxuICAgICAgICBzZXR0aW5ncy5wZXJzb25VcCk7XG4gICAgfSBlbHNlIGlmIChNYXRoLmFicyhkeCkgPiBzZXR0aW5ncy53YWxrU3BlZWQgKiAyKXtcbiAgICAgIHZhciBkaXJlY3Rpb25YID0gZHggPCAwID8gMSA6IC0xO1xuICAgICAgdmFyIHJvdGF0aW9uPSBkeCA8IDAgPyBzZXR0aW5ncy5wZXJzb25SaWdodCA6IHNldHRpbmdzLnBlcnNvbkxlZnQ7XG4gICAgICB0aGlzLm1vdmVDYXJ0QW5kUGVyc29uKFxuICAgICAgICBzaG9wcGVyLFxuICAgICAgICBzaG9wcGVyLnBlcnNvbi54ICsgc2V0dGluZ3Mud2Fsa1NwZWVkICogZGlyZWN0aW9uWCxcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueSAsXG4gICAgICAgIHJvdGF0aW9uKTtcbiAgICB9XG4gIH0sXG4gIHN0YXRlUHVzaFRvd2FyZHNDYXJ0UmV0dXJuOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuXG4gIH0sXG4gIHN0YXRlUmFuZG9tbHlQdXNoOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgIGlmIChzaG9wcGVyLm1vbnN0ZXJTdGF0ZUluaXRlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgfVxuICB9LFxuICBzdGF0ZVJldHVybkNhcnRDb2x1bW46IGZ1bmN0aW9uIChzaG9wcGVyKSB7XG4gICAgdmFyIHRhcmdldFggPSBzaG9wcGVyLmNhci5zcGFjZVRhcmdldC5jb2x1bW4gPCAyP1xuICAgICAgc2V0dGluZ3MubG90MVVwWCArIDIwOlxuICAgICAgc2V0dGluZ3MubG90MkRvd25YIC0gMjA7XG5cbiAgICB2YXIgZHggPSBzaG9wcGVyLnBlcnNvbi54IC0gdGFyZ2V0WDtcbiAgICBpZiAoTWF0aC5hYnMoZHgpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVSZXR1cm5DYXJ0Um93O1xuICAgICAgc2hvcHBlci5uZXh0VGFyZ2V0WSA9IHNldHRpbmdzLnNwYWNlczFZXG4gICAgICArIHNldHRpbmdzLnNwYWNlT2Zmc2V0ICogMlxuICAgICAgICArIE1hdGgucmFuZG9tKCkgKiAzMFxuICAgICAgICAtIE1hdGgucmFuZG9tKCkgKiAxNTtcbiAgICB9IGVsc2UgaWYgKGR4ID4gMCkge1xuICAgICAgdGhpcy5tb3ZlQ2FydEFuZFBlcnNvbihcbiAgICAgICAgc2hvcHBlcixcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueCAtIHNldHRpbmdzLndhbGtTcGVlZCxcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueSxcbiAgICAgICAgc2V0dGluZ3MucGVyc29uTGVmdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubW92ZUNhcnRBbmRQZXJzb24oXG4gICAgICAgIHNob3BwZXIsXG4gICAgICAgIHNob3BwZXIucGVyc29uLnggKyBzZXR0aW5ncy53YWxrU3BlZWQsXG4gICAgICAgIHNob3BwZXIucGVyc29uLnksXG4gICAgICAgIHNldHRpbmdzLnBlcnNvblJpZ2h0KTtcbiAgICB9XG4gIH0sXG4gIHN0YXRlUmV0dXJuQ2FydFJvdzogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICB2YXIgdGFyZ2V0WSA9IHNob3BwZXIubmV4dFRhcmdldFk7XG5cbiAgICB2YXIgZHkgPSBzaG9wcGVyLnBlcnNvbi55IC0gdGFyZ2V0WTtcbiAgICBpZiAoTWF0aC5hYnMoZHkpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVSZXR1cm5DYXJ0SW50b1JldHVybkFyZWE7XG4gICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgIHRoaXMubW92ZUNhcnRBbmRQZXJzb24oXG4gICAgICAgIHNob3BwZXIsXG4gICAgICAgIHNob3BwZXIucGVyc29uLngsXG4gICAgICAgIHNob3BwZXIucGVyc29uLnkgLSBzZXR0aW5ncy53YWxrU3BlZWQsXG4gICAgICAgIHNldHRpbmdzLnBlcnNvblVwKTtcbiAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgdGhpcy5tb3ZlQ2FydEFuZFBlcnNvbihcbiAgICAgICAgc2hvcHBlcixcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueCxcbiAgICAgICAgc2hvcHBlci5wZXJzb24ueSArIHNldHRpbmdzLndhbGtTcGVlZCxcbiAgICAgICAgc2V0dGluZ3MucGVyc29uRG93bik7XG4gICAgfVxuICB9LFxuICBzdGF0ZVJldHVybkNhcnRJbnRvUmV0dXJuQXJlYTogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICBpZiAoc2hvcHBlci5jYXIuc3BhY2VUYXJnZXQuY29sdW1uIDwgMikge1xuICAgICAgc2hvcHBlci5jYXJ0LnJvdGF0aW9uID0gc2V0dGluZ3MucGVyc29uUmlnaHRcbiAgICAgICsgTWF0aC5yYW5kb20oKSAqIDAuMiAtIE1hdGgucmFuZG9tKCkgKiAwLjE7XG4gICAgICBzaG9wcGVyLmNhcnQueCArPSAoMTAgKyBNYXRoLnJhbmRvbSgpICogMTAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvcHBlci5jYXJ0LnJvdGF0aW9uID0gc2V0dGluZ3MucGVyc29uTGVmdFxuICAgICAgICArIE1hdGgucmFuZG9tKCkgKiAwLjIgLSBNYXRoLnJhbmRvbSgpICogMC4xO1xuICAgICAgc2hvcHBlci5jYXJ0LnggLT0gKDEwICsgTWF0aC5yYW5kb20oKSAqIDEwMCk7XG4gICAgfVxuICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlTGVhdmluZ1JldHVyblRvQ2FyWTtcbiAgfSxcbiAgc3RhdGVMZWF2aW5nUmV0dXJuVG9DYXJZOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgIHZhciB0YXJnZXRZO1xuICAgIGlmIChzaG9wcGVyLmNhci5zcGFjZVRhcmdldC5jb2x1bW4gJSAyID09PSAwKSB7XG4gICAgICB0YXJnZXRZID0gc2hvcHBlci5jYXIueSArIDMwO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRZID0gc2hvcHBlci5jYXIueSAtIDMwO1xuICAgIH1cblxuICAgIHZhciBkeSA9IHNob3BwZXIucGVyc29uLnkgLSB0YXJnZXRZO1xuICAgIGlmIChNYXRoLmFicyhkeSkgPCBzZXR0aW5ncy53YWxrU3BlZWQgKiAyKSB7XG4gICAgICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSB0aGlzLnN0YXRlTGVhdmluZ1dhbGtUb0NhckRvb3I7XG4gICAgfSBlbHNlIGlmIChkeSA8IDApIHtcbiAgICAgIHNob3BwZXIucGVyc29uLnkgKz0gc2V0dGluZ3Mud2Fsa1NwZWVkO1xuICAgICAgc2hvcHBlci5wZXJzb24ucm90YXRpb24gPSBzZXR0aW5ncy5wZXJzb25Eb3duO1xuICAgIH1lbHNlIHtcbiAgICAgIHNob3BwZXIucGVyc29uLnkgLT0gc2V0dGluZ3Mud2Fsa1NwZWVkO1xuICAgICAgc2hvcHBlci5wZXJzb24ucm90YXRpb24gPSBzZXR0aW5ncy5wZXJzb25VcDtcbiAgICB9XG5cbiAgfSxcbiAgc3RhdGVMZWF2aW5nV2Fsa1RvQ2FyRG9vcjogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICB2YXIgZHggPSBzaG9wcGVyLnBlcnNvbi54IC0gc2hvcHBlci5jYXIueDtcbiAgICBpZiAoTWF0aC5hYnMoZHgpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5yZWFkeVRvTGVhdmUgPSB0cnVlO1xuICAgICAgc2hvcHBlci5wZXJzb24udmlzaWJsZSA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoZHggPiAwKSB7XG4gICAgICBzaG9wcGVyLnBlcnNvbi54IC09IHNldHRpbmdzLndhbGtTcGVlZDtcbiAgICAgIHNob3BwZXIucGVyc29uLnJvdGF0aW9uID0gc2V0dGluZ3MucGVyc29uTGVmdDtcbiAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgc2hvcHBlci5wZXJzb24ueCArPSBzZXR0aW5ncy53YWxrU3BlZWQ7XG4gICAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHNldHRpbmdzLnBlcnNvblJpZ2h0O1xuICAgIH1cblxuICB9LFxuICBzdGF0ZVdhbGtUb0NvbHVtbjogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICB2YXIgZHggPSBzaG9wcGVyLnBlcnNvbi54IC0gc2hvcHBlci5uZXh0VGFyZ2V0WDtcbiAgICBpZiAoTWF0aC5hYnMoZHgpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVXYWxrVG9Db2x1bW5Ub3A7XG4gICAgfSBlbHNlIGlmIChkeCA+IDApIHtcbiAgICAgIHNob3BwZXIucGVyc29uLnggLT0gc2V0dGluZ3Mud2Fsa1NwZWVkO1xuICAgICAgc2hvcHBlci5wZXJzb24ucm90YXRpb24gPSBzZXR0aW5ncy5wZXJzb25MZWZ0O1xuICAgIH0gZWxzZSBpZiAoZHggPCAwKSB7XG4gICAgICBzaG9wcGVyLnBlcnNvbi54ICs9IHNldHRpbmdzLndhbGtTcGVlZDtcbiAgICAgIHNob3BwZXIucGVyc29uLnJvdGF0aW9uID0gc2V0dGluZ3MucGVyc29uUmlnaHQ7XG4gICAgfVxuICB9LFxuICBzdGF0ZVdhbGtUb0NvbHVtblRvcDogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICB2YXIgZHkgPSBzaG9wcGVyLnBlcnNvbi55IC0gc2V0dGluZ3MubG90VG9wO1xuICAgIGlmIChNYXRoLmFicyhkeSkgPCBzZXR0aW5ncy53YWxrU3BlZWQgKiAyKSB7XG4gICAgICBzaG9wcGVyLnN0YXRlVXBkYXRlID0gdGhpcy5zdGF0ZVdhbGtUb0Nyb3NzV2FsaztcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvcHBlci5wZXJzb24ueSAtPSBzZXR0aW5ncy53YWxrU3BlZWQ7XG4gICAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHNldHRpbmdzLnBlcnNvblVwO1xuICAgIH1cbiAgfSxcbiAgc3RhdGVXYWxrVG9Dcm9zc1dhbGs6IGZ1bmN0aW9uIChzaG9wcGVyKSB7XG4gICAgdmFyIGR4ID0gc2hvcHBlci5wZXJzb24ueCAtIDQwMDtcbiAgICBpZiAoTWF0aC5hYnMoZHgpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVXYWxrSW50b1N0b3JlO1xuICAgIH0gZWxzZSBpZiAoZHggPiAwKSB7XG4gICAgICBzaG9wcGVyLnBlcnNvbi54IC09IHNldHRpbmdzLndhbGtTcGVlZDtcbiAgICAgIHNob3BwZXIucGVyc29uLnJvdGF0aW9uID0gc2V0dGluZ3MucGVyc29uTGVmdDtcbiAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgc2hvcHBlci5wZXJzb24ueCArPSBzZXR0aW5ncy53YWxrU3BlZWQ7XG4gICAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHNldHRpbmdzLnBlcnNvblJpZ2h0O1xuICAgIH1cbiAgfSxcbiAgc3RhdGVXYWxrSW50b1N0b3JlOiBmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgIHZhciBkeSA9IHNob3BwZXIucGVyc29uLnkgLSA4MDtcbiAgICBpZiAoTWF0aC5hYnMoZHkpIDwgc2V0dGluZ3Mud2Fsa1NwZWVkICogMikge1xuICAgICAgc2hvcHBlci5zdGF0ZVVwZGF0ZSA9IHRoaXMuc3RhdGVFbnRlcmVkU3RvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNob3BwZXIucGVyc29uLnkgLT0gc2V0dGluZ3Mud2Fsa1NwZWVkO1xuICAgICAgc2hvcHBlci5wZXJzb24ucm90YXRpb24gPSBzZXR0aW5ncy5wZXJzb25VcDtcbiAgICB9XG4gIH0sXG4gIG1vdmVDYXJ0QW5kUGVyc29uOiBmdW5jdGlvbiAoc2hvcHBlciwgeCwgeSwgcm90YXRpb24pIHtcbiAgICBzaG9wcGVyLnBlcnNvbi54ID0geDtcbiAgICBzaG9wcGVyLnBlcnNvbi55ID0geTtcbiAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHJvdGF0aW9uO1xuXG4gICAgc2hvcHBlci5jYXJ0LnggPSBzaG9wcGVyLnBlcnNvbi54O1xuICAgIHNob3BwZXIuY2FydC55ID0gc2hvcHBlci5wZXJzb24ueTtcbiAgICBzaG9wcGVyLmNhcnQucm90YXRpb24gPSBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbjtcbiAgfVxufVxuIiwidmFyIFBoYXNlciA9IHdpbmRvdy5QaGFzZXJcbnZhciBHYW1lU3RhdGVzID0gcmVxdWlyZShcInN0YXRlcy9HYW1lU3RhdGVzXCIpO1xudmFyIEdhbWVTdGF0ZUNsYXp6ZXMgPSByZXF1aXJlKFwic3RhdGVzL0dhbWVTdGF0ZUNsYXp6ZXNcIik7XG52YXIgZ2FtZSA9IHdpbmRvdy5nYW1lID0gbmV3IFBoYXNlci5HYW1lKDgwMCwgNjAwLCBQaGFzZXIuQVVUTywgXCJnYW1lXCIsIG51bGwsIHRydWUsIGZhbHNlKTtcbmZvciAodmFyIHN0YXRlIGluIEdhbWVTdGF0ZXMpIHtcbiAgaWYgKEdhbWVTdGF0ZXMuaGFzT3duUHJvcGVydHkoc3RhdGUpKSB7XG4gICAgZ2FtZS5zdGF0ZS5hZGQoR2FtZVN0YXRlc1tzdGF0ZV0sIEdhbWVTdGF0ZUNsYXp6ZXNbc3RhdGVdLmNsYXp6KTtcbiAgfVxufVxuZ2FtZS5zdGF0ZS5zdGFydChHYW1lU3RhdGVzLmJvb3QpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vY2FyIHJvdGF0aW9uc1xuICBjYXJMZWZ0Um90YXRpb246IDAsXG4gIGNhclJpZ2h0Um90YXRpb246IE1hdGguUEksXG4gIGNhclJpZ2h0Um90YXRpb25OZWc6IC1NYXRoLlBJLFxuICBjYXJEb3duUm90YXRpb246IE1hdGguUEkgLyAyLFxuICBjYXJVcFJvdGF0aW9uOiAgMypNYXRoLlBJIC8gMixcbiAgY2FyVXBSb3RhdGlvbk5lZzogIC1NYXRoLlBJIC8gMixcblxuICAvL2NhciBkcml2aW5nIHNldHRpbmdzXG4gIGNhclZlbG9jaXR5OiA1LFxuICBjYXJSYW5kb21WZWxvY2l0eUNoYW5nZTogMixcbiAgY2FyUm90YXRpb25WZWxvY2l0eTogTWF0aC5QSS81MCxcbiAgdHVyblJhZGl1czogMjUsXG5cbiAgLy9jb2xsaXNpb24gc2V0dGluZ3NcbiAgY2FyU3BhY2U6IC0xMCxcbiAgcGVyc29uU3BhY2U6IDUsXG4gIGNhcnRTcGFjZTogNSxcblxuICAvL3JvYWQgYW5kIHBhcmtpbmcgbG90IHNldHRpbmdzXG4gIHJvYWRMZWZ0WTogMTA1LFxuICByb2FkUmlnaHRZOiAxNTUsXG4gIHN0b3BTaWduWTogMjQwLFxuICBsb3QxRG93blg6IDE4MCxcbiAgbG90MkRvd25YOiA1NTAsXG4gIGxvdDFVcFg6IDI1NCxcbiAgbG90MlVwWDogNjE0LFxuICBzcGFjZXNYOiBbXG4gICAgOTAsXG4gICAgMzQ1LFxuICAgIDQ1NSxcbiAgICA3MTBcbiAgXSxcbiAgc3BhY2VzOiAyMixcbiAgcm93czogNixcbiAgY29sdW1uczogNCxcbiAgc3BhY2VzMVk6IDIyNCxcbiAgc3BhY2VPZmZzZXQ6IDY1LFxuXG4gIGxvdFRvcDogMTc1LFxuICB3YWxrU3BlZWQ6IC44LFxuICBwZXJzb25MZWZ0OiAwLFxuICBwZXJzb25SaWdodDogTWF0aC5QSSxcbiAgcGVyc29uVXA6IE1hdGguUEkvMixcbiAgcGVyc29uRG93bjogMyAqIE1hdGguUEkvMixcblxuICAvL3Blb3BsZSB0YWxraW5nXG4gIGd1aWx0eVNheWluZ3M6IFtcbiAgICBcIkkgY2FuJ3Qgd2FsayB0aGF0IGZhciFcIixcbiAgICBcIlRoZXkgcGF5IHNvbWVvbmUgZWxzZSB0byBjb2xsZWN0IG15IGNhcnQhXCIsXG4gICAgXCJCdXQgSSBoYXZlIGtpZHMgaW4gbXkgY2FyIVwiLFxuICAgIFwiSXQncyB0b28gaG90IHRvIHJldHVybiBteSBjYXJ0LlwiLFxuICAgIFwiQnV0LCBpdCB3YXMgdG9vIGZhciBhd2F5IVwiXG4gIF0sXG4gIGlubm9jZW50U2F5aW5nczogW1xuICAgIFwiSSB3b3VsZCBuZXZlciBsZWF2ZSBteSBjYXJ0IVwiLFxuICAgIFwiSSdtIHRhbGtpbmcgdG8gbWFuYWdlbWVudCFcIixcbiAgICBcIkkgd2lsbCBuZXZlciBzaG9wIGhlcmUgYWdhaW4hXCIsXG4gICAgXCJTdG9wIGhhcmFzc2luZyBtZSFcIixcbiAgICBcIkkndmUgYmVlbiBmYWxzZWx5IGFjY3VzZWQhIEFnYWluIVwiXG4gIF1cbn1cbiIsInZhciBHYW1lU3RhdGVzID0gcmVxdWlyZShcInN0YXRlcy9HYW1lU3RhdGVzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByZWxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICBcbiAgICBnYW1lLmxvYWQuaW1hZ2UoXCJwcmVsb2FkZXJCYWNrZ3JvdW5kXCIsIFwiYXNzZXRzL3ByZWxvYWRlckJhY2tncm91bmQucG5nXCIpO1xuXHRcdGdhbWUubG9hZC5pbWFnZShcInByZWxvYWRlckJhclwiLCBcImFzc2V0cy9wcmVsb2FkZXJCYXIucG5nXCIpO1xuICB9LFxuICBjcmVhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBnYW1lLnN0YXRlLnN0YXJ0KEdhbWVTdGF0ZXMubG9hZCk7XG4gIH0sXG59XG4iLCJ2YXIgR2FtZVN0YXRlcyA9IHJlcXVpcmUoXCJzdGF0ZXMvR2FtZVN0YXRlc1wiKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICBwcmVsb2FkOiBmdW5jdGlvbiAoKSB7XG4gIH0sXG4gIGNyZWF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdHlsZSA9IHsgZm9udDogXCIyNXB4IEFyaWFsXCIsIGZpbGw6IFwiI0ZGRkFENVwiLCBhbGlnbjogXCJjZW50ZXJcIiB9O1xuXG4gICAgZ2FtZS5hZGQudGV4dCg4MCwgMTUwLCBcIllvdSBoYXJyYXNlZCBhbiBpbm5vY2VudCBzaG9wcGVyLCB5b3UncmUgZmlyZWQhXCIsIHN0eWxlKTtcbiAgICB2YXIgc2NvcmVUZXh0ID0gXCJZb3UgZm91bmQgXCIgKyB3aW5kb3cubW9uc3RlcnNGb3VuZCArIFwiIG1vbnN0ZXJzLlwiO1xuICAgIGlmICh3aW5kb3cubW9uc3RlcnNFc2NhcGVkID09PSAwICYmIHdpbmRvdy5tb25zdGVyc0ZvdW5kID4gMCkge1xuICAgICAgc2NvcmVUZXh0ICs9IFwiIFlvdSBkaWRuJ3QgbGV0IGFueSBtb25zdGVycyBlc2NhcGUhXCI7XG5cbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5tb25zdGVyc0VzY2FwZWQgPiAwKXtcbiAgICAgICAgc2NvcmVUZXh0ICs9IFwiIEJ1dCwgeW91IGxldCBcIiArIHdpbmRvdy5tb25zdGVyc0VzY2FwZWQgICtcIiBtb25zdGVycyBlc2NhcGUuXCI7XG4gICAgfVxuXG4gICAgICBnYW1lLmFkZC50ZXh0KDgwLCAyMDAsIHNjb3JlVGV4dCwgc3R5bGUpO1xuXG4gICAgZ2FtZS5hZGQudGV4dCg4MCwgMjUwLCBcIkNsaWNrIHRvIHRyeSBhZ2FpblwiLCBzdHlsZSk7XG5cbiAgICBnYW1lLmFkZC50ZXh0KDgwLCA0NTAsIFwiVGlwOiBNb25zdGVycyBkb24ndCByZXR1cm4gdGhlaXIgY2FydHMuXCIsIHN0eWxlKTtcblxuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZ2FtZS5pbnB1dC5hY3RpdmVQb2ludGVyLmlzRG93bilcbiAgICAgICB7XG4gICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoR2FtZVN0YXRlcy5tZW51KTtcbiAgICAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBib290OiB7XG4gICAgY2xheno6IHJlcXVpcmUoXCIuL0Jvb3RcIiksXG4gIH0sXG4gIGxvYWQ6IHtcbiAgICBjbGF6ejogcmVxdWlyZShcIi4vTG9hZFwiKVxuICB9LFxuICBtZW51OiB7XG4gICAgY2xheno6IHJlcXVpcmUoXCIuL01lbnVcIilcbiAgfSxcbiAgcGxheToge1xuICAgIGNsYXp6OiByZXF1aXJlKFwiLi9QbGF5XCIpXG4gIH0sXG4gIGdhbWVPdmVyOiB7XG4gICAgY2xheno6IHJlcXVpcmUoXCIuL0dhbWVPdmVyXCIpXG4gIH0sXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJvb3Q6IFwiQm9vdFwiLFxuICBsb2FkOiBcIkxvYWRcIixcbiAgbWVudTogXCJNZW51XCIsXG4gIHBsYXk6IFwiUGxheVwiLFxuICBnYW1lT3ZlcjogXCJHYW1lT3ZlclwiXG59O1xuIiwidmFyIEdhbWVTdGF0ZXMgPSByZXF1aXJlKFwic3RhdGVzL0dhbWVTdGF0ZXNcIik7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJlbG9hZDogZnVuY3Rpb24gKCkge1xuICAgIGdhbWUuYWRkLnRleHQoODAsIDE1MCwgXCJsb2FkaW5nLi4uXCIsIHtmb250OiBcIjMwcHggQ291cmllclwiLCBmaWxsOiBcIiNmZmZmZlwifSk7XG5cbiAgICBnYW1lLmJhY2tncm91bmQgPSB0aGlzLmFkZC5zcHJpdGUoMCwgMCwgJ3ByZWxvYWRlckJhY2tncm91bmQnKTtcbiAgICBcdGdhbWUucHJlbG9hZEJhciA9IHRoaXMuYWRkLnNwcml0ZSgzMDAsIDQwMCwgJ3ByZWxvYWRlckJhcicpO1xuICAgIFx0Z2FtZS5sb2FkLnNldFByZWxvYWRTcHJpdGUoZ2FtZS5wcmVsb2FkQmFyKTtcbiAgICBnYW1lLnRpbWUuYWR2YW5jZWRUaW1pbmcgPSB0cnVlO1xuICAgIGdhbWUubG9hZC5hdGxhc0pTT05IYXNoKFwic3ByaXRlc1wiLCBcImFzc2V0cy9zcHJpdGVzLnBuZ1wiLCBcImFzc2V0cy9zcHJpdGVzLmpzb25cIik7XG5cbiAgfSxcbiAgY3JlYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgZ2FtZS5zdGF0ZS5zdGFydChHYW1lU3RhdGVzLm1lbnUpO1xuICB9XG59XG4iLCJ2YXIgR2FtZVN0YXRlcyA9IHJlcXVpcmUoXCJzdGF0ZXMvR2FtZVN0YXRlc1wiKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICBwcmVsb2FkOiBmdW5jdGlvbiAoKSB7XG4gIH0sXG4gIGNyZWF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciB0aXRsZSA9IGdhbWUuYWRkLnNwcml0ZSgwLDAsIFwic3ByaXRlc1wiKTtcbiAgICB0aXRsZS5mcmFtZU5hbWU9IFwibWVudVNjcmVlblwiO1xuICAgIHRpdGxlLnRpbnQgPSAweEZGRkFENTtcbiAgICAvL2dhbWUuc3RhdGUuc3RhcnQoR2FtZVN0YXRlcy5wbGF5KTtcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGdhbWUuaW5wdXQuYWN0aXZlUG9pbnRlci5pc0Rvd24pXG4gICAgICAge1xuICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KEdhbWVTdGF0ZXMucGxheSk7XG4gICAgICAgfVxuICB9XG59XG4iLCJ2YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xudmFyIEdhbWVTdGF0ZXMgPSByZXF1aXJlKFwiLi9HYW1lU3RhdGVzXCIpO1xudmFyIHNldHRpbmdzID0gcmVxdWlyZShcIi4uL3NldHRpbmdzXCIpO1xudmFyIGNhckNvbnRyb2xsZXIgPSByZXF1aXJlKFwiLi4vY29udHJvbGxlcnMvQ2FyQ29udHJvbGxlclwiKTtcbnZhciBzaG9wcGVyQ29udHJvbGxlciA9IHJlcXVpcmUoXCIuLi9jb250cm9sbGVycy9TaG9wcGVyQ29udHJvbGxlclwiKTtcbnZhciBjb2xsaXNpb25Db250cm9sbGVyID0gcmVxdWlyZShcIi4uL2NvbnRyb2xsZXJzL0NvbGxpc2lvbkNvbnRyb2xsZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzaG9wcGVyczogW10sXG4gIG1vbnN0ZXJzRm91bmQ6IDAsXG4gIG1vbnN0ZXJzRXNjYXBlZDogMCxcbiAgY3JlYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgXy5iaW5kQWxsKHRoaXMsIFwiY2hlY2tJZkhvdmVyU2hvcHBlclwiKVxuICAgIHZhciBiYWNrZ3JvdW5kID0gZ2FtZS5hZGQuc3ByaXRlKDAsMCwgXCJzcHJpdGVzXCIpO1xuICAgIGJhY2tncm91bmQuZnJhbWVOYW1lPSBcImJhY2tncm91bmRDb21iaW5lZFwiO1xuICAgIGNhckNvbnRyb2xsZXIuaW5pdGlhbGl6ZSgpO1xuICAgIHNob3BwZXJDb250cm9sbGVyLmluaXRpYWxpemUoKTtcbiAgICB0aGlzLmdhbWVPYmplY3RzTGF5ZXIgPSBnYW1lLmFkZC5ncm91cCgpO1xuICAgIHRoaXMuYWNjdXNlRGlhbG9nID0gZ2FtZS5hZGQuc3ByaXRlKDAsMCwgXCJzcHJpdGVzXCIpO1xuICAgIHRoaXMuYWNjdXNlRGlhbG9nLmZyYW1lTmFtZSA9IFwiYWNjdXNlRGlhbG9nXCI7XG4gICAgdGhpcy5hY2N1c2VEaWFsb2cuYW5jaG9yLnggPSAwLjM7XG4gICAgdGhpcy5hY2N1c2VEaWFsb2cudmlzaWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuYWNjdXNlRGlhbG9nLmFuY2hvci55ID0gLS4yO1xuXG4gICAgdGhpcy5tb25zdGVyc0ZvdW5kID0gMDtcbiAgICB0aGlzLm1vbnN0ZXJzRXNjYXBlZCA9IDA7XG4gICAgdGhpcy5zaG9wcGVycyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICB0aGlzLmFkZFNob3BwZXJJblN0b3JlKCk7XG4gICAgfVxuICAvLyAgdGhpcy5hZGRTaG9wcGVyKCk7XG4gICAgd2luZG93LlBsYXkgPSB0aGlzO1xuICAgIGdhbWUuaW5wdXQub25Eb3duLmFkZCh0aGlzLmNoZWNrSWZIaXRTaG9wcGVyLCB0aGlzKTtcbiAgICBnYW1lLmlucHV0Lm1vdXNlLm9uTW91c2VNb3ZlID0gdGhpcy5jaGVja0lmSG92ZXJTaG9wcGVyO1xuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMDA1ICYmIHRoaXMuc2hvcHBlcnMubGVuZ3RoIDwgc2V0dGluZ3Muc3BhY2VzKSB7XG4gICAgICB0aGlzLmFkZFNob3BwZXIoKTtcbiAgICB9XG5cbiAgdmFyIHJlbW92ZVNob3BwZXJzID0gW107XG4gICAgXy5lYWNoKHRoaXMuc2hvcHBlcnMsIF8uYmluZChmdW5jdGlvbiAoc2hvcHBlciwgaW5kZXgpIHtcblxuICAgICAgaWYgKCFzaG9wcGVyLmNhci5pc1BhcmtlZCkge1xuICAgICAgICAgIGNhckNvbnRyb2xsZXIudXBkYXRlQ2FyKHNob3BwZXIuY2FyKTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvcHBlci5yZWFkeVRvTGVhdmUpIHtcbiAgICAgICAgaWYgKHNob3BwZXIucGVyc29uLmlzTW9uc3Rlcikge1xuICAgICAgICAgIHRoaXMubW9uc3RlcnNFc2NhcGVkICsrO1xuICAgICAgICB9XG4gICAgICAgIGNhckNvbnRyb2xsZXIuc3RhcnRMZWF2aW5nKHNob3BwZXIuY2FyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2hvcHBlcihzaG9wcGVyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNob3BwZXIuY2FyLnJlYWR5VG9CZURlc3Ryb3llZCA9PT0gdHJ1ZSkge1xuXG4gICAgICAgIHJlbW92ZVNob3BwZXJzLnB1c2goaW5kZXgpO1xuICAgICAgfVxuXG4gICAgfSwgdGhpcykpO1xuICAgIGZvciAoIHZhciBpID0gcmVtb3ZlU2hvcHBlcnMubGVuZ3RoIC0xOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc29sZS5sb2coXCJzaG9wcGVyIHJlbW92ZWRcIik7XG5cbiAgICAgIHRoaXMuc2hvcHBlcnNbcmVtb3ZlU2hvcHBlcnNbaV1dLmNhci5kZXN0cm95KCk7XG4gICAgICB0aGlzLnNob3BwZXJzW3JlbW92ZVNob3BwZXJzW2ldXS5wZXJzb24uZGVzdHJveSgpO1xuICAgICAgdGhpcy5zaG9wcGVycy5zcGxpY2UocmVtb3ZlU2hvcHBlcnNbaV0sIDEpO1xuXG4gICAgfVxuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAvL2dhbWUuZGVidWcudGV4dChnYW1lLnRpbWUuZnBzIHx8IFwiLS1cIiwgMiwgMTQsIFwiI2E3YWViZVwiKTtcbiAgICBnYW1lLmRlYnVnLnRleHQoXCJNb25zdGVycyBmb3VuZDogXCIgKyB0aGlzLm1vbnN0ZXJzRm91bmQgLCA1NjAsIDI0LCBcIiNGRkZBRDVcIik7XG4gICAgZ2FtZS5kZWJ1Zy50ZXh0KFwiTW9uc3RlcnMgZXNjYXBlZDogXCIgKyB0aGlzLm1vbnN0ZXJzRXNjYXBlZCAsIDU2MCwgNDAsIFwiI0ZGRkFENVwiKTtcbiAgfSxcbiAgdXBkYXRlU2hvcHBlcjogZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICBzaG9wcGVyLnN0YXRlVXBkYXRlKHNob3BwZXIpO1xuICB9LFxuICBhZGRTaG9wcGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNob3BwZXIgPSB0aGlzLmNyZWF0ZVNob3BwZXIoNDAwLCA2MCwgLU1hdGguUEkvMik7XG4gICAgdmFyIGNhciA9IGNhckNvbnRyb2xsZXIuYWRkQ2FyKHRoaXMuZ2FtZU9iamVjdHNMYXllcik7XG4gICAgY2FyQ29udHJvbGxlci5wbGFjZUF0RW50cmFuY2UoY2FyKTtcbiAgICBzaG9wcGVyLnN0YXRlVXBkYXRlID0gc2hvcHBlckNvbnRyb2xsZXIuc3RhdGVHZXRPdXRPZkNhcjtcblxuICAgIHNob3BwZXIuY2FyID0gY2FyO1xuICAgIGNvbGxpc2lvbkNvbnRyb2xsZXIuYWRkKGNhcik7XG4gICAgdGhpcy5zaG9wcGVycy5wdXNoKHNob3BwZXIpO1xuICAgIHJldHVybiBzaG9wcGVyO1xuICB9LFxuICBhZGRTaG9wcGVySW5TdG9yZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaG9wcGVyID0gdGhpcy5hZGRTaG9wcGVyKCk7XG4gICAgY2FyQ29udHJvbGxlci5wYXJrQ2FySW5PcGVuU3BhY2Uoc2hvcHBlci5jYXIpO1xuICAgIHNob3BwZXIuc3RhdGVVcGRhdGUgPSBzaG9wcGVyQ29udHJvbGxlci5zdGF0ZUVudGVyZWRTdG9yZTtcbiAgfSxcblxuICBjcmVhdGVTaG9wcGVyOiBmdW5jdGlvbiAoeCwgeSwgcm90YXRpb24pIHtcbiAgICAgIHZhciBwZXJzb24gPSB0aGlzLmdhbWVPYmplY3RzTGF5ZXIuY3JlYXRlKDAsMCwgXCJzcHJpdGVzXCIpO1xuICAgICAgcGVyc29uLmZyYW1lTmFtZSA9IFwicGVyc29uXCIgKyAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMykgKyAxKTtcbiAgICAgIHBlcnNvbi5hbmNob3IueCA9IDA7XG4gICAgICBwZXJzb24uYW5jaG9yLnkgPSAwLjU7XG4gICAgICBwZXJzb24uc2NhbGUuc2V0KDEuNSwgMS41KTtcbiAgICAgIHBlcnNvbi52aXNpYmxlID0gZmFsc2U7XG4gICAgICBwZXJzb24ub2JqZWN0VHlwZSA9IFwicGVyc29uXCI7XG4gICAgICBwZXJzb24uaGl0QXJlYSA9IG5ldyBQaGFzZXIuUmVjdGFuZ2xlKDAsIDAsIDgwLCA4MCk7XG4gICAgICBwZXJzb24uZ2V0Qm91bmRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHRvcDogdGhpcy50b3AgLSBzZXR0aW5ncy5wZXJzb25TcGFjZSxcbiAgICAgICAgICBib3R0b206IHRoaXMuYm90dG9tICsgc2V0dGluZ3MucGVyc29uU3BhY2UsXG4gICAgICAgICAgbGVmdDogdGhpcy5sZWZ0ICsgc2V0dGluZ3MucGVyc29uU3BhY2UsXG4gICAgICAgICAgcmlnaHQ6IHRoaXMucmlnaHQgLSBzZXR0aW5ncy5wZXJzb25TcGFjZSxcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgICBjb2xsaXNpb25Db250cm9sbGVyLmFkZChwZXJzb24pO1xuXG4gICAgICBwZXJzb24uaXNNb25zdGVyID0gTWF0aC5yYW5kb20oKSA8IC42O1xuICAgICAgaWYgKHBlcnNvbi5pc01vbnN0ZXIpIHtcbiAgICAgICAgcGVyc29uLm1vbnN0ZXJUeXBlID0gc2hvcHBlckNvbnRyb2xsZXIubW9uc3RlclR5cGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqc2hvcHBlckNvbnRyb2xsZXIubW9uc3RlclR5cGVzLmxlbmd0aCldXG4gICAgICB9XG5cbiAgICAgIHZhciBjYXJ0ID0gdGhpcy5nYW1lT2JqZWN0c0xheWVyLmNyZWF0ZSgwLDAsIFwic3ByaXRlc1wiKTtcbiAgICAgIGNhcnQuZnJhbWVOYW1lID0gXCJjYXJ0XCI7XG4gICAgICBjYXJ0LmFuY2hvci54ID0gMTtcbiAgICAgIGNhcnQuYW5jaG9yLnkgPSAwLjU7XG4gICAgICBjYXJ0LnNjYWxlLnNldCgxLjIsIDEuMik7XG4gICAgICBjYXJ0LnZpc2libGUgPSBmYWxzZTtcbiAgICAgIGNhcnQub2JqZWN0VHlwZSA9IFwiY2FydFwiO1xuICAgICAgY2FydC5nZXRCb3VuZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdG9wOiB0aGlzLnRvcCAtIHNldHRpbmdzLmNhcnRTcGFjZSxcbiAgICAgICAgICBib3R0b206IHRoaXMuYm90dG9tICsgc2V0dGluZ3MuY2FydFNwYWNlLFxuICAgICAgICAgIGxlZnQ6IHRoaXMubGVmdCArIHNldHRpbmdzLmNhcnRTcGFjZSxcbiAgICAgICAgICByaWdodDogdGhpcy5yaWdodCAtIHNldHRpbmdzLmNhcnRTcGFjZSxcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgICBjb2xsaXNpb25Db250cm9sbGVyLmFkZChjYXJ0KTtcblxuICAgICAgdmFyIHNob3BwZXIgPSB7XG4gICAgICAgIHBlcnNvbjogcGVyc29uLFxuICAgICAgICBjYXJ0OiBjYXJ0LFxuICAgICAgICBlbnRyYW5jZVRpbWU6ICtuZXcgRGF0ZSxcbiAgICAgICAgc2hvcHBpbmdUaW1lOiAyMDAwICsgTWF0aC5yYW5kb20oKSAqIDEwMDAwXG4gICAgICB9XG4gICAgICB0aGlzLm1vdmVTaG9wcGVyKHNob3BwZXIsIHgsIHksIHJvdGF0aW9uKTtcbiAgICAgIHBlcnNvbi5zaG9wcGVyID0gc2hvcHBlcjtcbiAgICAgIHJldHVybiBzaG9wcGVyO1xuICB9LFxuICBjaGVja0lmSGl0U2hvcHBlcjogZnVuY3Rpb24gKGV2dCkge1xuICAgIHZhciBjbGlja1ggPSBldnQucG9zaXRpb24ueDtcbiAgICB2YXIgY2xpY2tZID0gZXZ0LnBvc2l0aW9uLnk7XG4gICAgXy5lYWNoKHRoaXMuc2hvcHBlcnMsIF8uYmluZChmdW5jdGlvbiAoc2hvcHBlcikge1xuICAgICAgdmFyIHggPSBzaG9wcGVyLnBlcnNvbi54O1xuICAgICAgdmFyIHkgPSBzaG9wcGVyLnBlcnNvbi55O1xuICAgICAgdmFyIGR4ID0geCAtIGNsaWNrWDtcbiAgICAgIHZhciBkeSA9IHkgLSBjbGlja1k7XG4gICAgICBpZiAoZHgqZHggKyBkeSpkeSA8IDEwMDApIHtcbiAgICAgICAgdGhpcy5hY2N1c2VNb25zdGVyKHNob3BwZXIucGVyc29uKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKSk7XG4gIH0sXG4gIGNoZWNrSWZIb3ZlclNob3BwZXI6ICBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgdmFyIGNsaWNrWCA9IGV2dC5sYXllclg7XG4gICAgdmFyIGNsaWNrWSA9IGV2dC5sYXllclk7XG4gICAgdGhpcy5hY2N1c2VEaWFsb2cudmlzaWJsZSA9IGZhbHNlO1xuICAgIF8uZWFjaCh0aGlzLnNob3BwZXJzLCBfLmJpbmQoZnVuY3Rpb24gKHNob3BwZXIpIHtcbiAgICAgIHZhciB4ID0gc2hvcHBlci5wZXJzb24ueDtcbiAgICAgIHZhciB5ID0gc2hvcHBlci5wZXJzb24ueTtcbiAgICAgIHZhciBkeCA9IHggLSBjbGlja1g7XG4gICAgICB2YXIgZHkgPSB5IC0gY2xpY2tZO1xuICAgICAgaWYgKGR4KmR4ICsgZHkqZHkgPCAxMDAwKSB7XG4gICAgICAgIHRoaXMuYWNjdXNlRGlhbG9nLnZpc2libGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmFjY3VzZURpYWxvZy54ID0gc2hvcHBlci5wZXJzb24ueDtcbiAgICAgICAgdGhpcy5hY2N1c2VEaWFsb2cueSA9IHNob3BwZXIucGVyc29uLnk7XG4gICAgICB9XG4gICAgfSwgdGhpcykpO1xuICB9LFxuICBhY2N1c2VNb25zdGVyOiBmdW5jdGlvbiAocGVyc29uKSB7XG4gICAgaWYgKHBlcnNvbi5pc01vbnN0ZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiWW91IGZvdW5kIG9uZSFcIiwgcGVyc29uLm1vbnN0ZXJUeXBlICk7XG4gICAgICB0aGlzLm1vbnN0ZXJzRm91bmQgKys7XG4gICAgICBwZXJzb24udmlzaWJsZSA9IGZhbHNlO1xuICAgICAgcGVyc29uLnNob3BwZXIuY2FydC52aXNpYmxlID0gZmFsc2U7XG4gICAgICBwZXJzb24uc2hvcHBlci5jYXIudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgcGVyc29uLnNob3BwZXIuY2FyLnJlYWR5VG9CZURlc3Ryb3llZCA9IHRydWU7XG4gICAgICBwZXJzb24uc2hvcHBlci5jYXIuc3BhY2VUYXJnZXQuYXZhaWxhYmxlID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWNjdXNlRGlhbG9nLnZpc2libGUgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93Lm1vbnN0ZXJzRXNjYXBlZCA9IHRoaXMubW9uc3RlcnNFc2NhcGVkO1xuICAgICAgd2luZG93Lm1vbnN0ZXJzRm91bmQgPSB0aGlzLm1vbnN0ZXJzRm91bmQ7XG4gICAgICBnYW1lLnN0YXRlLnN0YXJ0KEdhbWVTdGF0ZXMuZ2FtZU92ZXIpO1xuICAgICAgY29uc29sZS5sb2coXCJZb3UgYWNjdXNlZCBhbiBpbm5ub2NlbnQgcGVyc29uIVwiKTtcbiAgICB9XG4gIH0sXG4gIG1vdmVTaG9wcGVyOiBmdW5jdGlvbiAoc2hvcHBlciwgeCwgeSwgcm90YXRpb24pIHtcbiAgICBzaG9wcGVyLnBlcnNvbi5wb3NpdGlvbi54ID0geDtcbiAgICBzaG9wcGVyLnBlcnNvbi5wb3NpdGlvbi55ID0geTtcbiAgICBzaG9wcGVyLnBlcnNvbi5yb3RhdGlvbiA9IHJvdGF0aW9uO1xuICAgIHNob3BwZXIuY2FydC5wb3NpdGlvbi54ID0geDtcbiAgICBzaG9wcGVyLmNhcnQucG9zaXRpb24ueSA9IHk7XG4gICAgc2hvcHBlci5jYXJ0LnJvdGF0aW9uID0gcm90YXRpb247XG4gIH0sXG59O1xuIl19
