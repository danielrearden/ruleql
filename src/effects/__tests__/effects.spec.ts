import { Chance } from 'chance'
import { isEqual, trim } from 'lodash'

import { getFieldNamesFromSource } from '../../graphql/utils'
import { ExecutionContext } from '../../rule-engine/rules'
import EffectExecutor from '../effect-executor'
import { defaultEffectFields, defaultEffectResolvers } from '../effects'

const chance = new Chance()
const context: ExecutionContext = {
  alwaysNull: null,
  alwaysTrue: true,
  alwaysUndefined: undefined,
  someFloat: chance.floating({ min: 1, max: 100 }),
  someInt: chance.integer({ min: 1, max: 100 }),
  someNumberArray: [chance.integer({ min: 1, max: 100 }), chance.integer({ min: 1, max: 100 })],
  someObject: {
    someField: chance.word(),
    someOtherField: chance.integer({ min: 1, max: 100 }),
  },
  someObjectArray: [
    {
      someField: chance.word(),
      someOtherField: chance.integer({ min: 1, max: 100 }),
    },
    {
      someField: chance.word(),
      someOtherField: chance.integer({ min: 1, max: 100 }),
    },
  ],
  someOtherObject: {
    someOtherField: chance.word(),
    someOtherOtherField: chance.integer({ min: 1, max: 100 }),
  },
  someString: chance.word(),
  someStringArray: [chance.string(), chance.string()],
}

function assertExecutes (expected: object, field: string) {
  test('should execute: ' + trim(field), async () => {
    const executor = new EffectExecutor()
    const ctx = Object.assign({}, context)
    const query = `{ ${field} }`
    const rule = { effects: query, conditions: '' }
    await executor.executeAll([rule], ctx)
    expect(ctx).toMatchObject(expected)
  })
}

function assertRejects (field: string) {
  test('should reject: ' + trim(field), async () => {
    const executor = new EffectExecutor()
    const ctx = Object.assign({}, context)
    const query = `{ ${field} }`
    const rule = { effects: query, conditions: '' }
    await expect(executor.executeAll([rule], ctx)).rejects.toBeDefined()
  })
}

describe('Effects', () => {
  it('should have resolvers for all default fields', async () => {
    const defaultFieldNames = getFieldNamesFromSource(defaultEffectFields)
    const defaultResolverNames = Object.keys(defaultEffectResolvers)
    expect(defaultFieldNames.length).toBe(defaultResolverNames.length)

    for (const defaultFieldName of defaultFieldNames) {
      expect(defaultResolverNames).toContain(defaultFieldName)
    }
  })

  describe('add', async () => {
    const int = chance.integer({min: 1, max: 100})
    assertExecutes({ someInt: context.someInt + int }, `
      add(path:"someInt", value: ${int})
    `)

    assertExecutes({ someInt: context.someInt + context.someInt }, `
      add(path:"someInt", valuePath: "someInt")
    `)

    assertRejects(`
      add(path:"someString", value: ${int})
    `)

    assertRejects(`
      add(path:"someString", value: ${int}, valuePath: "someInt")
    `)
  })

  describe('ceiling', async () => {
    assertExecutes({ someFloat: Math.ceil(context.someFloat) }, `
      ceiling(path:"someFloat")
    `)

    assertRejects(`
      ceiling(path:"someString")
    `)
  })

  describe('clamp', async () => {
    const int = chance.integer({min: 1, max: 100})
    let lower = context.someInt + int
    let upper = context.someInt + (2 * int)
    assertExecutes({ someInt: lower }, `
      clamp(path:"someInt", lower: ${lower}, upper: ${upper})
    `)

    lower = context.someInt - (2 * int)
    upper = context.someInt - int
    assertExecutes({ someInt: upper }, `
      clamp(path:"someInt", lower: ${lower}, upper: ${upper})
    `)

    assertRejects(`
      clamp(path:"someString", lower: ${lower}, upper: ${upper})
    `)
  })

  describe('concat', async () => {
    const word = chance.word()
    assertExecutes({ someStringArray: context.someStringArray.concat(word) }, `
      concat(path:"someStringArray", value: "\\"${word}\\"")
    `)

    const int = chance.integer({min: 1, max: 100})
    assertExecutes({ someNumberArray: context.someNumberArray.concat(int) }, `
      concat(path:"someNumberArray", value: "${int}")
    `)

    assertExecutes({ someNumberArray: context.someNumberArray.concat(context.someNumberArray) }, `
      concat(path:"someNumberArray", valuePath: "someNumberArray")
    `)

    const obj = { [chance.word()]: chance.word() }
    const objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    assertExecutes({ someObjectArray: context.someObjectArray.concat(obj) }, `
      concat(path:"someObjectArray", value: "${objJSON}")
    `)

    const bool = chance.bool()
    assertExecutes({ someString: [context.someString].concat(bool) }, `
      concat(path:"someString", value: "${bool}")
    `)

    assertRejects(`
      concat(path:"someStringArray", value: "foo: 10")
    `)

    assertRejects(`
      concat(path:"someObjectArray", value: "${objJSON}", valuePath: "someObjectArray")
    `)
  })

  describe('default', async () => {
    const str = chance.word()
    assertExecutes({ someNewPath: str }, `
      default(path:"someNewPath", value: "\\"${str}\\"")
    `)

    assertExecutes(context, `
      default(path:"someString", value: "\\"${str}\\"")
    `)

    assertRejects(`
      default(path:"someNewPath", value: "foo: 0")
    `)
  })

  describe('divide', async () => {
    const int = chance.integer({min: 1, max: 100})
    assertExecutes({ someInt: context.someInt / int }, `
      divide(path:"someInt", value: ${int})
    `)

    assertExecutes({ someInt: context.someInt / context.someInt }, `
      divide(path:"someInt", valuePath: "someInt")
    `)

    assertRejects(`
      divide(path:"someString", value: ${int})
    `)

    assertRejects(`
      divide(path:"someInt", value: 0)
    `)
  })

  describe('filter', async () => {
    let obj = context.someObjectArray[0]
    let objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    let expected = context.someObjectArray.filter((o) => isEqual(o, context.someObjectArray[0]))
    assertExecutes({ someObjectArray: expected }, `
      filter(path:"someObjectArray", value: "${objJSON}")
    `)

    const str = context.someStringArray[0]
    expected = context.someStringArray.filter((o) => isEqual(o, context.someStringArray[0]))
    assertExecutes({ someStringArray: expected }, `
      filter(path:"someStringArray", value: "\\"${str}\\"")
    `)

    const num = context.someNumberArray[0]
    expected = context.someNumberArray.filter((o) => isEqual(o, context.someNumberArray[0]))
    assertExecutes({ someNumberArray: expected }, `
      filter(path:"someNumberArray", value: "${num}")
    `)

    expected = context.someNumberArray.filter((o) => isEqual(o, context.someNumberArray[0]))
    assertExecutes({ someNumberArray: expected }, `
      filter(path:"someNumberArray", valuePath: "someNumberArray[0]")
    `)

    obj = { [chance.word()]: chance.word() }
    objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    assertExecutes(context, `
      filter(path:"someString", value: "${objJSON}")
    `)

    assertRejects(`
      filter(path:"someNumberArray", value: "foo: 0")
    `)

    assertRejects(`
      filter(path:"someNumberArray", value: ${context.someNumberArray[0]}, valuePath: "someNumberArray[0]")
    `)
  })

  describe('floor', async () => {
    assertExecutes({ someFloat: Math.floor(context.someFloat) }, `
      floor(path:"someFloat")
    `)

    assertRejects(`
      floor(path:"someString")
    `)
  })

  describe('max', async () => {
    let num = context.someFloat + chance.integer({min: 1, max: 100})
    assertExecutes({ someFloat: num }, `
      max(path:"someFloat", value: ${num})
    `)

    num = context.someFloat - chance.integer({min: 1, max: 100})
    assertExecutes(context, `
      max(path:"someFloat", value: ${num})
    `)

    assertExecutes({ someFloat: Math.max(context.someFloat, context.someInt) }, `
      max(path:"someFloat", valuePath: "someInt")
    `)

    assertRejects(`
      max(path:"someFloat", value: 1, valuePath: "someInt")
    `)

    assertRejects(`
      max(path:"someString")
    `)
  })

  describe('merge', async () => {
    const obj = { [chance.word()]: chance.word() }
    const objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    assertExecutes({ someObject: Object.assign({}, context.someObject, obj) }, `
      merge(path:"someObject", value: "${objJSON}")
    `)

    assertExecutes({ someObject: Object.assign({}, context.someObject, context.someOtherObject) }, `
      merge(path:"someObject", valuePath: "someOtherObject")
    `)

    assertExecutes({ alwaysUndefined: obj }, `
      merge(path:"alwaysUndefined", value: "${objJSON}")
    `)

    assertExecutes({ alwaysNull: obj }, `
      merge(path:"alwaysNull", value: "${objJSON}")
    `)

    assertRejects(`
      merge(path:"someObject", value: "foo: 10")
    `)

    assertRejects(`
      merge(path:"someObject", value: "10")
    `)

    assertRejects(`
      merge(path:"someInt", value: "${objJSON}")
    `)
  })

  describe('min', async () => {
    let num = context.someFloat - chance.integer({min: 1, max: 100})
    assertExecutes({ someFloat: num }, `
      min(path:"someFloat", value: ${num})
    `)

    assertExecutes({ someFloat: Math.min(context.someFloat, context.someInt) }, `
      min(path:"someFloat", valuePath: "someInt")
    `)

    num = context.someFloat + chance.integer({min: 1, max: 100})
    assertExecutes(context, `
      min(path:"someFloat", value: ${num})
    `)

    assertRejects(`
      min(path:"someString")
    `)

    assertRejects(`
      min(path:"someFloat", value: 2, valuePath:"someInt")
    `)
  })

  describe('multiply', async () => {
    const int = chance.integer({min: 2, max: 100})
    assertExecutes({ someInt: context.someInt * int }, `
      multiply(path:"someInt", value: ${int})
    `)

    assertExecutes({ someInt: context.someInt * context.someInt }, `
      multiply(path:"someInt", valuePath:"someInt")
    `)

    assertRejects(`
      multiply(path:"someString", value: ${int})
    `)

    assertRejects(`
      multiply(path:"someInt", value: 3, valuePath:"someInt")
    `)
  })

  describe('pull', async () => {
    let obj = context.someObjectArray[0]
    let objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    let expected = context.someObjectArray.filter((o) => !isEqual(o, context.someObjectArray[0]))
    assertExecutes({ someObjectArray: expected }, `
      pull(path:"someObjectArray", value: "${objJSON}")
    `)

    const str = context.someStringArray[0]
    expected = context.someStringArray.filter((o) => !isEqual(o, context.someStringArray[0]))
    assertExecutes({ someStringArray: expected }, `
      pull(path:"someStringArray", value: "\\"${str}\\"")
    `)

    expected = context.someNumberArray.filter((o) => !isEqual(o, context.someNumberArray[0]))
    assertExecutes({ someNumberArray: expected }, `
      pull(path:"someNumberArray", valuePath: "someNumberArray[0]")
    `)

    obj = { [chance.word()]: chance.word() }
    objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    assertExecutes(context, `
      pull(path:"someString", value: "${objJSON}")
    `)

    assertRejects(`
      pull(path:"someNumberArray", value: "foo: 0")
    `)

    assertRejects(`
      pull(path:"someNumberArray", value: 5, valuePath: "someNumberArray[0]")
    `)
  })

  describe('round', async () => {
    assertExecutes({ someFloat: Math.round(context.someFloat) }, `
      round(path:"someFloat")
    `)

    assertRejects(`
      round(path:"someString")
    `)
  })

  describe('set', async () => {
    const str = chance.word()
    assertExecutes({ someNewPath: str }, `
      set(path:"someNewPath", value: "\\"${str}\\"")
    `)

    const bool = chance.bool()
    assertExecutes({ someNewPath: bool }, `
      set(path:"someNewPath", value: "${bool}")
    `)

    const num = chance.integer({min: 1, max: 100})
    assertExecutes({ someNewPath: num }, `
      set(path:"someNewPath", value: "${num}")
    `)

    assertExecutes({ someNewPath: context.someInt }, `
      set(path:"someNewPath", valuePath: "someInt")
    `)

    const obj = context.someObjectArray[0]
    const objJSON = JSON.stringify(obj).replace(/"/g, '\\"')
    assertExecutes({ someNewPath: obj }, `
      set(path:"someNewPath", value: "${objJSON}")
    `)

    assertRejects(`
      set(path:"someNewPath", value: "foo: 0")
    `)
  })

  describe('subtract', async () => {
    const int = chance.integer({min: 1, max: 100})
    assertExecutes({ someInt: context.someInt - int }, `
      subtract(path:"someInt", value: ${int})
    `)

    assertExecutes({ someFloat: context.someFloat - context.someInt }, `
      subtract(path:"someFloat", valuePath: "someInt")
    `)

    assertRejects(`
      subtract(path:"someString", value: ${int})
    `)

    assertRejects(`
      subtract(path:"Int", value: ${int}, valuePath: "someInt")
    `)
  })

  describe('unset', async () => {
    assertExecutes(context, `
      unset(path:"someNewPath")
    `)

    const updatedContext = Object.assign({}, context)
    delete updatedContext.someString
    assertExecutes(updatedContext, `
      unset(path:"someString")
    `)
  })
})
