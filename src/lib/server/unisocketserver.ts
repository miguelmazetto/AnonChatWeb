export class UniSocketServer{
    controller?: ReadableStreamDefaultController<any>
    onCancel = () => {}
    canceled = false;
    stream = new ReadableStream({
        start: c => this.controller = c,
        cancel: () => {this.canceled = true; this.onCancel()}
    })
    sendMessage(msg: string){
	    //@ts-ignore
        this.controller.enqueue(msg+'\0')
    }
}