import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'test-uid',
      setItem: vi.fn(),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              class1: { name: 'c1', properties: [] },
              class2: { name: 'c2', properties: [] },
              generalClass: [],
              noneClass: [],
            }),
        })
      )
    );
  });

  it('renders the App component', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(
      screen.getByText(/Self-Learning Classifier/i)
    ).toBeInTheDocument();
  });

  it('handles init', async () => {
    await act(async () => {
      render(<App />);
    });

    fireEvent.change(
      screen.getByPlaceholderText('Class 1 name'),
      { target: { value: 'class1' } }
    );
    fireEvent.change(
      screen.getByPlaceholderText('Class 2 name'),
      { target: { value: 'class2' } }
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /init/i })
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/init'),
      expect.any(Object)
    );
  });

  it('handles classify', async () => {
    await act(async () => {
      render(<App />);
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        'Enter properties separated by spaces or commas'
      ),
      { target: { value: 'prop1' } }
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /classify/i })
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/classify'),
      expect.any(Object)
    );
  });

  it('handles feedback', async () => {
    await act(async () => {
      render(<App />);
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        'Enter properties separated by spaces or commas'
      ),
      { target: { value: 'prop1' } }
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /classify/i })
      );
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /it is c1/i })
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/feedback'),
      expect.any(Object)
    );
  });

  it('adapts to mobile', async () => {
    await act(async () => {
      render(<App />);
    });

    const mainElement = screen.getByRole('main');
    expect(mainElement.className).toContain('container');

    await act(async () => {
      (global as any).innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
    });

    expect(mainElement.className).toContain('container');
  });
});
