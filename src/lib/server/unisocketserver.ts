export class UniSocketServer{
    controller?: ReadableStreamDefaultController<any>
    onCancel = () => {}
    stream = new ReadableStream({
        start: c => this.controller = c,
        cancel: () => this.onCancel()
    })
    sendMessage(msg: string){
	    //@ts-ignore
        this.controller.enqueue(msg+'\0')
    }
}