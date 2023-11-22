import { writable } from "svelte/store";

/**
 * Sleep em forma de async function
 * @param ms
 */
export async function sleep(ms: number){
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Envia mensagem post para path com o body
 * Se falhar com throw error, ele retentara em 500ms
 * Se falhar com HTTP error, retentara em 1000ms
 * Se falhar com HTTP error mais que 5 vezes,
 * 	esperara mais 5000ms para voltar a retentar.
 * @param path
 * @param body
 */
export async function postmessage(path: string, body: string){
	let tries = 0;
	while(true){
		try {
			const ret = await fetch(path, {
				method: 'POST',
				body: body
			})
			if(ret.ok)
				break;
			else
				await sleep(1000);
		} catch (e) {
			await sleep(500)
		} finally {
			tries++;
			if(tries > 5){
				await sleep(5000);
				tries = 0;
			}
		}
	}
}

export type PublicUser = {
    id: string,
    name: string,
    createdAt: Date
}

/**
 * Array de usuarios online, inicializado pelos dados do load
 */
export let onlineUsers = writable<PublicUser[]>();

export let loggedUser = writable<PublicUser>();;