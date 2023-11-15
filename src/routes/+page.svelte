<script lang="ts">
	import { onMount } from 'svelte';
	// DocShell
	// Components
	import { Avatar, ListBox, ListBoxItem } from '@skeletonlabs/skeleton';
	import UniSocketClient from '$lib/components/unisocketclient.svelte';
	import FixDestroy from '$lib/components/fixdestroy.svelte';
	import type { PageData } from './$types';
	import type { addmsg_cast } from './+page.server';
	
	export let data: PageData;

	const lastMessageReceivedDate = data.messages.at(-1)?.createdAt ?? new Date(Date.now())

	type Message = addmsg_cast

	console.log("Data:", data)

	// Types
	interface Person {
		id: number;
		avatar: number;
		name: string;
	}
	interface MessageFeed {
		id: number;
		host: boolean;
		avatar: number;
		name: string;
		timestamp: string;
		message: string;
		color: string;
	}

	let elemChat: HTMLElement;
	const lorem = 'Lorem';

	// Navigation List
	const people: Person[] = [
		{ id: 0, avatar: 14, name: 'Michael' },
		{ id: 1, avatar: 40, name: 'Janet' },
		{ id: 2, avatar: 31, name: 'Susan' },
		{ id: 3, avatar: 56, name: 'Joey' },
		{ id: 4, avatar: 24, name: 'Lara' },
		{ id: 5, avatar: 9, name: 'Melissa' }
	];
	let currentPerson: Person = people[0];

	// Messages
	let messageFeed: MessageFeed[] = [
		{
			id: 0,
			host: true,
			avatar: 48,
			name: 'Jane',
			timestamp: 'Yesterday @ 2:30pm',
			message: lorem,
			color: 'variant-soft-primary'
		},
		{
			id: 1,
			host: false,
			avatar: 14,
			name: 'Michael',
			timestamp: 'Yesterday @ 2:45pm',
			message: lorem,
			color: 'variant-soft-primary'
		},
		{
			id: 2,
			host: true,
			avatar: 48,
			name: 'Jane',
			timestamp: 'Yesterday @ 2:50pm',
			message: lorem,
			color: 'variant-soft-primary'
		},
		{
			id: 3,
			host: false,
			avatar: 14,
			name: 'Michael',
			timestamp: 'Yesterday @ 2:52pm',
			message: lorem,
			color: 'variant-soft-primary'
		}
	];
	let currentMessage = '';

	let cursending = 0;

	type ClMessage = Message & {
		sendingId?: number
	}

	let msgBuf: ClMessage[] = data.messages.map(msg => {
		// @ts-ignore
		if(msg.sender.id === data.user.id) msg.host = true;
		return msg
	});
	let msgDB: Record<string, ClMessage> = {};

	// eslint-disable-next-line no-undef
	function scrollChatBottom(behavior?: ScrollBehavior): void {
		elemChat.scrollTo({ top: elemChat.scrollHeight, behavior });
	}

	function getCurrentTimestamp(): string {
		return new Date().toLocaleString('pt-BR', { hour: 'numeric', minute: 'numeric', hour12: true });
	}

	async function sleep(ms: number){
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	async function addMessage() {
		const msg: ClMessage = {
			createdAt: new Date(Date.now()),
			data: currentMessage,
			id: `sending-${cursending}`,
			sender: {
				id: data.user.id,
				name: data.user.name
			},
			sendingId: cursending
		}

		msgBuf = [...msgBuf, msg]

		const message2send = currentMessage;

		// Clear prompt
		currentMessage = '';
		// Smooth scroll to bottom
		// Timeout prevents race condition
		setTimeout(() => {
			scrollChatBottom('smooth');
		}, 0);

		const sentid = cursending
		cursending++;

		while(true){
			try {
				const ret = await fetch("?/sendmessage", {
					method: 'POST',
					body: JSON.stringify([sentid, message2send])
				})
				if(ret.ok)
					break;
				else
					await sleep(1000);
			} catch (e) {
				await sleep(500)
			}
		}
		
		for (let i = 0; i < msgBuf.length; i++) {
			const e = msgBuf[i];
			console.log(e.sendingId, sentid, e.sendingId === sentid)
			if(e.sendingId === sentid){
				msgBuf.splice(i, 1)
				msgBuf = msgBuf
				break;
			}
		}
	}

	function receivedMessage(msg: Message): void {

		msgBuf.push(msg)
		msgBuf = msgBuf

		setTimeout(() => {
			scrollChatBottom('smooth');
		}, 0);
	}

	function onPromptKeydown(event: KeyboardEvent): void {
		if (['Enter'].includes(event.code) && !event.shiftKey) {
			event.preventDefault();
			addMessage();
		}
	}

	// When DOM mounted, scroll to bottom
	onMount(() => {
		scrollChatBottom();
	});

    function handleMessage(msgstr: string){
		const msg = JSON.parse(msgstr)
        console.log("Received msg:", msg)
        let index : number;
        switch(msg.action){
            case 'addmsg':
				receivedMessage(msg.data)
                break;
            //case 'update':
            //    let obj : Record<string, any>, gothrough : boolean;
            //    rows.update((a) => (
            //        index = a.findIndex(v => v.sessionId === msg.sessionId),
            //        gothrough = index > -1,
            //        gothrough && (obj = a[a.findIndex(v => v.sessionId === msg.sessionId)]),
            //        gothrough && Object.keys(msg.data).forEach(k => obj[k] = msg.data[k]),
            //        a))
            //    break;
            //case 'remove':
            //    rows.update((a) => (
            //        index = a.findIndex(v => v.sessionId === msg.sessionId),
            //        index > -1 && a.splice(index, 1),
            //        a))
            //    break;
        }
	}
	function padzero(s: string|number, n: number = 2){
		return s.toString().padStart(n, '0')
	}
	function formatDate(date: Date){
		date = new Date(date);
		const now = new Date(Date.now())
		const my = now.getFullYear() === date.getFullYear()
		const mm = now.getMonth() === date.getMonth()
		const md = now.getDate() === date.getDate()

		if(my && mm && md)
			return `${padzero(date.getHours())}:${padzero(date.getMinutes())}`
		else if(my && mm)
			return  `${date.getDay()} ${date.getDate()}, ${padzero(date.getHours())}:${padzero(date.getMinutes())}`
		else
			return date.toLocaleTimeString()
	}
</script>
<FixDestroy><UniSocketClient src={"/chat?from="+lastMessageReceivedDate.getUTCMilliseconds()} onMessage={handleMessage}/></FixDestroy>
<section class="card h-full">
	<div class='chat w-full h-full grid grid-cols-1= lg:grid-cols-[300px_1fr] grid-rows-[1fh_100px]'>
		<!-- Navigation -->
		<div class="hidden lg:grid grid-rows-[auto_1fr_auto] border-r border-surface-500/30">
			<!-- List -->
			<div class="p-4 space-y-4">
				<small class="opacity-50">Usuários Online</small>
				<div class="overflow-y-auto">
					<ListBox active="variant-filled-primary">
						{#each people as person}
							<ListBoxItem bind:group={currentPerson} name="people" value={person}>
								<svelte:fragment slot="lead">
									<Avatar src="https://i.pravatar.cc/?img={person.avatar}" width="w-8" />
								</svelte:fragment>
								{person.name}
							</ListBoxItem>
						{/each}
					</ListBox>
				</div>
			</div>
			<!-- Footer -->
			<footer class="border-t border-surface-500/30 p-4">
				<button class="btn variant-filled">Trocar nome...</button>
			</footer>
		</div>
		<!-- Chat -->
		<div class="grid grid-row-[1fr_auto]">
			<!-- Conversation -->
			<section bind:this={elemChat} class="p-4 overflow-y-auto space-y-4" style='height: calc(100vh - 150px)'>
				{#each msgBuf as msg}
					{#if msg.sender.id !== data.user.id}
						<div class="grid grid-cols-[auto_1fr] gap-2">
							<Avatar src="https://i.pravatar.cc/?img=48" width="w-12" />
							<div class="card p-2 variant-soft rounded-tl-none space-y-1">
								<header class="flex justify-between items-center">
									<p class="font-bold">{msg.sender.name}</p>
									<small class="opacity-50">{formatDate(msg.createdAt)}</small>
								</header>
								<p>{@html msg.data.replaceAll('\n','<br/>')}</p>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-[1fr_auto] gap-2">
							<div class="card p-2 rounded-tr-none space-y-1 variant-soft-primary">
								<header class="flex justify-between items-center">
									<p class="font-bold">{msg.sender.name}</p>
									<small class="opacity-50">{formatDate(msg.createdAt)}</small>
								</header>
								<p>{@html msg.data.replaceAll('\n','<br/>')}</p>
							</div>
							<Avatar src="https://i.pravatar.cc/?img=48" width="w-12" />
						</div>
					{/if}
				{/each}
			</section>
			<!-- Prompt -->
			<section class="border-t border-surface-500/30 p-4 h-fit">
				<div class="input-group input-group-divider grid-cols-[auto_1fr_auto] rounded-container-token">
					<button class="input-group-shim">+</button>
					<textarea
						bind:value={currentMessage}
						class="bg-transparent border-0 ring-0"
						name="prompt"
						id="prompt"
						placeholder="Write a message..."
						rows="1"
						on:keydown={onPromptKeydown}
					/>
					<button class={currentMessage ? 'variant-filled-primary' : 'input-group-shim'} on:click={addMessage}>
						<i class="fa-solid fa-paper-plane" />
					</button>
				</div>
			</section>
		</div>
	</div>
</section>