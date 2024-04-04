import { SocketEvent } from '@runtipi/shared';
import { useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';

type Props = {
  type: SocketEvent['type'];
  data?: Extract<SocketEvent, { type: SocketEvent['type'] }>['data'];
  emitOnDisconnect?: SocketEvent['type'];
};

export const useSocketEmit = (props: Props) => {
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const { hostname, protocol } = window.location;

    if (!socketRef.current) {
      socketRef.current = io(`${protocol}//${hostname}`, { path: '/worker/socket.io' });
    }

    if (socketRef.current?.disconnected) {
      socketRef.current.connect();
    }

    console.log('emit', props.type, props.data);
    socketRef.current?.emit(props.type, props.data);

    return () => {
      console.log('disconnect', props.emitOnDisconnect, props.data)
      if (props.emitOnDisconnect) {
        socketRef.current?.emit(props.emitOnDisconnect, props.data);
      } else {
        socketRef.current?.disconnect();
      }
    };

  } , [props.data, props.emitOnDisconnect, props.type]);
}