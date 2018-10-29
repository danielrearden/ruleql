import { GraphQLScalarType } from 'graphql'
import GraphQLJSON from 'graphql-type-json'

export const JSON = GraphQLJSON

export const Void = new GraphQLScalarType({
  description: 'Void custom scalar',
  name: 'Void',
  parseLiteral: (ast) => null,
  parseValue: (value) => null,
  serialize: (value) => null,
})
