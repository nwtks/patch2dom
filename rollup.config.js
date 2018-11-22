import buble from 'rollup-plugin-buble'
import { uglify } from 'rollup-plugin-uglify'

export default [
  {
    input: 'src/patchdom.js',
    output: {
      file: 'dist/patchdom.js',
      format: 'cjs'
    },
    plugins: [buble()]
  },
  {
    input: 'src/patchdom.js',
    output: {
      name: 'patchdom',
      file: 'dist/patchdom.min.js',
      format: 'umd'
    },
    plugins: [buble(), uglify()]
  }
]
