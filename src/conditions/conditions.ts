import * as _ from 'lodash'

export interface ConditionResolverMap {
  [key: string]: (args: { [key: string]: any }, context: any) => Promise<boolean> | boolean
}

export const defaultConditionFields: string = `
  "Always resolves to true"
  always: Boolean!

  "Whether value at path is within the specified precision of the value."
  closeTo(path: String!, value: Float!, precision: Int = 2): Boolean!

  "Whether value at path equals provided value using strict equality comparison."
  equalsNumber(path: String!, value: Int!): Boolean!

  "Whether value at path equals provided JSON value after it is parsed into an object. Does a deep comparison."
  equalsObject(path: String!, value: JSON!): Boolean!

  "Whether value at path equals provided value using strict equality comparison."
  equalsString(path: String!, value: String!): Boolean!

  "Whether value at path is greater than value."
  greaterThan(path: String!, value: Float!): Boolean!

  "Whether value at path is greater than or equal to value."
  greaterThanOrEqual(path: String!, value: Float!): Boolean!

  "Whether the value at path includes a member that matches the specified value."
  includesFloat(path: String!, value: Float!): Boolean!

  """
  Whether the value at path includes a member that matches the specified value.
  The value should be a JSON representing an object that will be passed to lodash's matches method.
  """
  includesObject(path: String!, value: JSON!): Boolean!

  "Whether the value at path includes a member that matches the specified value."
  includesString(path: String!, value: String!): Boolean!

  "Whether value at path is falsy."
  isFalsy(path: String!): Boolean!

  "Whether value at path is null."
  isNull(path: String!): Boolean!

  "Whether value at path is truthy."
  isTruthy(path: String!): Boolean!

  "Whether value at path is undefined."
  isUndefined(path: String!): Boolean!

  "Whether value at path is less than value."
  lessThan(path: String!, value: Float!): Boolean!

  "Whether value at path is less than or equal to value."
  lessThanOrEqual(path: String!, value: Float!): Boolean!

  "Whether value at path matches the JSON value. See lodash's match method for more information."
  matchesObject(path: String!, value: JSON!): Boolean!

  "Whether value at path matches the regular expression value."
  matchesRegex(path: String!, value: String!, flags: String = ""): Boolean!

  "Always resolves to false"
  never: Boolean!
`

export const defaultConditionResolvers: ConditionResolverMap = {
  always: () => true,
  closeTo: ({ path, value: expected, precision }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = Number(actualRaw)

    const pow = Math.pow(10, precision + 1)
    const delta = Math.abs(expected - actual)
    const maxDelta = Math.pow(10, -precision) / 2

    return Boolean((Math.round(delta * pow) / pow) <= maxDelta)
  },
  equalsNumber: ({ path, value: expected }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = Number(actualRaw)

    return _.isEqual(actual, expected)
  },
  equalsObject: ({ path, value: expectedRaw }, context): boolean => {
    const actual = _.get(context, path)
    let expected = null

    try {
      expected = JSON.parse(expectedRaw)
    } catch (error) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${expectedRaw}`)
    }

    return _.isEqual(actual, expected)
  },
  equalsString: ({ path, value: expected }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = String(actualRaw)

    return _.isEqual(actual, expected)
  },
  greaterThan: ({ path, value: expected }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = Number(actualRaw)

    return actual > expected
  },
  greaterThanOrEqual: ({ path, value: expected }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = Number(actualRaw)

    return actual >= expected
  },
  includesFloat: ({ path, value: expected }, context): boolean => {
    const actual = _.get(context, path)
    if (!_.isArray(actual)) {
      return false
    }

    return actual.find((element) => element === expected)
  },
  includesObject: ({ path, value: expectedRaw }, context): boolean => {
    const actual = _.get(context, path)
    let expected = null
    if (!_.isArray(actual)) {
      return false
    }

    try {
      expected = JSON.parse(expectedRaw)
    } catch (error) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${expectedRaw}`)
    }

    return !!_.find(actual, expected)
  },
  includesString: ({ path, value: expected }, context): boolean => {
    const actual = _.get(context, path)
    if (!_.isArray(actual)) {
      return false
    }

    return actual.find((element) => element === expected)
  },
  isFalsy: ({ path }, context): boolean => {
    const actual = _.get(context, path)

    return !!!actual
  },
  isNull: ({ path }, context): boolean => {
    const actual = _.get(context, path)

    return actual === null
  },
  isTruthy: ({ path }, context): boolean => {
    const actual = _.get(context, path)

    return !!actual
  },
  isUndefined: ({ path }, context): boolean => {
    const actual = _.get(context, path)

    return actual === undefined
  },
  lessThan: ({ path, value: expected }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = Number(actualRaw)

    return actual < expected
  },
  lessThanOrEqual: ({ path, value: expected }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = Number(actualRaw)

    return actual <= expected
  },
  matchesObject: ({ path, value: expectedRaw }, context): boolean => {
    const actual = _.get(context, path)
    let expected = null

    try {
      expected = JSON.parse(expectedRaw)
    } catch (error) {
      throw new TypeError(`Invalid JSON. Did you remember to escape double quotes? Received: ${expectedRaw}`)
    }

    return _.isMatch(actual, expected)
  },
  matchesRegex: ({ path, value, flags }, context): boolean => {
    const actualRaw = _.get(context, path)
    const actual = String(actualRaw)
    const regex = RegExp(value, flags)

    return regex.test(actual)
  },
  never: () => false,
}
