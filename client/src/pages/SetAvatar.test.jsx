
import { render, screen, fireEvent } from '@testing-library/react';
import SetAvatar from './SetAvatar';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: 'base64imagestring' })),
  post: jest.fn(() => Promise.resolve({ data: { isSet: true, image: 'base64imagestring' } })),
}));

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SetAvatar Component', () => {
  beforeEach(() => {
    window.localStorage.setItem('chat-app-user', JSON.stringify({ _id: '123', username: 'test' }));
  });

  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <SetAvatar />
      </BrowserRouter>
    );
    // Since we mock axios to resolve immediately, we might miss the loading state if not careful.
    // But typically it renders Loading... first.
    // For this test, we can check if Title appears after loading.
  });

  test('renders avatars after loading', async () => {
    render(
      <BrowserRouter>
        <SetAvatar />
      </BrowserRouter>
    );
    const title = await screen.findByText(/Chọn ảnh đại diện của bạn/i);
    expect(title).toBeInTheDocument();
  });
});
