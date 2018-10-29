import BaseExecutor, { BaseExecutorConfig } from '../base-executor'

class TestBaseExecutor extends BaseExecutor {
  public execute: () => null
  public executeAll: () => null
}

const testDefaultResolversMap = {
  bar: () => false,
  foo: () => true,
}
const testDefaultFieldNames = Object.keys(testDefaultResolversMap)
const testSchemaBuilder = (fields) => `
  type Query {
    foo: Boolean!
    bar: Boolean!

    ${fields}
  }
`
const baseTestConfig: BaseExecutorConfig = {
  defaultResolvers: testDefaultResolversMap,
  schemaBuilder: testSchemaBuilder,
}

function getQueryTypeFieldNames (executor: BaseExecutor): string[] {
  const schema = executor.schema
  expect(schema).toBeDefined()
  expect(schema.getQueryType()).toBeDefined()
  return Object.keys(schema.getQueryType().getFields())
}

function assertConstructorThrows (config: BaseExecutorConfig): void {
  try {
    // tslint:disable-next-line:no-unused-expression
    new TestBaseExecutor(config)
    fail('BaseExecutor constructor did not throw')
  } catch (error) {
    expect(error).toBeDefined()
  }
}

describe('BaseExecutor', () => {
  describe('constructor', () => {
    it('should create a BaseExecutor with default fields for the Conditions type and default resolvers', () => {
      const executor = new TestBaseExecutor(baseTestConfig)
      const queryTypeFieldNames = getQueryTypeFieldNames(executor)

      for (const fieldName of testDefaultFieldNames) {
        expect(queryTypeFieldNames).toContain(fieldName)
      }

      expect(executor.resolvers).toEqual(testDefaultResolversMap)
    })

    it('should create a BaseExecutor with custom fields', () => {
      const customFields = `
        someCondition: Boolean
        someOtherCondition: Boolean
      `
      const customFieldResolvers = {
        someCondition: () => true,
        someOtherCondition: () => true,
      }
      const executor = new TestBaseExecutor({
        fields: customFields,
        resolvers: customFieldResolvers,
        ...baseTestConfig,
      })
      const queryTypeFieldNames = getQueryTypeFieldNames(executor)

      for (const fieldName of Object.keys(customFieldResolvers)) {
        expect(queryTypeFieldNames).toContain(fieldName)
      }

      expect(executor.resolvers).toMatchObject(customFieldResolvers)
    })

    it('should create a BaseExecutor with custom fields and custom input type', () => {
      const typeDefs = `
        input CustomInput {
          someField: Int
        }
      `
      const fields = `
        someCondition(input: CustomInput!): Boolean
      `
      const resolvers = {
        someCondition: () => true,
      }
      const config = { fields, resolvers, additionalTypeDefs: typeDefs, ...baseTestConfig }
      const executor = new TestBaseExecutor(config)
      expect(executor).toBeDefined()
    })

    it('should throw if a custom type is used without being passed in', () => {
      const fields = `
        someCondition(input: CustomInput!): Boolean
      `
      const resolvers = {
        someCondition: () => true,
      }
      const config = { fields, resolvers, ...baseTestConfig }
      assertConstructorThrows(config)
    })

    it('should throw if a resolver is missing', () => {
      const fields = `
        someCondition: Boolean
        someOtherCondition: Boolean
      `
      const resolvers = {
        someCondition: () => true,
      }
      const config = { fields, resolvers, ...baseTestConfig }
      assertConstructorThrows(config)
    })

    it('should throw if a resolver is included for a field that does not exist', () => {
      const fields = `
        someCondition: Boolean
      `
      const resolvers = {
        someCondition: () => true,
        someOtherCondition: () => true,
      }
      const config = { fields, resolvers, ...baseTestConfig }
      assertConstructorThrows(config)
    })
  })
})
