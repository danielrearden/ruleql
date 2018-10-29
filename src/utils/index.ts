import * as _ from 'lodash'

/**
 * Given an array of nested arrays, returns a map of paths to array elements
 */
export function getPathMap (arr) {
  return _.transform(arr, (result, value, key) => {
      if (_.isArray(value)) {
          const flatMap = _.mapKeys(getPathMap(value), (mvalue, mkey) => {
            const index = mkey.indexOf('.')
            if (-1 !== index) {
                return key + '[' + mkey.slice(0, index) + ']' + mkey.slice(index)
            }
            return key + '[' + mkey + ']'
          })
          _.assign(result, flatMap)
      } else {
          result[key] = value
      }
      return result
  }, {})
}
