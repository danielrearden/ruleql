import {
  FieldNode,
  OperationDefinitionNode,
} from 'graphql'
import * as _ from 'lodash'

import BaseExecutor from '../graphql/base-executor'
import { ExecutionContext, Rule } from '../rule-engine/rules'
import { defaultEffectFields, defaultEffectResolvers, EffectsResolverMap } from './effects'

export interface EffectExecutorConfig {
  fields?: string,
  additionalTypeDefs?: string,
  resolvers?: EffectsResolverMap,
}

export default class EffectExecutor extends BaseExecutor {
  constructor (config: EffectExecutorConfig = {}) {
    super({
      ...config,
      defaultResolvers: defaultEffectResolvers,
      schemaBuilder: (fields) => `
      type Query {
        ${defaultEffectFields}

        ${fields}
      }
      `,
    })
  }

  /**
   * Executes an array of effect sets.
   */
  public async executeAll (rules: Rule[], context: ExecutionContext): Promise<void> {
    for (const rule of rules) {
      context.rule = _.omit(rule, ['effects', 'conditions'])
      await this.execute(rule.effects, context)
    }
  }

  /**
   * Executes a single set of effects.
   */
  private async execute (effects: string, context: ExecutionContext): Promise<void> {
    const operationNode = this.getDocumentOperationNode(effects)
    return this.executeEffect(operationNode, context)
  }

  private executeEffect = async (
    operationNode: OperationDefinitionNode,
    context: ExecutionContext,
  ): Promise<void> => {
    await Promise.all(operationNode.selectionSet.selections.map(async (selection) => {
      const field = selection as FieldNode
      const name = field.name.value

      const resolver = this.resolvers[name]
      if (resolver === undefined) {
        throw new Error(`Missing resolver for effect "${name}"`)
      }

      const args = this.getArgs(field, 'Query')

      await resolver(args, context)
    }))
  }
}
