// MediaPipe Face Landmarker eye landmark indexes

const LEFT_EYE = [
    362,
    385,
    387,
    263,
    373,
    380,
];


const RIGHT_EYE = [
    33,
    160,
    158,
    133,
    153,
    144,
];


// Calculate distance between two landmarks
function distance(point1, point2) {
    const dx =
        point1.x - point2.x;

    const dy =
        point1.y - point2.y;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}


// Calculate Eye Aspect Ratio
function calculateEAR(
    landmarks,
    indices
) {
    const p1 = landmarks[indices[0]];
    const p2 = landmarks[indices[1]];
    const p3 = landmarks[indices[2]];
    const p4 = landmarks[indices[3]];
    const p5 = landmarks[indices[4]];
    const p6 = landmarks[indices[5]];


    const vertical1 =
        distance(p2, p6);

    const vertical2 =
        distance(p3, p5);

    const horizontal =
        distance(p1, p4);


    if (horizontal === 0) {
        return 0;
    }


    return (
        (vertical1 + vertical2) /
        (2 * horizontal)
    );
}


// Calculate eye state
export function calculateEyeState(
    faceLandmarks
) {
    if (
        !faceLandmarks ||
        faceLandmarks.length === 0
    ) {
        return {
            leftEAR: 0,
            rightEAR: 0,
            averageEAR: 0,
            eyesClosed: false,
        };
    }


    const leftEAR =
        calculateEAR(
            faceLandmarks,
            LEFT_EYE
        );


    const rightEAR =
        calculateEAR(
            faceLandmarks,
            RIGHT_EYE
        );


    const averageEAR =
        (leftEAR + rightEAR) / 2;


    // Initial threshold.
    // We can calibrate this later.
    const EYE_CLOSED_THRESHOLD = 0.20;


    return {
        leftEAR,
        rightEAR,
        averageEAR,

        eyesClosed:
            averageEAR <
            EYE_CLOSED_THRESHOLD,
    };
}