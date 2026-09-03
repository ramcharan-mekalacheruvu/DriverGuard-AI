// src/ai/audioAlerts.js

let lastMessage = "";
let lastMessageTime = 0;

const AUDIO_COOLDOWN = 5000;

let audioUnlocked = false;
let selectedVoice = null;


// ---------------------------------------------
// Check speech support
// ---------------------------------------------

function speechSupported() {
    return (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        typeof window.SpeechSynthesisUtterance !== "undefined"
    );
}


// ---------------------------------------------
// Load a suitable voice
// ---------------------------------------------

function loadVoice() {

    if (!speechSupported()) {
        return null;
    }

    const voices =
        window.speechSynthesis.getVoices();

    if (!voices || voices.length === 0) {
        return null;
    }

    // Prefer English voices
    const englishVoice =
        voices.find((voice) =>
            voice.lang &&
            voice.lang.toLowerCase().startsWith("en")
        );

    selectedVoice =
        englishVoice || voices[0];

    return selectedVoice;
}


// ---------------------------------------------
// Load voices when browser provides them
// ---------------------------------------------

if (speechSupported()) {

    window.speechSynthesis.onvoiceschanged = () => {
        loadVoice();
    };

    loadVoice();
}


// ---------------------------------------------
// Unlock audio on mobile
// IMPORTANT:
// Call this directly from a user click/tap.
// ---------------------------------------------

export function unlockAudio() {

    if (!speechSupported()) {

        console.warn(
            "Speech synthesis is not supported by this browser."
        );

        return false;
    }

    try {

        // Make sure voices are loaded
        loadVoice();

        // Stop anything currently speaking
        window.speechSynthesis.cancel();

        /*
         * Mobile browsers generally require speech to be
         * triggered by a user interaction such as:
         *
         * Start Monitoring button
         *
         * This short silent utterance initializes speech.
         */

        const unlockSpeech =
            new SpeechSynthesisUtterance(" ");

        unlockSpeech.volume = 0;
        unlockSpeech.rate = 1;
        unlockSpeech.pitch = 1;

        if (selectedVoice) {
            unlockSpeech.voice = selectedVoice;
        }

        unlockSpeech.onend = () => {
            console.log("🔊 Mobile audio unlocked");
        };

        unlockSpeech.onerror = (error) => {
            console.warn(
                "Audio unlock speech error:",
                error
            );
        };

        window.speechSynthesis.speak(
            unlockSpeech
        );

        audioUnlocked = true;

        console.log(
            "🔊 Audio unlocked successfully"
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

    if (!speechSupported()) {

        console.warn(
            "Speech synthesis is not supported."
        );

        return;
    }

    if (!message) {
        return;
    }

    /*
     * If the user has not interacted with the page,
     * browsers may block speech.
     */
    if (!audioUnlocked) {

        console.warn(
            "⚠️ Audio is locked. Call unlockAudio() from a user interaction."
        );

        return;
    }

    const now = Date.now();

    /*
     * Prevent the same alert from being spoken repeatedly.
     */
    if (
        message === lastMessage &&
        now - lastMessageTime < AUDIO_COOLDOWN
    ) {
        return;
    }

    try {

        // Stop previous speech
        window.speechSynthesis.cancel();

        const speech =
            new SpeechSynthesisUtterance(
                message
            );

        speech.rate = 0.95;
        speech.pitch = 1;
        speech.volume = 1;

        // Use selected voice if available
        if (!selectedVoice) {
            loadVoice();
        }

        if (selectedVoice) {
            speech.voice = selectedVoice;
        }

        speech.lang =
            selectedVoice?.lang || "en-US";

        speech.onstart = () => {

            console.log(
                "🔊 Speaking alert:",
                message
            );
        };

        speech.onend = () => {

            console.log(
                "🔊 Alert completed"
            );
        };

        speech.onerror = (error) => {

            console.error(
                "🔊 Speech error:",
                error
            );
        };

        /*
         * Some mobile browsers behave better if speech
         * synthesis is resumed before speaking.
         */
        if (
            typeof window.speechSynthesis.resume ===
            "function"
        ) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(
            speech
        );

        lastMessage = message;
        lastMessageTime = now;

    } catch (error) {

        console.error(
            "Speech alert failed:",
            error
        );
    }
}


// ---------------------------------------------
// Exact DriverGuard alerts
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
// Convenience functions
// ---------------------------------------------

export function speakPhoneAlert() {

    speakAlert(
        ALERT_MESSAGES.phone
    );
}


export function speakHeadPoseAlert() {

    speakAlert(
        ALERT_MESSAGES.headPose
    );
}


export function speakAttentionAlert() {

    speakAlert(
        ALERT_MESSAGES.attention
    );
}


export function speakDrowsinessAlert() {

    speakAlert(
        ALERT_MESSAGES.drowsiness
    );
}


export function speakYawningAlert() {

    speakAlert(
        ALERT_MESSAGES.yawning
    );
}


// ---------------------------------------------
// Check whether audio is unlocked
// ---------------------------------------------

export function isAudioUnlocked() {

    return audioUnlocked;
}


// ---------------------------------------------
// Reset audio alerts
// ---------------------------------------------

export function resetAudioAlerts() {

    lastMessage = "";
    lastMessageTime = 0;

    if (speechSupported()) {

        window.speechSynthesis.cancel();

        if (
            typeof window.speechSynthesis.resume ===
            "function"
        ) {
            window.speechSynthesis.resume();
        }
    }

    /*
     * IMPORTANT:
     *
     * Do NOT lock audio again when monitoring stops.
     *
     * Once the user has interacted with the application,
     * we keep audio unlocked for the current page session.
     */
}


// ---------------------------------------------
// Optional full audio reset
// ---------------------------------------------

export function lockAudio() {

    audioUnlocked = false;

    lastMessage = "";
    lastMessageTime = 0;

    if (speechSupported()) {
        window.speechSynthesis.cancel();
    }
}
