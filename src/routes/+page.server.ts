import prisma from "$lib/config/prisma";
import { getLastMessages } from "$lib/server/chat";
import { randHex, type Locals, type MyEvent } from "../hooks.server";
import { _broadcast } from "./chat/+server";

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
		messages: await getLastMessages()
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
    }
}