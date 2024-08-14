'use client';

import clsx from 'clsx';
import React, { type PropsWithChildren } from 'react';

type Props = {
  position: 'bottom' | 'top';
  visible: boolean;
};

export const OffCanvas = (props: PropsWithChildren<Props>) => {
  const { position, children, visible } = props;
  return (
    <>
      <div className={clsx(`offcanvas offcanvas-${position} h-auto`, { show: visible })}>
        <div className="offcanvas-body">
          <div className="container">{children}</div>
        </div>
      </div>
      <div className={clsx('pe-none offcanvas-backdrop fade', { show: visible })} />
    </>
  );
};
