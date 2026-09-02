// src/ai/yawnDetection.js

let yawnStartTime = null;
let lastYawnTime = 0;

// Mouth opening threshold.
// This may need adjustment depending on camera position.
const YAWN_MAR_THRESHOLD = 0.55;

// Mouth must remain open for this long.
const YAWN_DURATION = 1200;

// Prevent repeated yawn alerts.
const YAWN_COOLDOWN = 5000;


// ---------------------------------------------
// Distance between two landmarks
// ---------------------------------------------

function distance(p1, p2) {
    if (!p1 || !p2) {
        return 0;
    }

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}


// ---------------------------------------------
// Calculate Mouth Aspect Ratio
// ---------------------------------------------

function calculateMAR(landmarks) {

    /*
        MediaPipe Face Landmarker mouth points

        61  = left mouth corner
        291 = right mouth corner

        13  = upper inner lip
        14  = lower inner lip

        Additional vertical points:
        82  = upper mouth
        312 = lower mouth
    */

    const left = landmarks[61];
    const right = landmarks[291];

    const upper = landmarks[13];
    const lower = landmarks[14];

    const upper2 = landmarks[82];
    const lower2 = landmarks[312];

    if (
        !left ||
        !right ||
        !upper ||
        !lower ||
        !upper2 ||
        !lower2
    ) {
        return 0;
    }

    const horizontal = distance(left, right);

    if (horizontal === 0) {
        return 0;
    }

    const vertical1 = distance(
        upper,
        lower
    );

    const vertical2 = distance(
        upper2,
        lower2
    );

    return (
        (vertical1 + vertical2) /
        (2 * horizontal)
    );
}


// ---------------------------------------------
// Detect yawning
// ---------------------------------------------

export function detectYawn(landmarks, now = performance.now()) {

    if (
        !landmarks ||
        landmarks.length === 0
    ) {
        return {
            yawning: false,
            mar: 0,
        };
    }

    const mar = calculateMAR(landmarks);

    // Mouth is sufficiently open
    if (mar >= YAWN_MAR_THRESHOLD) {

        if (yawnStartTime === null) {
            yawnStartTime = now;
        }

        const openDuration =
            now - yawnStartTime;

        // Mouth has remained open long enough
        if (
            openDuration >= YAWN_DURATION &&
            now - lastYawnTime >= YAWN_COOLDOWN
        ) {

            lastYawnTime = now;

            return {
                yawning: true,
                mar,
            };
        }

    } else {

        // Mouth closed again
        yawnStartTime = null;
    }

    return {
        yawning: false,
        mar,
    };
}


// ---------------------------------------------
// Reset
// ---------------------------------------------

export function resetYawnDetection() {

    yawnStartTime = null;
    lastYawnTime = 0;

}