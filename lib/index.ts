import {RTCPusher, RTCPusherConfig} from './pusher'
import {RTCPlayer, RTCPlayerConfig} from './player'


(<any>window).RTCPusher = RTCPusher;
(<any>window).RTCPlayer = RTCPlayer;
(<any>window).RTCPusherConfig = RTCPusherConfig;
(<any>window).RTCPlayerConfig = RTCPlayerConfig;

export {
    RTCPusher, 
    RTCPusherConfig,
    RTCPlayer, 
    RTCPlayerConfig
}