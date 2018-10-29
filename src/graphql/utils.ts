import {
  parse,
  ObjectTypeDefinitionNode,
} from 'graphql'

/**
 * Parses a source containing field definitions and extracts the names of each field
 */
export function getFieldNamesFromSource (fields: string): string[] {
  const source = `type SourceType {
    ${fields}
  }`
  const document = parse(source, { noLocation: true })
  const type = document.definitions[0] as ObjectTypeDefinitionNode
  return type.fields.map((field) => field.name.value)
}
