// Configuration des tests Jest
import '@testing-library/jest-dom';

// Mock de l'environnement Replit
global.process = {
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    SESSION_SECRET: 'test-secret'
  }
};

// Mock des APIs du navigateur
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock de l'API de géolocalisation
global.navigator.geolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn()
};

// Mock du localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;