import { ASTVisitor, GraphQLError, Kind } from 'graphql'
import { ExecutableDefinitions } from 'graphql/validation/rules/ExecutableDefinitions'
import { FieldsOnCorrectType } from 'graphql/validation/rules/FieldsOnCorrectType'
import { FragmentsOnCompositeTypes } from 'graphql/validation/rules/FragmentsOnCompositeTypes'
import { KnownArgumentNames } from 'graphql/validation/rules/KnownArgumentNames'
import { KnownDirectives } from 'graphql/validation/rules/KnownDirectives'
import { KnownFragmentNames } from 'graphql/validation/rules/KnownFragmentNames'
import { KnownTypeNames } from 'graphql/validation/rules/KnownTypeNames'
import { NoUndefinedVariables } from 'graphql/validation/rules/NoUndefinedVariables'
import { NoUnusedVariables } from 'graphql/validation/rules/NoUnusedVariables'
import { PossibleFragmentSpreads } from 'graphql/validation/rules/PossibleFragmentSpreads'
import { ProvidedRequiredArguments } from 'graphql/validation/rules/ProvidedRequiredArguments'
import { ScalarLeafs } from 'graphql/validation/rules/ScalarLeafs'
import { UniqueArgumentNames } from 'graphql/validation/rules/UniqueArgumentNames'
import { UniqueDirectivesPerLocation } from 'graphql/validation/rules/UniqueDirectivesPerLocation'
import { UniqueInputFieldNames } from 'graphql/validation/rules/UniqueInputFieldNames'
import { UniqueVariableNames } from 'graphql/validation/rules/UniqueVariableNames'
import { ValuesOfCorrectType } from 'graphql/validation/rules/ValuesOfCorrectType'
import { VariablesAreInputTypes } from 'graphql/validation/rules/VariablesAreInputTypes'
import { VariablesInAllowedPosition } from 'graphql/validation/rules/VariablesInAllowedPosition'
import { ValidationContext, ValidationRule } from 'graphql/validation/ValidationContext'

/**
 * Fragments are not supported. This rule ensures no fragments are included in the document.
 */
export function NoFragments (context: ValidationContext): ASTVisitor {
  const fragmentDefs = []

  return {
    FragmentDefinition (node) {
      fragmentDefs.push(node)
      return false
    },
    Document: {
      leave () {
        if (fragmentDefs.length) {
          context.reportError(new GraphQLError('Fragments are not supported.'))
        }
      },
    },
  }
}

/**
 * Multiple operations are not supported.
 */
export function NoMultipleOperations (context: ValidationContext): ASTVisitor {
  let operationCount = 0

  return {
    Document (node) {
      operationCount = node.definitions.filter(
        (definition) => definition.kind === Kind.OPERATION_DEFINITION,
      ).length
    },
    OperationDefinition () {
      if (operationCount > 1) {
        context.reportError(new GraphQLError('Multiple operations are not supported.'))
      }
    },
  }
}

/**
 * This is a subset of validation rules that are normally applied to documents in GraphQL.
 * Omitted rules:
 *   - LoneAnonymousOperation
 *   - NoFragmentCycles
 *   - NoUnusedFragments
 *   - OverlappingFieldsCanBeMerged
 *   - SingleFieldSubscriptions
 *   - UniqueFragmentNames
 *   - UniqueOperationNames
 */
export const standardRules: ValidationRule[] = [
  ExecutableDefinitions,
  KnownFragmentNames,
  KnownTypeNames,
  FragmentsOnCompositeTypes,
  VariablesAreInputTypes,
  ScalarLeafs,
  FieldsOnCorrectType,
  PossibleFragmentSpreads,
  UniqueVariableNames,
  NoUndefinedVariables,
  NoUnusedVariables,
  KnownDirectives,
  UniqueDirectivesPerLocation,
  KnownArgumentNames,
  UniqueArgumentNames,
  ValuesOfCorrectType,
  ProvidedRequiredArguments,
  VariablesInAllowedPosition,
  UniqueInputFieldNames,
]

/**
 * This is the full set of rules used for validation, including custom rules.
 */
export const validationRules: ValidationRule[] = [
  NoFragments,
  NoMultipleOperations,
  ...standardRules,
]
