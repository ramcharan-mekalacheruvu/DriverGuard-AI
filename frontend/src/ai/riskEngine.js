// src/ai/riskEngine.js

let eyeClosedSince = null;
let lastAlertTime = 0;

const EYE_WARNING_TIME = 1000;
const EYE_DROWSY_TIME = 2000;
const ALERT_COOLDOWN = 5000;


// Reset everything
export function resetRiskEngine() {

    eyeClosedSince = null;
    lastAlertTime = 0;

}


// Update drowsiness state
export function updateDrowsiness(
    eyesClosed,
    currentTime = Date.now()
) {

    // Eyes are open
    if (!eyesClosed) {

        eyeClosedSince = null;

        return {
            state: "normal",
            label: "Normal",
            duration: 0,
            shouldAlert: false,
        };
    }


    // First frame where eyes become closed
    if (eyeClosedSince === null) {

        eyeClosedSince = currentTime;

    }


    const duration =
        currentTime -
        eyeClosedSince;


    // Normal brief eye closure
    if (duration < EYE_WARNING_TIME) {

        return {
            state: "normal",
            label: "Normal",
            duration,
            shouldAlert: false,
        };

    }


    // Warning
    if (duration < EYE_DROWSY_TIME) {

        return {
            state: "warning",
            label: "Eyes closed",
            duration,
            shouldAlert: false,
        };

    }


    // Drowsy
    const canAlert =
        currentTime - lastAlertTime >=
        ALERT_COOLDOWN;


    if (canAlert) {

        lastAlertTime = currentTime;

    }


    return {
        state: "drowsy",
        label: "Drowsiness detected",
        duration,
        shouldAlert: canAlert,
    };
}