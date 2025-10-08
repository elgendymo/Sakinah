import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document methods
const mockDocumentElement = {
  setAttribute: vi.fn(),
};

const mockBody = {
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

Object.defineProperty(document, 'body', {
  value: mockBody,
  writable: true,
});

describe('useSurveyLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default language', () => {
    const { result } = renderHook(() => useSurveyLanguage());

    expect(result.current.language).toBe('en');
    expect(result.current.isRTL).toBe(false);
  });

  it('initializes with provided initial language', () => {
    const { result } = renderHook(() => useSurveyLanguage('ar'));

    expect(result.current.language).toBe('ar');
    expect(result.current.isRTL).toBe(true);
  });

  it('loads saved language from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue('ar');

    const { result } = renderHook(() => useSurveyLanguage());

    expect(result.current.language).toBe('ar');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('sakinah_survey_language');
  });

  it('ignores invalid language from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('invalid');

    const { result } = renderHook(() => useSurveyLanguage());

    expect(result.current.language).toBe('en');
  });

  it('sets document attributes on mount', () => {
    renderHook(() => useSurveyLanguage('ar'));

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('lang', 'ar');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('dir', 'rtl');
    expect(mockBody.classList.add).toHaveBeenCalledWith('rtl');
  });

  it('changes language when setLanguage is called', () => {
    const { result } = renderHook(() => useSurveyLanguage());

    act(() => {
      result.current.setLanguage('ar');
    });

    expect(result.current.language).toBe('ar');
    expect(result.current.isRTL).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('sakinah_survey_language', 'ar');
  });

  it('updates document attributes when language changes', () => {
    const { result } = renderHook(() => useSurveyLanguage());

    act(() => {
      result.current.setLanguage('ar');
    });

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('lang', 'ar');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('dir', 'rtl');
    expect(mockBody.classList.add).toHaveBeenCalledWith('rtl');
  });

  it('removes RTL class when switching to LTR', () => {
    const { result } = renderHook(() => useSurveyLanguage('ar'));

    act(() => {
      result.current.setLanguage('en');
    });

    expect(mockBody.classList.remove).toHaveBeenCalledWith('rtl');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('dir', 'ltr');
  });

  it('toggles language between en and ar', () => {
    const { result } = renderHook(() => useSurveyLanguage('en'));

    act(() => {
      result.current.toggleLanguage();
    });

    expect(result.current.language).toBe('ar');

    act(() => {
      result.current.toggleLanguage();
    });

    expect(result.current.language).toBe('en');
  });

  it('returns correct localized text', () => {
    const { result } = renderHook(() => useSurveyLanguage('en'));

    let localizedText = result.current.getLocalizedText('Hello', 'مرحبا');
    expect(localizedText).toBe('Hello');

    act(() => {
      result.current.setLanguage('ar');
    });

    localizedText = result.current.getLocalizedText('Hello', 'مرحبا');
    expect(localizedText).toBe('مرحبا');
  });

  it('correctly identifies RTL state', () => {
    const { result } = renderHook(() => useSurveyLanguage('en'));

    expect(result.current.isRTL).toBe(false);

    act(() => {
      result.current.setLanguage('ar');
    });

    expect(result.current.isRTL).toBe(true);
  });

  it('persists language preference in localStorage', () => {
    const { result } = renderHook(() => useSurveyLanguage());

    act(() => {
      result.current.setLanguage('ar');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('sakinah_survey_language', 'ar');

    act(() => {
      result.current.setLanguage('en');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('sakinah_survey_language', 'en');
  });

  describe('Document manipulation edge cases', () => {
    it('handles missing document elements gracefully', () => {
      // Temporarily remove document elements
      const originalDocumentElement = document.documentElement;
      const originalBody = document.body;

      Object.defineProperty(document, 'documentElement', {
        value: null,
        writable: true,
      });

      Object.defineProperty(document, 'body', {
        value: null,
        writable: true,
      });

      expect(() => {
        renderHook(() => useSurveyLanguage('ar'));
      }).not.toThrow();

      // Restore
      Object.defineProperty(document, 'documentElement', {
        value: originalDocumentElement,
        writable: true,
      });

      Object.defineProperty(document, 'body', {
        value: originalBody,
        writable: true,
      });
    });
  });

  describe('localStorage error handling', () => {
    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useSurveyLanguage());

      expect(() => {
        act(() => {
          result.current.setLanguage('ar');
        });
      }).not.toThrow();

      // Language should still change even if localStorage fails
      expect(result.current.language).toBe('ar');
    });

    it('handles localStorage getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => {
        renderHook(() => useSurveyLanguage());
      }).not.toThrow();
    });
  });

  describe('Multiple language toggles', () => {
    it('handles rapid language toggles', () => {
      const { result } = renderHook(() => useSurveyLanguage());

      act(() => {
        result.current.toggleLanguage(); // en -> ar
        result.current.toggleLanguage(); // ar -> en
        result.current.toggleLanguage(); // en -> ar
        result.current.toggleLanguage(); // ar -> en
      });

      expect(result.current.language).toBe('en');
      expect(result.current.isRTL).toBe(false);
    });
  });
});