import {
  assertValidSchema,
  buildSchema,
  parse,
  validate,
  DocumentNode,
  FieldNode,
  GraphQLObjectType,
  GraphQLSchema,
  ObjectTypeDefinitionNode,
  OperationDefinitionNode,
} from 'graphql'
import { getFieldDef } from 'graphql/execution/execute'
import { getArgumentValues } from 'graphql/execution/values'
import * as customTypes from './custom-types'
import { validationRules } from './validation-rules'

export interface BaseExecutorResolverMap {
  [key: string]: (args: { [key: string]: any }, context: any) => any
}

export type SchemaBuilderFunc = (fields: string) => string

export interface BaseExecutorConfig {
  fields?: string,
  additionalTypeDefs?: string,
  resolvers?: BaseExecutorResolverMap,
  defaultResolvers: BaseExecutorResolverMap,
  schemaBuilder: SchemaBuilderFunc,
}

/**
 * Base class for executing a document using a schema and a map of resolver functions. Components extending this class
 * should override the `execute` and `executeAll` methods. These two methods should encapsulate all execution logic.
 */
export default abstract class BaseExecutor {
  public resolvers: BaseExecutorResolverMap
  public schema: GraphQLSchema

  constructor ({
    resolvers = {},
    defaultResolvers = {},
    fields = '',
    additionalTypeDefs = '',
    schemaBuilder = () => '',
  }: BaseExecutorConfig) {
    if (fields.length) {
      this.assertValidFields(fields, 'Boolean')
      this.assertValidResolvers(fields, resolvers)
    }

    this.resolvers = { ...defaultResolvers, ...resolvers }
    this.schema = this.buildCustomSchema(fields, additionalTypeDefs, schemaBuilder)
  }

  /**
   * Execution method that should be overriden by implementing class.
   */
  public abstract executeAll (...args: any[]): Promise<any>

  /**
   * Gets an object representing the values of a field's arguments
   */
  protected getArgs = (field: FieldNode, parentTypeName: string): { [key: string]: any } => {
    const parentType = this.schema.getType(parentTypeName) as GraphQLObjectType
    const fieldDef = getFieldDef(this.schema, parentType, field.name.value)
    return getArgumentValues(fieldDef, field, {})
  }

  /**
   * Parses query string into document and returns node representing document's query operation
   */
  protected getDocumentOperationNode (source: string): OperationDefinitionNode {
  const document = parse(source, { noLocation: true })

  this.assertValidDocument(document)

  const queryNode = document.definitions.find((def) => (def as OperationDefinitionNode).operation === 'query')
  if (!queryNode) {
    throw new Error('Invalid document. Only queries are supported.')
  }
  return queryNode as OperationDefinitionNode
}

  /**
   * Asserts the provided document is valid
   */
  private assertValidDocument = (document: DocumentNode): void => {
    const errors = validate(this.schema, document, validationRules)
    if (errors.length) {
      throw new Error(`Invalid schema: ${errors[0].message}`)
    }
  }

  /**
   * Asserts the provided fields are valid. Used for executors where all fields are expected to be of a specific type.
   */
  private assertValidFields = (queries: string, typeName: string): void => {
    const source = `type TestType {
      ${queries}
    }`
    const document = parse(source, { noLocation: true })
    const type = document.definitions[0] as ObjectTypeDefinitionNode
    for (const field of type.fields) {
      if (field.type.kind === 'NamedType' && field.type.name.value !== typeName) {
        throw new Error(`Field "${field.name.value}" should be of type ${typeName} but is ${field.type.name.value}`)
      }
    }
  }

  /**
   * Asserts the provided fields and resolvers match
   */
  private assertValidResolvers = (
    fields: string,
    resolvers: BaseExecutorResolverMap = {},
  ): void => {
    const source = `type TestType {
      ${fields}
    }`
    const document = parse(source, { noLocation: true })
    const type = document.definitions[0] as ObjectTypeDefinitionNode

    for (const field of type.fields) {
      const resolverMissing = !resolvers[field.name.value]
      if (resolverMissing) {
        throw new Error(`Missing resolver for custom field ${field.name.value}`)
      }
    }

    const resolverNames = Object.keys(resolvers)
    for (const resolverName of resolverNames) {
      const extraResolver = !type.fields.find((field) => field.name.value === resolverName)
      if (extraResolver) {
        throw new Error(`Resolver defined for field ${resolverName} but no such field exists.`)
      }
    }
  }

  /**
   * Builds a schema based on the passed in fields and type definitions.
   */
  private buildCustomSchema = (
    fields: string,
    additionalTypeDefs: string,
    schemaBuilder: SchemaBuilderFunc,
  ): GraphQLSchema => {
    const baseSchema = schemaBuilder(fields)
    const customTypeNames = Object.keys(customTypes)
    const typeDefs = `
    ${customTypeNames.map((typeName) => `
    scalar ${typeName}
    `)}

    ${baseSchema}

    ${additionalTypeDefs}
  `
    const schema = buildSchema(typeDefs)

    // Note: We're just assigning each custom type to the schema's private _typeMap property.
    // The alternative here would be to recreate the schema like graphql-tools does.
    customTypeNames.forEach((typeName) => {
      // tslint:disable-next-line:no-string-literal
      Object.assign(schema['_typeMap'][typeName], customTypes[typeName])
    })

    assertValidSchema(schema)

    return schema
  }
}
