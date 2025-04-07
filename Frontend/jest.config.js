// jest.config.js
export default {
    transform: {
      '^.+\\.jsx?$': 'babel-jest'
    },
    testEnvironment: 'jsdom',
    moduleFileExtensions: ['js', 'jsx'],
  };