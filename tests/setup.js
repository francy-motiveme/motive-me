// Configuration des tests Jest
import '@testing-library/jest-dom';

// Mock import.meta for Vite compatibility
const importMetaMock = {
  env: {
    VITE_API_URL: 'http://localhost:3000',
    VITE_EMAILJS_PUBLIC_KEY: 'test-emailjs-key',
    VITE_EMAILJS_SERVICE_ID: 'test-service-id'
  }
};

// Inject into global scope
global.import = {
  meta: importMetaMock
};

// Mock de l'environnement
process.env.VITE_API_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-session-secret';

// Mock des APIs du navigateur
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock de l'API de géolocalisation
global.navigator = global.navigator || {};
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

// Mock fetch pour les appels API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: {} }),
  })
);
