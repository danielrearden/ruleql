import * as _ from 'lodash'

export interface EffectsResolverMap {
  [key: string]: (args: { [key: string]: any }, context: any) => Promise<void> | void
}

export const defaultEffectFields: string = `
  "Adds the provided value to the value at path. Throws error if value at path is not a number."
  add(path: String!, value: Float!): Void

  "Rounds value at path up to provided precision. Throws error if value at path is not a number."
  ceiling(path: String!, precision: Int = 0): Void

  "Clamps the value at path within the provided inclusive bounds. Throws error if value at path is not a number."
  clamp(path: String!, lower: Float!, upper: Float!): Void

  """
  Concats value at path to provided JSON value. Numbers, strings and booleans can also be used as a valid value.
  If the value doesn't exist, the value at the path will be set to an empty array and then concatenated.
  If the value isn't an array, it will be wrapped in one and then concatenated.
  """
  concat(path: String!, value: JSON!): Void

  "Sets the value at the path to the provided value, but only if the existing value is undefined"
  default(path: String!, value: JSON!): Void

  "Divides value at path by provided value. Throws error if value at path is not a number or if provided number is 0."
  divide(path: String!, value: Float!): Void

  """
  Filters elements from array at path that either don't match the provided value (if it's an object)
  or don't equal the value (if it's anything else).
  """
  filter(path: String!, value: JSON!): Void

  "Rounds value at path down to provided precision. Throws error if value at path is not a number."
  floor(path: String!, precision: Int = 0): Void

  "Sets the value at path to the greater of it or the provided value. Throws error if value at path is not a number."
  max(path: String!, value: Float!): Void

  """
  Deep merges value at path with provided JSON value. If value at path is null or undefined, it will be set to the
  provided object. If either of the values are not objects, an error will be thrown.
  """
  merge(path: String!, value: JSON!): Void

  "Sets the value at path to the lesser of it or the provided value. Throws error if value at path is not a number."
  min(path: String!, value: Float!): Void

  "Multiplies value at path by provided value. Throws error if value at path is not a number."
  multiply(path: String!, value: Float!): Void

  """
  Removes elements from array at path that either match the provided value (if it's an object)
  or equal the value (if it's anything else).
  """
  pull(path: String!, value: JSON!): Void

  "Rounds value at path to provided precision. Throws error if value at path is not a number."
  round(path: String!, precision: Int = 0): Void

  "Sets value at path to provided JSON value. Numbers, strings and booleans can also be used as a valid value."
  set(path: String!, value: JSON!): Void

  "Subtracts the provided value from the value at path. Throws error if value at path is not a number."
  subtract(path: String!, value: Float!): Void

  "Deletes value at path if it exists."
  unset(path: String!): Void
`

export const defaultEffectResolvers: EffectsResolverMap = {
  add: ({ path, value }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't add because ${initial} at ${path} is not a number`)
    }
    const updated = initial + value
    _.set(context, path, updated)
  },
  ceiling: ({ path, precision }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute ceiling because ${initial} at ${path} is not a number`)
    }
    const updated = _.ceil(initial, precision)
    _.set(context, path, updated)
  },
  clamp: ({ path, lower, upper }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't clamp because ${initial} at ${path} is not a number`)
    }
    const updated = _.clamp(initial, lower, upper)
    _.set(context, path, updated)
  },
  concat: ({ path, value: valueRaw }, context): void => {
    let initial = _.get(context, path)
    if (initial === undefined || initial === null) {
      initial = []
    }
    if (!Array.isArray(initial)) {
      initial = [initial]
    }

    let value
    try {
      value = JSON.parse(valueRaw)
    } catch (e) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${valueRaw}`)
    }

    const updated = _.concat(initial, value)
    _.set(context, path, updated)
  },
  default: ({ path, value: valueRaw }, context): void => {
    const existing = _.get(context, path)
    if (existing !== undefined) {
      return
    }

    let value
    try {
      value = JSON.parse(valueRaw)
    } catch (e) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${valueRaw}`)
    }

    _.set(context, path, value)
  },
  divide: ({ path, value }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't divide because ${initial} at ${path} is not a number`)
    }
    if (value === 0) {
      throw new RangeError('Can\'t divide because provided value is 0')
    }
    const updated = initial / value
    _.set(context, path, updated)
  },
  filter: ({ path, value: valueRaw }, context): void => {
    const initial = _.get(context, path)
    if (!Array.isArray(initial)) {
      return
    }

    let value
    try {
      value = JSON.parse(valueRaw)
    } catch (e) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${valueRaw}`)
    }

    const valueIsObject = _.isObject(value) && !_.isArray(value)
    const comparatorFunc = valueIsObject ? _.isMatch : _.isEqual
    const updated = initial.filter((element) => comparatorFunc(element, value))
    _.set(context, path, updated)
  },
  floor: ({ path, precision }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute floor because ${initial} at ${path} is not a number`)
    }
    const updated = _.floor(initial, precision)
    _.set(context, path, updated)
  },
  max: ({ path, value }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute max because ${initial} at ${path} is not a number`)
    }
    const updated = _.max([initial, value])
    _.set(context, path, updated)
  },
  merge: ({ path, value: valueRaw }, context): void => {
    const initial = _.get(context, path)

    let value
    try {
      value = JSON.parse(valueRaw)
    } catch (e) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${valueRaw}`)
    }

    if (!_.isObject(value) || (!_.isNil(initial) && !_.isObject(initial))) {
      throw new TypeError('Can only merge two objects.')
    }
    const updated = _.isNil(initial) ? value : _.merge(initial, value)
    _.set(context, path, updated)
  },
  min: ({ path, value }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute min because ${initial} at ${path} is not a number`)
    }
    const updated = _.min([initial, value])
    _.set(context, path, updated)
  },
  multiply: ({ path, value }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't compute ceiling because ${initial} at ${path} is not a number`)
    }
    const updated = initial * value
    _.set(context, path, updated)
  },
  pull: ({ path, value: valueRaw }, context): void => {
    const initial = _.get(context, path)
    if (!Array.isArray(initial)) {
      return
    }

    let value
    try {
      value = JSON.parse(valueRaw)
    } catch (e) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${valueRaw}`)
    }

    const valueIsObject = _.isObject(value) && !_.isArray(value)
    const comparatorFunc = valueIsObject ? _.isMatch : _.isEqual
    const updated = _.pullAllWith(initial, _.isArray(value) ? value : [value], comparatorFunc)
    _.set(context, path, updated)
  },
  round: ({ path, precision }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't round because ${initial} at ${path} is not a number`)
    }
    const updated = _.round(initial, precision)
    _.set(context, path, updated)
  },
  set: ({ path, value: valueRaw }, context): void => {
    let value
    try {
      value = JSON.parse(valueRaw)
    } catch (e) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${valueRaw}`)
    }

    _.set(context, path, value)
  },
  subtract: ({ path, value }, context): void => {
    const initial = _.get(context, path)
    if (!_.isNumber(initial)) {
      throw new TypeError(`Can't subtract because ${initial} at ${path} is not a number`)
    }
    const updated = initial - value
    _.set(context, path, updated)
  },
  unset: ({ path }, context): void => {
    _.unset(context, path)
  },
}
