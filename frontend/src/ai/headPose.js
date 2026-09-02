// src/ai/headPose.js

// MediaPipe Face Landmarker landmark indexes
//
// Nose: 1
// Left side of face: 234
// Right side of face: 454
// Forehead: 10
// Chin: 152
//
// These landmarks are used to estimate the
// approximate direction of the driver's head.

const NOSE = 1;

const LEFT_FACE = 234;
const RIGHT_FACE = 454;

const FOREHEAD = 10;
const CHIN = 152;


// ---------------------------------------------
// Calculate distance between two landmarks
// ---------------------------------------------

function distance(a, b) {

    if (!a || !b) {
        return 0;
    }

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );
}


// ---------------------------------------------
// Detect head pose
// ---------------------------------------------

export function detectHeadPose(faceLandmarks) {

    if (
        !faceLandmarks ||
        faceLandmarks.length === 0
    ) {

        return {
            detected: false,
            direction: "Not detected",
            yaw: 0,
            pitch: 0,
            attention: "Not detected",
        };
    }


    const landmarks = faceLandmarks[0];


    const nose = landmarks[NOSE];

    const leftFace = landmarks[LEFT_FACE];

    const rightFace = landmarks[RIGHT_FACE];

    const forehead = landmarks[FOREHEAD];

    const chin = landmarks[CHIN];


    if (
        !nose ||
        !leftFace ||
        !rightFace ||
        !forehead ||
        !chin
    ) {

        return {
            detected: false,
            direction: "Not detected",
            yaw: 0,
            pitch: 0,
            attention: "Not detected",
        };
    }


    // -----------------------------------------
    // Face center
    // -----------------------------------------

    const faceCenterX =
        (leftFace.x + rightFace.x) / 2;


    const faceCenterY =
        (forehead.y + chin.y) / 2;


    // -----------------------------------------
    // Face dimensions
    // -----------------------------------------

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
        faceWidth === 0 ||
        faceHeight === 0
    ) {

        return {
            detected: false,
            direction: "Not detected",
            yaw: 0,
            pitch: 0,
            attention: "Not detected",
        };
    }


    // -----------------------------------------
    // YAW
    //
    // Nose position relative to face center.
    //
    // Positive = one direction
    // Negative = opposite direction
    //
    // The UI direction is calibrated below.
    // -----------------------------------------

    const yaw =
        (
            nose.x -
            faceCenterX
        ) / faceWidth;


    // -----------------------------------------
    // PITCH
    //
    // Nose position relative to vertical
    // face center.
    // -----------------------------------------

    const pitch =
        (
            nose.y -
            faceCenterY
        ) / faceHeight;


    // -----------------------------------------
    // Thresholds
    //
    // These are starting values and can be
    // calibrated using real camera testing.
    // -----------------------------------------

    const YAW_THRESHOLD = 0.18;

    const PITCH_THRESHOLD = 0.16;


    let direction = "Center";

    let attention = "Focused";


    // -----------------------------------------
    // Horizontal head movement
    // -----------------------------------------

    if (yaw > YAW_THRESHOLD) {

        direction = "Looking Left";

        attention = "Distracted";

    }

    else if (yaw < -YAW_THRESHOLD) {

        direction = "Looking Right";

        attention = "Distracted";
    }


    // -----------------------------------------
    // Vertical head movement
    // -----------------------------------------

    else if (pitch > PITCH_THRESHOLD) {

        direction = "Looking Down";

        attention = "Distracted";
    }

    else if (pitch < -PITCH_THRESHOLD) {

        direction = "Looking Up";

        attention = "Distracted";
    }


    return {

        detected: true,

        direction,

        yaw,

        pitch,

        attention,

    };
}