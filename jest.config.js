
export default {
    transform: {
      "^.+\\.[tj]sx?$": "babel-jest"
    },
    // Use the 'node' test environment for ESM modules
    testEnvironment: "node",
};