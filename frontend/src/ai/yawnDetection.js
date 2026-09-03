
// src/ai/yawnDetection.js

let yawnStartTime = null;
let lastYawnTime = 0;


// =====================================================
// CONFIGURATION
// =====================================================

// Mouth Aspect Ratio above this value is considered
// sufficiently open for possible yawning.
const YAWN_MAR_THRESHOLD = 0.250;

// Mouth must remain above the threshold for 600 ms
// before a yawn is confirmed.
const YAWN_DURATION = 600;

// Prevent repeated yawn confirmations.
const YAWN_COOLDOWN = 5000;


// =====================================================
// DISTANCE
// =====================================================

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


// =====================================================
// CALCULATE MOUTH ASPECT RATIO
// =====================================================

function calculateMAR(landmarks) {

    /*
        MediaPipe Face Landmarker mouth points:

        61  = left mouth corner
        291 = right mouth corner

        13  = upper inner lip
        14  = lower inner lip

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


    const horizontal = distance(
        left,
        right
    );


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


// =====================================================
// DETECT YAWN
// =====================================================

export function detectYawn(
    landmarks,
    now = performance.now()
) {

    if (
        !landmarks ||
        landmarks.length === 0
    ) {

        yawnStartTime = null;

        return {
            yawning: false,
            mar: 0,
        };
    }


    const mar = calculateMAR(
        landmarks
    );


    // =================================================
    // MOUTH OPEN
    // =================================================

    if (
        mar > YAWN_MAR_THRESHOLD
    ) {

        // Start observation
        if (
            yawnStartTime === null
        ) {

            yawnStartTime = now;

        }


        const openDuration =
            now - yawnStartTime;


        // =================================================
        // CONFIRM YAWN
        // =================================================

        if (
            openDuration >= YAWN_DURATION &&
            now - lastYawnTime >= YAWN_COOLDOWN
        ) {

            lastYawnTime = now;

            console.log(
                `😮 YAWN CONFIRMED | MAR: ${mar.toFixed(3)}`
            );

            return {
                yawning: true,
                mar,
            };
        }

    } else {

        // Mouth closed / below threshold.
        // Reset observation.
        yawnStartTime = null;
    }


    return {
        yawning: false,
        mar,
    };
}


// =====================================================
// RESET
// =====================================================

export function resetYawnDetection() {

    yawnStartTime = null;

    lastYawnTime = 0;
}

