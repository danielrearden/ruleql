import * as DataLoader from 'dataloader'
import {
  FieldNode,
  OperationDefinitionNode,
} from 'graphql'
import * as _ from 'lodash'

import BaseExecutor from '../graphql/base-executor'
import { ExecutionContext, Rule } from '../rule-engine/rules'
import { defaultConditionFields, defaultConditionResolvers, ConditionResolverMap } from './conditions'

export interface ConditionExecutorConfig {
  fields?: string,
  additionalTypeDefs?: string,
  resolvers?: ConditionResolverMap,
}

const dataLoaderConfig = {
  cacheKeyFn: ({ name, args }) => `${name}:${JSON.stringify(args)}`,
}

export default class ConditionExecutor extends BaseExecutor {
  private dataLoader: DataLoader<{ name: string, args: {} }, boolean>

  constructor (config: ConditionExecutorConfig = {}) {
    super({
      ...config,
      defaultResolvers: defaultConditionResolvers,
      schemaBuilder: (fields) => `
        schema {
          query: Conditions
        }

        type Conditions {
          and: Conditions
          or: Conditions
          xor: Conditions
          not: Conditions

          ${defaultConditionFields}

          ${fields}
        }
      `,
    })
  }

  /**
   * Validates an array of condition sets and returns a Promise that resolves to
   * an array of booleans indicating whether each condition set was met
   */
  public async executeAll (rules: Rule[], context: ExecutionContext): Promise<boolean[]> {
    this.dataLoader = new DataLoader((keyInputs) => {
      return Promise.all(keyInputs.map(async ({ name, args }) => {
        const resolver = this.resolvers[name] || _.noop
        const value = await resolver(args, context)
        return Boolean(value)
      }))
    }, dataLoaderConfig)
    return Promise.all(rules.map((rule) => this.execute(rule.conditions)))
  }

  /**
   * Validates a single set of conditions and returns a Promise that resolves to
   * a boolean indicating whether the conditions were met.
   */
  private async execute (conditions: string): Promise<boolean> {
    const operationNode = this.getDocumentOperationNode(conditions)
    return this.validateConditions(operationNode)
  }

  /**
   * Validates the condition or conditions for the given field node in the document
   */
  private validateConditions = async (
    field: FieldNode | OperationDefinitionNode,
  ): Promise<boolean> => {
    const kind: string = field.kind
    const name: string = field.name && field.name.value
    const isRootQuery = kind === 'OperationDefinition'

    if (isRootQuery || name === 'and') {
      return this.validateANDConditions(field as FieldNode)
    } else if (name === 'or') {
      return this.validateORConditions(field as FieldNode)
    } else if (name === 'xor') {
      return this.validateXORConditions(field as FieldNode)
    } else if (name === 'not') {
      return this.validateNOTConditions(field as FieldNode)
    } else {
      return this.validateSingleCondition(field as FieldNode)
    }
  }

  /**
   *
   * Checks all the conditions inside a field's selection set and only returns true if all the conditions are true
   */
  private validateANDConditions = async (field: FieldNode): Promise<boolean> => {
    const selections = field.selectionSet.selections
    const results = await Promise.all(selections.map((selection) => {
      return this.validateConditions(selection as FieldNode)
    }))
    return results.every((t) => t)
  }

  /**
   * Checks the conditions inside a field's selection set and returns true if at least one of the conditions is true
   */
  private validateORConditions = async (field: FieldNode): Promise<boolean> => {
    const selections = field.selectionSet.selections
    const results = await Promise.all(selections.map((selection) => {
      return this.validateConditions(selection as FieldNode)
    }))
    return results.includes(true)
  }

  /**
   * Checks the conditions inside a field's selection set and returns true if exactly one of the conditions is true.
   */
  private validateXORConditions = async (field: FieldNode): Promise<boolean> => {
    const selections = field.selectionSet.selections
    const results = await Promise.all(selections.map((selection) => {
      return this.validateConditions(selection as FieldNode)
    }))
    const trueCount = results.reduce((count, isTrue) => count + (isTrue ? 1 : 0), 0)
    return trueCount === 1
  }

  /**
   * Negates the condition inside the field's selection set (i.e. if the condition returns true, this will return false
   * and vice versa). This is meant to negate a single condition, but if multiple conditions are specified,
   * this will behave as a "NAND" operation -- the conditions will be grouped under an "AND" operation
   * and the resulting value will then be negated
   */
  private validateNOTConditions = async (field: FieldNode): Promise<boolean> => {
    const value = await this.validateANDConditions(field)
    return !value
  }

  /**
   * Checks whether the condition specified by the field is true. This method relies on the appropriate resolver
   * being present and returning a boolean or a Promise that will resolve in a boolean.
   * Note: the value the resolver resolves to is coerced into a boolean before being returned by this method.
   */
  private validateSingleCondition = async (field: FieldNode): Promise<boolean> => {
    const name = field.name.value
    const args = this.getArgs(field, 'Conditions')
    return this.dataLoader.load({ name, args })
  }

}
