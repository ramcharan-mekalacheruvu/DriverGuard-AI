// DriverGuard AI
// Browser voice alert system.

let lastAlertTime = 0;

const ALERT_COOLDOWN = 5000;


const ALERT_MESSAGES = {
    drowsiness:
        "Warning! You appear to be drowsy. Please take a break.",

    distraction:
        "Please keep your eyes on the road.",

    phone:
        "Warning! Please stop using your mobile phone while driving.",

    faceMissing:
        "Please keep your attention on the road.",

    critical:
        "Critical warning! Driver attention is low.",
};


// Speak safety warning
export function speakAlert(type) {
    if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
    ) {
        console.warn(
            "Speech synthesis is not supported."
        );

        return;
    }


    const now = Date.now();


    // Prevent continuous alerts
    if (
        now - lastAlertTime <
        ALERT_COOLDOWN
    ) {
        return;
    }


    const message =
        ALERT_MESSAGES[type] ||
        "Warning! Please drive safely.";


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            message
        );


    utterance.rate = 1;

    utterance.pitch = 1;

    utterance.volume = 1;


    window.speechSynthesis.speak(
        utterance
    );


    lastAlertTime = now;
}


// Reset alert cooldown
export function resetAudioAlerts() {
    lastAlertTime = 0;

    if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
    ) {
        window.speechSynthesis.cancel();
    }
}