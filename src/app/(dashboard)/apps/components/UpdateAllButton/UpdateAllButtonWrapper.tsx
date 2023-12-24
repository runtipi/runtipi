'use client'

import React from 'react';
import { AppService } from '@/server/services/apps/apps.service';
import { UpdateAllButton } from "./UpdateAllButton";


type UpdateAllButtonWrapperProps = {
  apps: Awaited<ReturnType<AppService['getApp']>>[];
}

export const UpdateAllButtonWrapper: React.FC<UpdateAllButtonWrapperProps> = ({apps}) => {

  return (
    <UpdateAllButton apps={apps}/>
  )
}