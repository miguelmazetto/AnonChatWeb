import prisma from "$lib/config/prisma";
import type { User } from "@prisma/client"

/**
 * Informações do usuário que são publicas,
 * expostas para qualquer outro usuário
 */
export type PublicUser = {
    id: string,
    name: string,
    createdAt: Date
}

/**
 * Obter as ultimas 100 mensagens de chat do banco
 */
export async function getLastMessages(){
    return (await prisma.message.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
        include: { sender: { select: {id: true, name: true}} }
    })).reverse();
}

/**
 * Obter todas as mensagens de chat do banco
 */
export async function getAllMessages(){
    return await prisma.message.findMany({
        orderBy: [{ createdAt: 'asc' }],
        include: { sender: { select: {id: true, name: true}} }
    });
}

/**
 * Obter as próximas 100 mensagens de chat do banco após lasttime
 */
export async function getNextMessages(lasttime: Date){
    return (await prisma.message.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
        where: { createdAt: { lt: lasttime } },
        include: { sender: { select: {id: true, name: true}} }
    })).reverse();
}

/**
 * Mesmo que anterior (só que não funciona)
 */
export async function getMissedMessages(lasttime: Date){
    return (await prisma.message.findMany({
        orderBy: [{ createdAt: 'asc' }],
        where: { createdAt: { gt: lasttime } },
        include: { sender: { select: {id: true, name: true}} }
    }));
}