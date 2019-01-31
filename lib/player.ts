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
    private streamId:string 
    private websocket:WebSocket

    constructor(config:RTCPlayerConfig) {
        super()
        this.config = config
    }

    async startPlay(streamId:string, playUrl?:string) {

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


            return new Promise((resolve,reject) => {

                this.websocket = new WebSocket(playUrl)

                let hasConnected = false
    
                this.websocket.onopen = () => {
    
                    hasConnected = true
    
                    const data =  {
                        cmd: 'play',
                        streamId:streamId,
                        sdp: offer.sdp
                    }
    
                    this.websocket.send(JSON.stringify(data))
    
                    console.log('send', data)
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
    
                this.websocket.onclose = (event) => {

                    console.log("onclose")
                }
    
                this.websocket.onerror = (event) => {

                    console.error('onerror')
                    if (!hasConnected) {
                        reject('can not connecte to server')
                    }
                }
            })

        })

    }

    async stopPlay() {
        
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