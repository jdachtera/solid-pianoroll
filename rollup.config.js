import withSolid from 'rollup-preset-solid';
import postcss from 'rollup-plugin-postcss'

export default withSolid({
  input: 'src/index.tsx',
  targets: ['esm', 'cjs'],
  plugins: [postcss({
    extract: false,
    modules: true,
    use: ['sass'],
  })]
});
