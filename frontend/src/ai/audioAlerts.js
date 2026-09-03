
// src/ai/audioAlerts.js

/*
 * DriverGuard AI - Audio Alert System
 *
 * Goals:
 * 1. Exact alert messages
 * 2. Prevent repeated/spam alerts
 * 3. Support laptop + mobile browsers
 * 4. Allow audio to be unlocked from Start Monitoring
 * 5. Different cooldown for each alert type
 * 6. Prevent low-priority alerts from constantly interrupting important ones
 */


// ============================================================
// ALERT MESSAGES
// ============================================================

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


// ============================================================
// CONFIGURATION
// ============================================================

const ALERT_COOLDOWNS = {

    phone: 8000,

    headPose: 8000,

    attention: 8000,

    drowsiness: 10000,

    yawning: 10000,

};


// ============================================================
// STATE
// ============================================================

let audioUnlocked = false;

let voicesLoaded = false;

let currentSpeechType = null;

let lastAlertTimes = {

    phone: 0,

    headPose: 0,

    attention: 0,

    drowsiness: 0,

    yawning: 0,

};


// ============================================================
// BROWSER SUPPORT
// ============================================================

function isSpeechSupported() {

    return (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        typeof window.SpeechSynthesisUtterance !== "undefined"
    );

}


// ============================================================
// LOAD VOICES
// ============================================================

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


// ============================================================
// GET ENGLISH VOICE
// ============================================================

function getVoice() {

    const voices = loadVoices();

    if (!voices.length) {

        return null;

    }

    const englishVoice =
        voices.find((voice) => {

            return (
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
            );

        });

    return englishVoice || voices[0];

}


// ============================================================
// VOICE LOADING EVENT
// ============================================================

if (isSpeechSupported()) {

    loadVoices();

    window.speechSynthesis.onvoiceschanged =
        () => {

            loadVoices();

        };

}


// ============================================================
// UNLOCK AUDIO
//
// IMPORTANT:
// Call this directly inside the Start Monitoring
// button click.
// ============================================================

export function unlockAudio() {

    if (!isSpeechSupported()) {

        console.warn(
            "Speech synthesis is not supported by this browser."
        );

        return false;

    }

    try {

        const synth =
            window.speechSynthesis;

        /*
         * Cancel anything that may have been
         * left in the speech queue.
         */

        synth.cancel();

        /*
         * Some mobile browsers pause speech
         * synthesis automatically.
         */

        if (
            typeof synth.resume === "function"
        ) {

            synth.resume();

        }

        const voice = getVoice();

        /*
         * Use a very short silent utterance
         * to initialize the speech engine.
         */

        const unlockUtterance =
            new SpeechSynthesisUtterance(".");

        unlockUtterance.volume = 0;

        unlockUtterance.rate = 10;

        unlockUtterance.pitch = 1;

        unlockUtterance.lang =
            voice?.lang || "en-US";

        if (voice) {

            unlockUtterance.voice = voice;

        }

        unlockUtterance.onend = () => {

            console.log(
                "🔊 Speech engine ready"
            );

        };

        unlockUtterance.onerror =
            (error) => {

                console.warn(
                    "Speech unlock warning:",
                    error
                );

            };

        synth.speak(
            unlockUtterance
        );

        /*
         * Mark audio as unlocked.
         */

        audioUnlocked = true;

        console.log(
            "🔊 DriverGuard audio unlocked"
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


// ============================================================
// NORMALIZE ALERT TYPE
// ============================================================

function normalizeAlertType(type) {

    if (
        type &&
        Object.prototype.hasOwnProperty.call(
            ALERT_MESSAGES,
            type
        )
    ) {

        return type;

    }

    return null;

}


// ============================================================
// CHECK ALERT COOLDOWN
// ============================================================

function canSpeak(type) {

    const now = Date.now();

    const lastTime =
        lastAlertTimes[type] || 0;

    const cooldown =
        ALERT_COOLDOWNS[type] || 8000;

    return (
        now - lastTime >= cooldown
    );

}


// ============================================================
// SPEAK ALERT
//
// Usage:
//
// speakAlert("phone")
// speakAlert("headPose")
// speakAlert("attention")
// speakAlert("drowsiness")
// speakAlert("yawning")
//
// ============================================================

export function speakAlert(type) {

    if (!isSpeechSupported()) {

        console.warn(
            "Speech synthesis is not supported."
        );

        return false;

    }

    const alertType =
        normalizeAlertType(type);

    if (!alertType) {

        console.warn(
            "Unknown alert type:",
            type
        );

        return false;

    }

    if (!audioUnlocked) {

        console.warn(
            "⚠️ Audio is locked. Start Monitoring must unlock audio first."
        );

        return false;

    }

    if (!canSpeak(alertType)) {

        return false;

    }

    try {

        const synth =
            window.speechSynthesis;

        /*
         * Make sure speech engine is running.
         */

        if (
            typeof synth.resume === "function"
        ) {

            synth.resume();

        }

        /*
         * Stop currently playing speech.
         *
         * This prevents multiple alerts from
         * stacking in the browser queue.
         */

        synth.cancel();

        const voice = getVoice();

        const utterance =
            new SpeechSynthesisUtterance(
                ALERT_MESSAGES[alertType]
            );

        utterance.rate = 0.95;

        utterance.pitch = 1;

        utterance.volume = 1;

        utterance.lang =
            voice?.lang || "en-US";

        if (voice) {

            utterance.voice = voice;

        }

        currentSpeechType =
            alertType;

        utterance.onstart = () => {

            console.log(
                `🔊 ${alertType} alert:`,
                ALERT_MESSAGES[alertType]
            );

        };

        utterance.onend = () => {

            currentSpeechType = null;

        };

        utterance.onerror =
            (event) => {

                console.error(
                    `🔊 ${alertType} speech error:`,
                    event
                );

                currentSpeechType = null;

            };

        synth.speak(
            utterance
        );

        /*
         * Store the time ONLY after successfully
         * scheduling the utterance.
         */

        lastAlertTimes[alertType] =
            Date.now();

        return true;

    } catch (error) {

        console.error(
            "Speech alert failed:",
            error
        );

        currentSpeechType = null;

        return false;

    }

}


// ============================================================
// INDIVIDUAL ALERT FUNCTIONS
// ============================================================

export function speakPhoneAlert() {

    return speakAlert("phone");

}


export function speakHeadPoseAlert() {

    return speakAlert("headPose");

}


export function speakAttentionAlert() {

    return speakAlert("attention");

}


export function speakDrowsinessAlert() {

    return speakAlert("drowsiness");

}


export function speakYawningAlert() {

    return speakAlert("yawning");

}


// ============================================================
// AUDIO STATUS
// ============================================================

export function isAudioUnlocked() {

    return audioUnlocked;

}


export function isSpeaking() {

    if (!isSpeechSupported()) {

        return false;

    }

    return window.speechSynthesis.speaking;

}


export function getCurrentSpeechType() {

    return currentSpeechType;

}


// ============================================================
// RESET ALERT TIMERS
//
// Used when monitoring starts/stops.
//
// IMPORTANT:
// Audio remains unlocked.
// ============================================================

export function resetAudioAlerts() {

    lastAlertTimes = {

        phone: 0,

        headPose: 0,

        attention: 0,

        drowsiness: 0,

        yawning: 0,

    };

    currentSpeechType = null;

    if (isSpeechSupported()) {

        window.speechSynthesis.cancel();

        if (
            typeof window.speechSynthesis.resume ===
            "function"
        ) {

            window.speechSynthesis.resume();

        }

    }

}


// ============================================================
// COMPLETELY LOCK AUDIO
//
// Use only when you intentionally want to require
// another user interaction.
// ============================================================

export function lockAudio() {

    audioUnlocked = false;

    currentSpeechType = null;

    lastAlertTimes = {

        phone: 0,

        headPose: 0,

        attention: 0,

        drowsiness: 0,

        yawning: 0,

    };

    if (isSpeechSupported()) {

        window.speechSynthesis.cancel();

    }

}


// ============================================================
// OPTIONAL DEBUG INFORMATION
// ============================================================

export function getAudioStatus() {

    return {

        supported:
            isSpeechSupported(),

        unlocked:
            audioUnlocked,

        voicesLoaded:
            voicesLoaded,

        speaking:
            isSpeaking(),

        currentSpeechType:
            currentSpeechType,

    };

}
