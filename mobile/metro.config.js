const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const config = getDefaultConfig(projectRoot);

// Ensure Metro can resolve modules from mobile and shared workspace
config.watchFolders = [workspaceRoot];

// Use the mobile directory as the project root
config.projectRoot = projectRoot;

// Add node_modules from both mobile and workspace root
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  resolveRequest: (context, moduleName, platform) => {
    // If trying to load expo/AppEntry.js, redirect to our index.js
    if (moduleName === 'expo/AppEntry.js' || moduleName === 'expo/AppEntry') {
      return {
        filePath: path.resolve(projectRoot, 'index.js'),
        type: 'sourceFile',
      };
    }

    // Otherwise use default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Override resolver to use index.js as entry point
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // If trying to load expo/AppEntry.js, redirect to our index.js
    if (moduleName === 'expo/AppEntry.js' || moduleName === 'expo/AppEntry') {
      return {
        filePath: path.resolve(projectRoot, 'index.js'),
        type: 'sourceFile',
      };
    }

    // Otherwise use default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
