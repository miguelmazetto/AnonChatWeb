//import { load } from '../../+layout.server'
import prisma from '$lib/config/prisma'
import { UniSocketServer } from '$lib/server/unisocketserver';
import { getLastMessages, getNextMessages } from '$lib/server/chat';
import type { Locals } from '../../hooks.server.js';

export const _sockets: (UniSocketServer | undefined)[] = []; // @hmr:keep

// Broadcast to all sockets
export async function _broadcast(msg: Record<string, any>){
  const msgstr = JSON.stringify(msg)
  console.log("_broadcast", msg)
  console.log("_sockets", _sockets)

  for (let i = 0; i < _sockets.length; i++) {
    const socket = _sockets[i];
    console.log("Socket", i, socket)
    if(socket)
      try{
        await socket.sendMessage(msgstr)
      }catch(e){/* Nothing */}
  }

  // Remove unused last indexes
  while(_sockets.length > 0 && _sockets[_sockets.length - 1] === undefined)
    _sockets.pop()
}

export async function GET(event) {
  const url = event.url
  const locals = event.locals as Locals

  // Apply admin-only
  // load({ locals: { user } })

  console.log("msg/update start");
  const socket = new UniSocketServer()

  // find first unused id and set it to our socket
  let id = 0;
  for (; id <= _sockets.length; id++)
    if(_sockets[id] === undefined) break;

  _sockets[id] = socket

  socket.onCancel = () => {
    console.log("msg/update cancel");
    _sockets[id] = undefined
  }

  // Send initial message
  
  if(url.searchParams.get('from') === null || url.searchParams.get('from') === ''){
  
    const send = {
      action: 'last100',
      data: await getLastMessages(),
    }

    socket.sendMessage(JSON.stringify(send))
  }else{
    let date = new Date(url.searchParams.get('from') ?? '')
    //date.setUTCMilliseconds(parseInt(url.searchParams.get('from') ?? '0'))
    console.log(url.searchParams.get('from'), date)
    const send = {
      action: 'from',
      data: await getNextMessages(date),
    }

    socket.sendMessage(JSON.stringify(send))
  }

	return new Response(socket.stream, {
        headers: {
            'content-type': 'text/event-stream',
          }
	});
}