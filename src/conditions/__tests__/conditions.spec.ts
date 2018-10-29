import { Chance } from 'chance'
import { trim } from 'lodash'

import { getFieldNamesFromSource } from '../../graphql/utils'
import ConditionExecutor from '../condition-executor'
import { defaultConditionFields, defaultConditionResolvers } from '../conditions'

const chance = new Chance()
const context = {
  alwaysNull: null,
  alwaysTrue: true,
  alwaysUndefined: undefined,
  someFloat: chance.floating({ min: 1, max: 100 }),
  someInt: chance.integer({ min: 1, max: 100 }),
  someParentObject: {
    someNumberArray: [chance.integer({ min: 1, max: 100 })],
    someObject: {
      someField: chance.word(),
      someOtherField: chance.integer({ min: 1, max: 100 }),
    },
    someObjectArray: [{
      someField: chance.word(),
      someOtherField: chance.integer({ min: 1, max: 100 }),
    }],
    someStringArray: [chance.string()],
  },
  someString: chance.word(),
}

function assertExecutes (expected: boolean, field: string) {
  test('should execute: ' + trim(field), async () => {
    const executor = new ConditionExecutor()
    const ctx = Object.assign({}, context)
    const query = `{ ${field} }`
    const result = await executor.executeAll([query], ctx)
    expect(result).toEqual([expected])
    expect(ctx).toEqual(context)
  })
}

function assertRejects (field: string) {
  test('should reject: ' + trim(field), async () => {
    const executor = new ConditionExecutor()
    const ctx = Object.assign({}, context)
    const query = `{ ${field} }`
    await expect(executor.executeAll([query], ctx)).rejects.toBeDefined()
  })
}

describe('Conditions', () => {
  describe('resolvers', () => {
    it('should have resolvers for all default fields', async () => {
      const defaultFieldNames = getFieldNamesFromSource(defaultConditionFields)
      const defaultResolverNames = Object.keys(defaultConditionResolvers)
      expect(defaultFieldNames.length).toBe(defaultResolverNames.length)

      for (const defaultFieldName of defaultFieldNames) {
        expect(defaultResolverNames).toContain(defaultFieldName)
      }
    })
  })

  describe('add', async () => {
    assertExecutes(true, `
      always
    `)
  })

  describe('closeTo', async () => {
    assertExecutes(true, `
      closeTo(path:"someFloat", value: ${context.someFloat + 0.001})
    `)
    assertExecutes(false, `
      closeTo(path:"someFloat", value: ${context.someFloat + 0.1})
    `)
    assertExecutes(true, `
      closeTo(path:"someFloat", value: ${context.someFloat + 0.1}, precision: 0)
    `)
  })

  describe('equalsNumber', async () => {
    assertExecutes(true, `
      equalsNumber(path:"someInt", value: ${context.someInt})
    `)
    assertExecutes(false, `
      equalsNumber(path:"someInt", value: ${context.someInt - 1})
    `)
  })

  describe('equalsObject', async () => {
    let escapedJSON = JSON.stringify(context.someParentObject.someObject).replace(/"/g, '\\"')
    assertExecutes(true, `
      equalsObject(path:"someParentObject.someObject", value: "${escapedJSON}")
    `)
    const wrongObject = Object.assign({ foo: 'Foo1' }, context.someParentObject.someObject)
    escapedJSON = JSON.stringify(wrongObject).replace(/"/g, '\\"')
    assertExecutes(false, `
      equalsObject(path:"someParentObject.someObject", value: "${escapedJSON}")
    `)

    assertRejects(`
    equalsObject(path:"someParentObject.someObject", value: "foo: 5")
    `)
  })

  describe('greaterThan', async () => {
    assertExecutes(true, `
      greaterThan(path:"someFloat", value: ${context.someFloat - 1})
    `)
    assertExecutes(false, `
      greaterThan(path:"someFloat", value: ${context.someFloat})
    `)
  })

  describe('greaterThanOrEqual', async () => {
    assertExecutes(true, `
      greaterThanOrEqual(path:"someFloat", value: ${context.someFloat})
    `)
    assertExecutes(false, `
      greaterThanOrEqual(path:"someFloat", value: ${context.someFloat + 1})
    `)
  })

  describe('includesFloat', async () => {
    assertExecutes(true, `
      includesFloat(path:"someParentObject.someNumberArray", value: ${context.someParentObject.someNumberArray[0]})
    `)
    assertExecutes(false, `
      includesFloat(path:"someParentObject.someNumberArray", value: ${context.someParentObject.someNumberArray[0] + 1})
    `)
  })

  describe('includesObject', async () => {
    let escapedJSON = JSON.stringify(context.someParentObject.someObjectArray[0]).replace(/"/g, '\\"')
    assertExecutes(true, `
      includesObject(path:"someParentObject.someObjectArray", value: "${escapedJSON}")
    `)
    const wrongObject = Object.assign({ foo: 'Foo1' }, context.someParentObject.someObjectArray[0])
    escapedJSON = JSON.stringify(wrongObject).replace(/"/g, '\\"')
    assertExecutes(false, `
      includesObject(path:"someParentObject.someObjectArray", value: "${escapedJSON}")
    `)

    assertRejects(`
      includesObject(path:"someParentObject.someObjectArray", value: "foo: 3")
    `)
  })

  describe('includesString', async () => {
    assertExecutes(true, `
      includesString(path:"someParentObject.someStringArray", value: "${context.someParentObject.someStringArray[0]}")
    `)
    assertExecutes(false, `
      includesString(path:"someParentObject.someStringArray", value: "${
        context.someParentObject.someStringArray[0] + 'a'
      }")
    `)
  })

  describe('isFalsy', async () => {
    assertExecutes(false, `
      isFalsy(path:"alwaysTrue")
    `)
    assertExecutes(false, `
      isFalsy(path:"someParentObject")
    `)
    assertExecutes(true, `
      isFalsy(path:"alwaysUndefined")
    `)
    assertExecutes(true, `
      isFalsy(path:"alwaysNull")
    `)
  })

  describe('isNull', async () => {
    assertExecutes(false, `
      isNull(path:"alwaysTrue")
    `)
    assertExecutes(false, `
      isNull(path:"someParentObject")
    `)
    assertExecutes(false, `
      isNull(path:"alwaysUndefined")
    `)
    assertExecutes(true, `
      isNull(path:"alwaysNull")
    `)
  })

  describe('isTruthy', async () => {
    assertExecutes(true, `
      isTruthy(path:"alwaysTrue")
    `)
    assertExecutes(true, `
      isTruthy(path:"someParentObject")
    `)
    assertExecutes(false, `
      isTruthy(path:"alwaysUndefined")
    `)
    assertExecutes(false, `
      isTruthy(path:"alwaysNull")
    `)
  })

  describe('isUndefined', async () => {
    assertExecutes(false, `
      isUndefined(path:"alwaysTrue")
    `)
    assertExecutes(false, `
      isUndefined(path:"someParentObject")
    `)
    assertExecutes(true, `
      isUndefined(path:"alwaysUndefined")
    `)
    assertExecutes(false, `
      isUndefined(path:"alwaysNull")
    `)
  })

  describe('lessThan', async () => {
    assertExecutes(true, `
      lessThan(path:"someFloat", value: ${context.someFloat + 1})
    `)
    assertExecutes(false, `
      lessThan(path:"someFloat", value: ${context.someFloat})
    `)
  })

  describe('lessThanOrEqual', async () => {
    assertExecutes(true, `
      lessThanOrEqual(path:"someFloat", value: ${context.someFloat})
    `)
    assertExecutes(false, `
      lessThanOrEqual(path:"someFloat", value: ${context.someFloat - 1})
    `)
  })

  describe('never', async () => {
    assertExecutes(false, `
      never
    `)
  })

  describe('matchesObject', async () => {
    let object: {} = context.someParentObject.someObject
    let escapedJSON: string = JSON.stringify(object).replace(/"/g, '\\"')
    assertExecutes(true, `
      matchesObject(path:"someParentObject.someObject", value: "${escapedJSON}")
    `)

    object = Object.assign({}, context.someParentObject.someObject, { someField: 'Foo1' })
    escapedJSON = JSON.stringify(object).replace(/"/g, '\\"')
    assertExecutes(false, `
      matchesObject(path:"someParentObject.someObject", value: "${escapedJSON}")
    `)

    object = Object.assign({ foo: 'Foo1' }, context.someParentObject.someObject)
    escapedJSON = JSON.stringify(object).replace(/"/g, '\\"')
    assertExecutes(false, `
      matchesObject(path:"someParentObject.someObject", value: "${escapedJSON}")
    `)

    object = { someField: context.someParentObject.someObject.someField }
    escapedJSON = JSON.stringify(object).replace(/"/g, '\\"')
    assertExecutes(true, `
      matchesObject(path:"someParentObject.someObject", value: "${escapedJSON}")
    `)

    assertRejects(`
      matchesObject(path:"someParentObject.someObject", value: "foo: 5")
    `)
  })

  describe('matchesRegex', async () => {
    assertExecutes(true, `
      matchesRegex(path: "someString", value:"${context.someString}")
    `)
    assertExecutes(true, `
      matchesRegex(path: "someString", value:"${context.someString.substring(1)}")
    `)
    assertExecutes(false, `
      matchesRegex(path: "someString", value:"${context.someString + 'a'}")
    `)
  })
})
