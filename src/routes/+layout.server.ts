import { getLastMessages } from "$lib/server/chat";
import type { Locals } from "../hooks.server";

export const load = async (event: { locals: Locals}) => {
	return {
		user: event.locals.user
	};
};