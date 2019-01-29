import * as _ from 'lodash'
import * as inspect from 'util-inspect'

import { ExecutionContext } from '../rule-engine/rules'

export interface EffectsResolverMap {
  [key: string]: (args: { [key: string]: any }, context: ExecutionContext) => Promise<void> | void
}

export const defaultEffectFields: string = `
  "Adds the provided value to the value at path. Throws error if value at path is not a number."
  add(path: String!, value: Float, valuePath: String): Void

  "Rounds value at path up to provided precision. Throws error if value at path is not a number."
  ceiling(path: String!, precision: Int = 0): Void

  "Clamps the value at path within the provided inclusive bounds. Throws error if value at path is not a number."
  clamp(path: String!, lower: Float!, upper: Float!): Void

  """
  Concats value at path to provided JSON value. Numbers, strings and booleans can also be used as a valid value.
  If the value doesn't exist, the value at the path will be set to an empty array and then concatenated.
  If the value isn't an array, it will be wrapped in one and then concatenated.
  """
  concat(path: String!, value: JSON, valuePath: String): Void

  "Sets the value at the path to the provided value, but only if the existing value is undefined"
  default(path: String!, value: JSON, valuePath: String): Void

  "Divides value at path by provided value. Throws error if value at path is not a number or if provided number is 0."
  divide(path: String!, value: Float, valuePath: String): Void

  """
  Filters elements from array at path that either don't match the provided value (if it's an object)
  or don't equal the value (if it's anything else).
  """
  filter(path: String!, value: JSON, valuePath: String): Void

  "Rounds value at path down to provided precision. Throws error if value at path is not a number."
  floor(path: String!, precision: Int = 0): Void

  "Sets the value at path to the greater of it or the provided value. Throws error if value at path is not a number."
  max(path: String!, value: Float, valuePath: String): Void

  """
  Deep merges value at path with provided JSON value. If value at path is null or undefined, it will be set to the
  provided object. If either of the values are not objects, an error will be thrown.
  """
  merge(path: String!, value: JSON, valuePath: String): Void

  "Sets the value at path to the lesser of it or the provided value. Throws error if value at path is not a number."
  min(path: String!, value: Float, valuePath: String): Void

  "Multiplies value at path by provided value. Throws error if value at path is not a number."
  multiply(path: String!, value: Float, valuePath: String): Void

  """
  Removes elements from array at path that either match the provided value (if it's an object)
  or equal the value (if it's anything else).
  """
  pull(path: String!, value: JSON, valuePath: String): Void

  "Rounds value at path to provided precision. Throws error if value at path is not a number."
  round(path: String!, precision: Int = 0): Void

  "Sets value at path to provided JSON value. Numbers, strings and booleans can also be used as a valid value."
  set(path: String!, value: JSON, valuePath: String): Void

  "Subtracts the provided value from the value at path. Throws error if value at path is not a number."
  subtract(path: String!, value: Float, valuePath: String): Void

  "Deletes value at path if it exists."
  unset(path: String!): Void
`

export const defaultEffectResolvers: EffectsResolverMap = {
  add: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't add because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = initial + val
    _.set(context, path, updated)
  },
  ceiling: ({ path, precision }, context): void => {
    const initial = _.result(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute ceiling because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = _.ceil(initial, precision)
    _.set(context, path, updated)
  },
  clamp: ({ path, lower, upper }, context): void => {
    const initial = _.result(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't clamp because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = _.clamp(initial, lower, upper)
    _.set(context, path, updated)
  },
  concat: ({ path, value, valuePath }, context): void => {
    const val = getParsedValue(value, valuePath, context)
    let initial = _.result(context, path)
    if (initial === undefined || initial === null) {
      initial = []
    }
    if (!Array.isArray(initial)) {
      initial = [initial]
    }

    const updated = _.concat(initial, val)
    _.set(context, path, updated)
  },
  default: ({ path, value, valuePath }, context): void => {
    const val = getParsedValue(value, valuePath, context)
    const existing = _.result(context, path)

    if (existing !== undefined) {
      return
    }

    _.set(context, path, val)
  },
  divide: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't divide because ${inspect(initial)} at ${path} is not a number`)
    }
    if (val === 0) {
      throw new RangeError('Can\'t divide because provided value is 0')
    }
    const updated = initial / val
    _.set(context, path, updated)
  },
  filter: ({ path, value, valuePath }, context): void => {
    const val = getParsedValue(value, valuePath, context)
    const initial = _.result(context, path)

    if (!Array.isArray(initial)) {
      return
    }

    const valueIsObject = _.isObject(val) && !_.isArray(val)
    const comparatorFunc = valueIsObject ? _.isMatch : _.isEqual
    const updated = initial.filter((element) => comparatorFunc(element, val))
    _.set(context, path, updated)
  },
  floor: ({ path, precision }, context): void => {
    const initial = _.result(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute floor because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = _.floor(initial, precision)
    _.set(context, path, updated)
  },
  max: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute max because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = _.max([initial, val])
    _.set(context, path, updated)
  },
  merge: ({ path, value, valuePath }, context): void => {
    const val = getParsedValue(value, valuePath, context)
    const initial = _.result(context, path)

    if (!_.isObject(val) || (!_.isNil(initial) && !_.isObject(initial))) {
      throw new TypeError('Can only merge two objects.')
    }
    const updated = _.isNil(initial) ? val : _.merge(initial, val)
    _.set(context, path, updated)
  },
  min: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute min because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = _.min([initial, val])
    _.set(context, path, updated)
  },
  multiply: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute ceiling because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = initial * val
    _.set(context, path, updated)
  },
  pull: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getParsedValue(value, valuePath, context)

    if (!Array.isArray(initial)) {
      return
    }

    const valueIsObject = _.isObject(val) && !_.isArray(val)
    const comparatorFunc = valueIsObject ? _.isMatch : _.isEqual
    const updated = _.pullAllWith(initial, _.isArray(val) ? val : [val], comparatorFunc)
    _.set(context, path, updated)
  },
  round: ({ path, precision }, context): void => {
    const initial = _.result(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't round because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = _.round(initial, precision)
    _.set(context, path, updated)
  },
  set: ({ path, value, valuePath }, context): void => {
    const val = getParsedValue(value, valuePath, context)
    _.set(context, path, val)
  },
  subtract: ({ path, value, valuePath }, context): void => {
    const initial = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't subtract because ${inspect(initial)} at ${path} is not a number`)
    }
    const updated = initial - val
    _.set(context, path, updated)
  },
  unset: ({ path }, context): void => {
    _.unset(context, path)
  },
}

function getValue (value: any, valuePath: string, context: ExecutionContext): any {
  assertSingleValue(value, valuePath)
  if (!_.isUndefined(value)) {
    return value
  }
  return _.result(context, valuePath)
}

function getParsedValue (value: any, valuePath: string, context: ExecutionContext): any {
  assertSingleValue(value, valuePath)

  let val

  if (!_.isUndefined(valuePath)) {
      val = _.result(context, valuePath)
    } else {
      try {
        val = JSON.parse(value)
      } catch (e) {
        throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${inspect(value)}`)
      }
    }

  return val
}

function assertSingleValue (value, valuePath) {
  if (!_.isUndefined(value) && !_.isUndefined(valuePath)) {
    throw new Error('Cannot provide both value and valuePath!')
  }
  if (_.isUndefined(value) && _.isUndefined(valuePath)) {
    throw new Error('Must provide either value or valuePath')
  }
}
