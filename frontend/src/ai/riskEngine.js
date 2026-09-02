// DriverGuard AI
// Risk engine for driver safety monitoring.

let safetyScore = 100;

let drowsinessState = {
    eyesClosed: false,
    closedStartTime: null,
    warned: false,
};

const PENALTIES = {
    drowsiness: 10,
    distraction: 5,
    phone: 15,
    yawning: 3,
    faceMissing: 5,
};


// Reset complete monitoring session
export function resetRiskEngine() {
    safetyScore = 100;

    drowsinessState = {
        eyesClosed: false,
        closedStartTime: null,
        warned: false,
    };

    return safetyScore;
}


// Get current score
export function getSafetyScore() {
    return safetyScore;
}


// Apply penalty
export function applyRisk(eventType) {
    const penalty = PENALTIES[eventType] || 0;

    safetyScore = Math.max(
        0,
        safetyScore - penalty
    );

    return safetyScore;
}


// Drowsiness monitoring
export function updateDrowsiness(eyesClosed) {
    const now = Date.now();

    // Eyes are open
    if (!eyesClosed) {
        drowsinessState = {
            eyesClosed: false,
            closedStartTime: null,
            warned: false,
        };

        return {
            drowsy: false,
            shouldAlert: false,
            duration: 0,
            score: safetyScore,
        };
    }


    // Eyes have just closed
    if (!drowsinessState.eyesClosed) {
        drowsinessState.eyesClosed = true;
        drowsinessState.closedStartTime = now;
        drowsinessState.warned = false;
    }


    const duration =
        now - drowsinessState.closedStartTime;


    // Drowsiness threshold = 2 seconds
    if (
        duration >= 2000 &&
        !drowsinessState.warned
    ) {
        drowsinessState.warned = true;

        applyRisk("drowsiness");

        return {
            drowsy: true,
            shouldAlert: true,
            duration,
            score: safetyScore,
        };
    }


    return {
        drowsy: duration >= 2000,
        shouldAlert: false,
        duration,
        score: safetyScore,
    };
}


// Get risk level
export function getRiskLevel(score = safetyScore) {
    if (score >= 90) {
        return "SAFE";
    }

    if (score >= 70) {
        return "CAUTION";
    }

    if (score >= 50) {
        return "HIGH RISK";
    }

    return "CRITICAL";
}


// Get penalty amount
export function getPenalty(eventType) {
    return PENALTIES[eventType] || 0;
}