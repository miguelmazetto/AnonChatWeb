<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';

    // Props
    export let src : string | undefined
    export let onMessage = (msg: string) => console.log("Unhandled Message:", msg)

	//const noop = () => {}

	function concatU8Arr(bufs: Uint8Array[]) : Uint8Array{
		let length = 0
		bufs.forEach(buf => length += buf.length)
		let merged = new Uint8Array(length)
		let offset = 0
		bufs.forEach(buf => {
			merged.set(buf, offset)
			offset += buf.length
		})
		return merged
	}

	//const globalR = globalThis as Record<string, any>;
	//globalR.unisocketclient = globalR.unisocketclient ?? {}
	//const usc = globalR.unisocketclient as Record<string, ReadableStreamDefaultReader<Uint8Array> | undefined>

	let curreader : ReadableStreamDefaultReader<Uint8Array> | undefined; // @hmr:keep
	let markdestroy = false; // @hmr:keep
    let retrying = false; // @hmr:keep

	function tryGet(){
		//curreader = curreader ?? usc[src ?? '']
        if(src === undefined) return
		if((curreader && !curreader.closed ) || retrying) return;
		//usc[src ?? ''] = curreader

		markdestroy = false

		// Delete duplicated socket
		// if(usc[src ?? '']) usc[src ?? '']()
		// usc[src ?? ''] = doDestroy;

        retrying = true
		fetch(src)
			.then((response) => response.body)
			.then(async (body) => {
				if(markdestroy){
					body?.cancel()
					markdestroy = false
					return
				}
				if(body === null) throw null

				const reader = body.getReader()
				curreader = reader
                retrying = false

				let running = true
				reader.closed.finally(() => running = false)

				let msgbuf: Uint8Array[] = [];

				onNavigate(() => {running = false});

				while(running){
					let chunk = await reader.read()
					if(chunk.value === undefined) break;

					/*
						[8000bytes]
						[1400bytes][1400bytes][1400bytes][1400bytes]...
						{        }
						[700bytes]
								 [700bytes][1400bytes][1400bytes][1400bytes]
					*/
					let iof_zero: number			  //'\0'
					while((iof_zero = chunk.value.indexOf(0)) != -1){
						// Processando jsons do chunk atual

						let msg_arr = chunk.value.subarray(0, iof_zero) // Pegar JSON
						chunk.value = chunk.value.subarray(iof_zero+1)  // Deixar o resto chunk

						msgbuf.push(msg_arr)
						//handleMessageArr(concatU8Arr(msgbuf))
                        onMessage(new TextDecoder().decode(concatU8Arr(msgbuf)))
						msgbuf = []
					}

					if(chunk.value.length > 0)
						msgbuf.push(chunk.value)
					
					if(chunk.done == true) break;
					//console.log("GotChunk:", chunk)
				}

				if(curreader)
					await curreader.cancel()

				curreader = undefined
			})
			.finally(() => { if(!retrying && !markdestroy) tryGet() })
	}
	function handleFocus() {
		//console.log('Focus:', curreader, usc[src ?? ''], curreader?.closed, retrying)
		//curreader = curreader ?? usc[src ?? '']
        if(!retrying && curreader === undefined) tryGet()
	}
	function handleBlur() {
		//console.log("GotBlur!", Date.now())
	}
	onMount(tryGet)

	function doDestroy(){
		markdestroy = true
		curreader?.cancel()
		curreader = undefined
		//delete usc[src ?? ''];
	}

	onDestroy(doDestroy)
</script>

<svelte:window on:focus={handleFocus} on:blur={handleBlur} />

<slot />