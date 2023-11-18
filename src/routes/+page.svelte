<script lang="ts">
	import { onMount } from 'svelte';
	// DocShell
	// Components
	import { Avatar, ListBox, ListBoxItem, type ModalSettings, getModalStore } from '@skeletonlabs/skeleton';
	import UniSocketClient from '$lib/components/unisocketclient.svelte';
	import FixDestroy from '$lib/components/fixdestroy.svelte';
	import type { PageData } from './$types';
	import type { addmsg_cast } from './+page.server';
	import type { PublicUser } from '$lib/server/chat';
	
	export let data: PageData;

	const lastMessageReceivedDate = data.messages.at(-1)?.createdAt ?? new Date(Date.now())

	type Message = addmsg_cast

	console.log("Data:", data)

	let elemChat: HTMLElement;

	// Navigation List
	console.log("Me:", data.user, data.users)
	data.users[data.user.id] = data.user;
	let onlineUsers: PublicUser[] = Object.values(data.users);
	console.log(onlineUsers)

	let currentUser: PublicUser = data.users[data.user.id];

	// Messages
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

	// eslint-disable-next-line no-undef
	function scrollChatBottom(behavior?: ScrollBehavior): void {
		elemChat.scrollTo({ top: elemChat.scrollHeight, behavior });
	}

	async function sleep(ms: number){
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	async function postmessage(path: string, body: string){
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

		await postmessage("?/sendmessage", JSON.stringify([sentid, message2send]))
		
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
        switch(msg.action){
            case 'addmsg':
				receivedMessage(msg.data)
                break;
			case 'onuser':
				onlineUsers.push(msg.data)
				onlineUsers = onlineUsers
				break;
			case 'offuser':
				for (let i = 0; i < onlineUsers.length; i++) {
					const e = onlineUsers[i];
					if(e.id === msg.data){
						onlineUsers.splice(i, 1);
						onlineUsers = onlineUsers;
						break;
					}
				}
				break;
			case 'chname':
				for (let i = 0; i < onlineUsers.length; i++) {
					const e = onlineUsers[i];
					if(e.id === msg.data.id){
						e.name = msg.data.name;
						onlineUsers = onlineUsers;
						break;
					}
				}
				msgBuf.forEach(m => m.sender.id === msg.data.id ? m.sender.name = msg.data.name : 0)
				break;
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

		const diassemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

		if(my && mm && md)
			return `${padzero(date.getHours())}:${padzero(date.getMinutes())}`
		else if(my && mm)
			return  `${diassemana[date.getDay()]} ${date.getDate()}, ${padzero(date.getHours())}:${padzero(date.getMinutes())}`
		else
			return date.toLocaleTimeString()
	}
	const modalStore = getModalStore();
	let changeNameModal: ModalSettings = {
		type: 'prompt',
		title: 'Trocar nome',
		body: 'Insira o novo nome abaixo',
		value: data.user.name,
		valueAttr: { type: 'text', minlength: 3, maxlength: 36, required: true },
		response: async (r: string) => {
			await postmessage("?/changename", JSON.stringify({name: r}))
		},
	};
</script>
<FixDestroy><UniSocketClient src={"/chat?from="+lastMessageReceivedDate.getUTCMilliseconds()} onMessage={handleMessage}/></FixDestroy>
<div class='chat w-full h-full grid grid-cols-1= lg:grid-cols-[300px_1fr] grid-rows-[1fh_100px]'>
	<!-- Navigation -->
	<div class="hidden lg:grid grid-rows-[auto_1fr_auto] border-r border-surface-500/30"  style='height: calc(100vh - 150px)'>
		<!-- List -->
		<div class="p-4 space-y-4 overflow-y-auto">
			<small class="opacity-50">Usuários Online</small>
			<div class="overflow-y-auto">
				<ListBox active="variant-filled-primary">
					{#each onlineUsers as user}
						<ListBoxItem bind:group={currentUser} name="people" value={user}>
							<svelte:fragment slot="lead">
								<Avatar src="https://i.pravatar.cc/?img=48" width="w-8" />
							</svelte:fragment>
							{user ? user.name : 'undefined'}
							<svelte:fragment slot="trail">
								{#if user.id === data.user.id}
								Eu
								{/if}
							</svelte:fragment>
						</ListBoxItem>
					{/each}
				</ListBox>
			</div>
		</div>
		<!-- Footer -->
		<footer class="border-t border-surface-500/30 p-4">
			<button class="btn variant-filled" on:click={() => modalStore.trigger(changeNameModal)}>Trocar nome...</button>
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
							<p class="whitespace-pre-wrap">{msg.data}</p>
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