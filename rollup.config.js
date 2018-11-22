import buble from 'rollup-plugin-buble'
import { uglify } from 'rollup-plugin-uglify'

export default [
  {
    input: 'src/patch2dom.js',
    output: {
      file: 'dist/patch2dom.js',
      format: 'cjs'
    },
    plugins: [buble()]
  },
  {
    input: 'src/patch2dom.js',
    output: {
      name: 'patch2dom',
      file: 'dist/patch2dom.min.js',
      format: 'umd'
    },
    plugins: [buble(), uglify()]
  }
]
