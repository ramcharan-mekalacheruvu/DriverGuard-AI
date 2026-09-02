// src/ai/audioAlerts.js

let lastMessage = "";
let lastMessageTime = 0;

const AUDIO_COOLDOWN = 5000;


export function speakAlert(message) {

    if (
        !("speechSynthesis" in window)
    ) {
        console.warn(
            "Speech synthesis is not supported."
        );

        return;
    }


    const now = Date.now();


    if (
        message === lastMessage &&
        now - lastMessageTime <
            AUDIO_COOLDOWN
    ) {
        return;
    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            message
        );


    speech.rate = 0.95;
    speech.pitch = 1;
    speech.volume = 1;


    window.speechSynthesis.speak(
        speech
    );


    lastMessage = message;
    lastMessageTime = now;
}


// Reset audio cooldown
export function resetAudioAlerts() {

    lastMessage = "";
    lastMessageTime = 0;

    if (
        "speechSynthesis" in window
    ) {
        window.speechSynthesis.cancel();
    }
}