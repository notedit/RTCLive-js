import { EventEmitter }   from 'events'
const parseUrl = require('url-parse')


const BASE_URL = 'http://localhost:5000'

const BACK_BASH_URL = 'http://localhost:5000'


class RTCPusherConfig {
    video:boolean
    audio:boolean
}



class RTCPusher extends EventEmitter {

    private stream:MediaStream
    private peerconnection:any
    private config:RTCPusherConfig
    private closed:boolean
    private videoElement:HTMLVideoElement

    private audioTrack:MediaStreamTrack
    private videoTrack:MediaStreamTrack 
    private audioTransceiver:RTCRtpTransceiver
    private videoTransceiver:RTCRtpTransceiver

    private streamId:string 
    private pushUrl:string 

    constructor(config:RTCPusherConfig) {
        super()
        this.config = config
        this.closed = false
    }

    async setupLocalMedia() {

        //todo init local media 
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: this.config.audio,
            video: this.config.video
        })
        
        this.audioTrack = stream.getAudioTracks()[0]
        this.videoTrack = stream.getVideoTracks()[0]

        this.stream = stream
    }

    // pushUrl:  webrtc://domain:port/app/stream 
    async startPush(pushUrl:string) {

        const parsedUrl = parseUrl(pushUrl)

        let pathname = parsedUrl.pathname
        let streaminfo = pathname.split('/')
        console.dir(streaminfo)
        this.streamId = streaminfo.pop()

        this.pushUrl = pushUrl

        let options = {
            iceServers: [],
            iceTransportPolicy : 'all',   // relay or all
            bundlePolicy       : 'max-bundle',
            rtcpMuxPolicy      : 'require',
            sdpSemantics       : 'unified-plan'
        }

        let peerconnection = new RTCPeerConnection(options as RTCConfiguration)

        peerconnection.oniceconnectionstatechange = () => {
            console.log(peerconnection.iceConnectionState)
        }

        const transceiverInit:RTCRtpTransceiverInit = {
            direction: 'sendonly',
            streams: [this.stream]
        }

        if (this.audioTrack) {
            this.audioTransceiver = await peerconnection.addTransceiver(this.audioTrack,transceiverInit)
        } else {
            this.audioTransceiver = await peerconnection.addTransceiver('audio', transceiverInit)
        }

        if (this.videoTrack) {
            this.videoTransceiver = await peerconnection.addTransceiver(this.videoTrack, transceiverInit)
        } else {
            this.videoTransceiver = await peerconnection.addTransceiver('video', transceiverInit)
        }

        const offer = await peerconnection.createOffer()

        await peerconnection.setLocalDescription(offer)

        this.peerconnection = peerconnection;

        const data = {
            streamUrl: pushUrl,
            streamId:this.streamId,
            sdp: offer.sdp,
        }

        let res = await fetch(BASE_URL + '/publish', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        let ret = await res.json()

        console.dir(ret)

        const { sdp } = ret.d 

        let answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdp
        })

        await this.peerconnection.setRemoteDescription(answer)
    }

    async stopPush() {

        if (this.audioTrack) {
            this.peerconnection.removeTrack(this.audioTransceiver.sender)
        }
        
        if (this.videoTrack) {
            this.peerconnection.removeTrack(this.videoTransceiver.sender)
        }

        if (this.peerconnection) {
            this.peerconnection.close()
        }

        const data = {
            streamUrl: this.pushUrl,
            streamId:this.streamId
        }

        let res = await fetch(BASE_URL + '/unpublish', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        let ret = await res.json()

        console.dir(ret)
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


