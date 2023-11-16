import prisma from "$lib/config/prisma";
import type { User } from "@prisma/client"

export type PublicUser = {
    id: string,
    name: string,
    createdAt: Date
}

export async function getLastMessages(){
    return (await prisma.message.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
        include: { sender: { select: {id: true, name: true}} }
    })).reverse();
}

export async function getNextMessages(lasttime: Date){
    return (await prisma.message.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
        where: { createdAt: { lt: lasttime } },
        include: { sender: { select: {id: true, name: true}} }
    })).reverse();
}

export async function getMissedMessages(lasttime: Date){
    return (await prisma.message.findMany({
        orderBy: [{ createdAt: 'asc' }],
        where: { createdAt: { gt: lasttime } },
        include: { sender: { select: {id: true, name: true}} }
    }));
}