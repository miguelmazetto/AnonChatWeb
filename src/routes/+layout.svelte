<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal, Drawer } from '@skeletonlabs/skeleton';

	// Floating UI for Popups
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { storePopup, initializeStores, getDrawerStore } from '@skeletonlabs/skeleton';

	import Navigation from '$lib/components/navigation.svelte';
	import { Menu } from 'lucide-svelte';

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
	initializeStores();

	const drawerStore = getDrawerStore();
	function drawerOpen(): void {
		drawerStore.open();
	}
</script>

<Modal />

<Drawer width="w-300">
	<Navigation />
</Drawer>

<!-- App Shell -->
<AppShell slotSidebarLeft="w-0 md:w-300 bg-surface-500/10">
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<button class="lg:hidden btn btn-sm mr-4" aria-label="Menu Button" on:click={drawerOpen}>
					<span>
						<Menu />
					</span>
				</button>

				<strong class="text-xl">AnonChat</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<a
					class="btn btn-sm variant-ghost-surface"
					href="https://github.com/miguelmazetto/AnonChatWeb"
					target="_blank"
					rel="noreferrer"
				>
					GitHub
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
