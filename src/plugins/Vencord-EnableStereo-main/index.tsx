const definePlugin = (options) => options;

/*
* Vencord, a Discord client mod
* Copyright (c) 2025 pluckerpilple (@pluckerpilple)*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";



export default definePlugin({
    name: "BetterMicrophone",
    description: "Enable stereo audio to stream through your microphone!",
    authors: [Devs.pluckerpilple],
    version: "1.0.0",
    
    start() {
        if (!window.Vencord) return;
        
        const Webpack = window.Vencord.Webpack;
        if (!Webpack) return;
        
        const voiceModule = Webpack.find(m => 
            m?.prototype && typeof m?.prototype?.setLocalVolume === "function"
        );
        
        if (!voiceModule) return;
        
        try {
            const originalSetLocalVolume = voiceModule.prototype.setLocalVolume;
            
            voiceModule.prototype.setLocalVolume = function(...args) {
                if (this && this.conn && this.conn.setTransportOptions) {
                    const conn = this.conn;
                    
                    if (!conn._originalSetTransportOptions) {
                        conn._originalSetTransportOptions = conn.setTransportOptions.bind(conn);
                        
                        conn.setTransportOptions = function(options) {
                            if (!options || typeof options !== "object") {
                                return conn._originalSetTransportOptions(options);
                            }
                            
                            try {
                                const enhancedOptions = {
                                    ...options,
                                    audioEncoder: {
                                        ...(options.audioEncoder || {}),
                                        channels: 2,
                                        freq: 48000,
                                        rate: 512000,
                                        pacsize: 960,
                                    },
                                    packetLossRate: 0,
                                    encodingBitRate: 512000,
                                    callBitrate: 512000,
                                    callMaxBitRate: 512000,
                                };
                                
                                return conn._originalSetTransportOptions(enhancedOptions);
                            } catch (err) {
                                return conn._originalSetTransportOptions(options);
                            }
                        };
                    }
                }
                
                return originalSetLocalVolume.apply(this, args);
            };
            
            this._originalSetLocalVolume = originalSetLocalVolume;
        } catch (err) {}
    },
    
    stop() {
        try {
            const Webpack = window.Vencord?.Webpack;
            
            if (Webpack && this._originalSetLocalVolume) {
                const voiceModule = Webpack.find(m => 
                    m?.prototype && typeof m?.prototype?.setLocalVolume === "function"
                );
                
                if (voiceModule) {
                    voiceModule.prototype.setLocalVolume = this._originalSetLocalVolume;
                }
            }
        } catch (err) {}
    }
});