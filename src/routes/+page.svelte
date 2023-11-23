<script lang="ts">
	import { onMount } from 'svelte';
	import { Avatar, ListBox, ListBoxItem, type ModalSettings, getModalStore } from '@skeletonlabs/skeleton';
	import UniSocketClient from '$lib/components/unisocketclient.svelte';
	import FixDestroy from '$lib/components/fixdestroy.svelte';
	import type { PageData } from './$types';
	import type { addmsg_cast } from './+page.server';
	import { loggedUser, onlineUsers, postmessage, type PublicUser } from '$lib/client/chat';
	import Navigation from '$lib/components/navigation.svelte';
	
	import { Capacitor, CapacitorCookies } from '@capacitor/core'
	import { Preferences } from '@capacitor/preferences';

	if(Capacitor.isNativePlatform()){
		onMount(async () => {
			const saved = (await Preferences.get({ key: 'guesttoken' })).value
			if(saved){
				await CapacitorCookies.setCookie({
					key: 'guesttoken',
					value: saved
				})
				window.location.href = window.location.href;
			}else{
				if(document.cookie.indexOf('guesttoken') === -1){
					await CapacitorCookies.setCookie({
						key: 'newuser',
						value: 'true'
					})
					window.location.href = window.location.href;
				}else{
					await Preferences.set({
						key: 'guesttoken',
						value: (await CapacitorCookies.getCookies()).guesttoken
					})
				}
			}
		})
	}

	/**
	 * Dados embutidos pelo load (Server-Side Rendering)
	 */
	export let data: PageData;

	// Horario da ultima mensagem recebida
	// Esse valor é importante pois permite
	// que pedimos ao servidor no UniSocket para enviar
	// apenas as mensagens após a ultima mensagem recebida.
	const lastMessageReceivedDate = data.messages.at(-1)?.createdAt ?? new Date(Date.now())

	type Message = addmsg_cast

	console.log("Data:", data)

	// Elemento que deve ser scrollado do chat
	let elemChat: HTMLElement;

	/**
	 * Insere o usuario logado na lista de usuarios online
	 */
	data.users[data.user.id] = data.user;

	/**
	 * Array de usuarios online, inicializado pelos dados do load
	 */
	$onlineUsers = Object.values(data.users);
	$loggedUser = data.user;

	console.log($onlineUsers)

	// Conteudo da entrada de texto do chat
	let currentMessage = '';
	let cursending = 0;
	type ClMessage = Message & {
		sendingId?: number
	}

	/**
	 * Buffer de mensagens
	 * Inicializado com os dados incluidos no load
	 */
	let msgBuf: ClMessage[] = data.messages.map(msg => {
		// @ts-ignore
		if(msg.sender.id === data.user.id) msg.host = true;
		return msg
	});

	// eslint-disable-next-line no-undef
	function scrollChatBottom(behavior?: ScrollBehavior): void {
		elemChat.scrollTo({ top: elemChat.scrollHeight, behavior });
	}

	/**
	 * Monta e envia (via POST) a mensagem que esta na entrada de texto
	 */
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

		// Insere no buffer a mensagem
		// que o usuario esta enviando imediatamente
		msgBuf = [...msgBuf, msg]

		const message2send = currentMessage;

		// Limpa prompt
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

	/**
	 * Processa mensagem do chat
	 * (insere no buffer, chama renderizacao e scrolla o chat para baixo)
	 * @param msg
	 */
	function receivedMessage(msg: Message): void {

		msgBuf.push(msg)

		msgBuf = msgBuf // esse truque indica que a variavel atualizou

		setTimeout(() => {
			scrollChatBottom('smooth');
		}, 0);
	}

	/**
	 * Processa botoes do teclado apertados enquanto a caixa
	 * de entrada de mensagem estiver selecionada
	 * @param event
	 */
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

	/**
	 * Processa mensagem recebida do servidor
	 * @param msgstr
	 */
    function handleMessage(msgstr: string){
		const msg = JSON.parse(msgstr)
        console.log("Received msg:", msg)

        switch(msg.action){

			/**
			 * Recebemos uma mensagem nova
			*/
            case 'addmsg':
				receivedMessage(msg.data)
                break;

			/**
			 * Um usuario ficou online
			*/
			case 'onuser':
				onlineUsers.update(a => (a.push(msg.data), a))
				break;

			/**
			 * Um usuario ficou offline
			*/
			case 'offuser':
				onlineUsers.update(a => {
					for (let i = 0; i < a.length; i++) {
						const e = a[i];
						if(e.id === msg.data){
							a.splice(i, 1);
							break;
						}
					}
					return a;
				})
				break;

			/**
			 * Um usuario mudou o nome
			*/
			case 'chname':
				onlineUsers.update(a => {
					for (let i = 0; i < a.length; i++) {
						const e = a[i];
						if(e.id === msg.data.id){
							console.log("Found target:", e)
							e.name = msg.data.name;
							break;
						}
					}
					return a;
				})
				if(msg.data.id === $loggedUser.id)
					loggedUser.update(u => (u.name = msg.data.name, u))
				msgBuf.forEach(m =>
					m.sender.id === msg.data.id ? m.sender.name = msg.data.name : 0)
				msgBuf = msgBuf;
				break;
        }
	}

	/**
	 * Adiciona zero a esquerda ate o total numero seja n
	 * @param s
	 * @param n
	 */
	function padzero(s: string|number, n: number = 2){
		return s.toString().padStart(n, '0')
	}

	/**
	 * Formatacao de data mostrado ao usuario
	 * @param date
	 */
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

</script>
<FixDestroy><UniSocketClient src={"/chat?from="+lastMessageReceivedDate.getUTCMilliseconds()} onMessage={handleMessage}/></FixDestroy>

<div class='chat w-full h-full grid grid-cols-1= lg:grid-cols-[300px_1fr] grid-rows-[1fh_100px]'>

	<div class='hidden lg:grid'>
		<Navigation />
	</div>

	<!-- Chat -->
	<div class="grid grid-row-[1fr_auto]">
		<!-- Conversas -->
		<section bind:this={elemChat} class="p-4 overflow-y-auto space-y-4" style='height: calc(100vh - 150px)'>
			{#each msgBuf as msg} <!-- Para cada mensagem -->

				<!-- Mensagem de outras pessoas -->
				{#if msg.sender.id !== data.user.id}
					<div class="grid grid-cols-[auto_1fr] gap-2">

						<!-- Avatar do autor da mensagem -->
						<Avatar src="https://i.pravatar.cc/?img=48" width="w-12" />

						<div class="card p-2 variant-soft rounded-tl-none space-y-1">

							<header class="flex justify-between items-center">

								<!-- Nome do autor -->
								<p class="font-bold">{msg.sender.name}</p>

								<!-- Data de envio da mensagem -->
								<small class="opacity-50">{formatDate(msg.createdAt)}</small>
							</header>

							<!-- Conteudo da mensagem -->
							<p class="whitespace-pre-wrap">{msg.data}</p>

						</div>
					</div>
				{:else}
				<!-- Mensagem do usuario atual -->
					<div class="grid grid-cols-[1fr_auto] gap-2">
						<div class="card p-2 rounded-tr-none space-y-1 variant-soft-primary">
							<header class="flex justify-between items-center">

								<!-- Nome do autor -->
								<p class="font-bold">{msg.sender.name}</p>

								<!-- Data de envio da mensagem -->
								<small class="opacity-50">{formatDate(msg.createdAt)}</small>
							</header>

							<!-- Conteudo da mensagem -->
							<p class="whitespace-pre-wrap">{msg.data}</p>

						</div>

						<!-- Avatar do autor da mensagem -->
						<Avatar src="https://i.pravatar.cc/?img=48" width="w-12" />
					</div>
				{/if}
			{/each}
		</section>

		<!-- Prompt de enviar mensagens -->
		<section class="border-t border-surface-500/30 p-4 h-fit">
			<div class="input-group input-group-divider grid-cols-[auto_1fr_auto] rounded-container-token">

				<!-- Botao de adicionar anexo (inutilizado atualmente) -->
				<button class="input-group-shim">+</button>

				<!-- Entrada de texto -->
				<textarea
					bind:value={currentMessage}
					class="bg-transparent border-0 ring-0"
					name="prompt"
					id="prompt"
					placeholder="Escreva uma mensagem..."
					rows="1"
					on:keydown={onPromptKeydown}
				/>

				<!-- Botao de enviar mensagem -->
				<button class={currentMessage ? 'variant-filled-primary' : 'input-group-shim'} on:click={addMessage}>
					<i class="fa-solid fa-paper-plane" />
				</button>
			</div>
		</section>
	</div>
</div>