<script lang="ts">
	import { Avatar, ListBox, ListBoxItem, type ModalSettings, getModalStore } from '@skeletonlabs/skeleton';
	import { loggedUser, onlineUsers, postmessage } from '$lib/client/chat';

    // Usuario selecionado na navegacao
	let currentUser = $loggedUser;

	/**
	 * Configuracao do popup de trocar nome
	 */
	const modalStore = getModalStore();
	let changeNameModal: ModalSettings = {
		type: 'prompt',
		title: 'Trocar nome',
		body: 'Insira o novo nome abaixo',
		value: $loggedUser.name,
		valueAttr: { type: 'text', minlength: 3, maxlength: 36, required: true },
		response: async (r: string) => {
			await postmessage("?/changename", JSON.stringify({name: r}))
		},
	};

    loggedUser.subscribe(v => {currentUser = v; changeNameModal.value = v.name});

</script>

<!-- Navigation -->
<div class="grid grid-rows-[auto_1fr_auto] border-r border-surface-500/30"  style='height: calc(100vh - 150px)'>
	
	<!-- Usuarios Online -->
	<div class="p-4 space-y-4 overflow-y-auto">
	
		<small class="opacity-50">Usuários Online</small>
        		
		<div class="overflow-y-auto">
			<ListBox active="variant-filled-primary">
				{#each $onlineUsers as user} <!-- Para cada usuario online -->
					<ListBoxItem bind:group={currentUser} name="people" value={user}>
	
						<!-- Avatar do usuario -->
						<svelte:fragment slot="lead">
							<Avatar src="https://i.pravatar.cc/?img=48" width="w-8" />
						</svelte:fragment>
	
						<!-- Nome do usuario -->
						{user ? user.name : 'undefined'}
                            		
						<!-- Indicador de "Eu" -->
						<svelte:fragment slot="trail">
							{#if user.id === $loggedUser.id}
							Eu
							{/if}
						</svelte:fragment>
					</ListBoxItem>
				{/each}
			</ListBox>
		</div>
	</div>
	
	<!-- Parte debaixo do Navigation (parte dos botoes Trocar Usuario) -->
	<footer class="border-t border-surface-500/30 p-4">
		<button class="btn variant-filled" on:click={() => modalStore.trigger(changeNameModal)}>Trocar nome...</button>
	</footer>
</div>