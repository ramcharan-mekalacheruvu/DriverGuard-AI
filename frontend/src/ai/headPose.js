// src/ai/headPose.js

/*
 * DriverGuard AI - Head Pose Detection
 *
 * Detects:
 *  - Center
 *  - Looking Left
 *  - Looking Right
 *  - Looking Down
 *  - Looking Up
 *
 * Also provides:
 *  - yaw
 *  - pitch
 *  - attention state
 *
 * Designed for MediaPipe Face Landmarker.
 */


// ============================================================
// MEDIAPIPE LANDMARK INDEXES
// ============================================================

const NOSE = 1;

const LEFT_FACE = 234;
const RIGHT_FACE = 454;

const FOREHEAD = 10;
const CHIN = 152;


// ============================================================
// CONFIGURATION
// ============================================================

/*
 * Horizontal head movement threshold.
 *
 * Larger value = less sensitive.
 * Smaller value = more sensitive.
 */
const YAW_THRESHOLD = 0.18;


/*
 * Vertical head movement threshold.
 */
const PITCH_THRESHOLD = 0.16;


/*
 * Small additional margin used to avoid
 * rapid switching around the threshold.
 *
 * Example:
 *
 * YAW_THRESHOLD = 0.18
 * YAW_DEAD_ZONE = 0.025
 *
 * The detector becomes more stable around
 * the Center region.
 */
const YAW_DEAD_ZONE = 0.025;

const PITCH_DEAD_ZONE = 0.025;


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
// INVALID RESULT
// ============================================================

function invalidResult() {

    return {

        detected: false,

        direction: "Not detected",

        yaw: 0,

        pitch: 0,

        attention: "Not detected",

    };
}


// ============================================================
// DETECT HEAD POSE
// ============================================================

export function detectHeadPose(faceLandmarks) {

    // --------------------------------------------------------
    // Check face
    // --------------------------------------------------------

    if (
        !faceLandmarks ||
        !Array.isArray(faceLandmarks) ||
        faceLandmarks.length === 0
    ) {

        return invalidResult();

    }


    // --------------------------------------------------------
    // Get first detected face
    // --------------------------------------------------------

    const landmarks =
        faceLandmarks[0];


    if (
        !landmarks ||
        !Array.isArray(landmarks)
    ) {

        return invalidResult();

    }


    // --------------------------------------------------------
    // Get required landmarks
    // --------------------------------------------------------

    const nose =
        landmarks[NOSE];

    const leftFace =
        landmarks[LEFT_FACE];

    const rightFace =
        landmarks[RIGHT_FACE];

    const forehead =
        landmarks[FOREHEAD];

    const chin =
        landmarks[CHIN];


    // --------------------------------------------------------
    // Validate landmarks
    // --------------------------------------------------------

    if (
        !nose ||
        !leftFace ||
        !rightFace ||
        !forehead ||
        !chin
    ) {

        return invalidResult();

    }


    // ========================================================
    // FACE CENTER
    // ========================================================

    const faceCenterX =
        (
            leftFace.x +
            rightFace.x
        ) / 2;


    const faceCenterY =
        (
            forehead.y +
            chin.y
        ) / 2;


    // ========================================================
    // FACE DIMENSIONS
    // ========================================================

    const faceWidth =
        distance(
            leftFace,
            rightFace
        );


    const faceHeight =
        distance(
            forehead,
            chin
        );


    if (
        faceWidth <= 0 ||
        faceHeight <= 0
    ) {

        return invalidResult();

    }


    // ========================================================
    // YAW CALCULATION
    // ========================================================

    /*
     * Nose horizontal position relative
     * to the center of the face.
     */

    const yaw =
        (
            nose.x -
            faceCenterX
        ) /
        faceWidth;


    // ========================================================
    // PITCH CALCULATION
    // ========================================================

    /*
     * Nose vertical position relative
     * to the center of the face.
     */

    const pitch =
        (
            nose.y -
            faceCenterY
        ) /
        faceHeight;


    // ========================================================
    // INITIAL STATE
    // ========================================================

    let direction =
        "Center";

    let attention =
        "Focused";


    // ========================================================
    // EFFECTIVE THRESHOLDS
    // ========================================================

    const yawUpperThreshold =
        YAW_THRESHOLD +
        YAW_DEAD_ZONE;

    const yawLowerThreshold =
        YAW_THRESHOLD -
        YAW_DEAD_ZONE;


    const pitchUpperThreshold =
        PITCH_THRESHOLD +
        PITCH_DEAD_ZONE;

    const pitchLowerThreshold =
        PITCH_THRESHOLD -
        PITCH_DEAD_ZONE;


    // ========================================================
    // HORIZONTAL HEAD MOVEMENT
    // ========================================================

    if (
        yaw >
        yawUpperThreshold
    ) {

        /*
         * Positive yaw in the current
         * camera coordinate system.
         */

        direction =
            "Looking Left";

        attention =
            "Distracted";

    }

    else if (
        yaw <
        -yawUpperThreshold
    ) {

        direction =
            "Looking Right";

        attention =
            "Distracted";

    }


    // ========================================================
    // VERTICAL HEAD MOVEMENT
    // ========================================================

    /*
     * Only check pitch when yaw is not
     * already indicating a horizontal turn.
     */

    else if (
        pitch >
        pitchUpperThreshold
    ) {

        direction =
            "Looking Down";

        attention =
            "Distracted";

    }

    else if (
        pitch <
        -pitchUpperThreshold
    ) {

        direction =
            "Looking Up";

        attention =
            "Distracted";

    }


    // ========================================================
    // RETURN RESULT
    // ========================================================

    return {

        detected: true,

        direction,

        yaw,

        pitch,

        attention,

    };

}


// ============================================================
// OPTIONAL DEBUG FUNCTION
// ============================================================

export function getHeadPoseThresholds() {

    return {

        yawThreshold:
            YAW_THRESHOLD,

        pitchThreshold:
            PITCH_THRESHOLD,

        yawDeadZone:
            YAW_DEAD_ZONE,

        pitchDeadZone:
            PITCH_DEAD_ZONE,

    };

}