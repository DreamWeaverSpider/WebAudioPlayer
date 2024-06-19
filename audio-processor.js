class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);