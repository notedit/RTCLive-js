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

    async startPush(pushUrl:string) {

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

        let res = await fetch(pushUrl, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sdp: offer.sdp
            })
        })

        let ret = await res.json()

        let answer = new RTCSessionDescription({
            type: 'answer',
            sdp: ret.d.sdp
        })

        await this.peerconnection.setRemoteDescription(answer)
    }

    async stopPush(unpushUrl:string) {

        if (this.audioSender) {
            this.peerconnection.removeTrack(this.audioSender)
        }
        
        if (this.videoSender) {
            this.peerconnection.removeTrack(this.videoSender)
        }

        let res = await fetch(unpushUrl, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
        })
        

        if (this.peerconnection) {
            this.peerconnection.close()
        }

    }

    play(videoElement:HTMLVideoElement) {

        videoElement.setAttribute('playsinline','playsinline')
        videoElement.setAttribute('autoplay', 'true')

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


