import { SocketEvent } from '@runtipi/shared';
import { useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';

type Props = {
  type: SocketEvent['type'];
  data?: SocketEvent['data'];
  emitOnDisconnect?: SocketEvent['type'];
};

export const useSocketEmit = (props: Props) => {
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const { hostname, protocol } = window.location;

    if (!socketRef.current) {
      console.log('create socket');
      socketRef.current = io(`${protocol}//${hostname}`, { path: '/worker/socket.io' });
    }

    if (socketRef.current?.disconnected) {
      socketRef.current.connect();
    }

    socketRef.current.on('disconnect', () => {
      console.log('disconnected')
    });

    socketRef.current.on('connect', () => {
      console.log('connected');
      try {
        socketRef.current?.emit(props.type, props.data);
      } catch (error) {
        console.error('Error emitting socket event:', error);
      }
    });

    return () => {
      console.log('return disconnect', props.emitOnDisconnect, props.data)
      if (props.emitOnDisconnect) {
        socketRef.current?.emit(props.emitOnDisconnect, props.data);
      }
      
      socketRef.current?.disconnect();
    };

  } , [props.data, props.emitOnDisconnect, props.type]);
}