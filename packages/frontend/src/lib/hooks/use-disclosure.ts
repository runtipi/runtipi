import { useCallback, useState } from 'react';

export const useDisclosure = (isOpenDefault = false) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback((toSet?: boolean) => {
    if (typeof toSet === 'undefined') {
      setIsOpen((state) => !state);
    } else {
      setIsOpen(toSet);
    }
  }, []);

  return { isOpen, open, close, toggle };
};
