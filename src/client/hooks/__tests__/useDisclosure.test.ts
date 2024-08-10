import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test } from 'vitest';
import { useDisclosure } from '../useDisclosure';

describe('useDisclosure', () => {
  test('should set isOpen to false by default', () => {
    // arrange
    const { result } = renderHook(() => useDisclosure());

    // assert
    expect(result.current.isOpen).toBe(false);
  });

  test('should set isOpen to true when calling open', () => {
    // arrange
    const { result } = renderHook(() => useDisclosure());

    // act
    act(() => {
      result.current.open();
    });

    // assert
    expect(result.current.isOpen).toBe(true);
  });

  test('should set isOpen to false when calling close', () => {
    // arrangarrange
    const { result } = renderHook(() => useDisclosure(true));

    // act
    act(() => {
      result.current.close();
    });

    // assert
    expect(result.current.isOpen).toBe(false);
  });

  test('should set isOpen to the opposite of the current value when calling toggle', () => {
    // arrange
    const { result } = renderHook(() => useDisclosure(false));

    // act
    act(() => {
      result.current.toggle();
    });

    // assert
    expect(result.current.isOpen).toBe(true);

    // act
    act(() => {
      result.current.toggle();
    });

    // assert
    expect(result.current.isOpen).toBe(false);
  });

  test('should set isOpen to the passed value when calling toggle with a boolean argument', () => {
    // arrange
    const { result } = renderHook(() => useDisclosure(false));

    // act
    act(() => {
      result.current.toggle(true);
    });

    // assert
    expect(result.current.isOpen).toBe(true);

    // act
    act(() => {
      result.current.toggle(false);
    });

    // assert
    expect(result.current.isOpen).toBe(false);
  });
});
