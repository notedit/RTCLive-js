import { EventEmitter }   from 'events'


class RTCPlayerConfig {

}


class RTCPlayer extends EventEmitter {

    private stream:MediaStream
    private peerconnection:any
    private config:RTCPlayerConfig
    private closed:boolean
    private videoElement:HTMLVideoElement
    private subscriberId:string

    constructor(config:RTCPlayerConfig) {
        super()
        this.config = config
    }

    async startPlay(playUrl:string) {

        return new Promise(async (resolve,reject) => {

            // timeout for play 
            let playTimeout = setTimeout(() => {
                playTimeout = null
                reject()
            },2000)

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
    
            this.peerconnection.ontrack = (event) => {

                if(playTimeout) {
                    clearTimeout(playTimeout)
                    playTimeout = null
                }

                setTimeout(() => {
                    if (this.stream) {
                        return
                    }
                    this.stream = event.streams[0]
                    console.log('got stream ')
                    resolve()
                }, 0)
            }

            this.peerconnection.addTransceiver("audio", {direction:"recvonly"})
            this.peerconnection.addTransceiver("video", {direction:"recvonly"})

            const offer = await this.peerconnection.createOffer()

            await this.peerconnection.setLocalDescription(offer)

            let res = await fetch(playUrl, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sdp: offer.sdp
                })
            })
    
            let ret = await res.json()

            this.subscriberId = ret.d.subscriberId 

            let answer = new RTCSessionDescription({
                type: 'answer',
                sdp: ret.d.sdp
            })

            await this.peerconnection.setRemoteDescription(answer)
        })

    }

    async stopPlay(unplayUrl:string) {

        let res = await fetch(unplayUrl, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscriberId:this.subscriberId
            })
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

        try {
            this.videoElement.play()
        } catch (error) {
            
        }
    }
    
}

export {
    RTCPlayerConfig,
    RTCPlayer
}