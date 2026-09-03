
// src/ai/audioAlerts.js

let lastMessage = "";
let lastMessageTime = 0;

const AUDIO_COOLDOWN = 5000;

let audioUnlocked = false;
let voicesLoaded = false;


// ---------------------------------------------
// Exact DriverGuard alert messages
// ---------------------------------------------

export const ALERT_MESSAGES = {
    phone:
        "Please put the phone down and focus on driving.",

    headPose:
        "Please keep your eyes on the road.",

    attention:
        "Please focus your attention on the road.",

    drowsiness:
        "Warning. You appear to be drowsy. Please stay alert.",

    yawning:
        "You appear tired. Please stay alert.",
};


// ---------------------------------------------
// Check browser support
// ---------------------------------------------

function isSpeechSupported() {
    return (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        typeof window.SpeechSynthesisUtterance !== "undefined"
    );
}


// ---------------------------------------------
// Load voices
// ---------------------------------------------

function loadVoices() {

    if (!isSpeechSupported()) {
        return [];
    }

    const voices =
        window.speechSynthesis.getVoices();

    if (voices && voices.length > 0) {
        voicesLoaded = true;
    }

    return voices || [];
}


// ---------------------------------------------
// Get English voice
// ---------------------------------------------

function getVoice() {

    const voices = loadVoices();

    if (!voices.length) {
        return null;
    }

    return (
        voices.find(
            (voice) =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        ) || voices[0]
    );
}


// ---------------------------------------------
// Load voices when browser makes them available
// ---------------------------------------------

if (isSpeechSupported()) {

    loadVoices();

    window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
    };
}


// ---------------------------------------------
// Unlock speech
//
// IMPORTANT:
// This function MUST be called directly from
// the Start Monitoring button click.
// ---------------------------------------------

export function unlockAudio() {

    if (!isSpeechSupported()) {

        console.warn(
            "Speech synthesis is not supported."
        );

        return false;
    }

    try {

        const synth =
            window.speechSynthesis;

        // Stop previous speech
        synth.cancel();

        // Force browser to resume speech engine
        if (typeof synth.resume === "function") {
            synth.resume();
        }

        const voice = getVoice();

        /*
         * Very short silent utterance.
         * This primes speech synthesis on many
         * mobile browsers.
         */
        const unlockUtterance =
            new SpeechSynthesisUtterance(".");

        unlockUtterance.volume = 0;
        unlockUtterance.rate = 10;
        unlockUtterance.pitch = 1;

        if (voice) {
            unlockUtterance.voice = voice;
        }

        unlockUtterance.lang =
            voice?.lang || "en-US";

        unlockUtterance.onend = () => {

            console.log(
                "🔊 Speech engine unlocked"
            );
        };

        unlockUtterance.onerror = (error) => {

            console.warn(
                "Speech unlock warning:",
                error
            );
        };

        synth.speak(
            unlockUtterance
        );

        /*
         * Set this immediately because this function
         * itself is called by the user's tap.
         */
        audioUnlocked = true;

        console.log(
            "🔊 Audio unlocked"
        );

        return true;

    } catch (error) {

        console.error(
            "Audio unlock failed:",
            error
        );

        audioUnlocked = false;

        return false;
    }
}


// ---------------------------------------------
// Speak alert
// ---------------------------------------------

export function speakAlert(message) {

    if (!isSpeechSupported()) {

        console.warn(
            "Speech synthesis is not supported."
        );

        return false;
    }

    if (!message) {
        return false;
    }

    /*
     * If audio wasn't initialized, try to resume it.
     */
    if (!audioUnlocked) {

        console.warn(
            "⚠️ Audio is locked. User interaction is required."
        );

        return false;
    }

    const now = Date.now();

    /*
     * Prevent repeated alerts.
     */
    if (
        message === lastMessage &&
        now - lastMessageTime < AUDIO_COOLDOWN
    ) {
        return false;
    }

    try {

        const synth =
            window.speechSynthesis;

        /*
         * Mobile browsers can sometimes leave the
         * speech engine paused.
         */
        if (typeof synth.resume === "function") {
            synth.resume();
        }

        /*
         * Cancel only existing speech.
         */
        synth.cancel();

        const voice = getVoice();

        const utterance =
            new SpeechSynthesisUtterance(
                message
            );

        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.lang =
            voice?.lang || "en-US";

        if (voice) {
            utterance.voice = voice;
        }

        utterance.onstart = () => {

            console.log(
                "🔊 ALERT:",
                message
            );
        };

        utterance.onend = () => {

            console.log(
                "🔊 Alert finished"
            );
        };

        utterance.onerror = (event) => {

            console.error(
                "🔊 Speech error:",
                event
            );
        };

        synth.speak(
            utterance
        );

        lastMessage = message;
        lastMessageTime = now;

        return true;

    } catch (error) {

        console.error(
            "Speech alert failed:",
            error
        );

        return false;
    }
}


// ---------------------------------------------
// Individual alert functions
// ---------------------------------------------

export function speakPhoneAlert() {

    return speakAlert(
        ALERT_MESSAGES.phone
    );
}


export function speakHeadPoseAlert() {

    return speakAlert(
        ALERT_MESSAGES.headPose
    );
}


export function speakAttentionAlert() {

    return speakAlert(
        ALERT_MESSAGES.attention
    );
}


export function speakDrowsinessAlert() {

    return speakAlert(
        ALERT_MESSAGES.drowsiness
    );
}


export function speakYawningAlert() {

    return speakAlert(
        ALERT_MESSAGES.yawning
    );
}


// ---------------------------------------------
// Audio status
// ---------------------------------------------

export function isAudioUnlocked() {

    return audioUnlocked;
}


// ---------------------------------------------
// Reset alerts
// ---------------------------------------------

export function resetAudioAlerts() {

    lastMessage = "";
    lastMessageTime = 0;

    if (isSpeechSupported()) {

        window.speechSynthesis.cancel();

        if (
            typeof window.speechSynthesis.resume ===
            "function"
        ) {
            window.speechSynthesis.resume();
        }
    }

    /*
     * DO NOT set audioUnlocked to false.
     *
     * The user already interacted with the page.
     */
}


// ---------------------------------------------
// Completely lock audio
// ---------------------------------------------

export function lockAudio() {

    audioUnlocked = false;

    lastMessage = "";
    lastMessageTime = 0;

    if (isSpeechSupported()) {
        window.speechSynthesis.cancel();
    }
}
