// postcss.config.mjs

const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // 'tailwindcss' を '@tailwindcss/postcss' に変更
    autoprefixer: {},
  },
};

export default config;