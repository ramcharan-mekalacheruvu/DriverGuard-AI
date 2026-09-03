// src/ai/riskEngine.js

/*
 * DriverGuard AI - Drowsiness Risk Engine
 *
 * EAR is calculated by eyeDetection.js.
 *
 * Current eye logic:
 *
 * EAR < 0.110
 *      -> Eyes closed
 *
 * This engine adds temporal confirmation so that
 * a single bad camera frame does not immediately
 * trigger a drowsiness alert.
 */


// ============================================================
// STATE
// ============================================================

let eyeClosedSince = null;

let lastAlertTime = 0;


// ============================================================
// CONFIGURATION
// ============================================================

/*
 * Eyes must remain closed for at least this long
 * before entering the warning state.
 *
 * 300 ms
 */
export const EYE_WARNING_TIME = 300;


/*
 * Eyes must remain closed for this long
 * before drowsiness is confirmed.
 *
 * 600 ms
 *
 * IMPORTANT:
 * This is milliseconds, not seconds.
 */
export const EYE_DROWSY_TIME = 600;


/*
 * Minimum time between drowsiness
 * audio alerts.
 *
 * Prevents repeated voice warnings.
 */
export const ALERT_COOLDOWN = 8000;


// ============================================================
// RESET
// ============================================================

export function resetRiskEngine() {

    eyeClosedSince = null;

    lastAlertTime = 0;

}


// ============================================================
// UPDATE DROWSINESS
// ============================================================

export function updateDrowsiness(
    eyesClosed,
    currentTime = performance.now()
) {

    // ========================================================
    // EYES OPEN
    // ========================================================

    if (!eyesClosed) {

        /*
         * Reset the timer immediately.
         *
         * This means the driver must have another
         * continuous eye-closure period before
         * drowsiness can be confirmed.
         */

        eyeClosedSince = null;


        return {

            state: "normal",

            label: "Normal",

            duration: 0,

            shouldAlert: false,

        };

    }


    // ========================================================
    // FIRST CLOSED FRAME
    // ========================================================

    if (
        eyeClosedSince === null
    ) {

        eyeClosedSince =
            currentTime;


        return {

            state: "normal",

            label: "Normal",

            duration: 0,

            shouldAlert: false,

        };

    }


    // ========================================================
    // CALCULATE CLOSED DURATION
    // ========================================================

    const duration =
        currentTime -
        eyeClosedSince;


    // ========================================================
    // BRIEF EYE CLOSURE
    // ========================================================

    if (
        duration <
        EYE_WARNING_TIME
    ) {

        return {

            state: "normal",

            label: "Normal",

            duration,

            shouldAlert: false,

        };

    }


    // ========================================================
    // WARNING
    // ========================================================

    if (
        duration <
        EYE_DROWSY_TIME
    ) {

        return {

            state: "warning",

            label: "Eyes closed",

            duration,

            shouldAlert: false,

        };

    }


    // ========================================================
    // DROWSINESS CONFIRMED
    // ========================================================

    const canAlert =
        (
            currentTime -
            lastAlertTime
        ) >=
        ALERT_COOLDOWN;


    // --------------------------------------------------------
    // Store alert time
    // --------------------------------------------------------

    if (canAlert) {

        lastAlertTime =
            currentTime;

    }


    // --------------------------------------------------------
    // Return confirmed drowsiness
    // --------------------------------------------------------

    return {

        state: "drowsy",

        label: "Drowsiness detected",

        duration,

        shouldAlert: canAlert,

    };

}


// ============================================================
// GET CURRENT ENGINE STATUS
// ============================================================

export function getRiskEngineStatus(
    currentTime = performance.now()
) {

    if (
        eyeClosedSince === null
    ) {

        return {

            eyesClosed: false,

            duration: 0,

            state: "normal",

        };

    }


    const duration =
        currentTime -
        eyeClosedSince;


    if (
        duration <
        EYE_WARNING_TIME
    ) {

        return {

            eyesClosed: true,

            duration,

            state: "normal",

        };

    }


    if (
        duration <
        EYE_DROWSY_TIME
    ) {

        return {

            eyesClosed: true,

            duration,

            state: "warning",

        };

    }


    return {

        eyesClosed: true,

        duration,

        state: "drowsy",

    };

}


// ============================================================
// GET CONFIGURATION
// ============================================================

export function getRiskEngineConfig() {

    return {

        warningTime:
            EYE_WARNING_TIME,

        drowsyTime:
            EYE_DROWSY_TIME,

        alertCooldown:
            ALERT_COOLDOWN,

    };

}