import { useUserContext } from '@/context/user-context';
import { getAutoTheme } from '@/lib/theme/theme';
import { type PropsWithChildren, Suspense, lazy } from 'react';

const ChristmasTheme = lazy(() => import('./themes/christmas').then((module) => ({ default: module.ChristmasTheme })));

type Props = {
  initialTheme?: string;
};

export const AutoThemeProvider = (props: PropsWithChildren<Props>) => {
  const { children } = props;
  const { allowAutoThemes } = useUserContext();

  const theme = getAutoTheme();

  if (!allowAutoThemes) {
    return children;
  }

  switch (theme) {
    case 'christmas':
      return (
        <Suspense>
          <ChristmasTheme>{children}</ChristmasTheme>
        </Suspense>
      );
    default:
      return children;
  }
};
