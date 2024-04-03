'use client'

import io, { Socket } from 'socket.io-client';

class LogsWebSocket {
  public socket: Socket;

  private wasCalled = false;

  constructor() {
    const { hostname, protocol } = window.location;
    this.socket = io(`${protocol}//${hostname}`, { path: '/worker/socket.io' });
  }

  viewLogs(appId: string) {
    this.socket.emit('viewLogs', appId);
  }

  stopLogs() {
    this.socket.emit('stopLogs', null);
  }

  getWasCalled() {
    return this.wasCalled;
  }

  setWasCalled(value: boolean) {
    this.wasCalled = value;
  }

}

const ws = new LogsWebSocket();

export const emitViewLogs = (appId: string) => {
  
  if (ws.getWasCalled()) return;

  ws.socket.emit('viewLogs', appId);
  ws.setWasCalled(true);
}

export const stopLogs = () => {
  ws.socket.emit('stopLogs', null);
  ws.setWasCalled(false);
}