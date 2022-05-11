import { NextFunction, Request, Response } from 'express';
import AppsService from './apps.service';
import { AppConfig } from '../../config/types';
import { getInitalFormValues } from './apps.helpers';

const uninstallApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    await AppsService.uninstallApp(appName);

    res.status(200).json({ message: 'App uninstalled successfully' });
  } catch (e) {
    next(e);
  }
};

const stopApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    await AppsService.stopApp(appName);

    res.status(200).json({ message: 'App stopped successfully' });
  } catch (e) {
    next(e);
  }
};

const updateAppConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;
    const { form } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    AppsService.updateAppConfig(appName, form);

    res.status(200).json({ message: 'App updated successfully' });
  } catch (e) {
    next(e);
  }
};

const getAppInfo = async (req: Request, res: Response<AppConfig>, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('App name is required');
    }

    const appInfo = await AppsService.getAppInfo(id);

    res.status(200).json(appInfo);
  } catch (e) {
    next(e);
  }
};

const listApps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apps = await AppsService.listApps();

    res.status(200).json(apps);
  } catch (e) {
    next(e);
  }
};

const startApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('App name is required');
    }

    await AppsService.startApp(id);

    res.status(200).json({ message: 'App started successfully' });
  } catch (e) {
    next(e);
  }
};

const installApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { form } = req.body;

    if (!id) {
      throw new Error('App name is required');
    }

    await AppsService.installApp(id, form);
  } catch (e) {
    next(e);
  }
};

const initalFormValues = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('App name is required');
    }

    res.status(200).json(getInitalFormValues(id));
  } catch (e) {
    next(e);
  }
};

const AppController = {
  uninstallApp,
  installApp,
  stopApp,
  updateAppConfig,
  getAppInfo,
  listApps,
  startApp,
  initalFormValues,
};

export default AppController;
