import { LetItGo } from 'let-it-go';
import { type PropsWithChildren, useEffect } from 'react';

export const ChristmasTheme = (props: PropsWithChildren) => {
  useEffect(() => {
    const snow = new LetItGo({ number: 50 });
    snow.letItGoAgain();
  }, []);

  return props.children;
};
