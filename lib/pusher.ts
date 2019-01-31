import { EventEmitter }   from 'events'

class RTCPusherConfig {

}

class RTCPusher extends EventEmitter {

    private stream:MediaStream
    private peerconnection:any
    private config:RTCPusherConfig
    private closed:boolean
    private videoElement:HTMLVideoElement

    private audioTrack:MediaStreamTrack
    private videoTrack:MediaStreamTrack 
    private audioSender:RTCRtpSender
    private videoSender:RTCRtpSender
    private websocket:WebSocket
    private streamId:string 
    private pushUrl:string

    constructor(config:RTCPusherConfig) {
        super()
        this.config = config
        this.closed = false
    }

    async setupLocalMedia() {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio:true,
            video:true
        })
        
        this.audioTrack = stream.getAudioTracks()[0]
        this.videoTrack = stream.getVideoTracks()[0]

        this.stream = stream
    }

    async startPush(streamId:string, pushUrl:string) {

        this.streamId = streamId
        this.pushUrl = pushUrl


        let options = {
            iceServers: [],
            iceTransportPolicy : 'all',   // relay or all
            bundlePolicy       : 'max-bundle',
            rtcpMuxPolicy      : 'require',
            sdpSemantics       : 'unified-plan'
        }

        this.peerconnection = new RTCPeerConnection(options as RTCConfiguration)

        this.peerconnection.oniceconnectionstatechange = () => {
            console.log(this.peerconnection.iceConnectionState)
        }

        if (this.audioTrack) {
            this.audioSender = await this.peerconnection.addTrack(this.audioTrack, this.stream)
        }

        if (this.videoTrack) {
            this.videoSender = await this.peerconnection.addTrack(this.videoTrack, this.stream)
        }

        const offer = await this.peerconnection.createOffer()
        // todo sdp mangle
        await this.peerconnection.setLocalDescription(offer)


        return new Promise(async (resolve,reject) => {

            this.websocket = new WebSocket(pushUrl)

            let hasConnected = false
            this.websocket.onopen = () => {
    
                console.log('onopen')

                hasConnected = true

                const data =  {
                    cmd: 'publish',
                    streamId:streamId,
                    sdp: offer.sdp,
                    data: {}
                }

                this.websocket.send(JSON.stringify(data))

            }
    
            this.websocket.onerror = () => {
                console.error('onerror')

                if (!hasConnected) {
                    reject('can not connecte to server')
                }
            }
    
            this.websocket.onmessage = async (event) => {
                const data = event.data
                const msg = JSON.parse(data)

                if (msg.code > 0) {
                    reject('onmessage error')
                    return
                }

                let answer = new RTCSessionDescription({
                    type: 'answer',
                    sdp: msg.data.sdp
                })
        
                await this.peerconnection.setRemoteDescription(answer)
                
                resolve()
            } 

            this.websocket.onclose = () => {
                console.log("onclose")
            }

        })

    }

    async stopPush() {

        if (this.audioSender) {
            this.peerconnection.removeTrack(this.audioSender)
        }
        
        if (this.videoSender) {
            this.peerconnection.removeTrack(this.videoSender)
        }


        if (this.peerconnection) {
            this.peerconnection.close()
        }

        if (this.websocket) {
            this.websocket.close()
        }

    }

    play(videoElement:HTMLVideoElement) {

        videoElement.setAttribute('playsinline','playsinline')
        videoElement.setAttribute('autoplay', 'true')
        videoElement.muted = true

        videoElement.onloadedmetadata = () => {

        }

        this.videoElement = videoElement
        this.videoElement.srcObject = this.stream
    }

}

export {
    RTCPusherConfig,
    RTCPusher
}


