import {
  FieldNode,
  OperationDefinitionNode,
} from 'graphql'

import BaseExecutor from '../graphql/base-executor'
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
  public async executeAll (effectsArray: string[], context: any): Promise<void> {
    for (const effects of effectsArray) {
      await this.execute(effects, context)
    }
  }

  /**
   * Executes a single set of effects.
   */
  private async execute (effects: string, context: any): Promise<void> {
    const operationNode = this.getDocumentOperationNode(effects)
    return this.executeEffect(operationNode, context)
  }

  private executeEffect = async (operationNode: OperationDefinitionNode, context: any): Promise<void> => {
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
