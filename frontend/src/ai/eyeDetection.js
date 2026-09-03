// src/ai/eyeDetection.js

/*
 * DriverGuard AI - Eye Detection
 *
 * Uses MediaPipe Face Landmarker landmarks
 * to calculate Eye Aspect Ratio (EAR).
 *
 * EAR < 0.110
 *      -> Eyes considered closed
 *
 * EAR >= 0.110
 *      -> Eyes considered open/normal
 */


// ============================================================
// CONFIGURATION
// ============================================================

/*
 * Eye closure threshold.
 *
 * IMPORTANT:
 * Keep this synchronized with the threshold
 * used by Monitoring.jsx / riskEngine.js.
 */
export const EYE_CLOSED_THRESHOLD = 0.110;


// ============================================================
// MEDIA PIPE LANDMARKS
// ============================================================

// ------------------------------------------------------------
// Left eye
// ------------------------------------------------------------

const LEFT_EYE = {

    upper: [
        159,
        160,
        161,
    ],

    lower: [
        145,
        144,
        163,
    ],

    left: 33,

    right: 133,

};


// ------------------------------------------------------------
// Right eye
// ------------------------------------------------------------

const RIGHT_EYE = {

    upper: [
        386,
        387,
        388,
    ],

    lower: [
        374,
        373,
        380,
    ],

    left: 362,

    right: 263,

};


// ============================================================
// DISTANCE
// ============================================================

function distance(a, b) {

    if (!a || !b) {

        return 0;

    }

    const dx =
        a.x - b.x;

    const dy =
        a.y - b.y;

    const dz =
        (a.z || 0) -
        (b.z || 0);

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );

}


// ============================================================
// VALIDATE LANDMARK
// ============================================================

function isValidLandmark(point) {

    return (
        point &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
    );

}


// ============================================================
// CALCULATE EAR
// ============================================================

function calculateEAR(
    landmarks,
    eye
) {

    if (
        !landmarks ||
        !eye
    ) {

        return 0;

    }


    // --------------------------------------------------------
    // Get vertical landmarks
    // --------------------------------------------------------

    const upper1 =
        landmarks[eye.upper[0]];

    const lower1 =
        landmarks[eye.lower[0]];


    const upper2 =
        landmarks[eye.upper[1]];

    const lower2 =
        landmarks[eye.lower[1]];


    const upper3 =
        landmarks[eye.upper[2]];

    const lower3 =
        landmarks[eye.lower[2]];


    // --------------------------------------------------------
    // Get horizontal landmarks
    // --------------------------------------------------------

    const left =
        landmarks[eye.left];

    const right =
        landmarks[eye.right];


    // --------------------------------------------------------
    // Validate all points
    // --------------------------------------------------------

    if (
        !isValidLandmark(upper1) ||
        !isValidLandmark(lower1) ||
        !isValidLandmark(upper2) ||
        !isValidLandmark(lower2) ||
        !isValidLandmark(upper3) ||
        !isValidLandmark(lower3) ||
        !isValidLandmark(left) ||
        !isValidLandmark(right)
    ) {

        return 0;

    }


    // --------------------------------------------------------
    // Calculate vertical distances
    // --------------------------------------------------------

    const vertical1 =
        distance(
            upper1,
            lower1
        );


    const vertical2 =
        distance(
            upper2,
            lower2
        );


    const vertical3 =
        distance(
            upper3,
            lower3
        );


    // --------------------------------------------------------
    // Calculate horizontal distance
    // --------------------------------------------------------

    const horizontal =
        distance(
            left,
            right
        );


    if (
        horizontal <= 0
    ) {

        return 0;

    }


    // --------------------------------------------------------
    // Eye Aspect Ratio
    // --------------------------------------------------------

    const ear =
        (
            vertical1 +
            vertical2 +
            vertical3
        ) /
        (
            3 *
            horizontal
        );


    // --------------------------------------------------------
    // Prevent invalid values
    // --------------------------------------------------------

    if (
        !Number.isFinite(ear)
    ) {

        return 0;

    }


    return ear;

}


// ============================================================
// DETECT EYES
// ============================================================

export function detectEyes(
    faceLandmarks
) {

    // --------------------------------------------------------
    // No face
    // --------------------------------------------------------

    if (
        !faceLandmarks ||
        !Array.isArray(faceLandmarks) ||
        faceLandmarks.length === 0
    ) {

        return {

            detected: false,

            leftEAR: 0,

            rightEAR: 0,

            averageEAR: 0,

            eyesClosed: false,

        };

    }


    // --------------------------------------------------------
    // First face
    // --------------------------------------------------------

    const landmarks =
        faceLandmarks[0];


    if (
        !landmarks ||
        !Array.isArray(landmarks)
    ) {

        return {

            detected: false,

            leftEAR: 0,

            rightEAR: 0,

            averageEAR: 0,

            eyesClosed: false,

        };

    }


    // --------------------------------------------------------
    // Calculate left eye EAR
    // --------------------------------------------------------

    const leftEAR =
        calculateEAR(
            landmarks,
            LEFT_EYE
        );


    // --------------------------------------------------------
    // Calculate right eye EAR
    // --------------------------------------------------------

    const rightEAR =
        calculateEAR(
            landmarks,
            RIGHT_EYE
        );


    // --------------------------------------------------------
    // Validate both eyes
    // --------------------------------------------------------

    const validLeft =
        leftEAR > 0;

    const validRight =
        rightEAR > 0;


    /*
     * If neither eye has a valid EAR,
     * the eye result cannot be trusted.
     */

    if (
        !validLeft &&
        !validRight
    ) {

        return {

            detected: false,

            leftEAR: 0,

            rightEAR: 0,

            averageEAR: 0,

            eyesClosed: false,

        };

    }


    // --------------------------------------------------------
    // Calculate average EAR
    // --------------------------------------------------------

    let averageEAR = 0;


    if (
        validLeft &&
        validRight
    ) {

        averageEAR =
            (
                leftEAR +
                rightEAR
            ) / 2;

    }

    else if (validLeft) {

        averageEAR =
            leftEAR;

    }

    else {

        averageEAR =
            rightEAR;

    }


    // --------------------------------------------------------
    // Eye closure
    // --------------------------------------------------------

    const eyesClosed =
        averageEAR <
        EYE_CLOSED_THRESHOLD;


    // --------------------------------------------------------
    // Return result
    // --------------------------------------------------------

    return {

        detected: true,

        leftEAR,

        rightEAR,

        averageEAR,

        eyesClosed,

    };

}


// ============================================================
// GET THRESHOLD
// ============================================================

export function getEyeClosureThreshold() {

    return EYE_CLOSED_THRESHOLD;

}


// ============================================================
// CHECK CLOSED STATE
// ============================================================

export function isEyesClosed(ear) {

    if (
        !Number.isFinite(ear)
    ) {

        return false;

    }


    return (
        ear <
        EYE_CLOSED_THRESHOLD
    );

}