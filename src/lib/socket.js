import { io } from 'socket.io-client';
import { getApiBaseUrl, getToken } from './auth.js';

let socket;

export function getSocket() {
  if (socket) return socket;

  socket = io(getApiBaseUrl() || undefined, {
    autoConnect: false,
    auth: {
      token: getToken(),
    },
  });

  return socket;
}
