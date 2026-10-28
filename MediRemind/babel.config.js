module.exports = function (api) {
  // Jest runs pure-logic tests in Node; keep its transform minimal so tests
  // don't depend on the React Native/Metro preset.
  const isTest = api.caller((caller) => caller?.name === 'babel-jest');
  api.cache.using(() => (isTest ? 'test' : 'build'));

  if (isTest) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    };
  }

  return {
    presets: ['babel-preset-expo'],
  };
};
