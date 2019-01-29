import * as _ from 'lodash'
import * as inspect from 'util-inspect'
import { ExecutionContext } from '../rule-engine/rules'

export interface ConditionResolverMap {
  [key: string]: (args: { [key: string]: any }, context: ExecutionContext) => Promise<boolean> | boolean
}

export const defaultConditionFields: string = `
  "Always resolves to true"
  always: Boolean!

  "Whether value at path is within the specified precision of the value."
  closeTo(path: String!, value: Float, valuePath: String precision: Int = 2): Boolean!

  "Whether value at path equals provided value using strict equality comparison."
  equalsNumber(path: String!, value: Int, valuePath: String): Boolean!

  "Whether value at path equals provided JSON value after it is parsed into an object. Does a deep comparison."
  equalsObject(path: String!, value: JSON, valuePath: String): Boolean!

  "Whether value at path equals provided value using strict equality comparison."
  equalsString(path: String!, value: String, valuePath: String): Boolean!

  "Whether value at path is greater than value."
  greaterThan(path: String!, value: Float, valuePath: String): Boolean!

  "Whether value at path is greater than or equal to value."
  greaterThanOrEqual(path: String!, value: Float, valuePath: String): Boolean!

  "Whether the value at path includes a member that matches the specified value."
  includesFloat(path: String!, value: Float, valuePath: String): Boolean!

  """
  Whether the value at path includes a member that matches the specified value.
  The value should be a JSON representing an object that will be passed to lodash's matches method.
  """
  includesObject(path: String!, value: JSON, valuePath: String): Boolean!

  "Whether the value at path includes a member that matches the specified value."
  includesString(path: String!, value: String, valuePath: String): Boolean!

  "Whether value at path is falsy."
  isFalsy(path: String!): Boolean!

  "Whether value at path is null."
  isNull(path: String!): Boolean!

  "Whether value at path is truthy."
  isTruthy(path: String!): Boolean!

  "Whether value at path is undefined."
  isUndefined(path: String!): Boolean!

  "Whether value at path is less than value."
  lessThan(path: String!, value: Float, valuePath: String): Boolean!

  "Whether value at path is less than or equal to value."
  lessThanOrEqual(path: String!, value: Float, valuePath: String): Boolean!

  "Whether value at path matches the JSON value. See lodash's match method for more information."
  matchesObject(path: String!, value: JSON, valuePath: String): Boolean!

  "Whether value at path matches the regular expression value."
  matchesRegex(path: String!, value: String, valuePath: String, flags: String = ""): Boolean!

  "Always resolves to false"
  never: Boolean!
`

export const defaultConditionResolvers: ConditionResolverMap = {
  always: () => true,
  closeTo: ({ path, value, valuePath, precision }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = Number(actualRaw)
    const val = getValue(value, valuePath, context)

    const pow = Math.pow(10, precision + 1)
    const delta = Math.abs(val - actual)
    const maxDelta = Math.pow(10, -precision) / 2

    return Boolean((Math.round(delta * pow) / pow) <= maxDelta)
  },
  equalsNumber: ({ path, value, valuePath }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = Number(actualRaw)
    const val = getValue(value, valuePath, context)

    return _.isEqual(actual, val)
  },
  equalsObject: ({ path, value, valuePath }, context): boolean => {
    const val = getParsedValue(value, valuePath, context)
    const actual = _.result(context, path)

    return _.isEqual(actual, val)
  },
  equalsString: ({ path, value, valuePath }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = String(actualRaw)
    const val = getValue(value, valuePath, context)

    return _.isEqual(actual, val)
  },
  greaterThan: ({ path, value, valuePath }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = Number(actualRaw)
    const val = getValue(value, valuePath, context)

    return actual > val
  },
  greaterThanOrEqual: ({ path, value, valuePath }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = Number(actualRaw)
    const val = getValue(value, valuePath, context)

    return actual >= val
  },
  includesFloat: ({ path, value, valuePath }, context): boolean => {
    const actual = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isArray(actual)) {
      return false
    }

    return actual.find((element) => element === val)
  },
  includesObject: ({ path, value, valuePath }, context): boolean => {
    const val = getParsedValue(value, valuePath, context)
    const actual = _.result(context, path)

    if (!_.isArray(actual)) {
      return false
    }

    return !!_.find(actual, val)
  },
  includesString: ({ path, value, valuePath }, context): boolean => {
    const actual = _.result(context, path)
    const val = getValue(value, valuePath, context)
    if (!_.isArray(actual)) {
      return false
    }

    return actual.find((element) => element === val)
  },
  isFalsy: ({ path }, context): boolean => {
    const actual = _.result(context, path)

    return !!!actual
  },
  isNull: ({ path }, context): boolean => {
    const actual = _.result(context, path)

    return actual === null
  },
  isTruthy: ({ path }, context): boolean => {
    const actual = _.result(context, path)

    return !!actual
  },
  isUndefined: ({ path }, context): boolean => {
    const actual = _.result(context, path)

    return actual === undefined
  },
  lessThan: ({ path, value, valuePath }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = Number(actualRaw)
    const val = getValue(value, valuePath, context)

    return actual < val
  },
  lessThanOrEqual: ({ path, value, valuePath }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = Number(actualRaw)
    const val = getValue(value, valuePath, context)

    return actual <= val
  },
  matchesObject: ({ path, value, valuePath }, context): boolean => {
    const val = getParsedValue(value, valuePath, context)
    const actual = _.result(context, path)

    return _.isMatch(actual, val)
  },
  matchesRegex: ({ path, value, valuePath, flags }, context): boolean => {
    const actualRaw = _.result(context, path)
    const actual = String(actualRaw)
    const val = getValue(value, valuePath, context)
    const regex = RegExp(val, flags)

    return regex.test(actual)
  },
  never: () => false,
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
