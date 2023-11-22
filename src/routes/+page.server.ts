import prisma from "$lib/config/prisma";
import { getAllMessages } from "$lib/server/chat";
import { randHex, type MyEvent } from "../hooks.server";
import { _broadcast, _onlineUsers } from "./chat/+server";

export type addmsg_cast = {
    id: string,
    createdAt: Date,
    sender: {
        id: string,
        name: string
    },
    data: string
}

export const load = async (event: MyEvent) => {
	return {
		user: event.locals.user,
		messages: await getAllMessages(),
        users: _onlineUsers
	};
};

export const actions = {
    // Send Message
	sendmessage: async (evt) => {
        const event = evt as MyEvent;
        let json = await event.request.json()
        const msg = json[1]
        let sent = await prisma.message.create({ data: { data: msg, id: randHex(), senderId: event.locals.user.id } })
        await _broadcast({
            action: 'addmsg',
            data: {
                id: sent.id,
                createdAt: sent.createdAt,
                sender: {
                    id: event.locals.user.id,
                    name: event.locals.user.name
                },
                data: msg
            }
        });
        console.log("Msg:", msg)
        console.log('json:', json)
        return json[0]
    },
    changename: async (evt) => {
        const event = evt as MyEvent;
        let json = await event.request.json()
        if(json.id && event.locals.user.role !== 'ADMIN') return 'No Permission';

        const id = (json.id as string | undefined) ?? event.locals.user.id
        try{
            let sent = await prisma.user.update({ where: { id }, data: { name: json.name ?? 'anon' }})
            await _broadcast({
                action: 'chname',
                data: {
                    id: sent.id,
                    name: sent.name
                }
            });
        }catch(e){
        }
        return 'done'
    },
}