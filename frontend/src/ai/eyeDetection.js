```javascript
// src/ai/eyeDetection.js

// MediaPipe Face Landmarker landmark indexes

// Left eye
const LEFT_EYE = {
    upper: [159, 160, 161],
    lower: [145, 144, 163],
    left: 33,
    right: 133,
};

// Right eye
const RIGHT_EYE = {
    upper: [386, 387, 388],
    lower: [374, 373, 380],
    left: 362,
    right: 263,
};


// Calculate distance between two landmarks
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


// Calculate Eye Aspect Ratio
function calculateEAR(landmarks, eye) {

    const vertical1 = distance(
        landmarks[eye.upper[0]],
        landmarks[eye.lower[0]]
    );

    const vertical2 = distance(
        landmarks[eye.upper[1]],
        landmarks[eye.lower[1]]
    );

    const vertical3 = distance(
        landmarks[eye.upper[2]],
        landmarks[eye.lower[2]]
    );

    const horizontal = distance(
        landmarks[eye.left],
        landmarks[eye.right]
    );

    if (horizontal === 0) {
        return 0;
    }

    return (
        (vertical1 + vertical2 + vertical3) /
        (3 * horizontal)
    );
}


// Analyze both eyes
export function detectEyes(faceLandmarks) {

    if (
        !faceLandmarks ||
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

    const landmarks = faceLandmarks[0];

    const leftEAR = calculateEAR(
        landmarks,
        LEFT_EYE
    );

    const rightEAR = calculateEAR(
        landmarks,
        RIGHT_EYE
    );

    const averageEAR =
        (leftEAR + rightEAR) / 2;


    // Eye closure threshold
    const EYE_CLOSED_THRESHOLD = 0.20;

    const eyesClosed =
        averageEAR < EYE_CLOSED_THRESHOLD;


    return {
        detected: true,
        leftEAR,
        rightEAR,
        averageEAR,
        eyesClosed,
    };
}
```
