const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-iap is a native (Nitro) module that cannot load in Expo Go.
// Local `expo start` bundles a stub; EAS/production builds bundle the real one.
//   EXPO_PUBLIC_IAP=real  → force real locally
//   EXPO_PUBLIC_IAP=mock  → force stub anywhere
const iap = process.env.EXPO_PUBLIC_IAP;
const isBuild =
  process.env.EAS_BUILD === 'true' || process.env.NODE_ENV === 'production';
const useRealIap = iap === 'real' || (iap !== 'mock' && isBuild);

if (!useRealIap) {
  const stub = path.resolve(__dirname, 'src/purchase/iapStub.ts');
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-iap') {
      return { type: 'sourceFile', filePath: stub };
    }
    return (upstream ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
