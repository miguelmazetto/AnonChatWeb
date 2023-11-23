//import { load } from '../../+layout.server'
import prisma from '$lib/config/prisma'
import { UniSocketServer } from '$lib/server/unisocketserver';
import { getLastMessages, getNextMessages, type PublicUser } from '$lib/server/chat';
import { randHex, type Locals } from '../../hooks.server.js';

type OnlineSocket = { socketid?: string } & UniSocketServer;

/**
 * _sockets = {
 *    [userid]: [
 *        OnlineSocketFromTab1,
 *        OnlineSocketFromTab2
 *    ]
 * }
 */
export const _sockets: Record<string, OnlineSocket[]> = {}; // @hmr:keep

/**
 * Broadcast para todos os sockets conectados
 * @param msg 
 */
export async function _broadcast(msg: Record<string, any>){
  const msgstr = JSON.stringify(msg)
  console.log("_broadcast", msg)
  //console.log("_sockets", _sockets)

  for (const key in _sockets) {
    for (let i = 0; i < _sockets[key].length; i++) {
      const socket = _sockets[key][i];
      if(socket)
        try{
          socket.sendMessage(msgstr)
        }catch(e){/* Nothing */}
    }
  }
}

export let _onlineUsers: Record<string, PublicUser> = {}

/**
 * Lida com todos os requests GET feito para o caminho '/chat' localhost:3000/chat
 * @param event 
 * @returns 
 */
export async function GET(event) {
  const url = event.url
  const locals = event.locals as Locals

  // Apply admin-only
  // load({ locals: { user } })

  const ip = event.getClientAddress();

  console.log("msg/update start:", ip);
  const socket: OnlineSocket = new UniSocketServer()
  const socketid = socket.socketid = randHex();
  const userid = locals.user.id

  _onlineUsers[userid] = _onlineUsers[userid] ?? {
    name:      locals.user.name,
    id:        userid,
    createdAt: locals.user.createdAt
  }

  await _broadcast({
    action: 'onuser',
    data: _onlineUsers[userid]
  });

  _sockets[userid] = _sockets[userid] ?? []
  _sockets[userid].push(socket)

  socket.onCancel = () => {
    console.log("msg/update cancel:", ip);

    // Remove socket from list
    for (let i = 0; i < _sockets[userid].length; i++) {
      const cursocket = _sockets[userid][i];
      if(cursocket.socketid === socketid)
        _sockets[userid].splice(i,1);
    }

    // If no sockets are online, then user is offline
    if(_sockets[userid].length == 0){
      delete _onlineUsers[userid];
      _broadcast({
        action: 'offuser',
        data: userid
      });
    }
  }

  // Send initial message
  
  if(url.searchParams.get('from') === null || url.searchParams.get('from') === ''){
  
    const send = {
      action: 'last100',
      data: await getLastMessages(),
    }

    socket.sendMessage(JSON.stringify(send))

  }else{ // V Sempre usado esse V

    let date = new Date(url.searchParams.get('from') ?? '')
    const send = {
      action: 'from',
      data: await getNextMessages(date),
    }

    socket.sendMessage(JSON.stringify(send))
  }

  /**
   * Retornando a stream do UniSocketServer faz
   * com que a stream seja linkada ao request
   */
	return new Response(socket.stream, {
        headers: {
            'content-type': 'text/event-stream',
          }
	});
}