import {
    FaceLandmarker,
    FilesetResolver,
} from "@mediapipe/tasks-vision";


let faceLandmarker = null;


// Initialize MediaPipe Face Landmarker
export async function initializeFaceLandmarker() {

    if (faceLandmarker) {
        return faceLandmarker;
    }


    console.log(
        "Initializing MediaPipe Face Landmarker..."
    );


    try {

        const vision =
            await FilesetResolver.forVisionTasks(
                "/wasm"
            );


        faceLandmarker =
            await FaceLandmarker.createFromOptions(
                vision,
                {
                    baseOptions: {
                        modelAssetPath:
                            "/models/face_landmarker.task",
                    },

                    runningMode: "VIDEO",

                    numFaces: 1,

                    minFaceDetectionConfidence: 0.5,

                    minFacePresenceConfidence: 0.5,

                    minTrackingConfidence: 0.5,

                    outputFaceBlendshapes: false,

                    outputFacialTransformationMatrixes: true,
                }
            );


        console.log(
            "MediaPipe Face Landmarker initialized successfully."
        );


        return faceLandmarker;

    } catch (error) {

        console.error(
            "MediaPipe initialization error:",
            error
        );

        faceLandmarker = null;

        throw error;

    }
}


// Get initialized model
export function getFaceLandmarker() {

    return faceLandmarker;

}


// Detect face from video
export function detectFace(
    videoElement,
    timestamp
) {

    if (!faceLandmarker) {

        return null;

    }


    return faceLandmarker.detectForVideo(
        videoElement,
        timestamp
    );

}