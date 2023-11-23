import type { Handle, HandleServerError, RequestEvent } from '@sveltejs/kit';
import log from '$lib/server/log';
import type { $Enums, Prisma, User } from '@prisma/client'
import type { DefaultArgs } from '@prisma/client/runtime/library';
import prisma from '$lib/config/prisma';
import { randomUUID, randomBytes } from 'crypto';

export const handleError: HandleServerError = async ({ error, event }) => {
	const errorId = randomUUID();

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
	event.locals.error = error?.toString() || undefined;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
	event.locals.errorStackTrace = error?.stack || undefined;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
	event.locals.errorId = errorId;
	log(500, event);

	return {
		message: 'An unexpected error occurred.',
		errorId
	};
};

//type MyHandle = Handle & {
//	event: RequestEvent & {
//		locals: App.Locals & {
//			startTimer: number
//		}
//	}
//}

export type Locals = App.Locals & {
	startTimer: number,
	usertoken?: string,
	user: {
		id: string;
		name: string;
		role: $Enums.Role;
		token: string;
		createdAt: Date;
	}
};

export function randHex(bytes = 16){
	return randomBytes(bytes).toString('hex')
}

export type MyEvent = RequestEvent<Partial<Record<string, string>>, string | null> & {
	locals: Locals
}

export const handle: Handle = async ({ event, resolve }) => {
	const startTimer = Date.now();
	const locals = event.locals as Locals;
	locals.startTimer = startTimer;
    locals.usertoken = event.cookies.get('guesttoken')

	while(true){
		if(locals.usertoken === undefined || locals.usertoken === ''){
			if(event.request.headers.get('user-agent') === 'AnonChatMobile'){
				console.log("AnonChatMobile found!", JSON.stringify(event.request.headers, null, 1))
				if(event.cookies.get('newuser') !== 'true'){
					console.log("AnonChatMobile newuser")
					break;
				}
			}
			
			locals.usertoken = randHex();
			event.cookies.set('guesttoken', locals.usertoken);
			locals.user = await prisma.user.create({
				data: {
					id: randHex(),
					name: `Anon_${randHex(4)}`,
					token: locals.usertoken
				}
			});
			break;
		}else{
			let user = await prisma.user.findUnique({ where: { token: locals.usertoken } });
			console.log(user, locals.usertoken)
			if(user === null || user === undefined){
				locals.usertoken = undefined;
				continue;
			}else{
				locals.user = user;
				break;
			}
		}
	}

	console.log("Locals:", locals)

	const response = await resolve(event);
	log(response.status, event);

	return response;
};