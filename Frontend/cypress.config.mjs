import { defineConfig } from 'cypress';
import path from 'path';

export default defineConfig({
  e2e: {
    // Base configuration
    baseUrl: 'http://localhost:5173',
    env: {
      apiUrl: 'http://localhost:5000/api',
    },
    
    // Path configurations (updated for your Frontend/cypress structure)
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',

    // Plugins and tasks
    setupNodeEvents(on, config) {
      // Optional: Add any custom tasks or plugins here
      return config;
    },

    // Execution settings
    video: false,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720
  },

  // Global overrides
  includeShadowDom: true // Enable shadow DOM testing if needed
});