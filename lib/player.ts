import { EventEmitter }   from 'events'

const parseUrl = require('url-parse')


const BASE_URL = 'http://localhost:5000'

const BACK_BASH_URL = 'http://localhost:5000'



class RTCPlayerConfig {

}


class RTCPlayer extends EventEmitter {

    private stream:MediaStream
    private peerconnection:any
    private config:RTCPlayerConfig
    private closed:boolean
    private videoElement:HTMLVideoElement
    private subscriberId:string
    private streamId:string
    private playUrl:string

    private audioTransceiver:RTCRtpTransceiver
    private videoTransceiver:RTCRtpTransceiver

    constructor(config:RTCPlayerConfig) {
        super()
        this.config = config
    }

    async startPlay(playUrl:string) {

        this.playUrl = playUrl

        console.log('playUrl', playUrl)

        const parsedUrl = parseUrl(playUrl)

        let pathname = parsedUrl.pathname
      
        let streaminfo = pathname.split('/')
       
        this.streamId = streaminfo.pop()

        this.stream = null

        let options = {
            iceServers: [],
            iceTransportPolicy : 'all',   // relay or all
            bundlePolicy       : 'max-bundle',
            rtcpMuxPolicy      : 'require',
            sdpSemantics       : 'unified-plan'
        }

        let peerconnection = new RTCPeerConnection(options as RTCConfiguration)

        const transceiverInit:RTCRtpTransceiverInit = {
            direction: 'recvonly'
        }

        this.audioTransceiver = await peerconnection.addTransceiver('audio', transceiverInit)
        this.videoTransceiver = await peerconnection.addTransceiver('video', transceiverInit)

        peerconnection.ontrack = (event) => {

            setTimeout(() => {
                if (this.stream) {
                    return
                }
                this.stream = event.streams[0]

                if (this.videoElement && !this.videoElement.srcObject) {
                    this.videoElement.srcObject = this.stream;
                }
               
            },0)
        }

        const offer = await peerconnection.createOffer()

        await peerconnection.setLocalDescription(offer)

        this.peerconnection = peerconnection

        const data = {
            streamUrl: playUrl,
            streamId:this.streamId,
            sdp: offer.sdp,
        }

        console.dir('play', data)

        let res = await fetch(BASE_URL + '/play', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        let ret = await res.json()

        console.dir(ret)

        const { sdp, subscriberId} = ret.d 

        this.subscriberId = subscriberId

        let answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdp
        })

        await this.peerconnection.setRemoteDescription(answer)

    }

    async stopPlay() {
        
        if (this.peerconnection) {
            this.peerconnection.close()
        }

        const data = {
            streamUrl: this.playUrl,
            streamId:this.streamId,
            subscriberId: this.subscriberId
        }

        let res = await fetch(BASE_URL + '/unplay', {
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

        videoElement.onloadedmetadata = () => {

        }
        
        this.videoElement = videoElement

        try {
            this.videoElement.srcObject = this.stream
            this.videoElement.play()
        } catch (error) {
            console.error(error)
        }
    }
    
}

export {
    RTCPlayerConfig,
    RTCPlayer
}