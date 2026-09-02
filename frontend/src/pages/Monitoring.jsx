import {
    useEffect,
    useRef,
    useState,
} from "react";

import "../styles/monitoring.css";


import {
    initializeFaceLandmarker,
    detectFace,
} from "../ai/faceLandmarker";


import {
    calculateEyeState,
} from "../ai/eyeDetection";


import {
    updateDrowsiness,
    resetRiskEngine,
} from "../ai/riskEngine";


import {
    speakAlert,
    resetAudioAlerts,
} from "../ai/audioAlerts";


function Monitoring() {

    const videoRef = useRef(null);

    const streamRef = useRef(null);

    const animationFrameRef =
        useRef(null);

    const lastVideoTimeRef =
        useRef(-1);


    const [cameraActive, setCameraActive] =
        useState(false);

    const [cameraError, setCameraError] =
        useState("");

    const [score, setScore] =
        useState(100);

    const [aiReady, setAiReady] =
        useState(false);

    const [faceDetected, setFaceDetected] =
        useState(false);

    const [eyesClosed, setEyesClosed] =
        useState(false);

    const [drowsy, setDrowsy] =
        useState(false);

    const [eyeEAR, setEyeEAR] =
        useState(0);


    // ---------------------------------------
    // Initialize AI
    // ---------------------------------------

    const initializeAI = async () => {

        try {

            await initializeFaceLandmarker();

            setAiReady(true);

            console.log(
                "Face AI initialized"
            );

        } catch (error) {

            console.error(
                "AI initialization failed:",
                error
            );

        }

    };


    // ---------------------------------------
    // Start camera
    // ---------------------------------------

    const startCamera = async () => {

        try {

            setCameraError("");

            resetRiskEngine();

            resetAudioAlerts();

            setScore(100);

            setFaceDetected(false);

            setEyesClosed(false);

            setDrowsy(false);

            setEyeEAR(0);

            lastVideoTimeRef.current = -1;


            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                setCameraError(
                    "Camera access is not supported by this browser."
                );

                return;
            }


            const stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {
                        facingMode: {
                            ideal: "user",
                        },

                        width: {
                            ideal: 1280,
                        },

                        height: {
                            ideal: 720,
                        },
                    },

                    audio: false,

                });


            streamRef.current = stream;


            if (videoRef.current) {

                videoRef.current.srcObject =
                    stream;

                await videoRef.current.play();

            }


            setCameraActive(true);


            if (!aiReady) {

                await initializeAI();

            }

        } catch (error) {

            console.error(
                "Camera error:",
                error
            );


            setCameraError(
                "Camera access was denied or is unavailable. Please allow camera permission and try again."
            );

        }

    };


    // ---------------------------------------
    // Stop camera
    // ---------------------------------------

    const stopCamera = () => {

        if (
            animationFrameRef.current
        ) {

            cancelAnimationFrame(
                animationFrameRef.current
            );

            animationFrameRef.current =
                null;

        }


        if (streamRef.current) {

            streamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current = null;

        }


        if (videoRef.current) {

            videoRef.current.pause();

            videoRef.current.srcObject =
                null;

        }


        resetRiskEngine();

        resetAudioAlerts();


        setScore(100);

        setCameraActive(false);

        setFaceDetected(false);

        setEyesClosed(false);

        setDrowsy(false);

        setEyeEAR(0);

        lastVideoTimeRef.current = -1;

    };


    // ---------------------------------------
    // AI processing
    // ---------------------------------------

    const runAI = () => {

        if (
            !videoRef.current ||
            !aiReady ||
            !cameraActive
        ) {

            return;

        }


        const video =
            videoRef.current;


        if (
            video.readyState < 2
        ) {

            animationFrameRef.current =
                requestAnimationFrame(
                    runAI
                );

            return;

        }


        const now =
            performance.now();


        // Process only new video frames
        if (
            video.currentTime !==
            lastVideoTimeRef.current
        ) {

            const result =
                detectFace(
                    video,
                    now
                );


            lastVideoTimeRef.current =
                video.currentTime;


            if (
                result &&
                result.faceLandmarks &&
                result.faceLandmarks.length > 0
            ) {

                const landmarks =
                    result.faceLandmarks[0];


                setFaceDetected(true);


                const eyeState =
                    calculateEyeState(
                        landmarks
                    );


                setEyeEAR(
                    eyeState.averageEAR
                );


                setEyesClosed(
                    eyeState.eyesClosed
                );


                const risk =
                    updateDrowsiness(
                        eyeState.eyesClosed
                    );


                setDrowsy(
                    risk.drowsy
                );


                setScore(
                    risk.score
                );


                // Voice warning
                if (
                    risk.shouldAlert
                ) {

                    speakAlert(
                        "drowsiness"
                    );

                }

            } else {

                setFaceDetected(false);

                setEyesClosed(false);

                setDrowsy(false);

                setEyeEAR(0);


                updateDrowsiness(false);

            }

        }


        animationFrameRef.current =
            requestAnimationFrame(
                runAI
            );

    };


    // ---------------------------------------
    // Cleanup
    // ---------------------------------------

    useEffect(() => {

        return () => {

            stopCamera();

        };

    }, []);


    // ---------------------------------------
    // Start AI loop
    // ---------------------------------------

    useEffect(() => {

        if (
            cameraActive &&
            aiReady
        ) {

            animationFrameRef.current =
                requestAnimationFrame(
                    runAI
                );

        }


        return () => {

            if (
                animationFrameRef.current
            ) {

                cancelAnimationFrame(
                    animationFrameRef.current
                );

                animationFrameRef.current =
                    null;

            }

        };

    }, [
        cameraActive,
        aiReady,
    ]);


    // ---------------------------------------
    // UI
    // ---------------------------------------

    return (

        <main className="monitor-page">

            <div className="monitor-header">

                <div>

                    <span>
                        REAL-TIME MONITORING
                    </span>

                    <h1>
                        Driver Monitoring
                    </h1>

                    <p>
                        Keep the camera positioned
                        toward the driver's face.
                    </p>

                </div>


                <div
                    className={
                        cameraActive
                            ? "monitor-live"
                            : "monitor-offline"
                    }
                >

                    <i className="bi bi-circle-fill"></i>

                    {cameraActive
                        ? "MONITORING"
                        : "OFFLINE"}

                </div>

            </div>


            <section className="monitor-layout">

                <div className="camera-panel">

                    <div className="camera-toolbar">

                        <span>

                            <i className="bi bi-camera-video"></i>

                            FRONT CAMERA

                        </span>


                        {cameraActive && (

                            <span className="recording">

                                <i className="bi bi-record-fill"></i>

                                LIVE

                            </span>

                        )}

                    </div>


                    <div className="camera-container">

                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                        />


                        {!cameraActive && (

                            <div className="camera-placeholder">

                                <div className="camera-big-icon">

                                    <i className="bi bi-camera-video"></i>

                                </div>


                                <h2>
                                    Camera not started
                                </h2>


                                <p>
                                    Start monitoring to
                                    activate your camera.
                                </p>

                            </div>

                        )}


                        {cameraActive && (

                            <div className="face-guide">

                                <div className="guide-corner top-left"></div>

                                <div className="guide-corner top-right"></div>

                                <div className="guide-corner bottom-left"></div>

                                <div className="guide-corner bottom-right"></div>

                            </div>

                        )}

                    </div>


                    {cameraError && (

                        <div className="camera-error">

                            <i className="bi bi-exclamation-triangle"></i>

                            {cameraError}

                        </div>

                    )}


                    <div className="camera-controls">

                        {!cameraActive ? (

                            <button
                                onClick={startCamera}
                                className="start-camera-btn"
                            >

                                <i className="bi bi-camera-video"></i>

                                Start Monitoring

                            </button>

                        ) : (

                            <button
                                onClick={stopCamera}
                                className="stop-camera-btn"
                            >

                                <i className="bi bi-stop-circle"></i>

                                Stop Monitoring

                            </button>

                        )}

                    </div>

                </div>


                <aside className="monitor-sidebar">


                    <div className="monitor-score-card">

                        <small>
                            DRIVER SAFETY SCORE
                        </small>


                        <div className="monitor-score">

                            {score}

                            <span>
                                /100
                            </span>

                        </div>


                        <div className="score-status">

                            <i className="bi bi-shield-check"></i>

                            {score >= 90
                                ? "SAFE"
                                : score >= 70
                                    ? "CAUTION"
                                    : score >= 50
                                        ? "HIGH RISK"
                                        : "CRITICAL"}

                        </div>

                    </div>


                    <div className="detection-card">

                        <div className="detection-heading">

                            <span>
                                LIVE DETECTION
                            </span>

                            <i className="bi bi-broadcast"></i>

                        </div>


                        <Detection
                            icon="bi-person-check"
                            label="Face"
                            value={
                                cameraActive
                                    ? (
                                        faceDetected
                                            ? "Detected"
                                            : "Not detected"
                                    )
                                    : "Waiting"
                            }
                            safe={faceDetected}
                        />


                        <Detection
                            icon="bi-eye"
                            label="Eyes"
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : eyesClosed
                                        ? "Closed"
                                        : "Normal"
                            }
                            safe={
                                !eyesClosed
                            }
                        />


                        <Detection
                            icon="bi-emoji-frown"
                            label="Drowsiness"
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : drowsy
                                        ? "Drowsy"
                                        : "Normal"
                            }
                            safe={
                                !drowsy
                            }
                        />


                        <Detection
                            icon="bi-compass"
                            label="Attention"
                            value={
                                drowsy
                                    ? "Low"
                                    : faceDetected
                                        ? "Focused"
                                        : "Waiting"
                            }
                            safe={
                                !drowsy &&
                                faceDetected
                            }
                        />


                        <Detection
                            icon="bi-phone"
                            label="Phone"
                            value="Not detected"
                            safe
                        />


                        <Detection
                            icon="bi-emoji-smile"
                            label="Yawning"
                            value="None"
                            safe
                        />

                    </div>


                    <div className="alert-info">

                        <i className="bi bi-volume-up"></i>


                        <div>

                            <strong>
                                Audio alerts enabled
                            </strong>


                            <p>
                                Voice warnings will be
                                played when unsafe behavior
                                is detected.
                            </p>

                        </div>

                    </div>


                    {aiReady && (

                        <div className="ai-status">

                            <i className="bi bi-cpu"></i>

                            <span>
                                AI engine ready
                            </span>

                        </div>

                    )}

                </aside>

            </section>

        </main>

    );

}


// Detection component
function Detection({
    icon,
    label,
    value,
    safe,
}) {

    return (

        <div className="detection-row">

            <div className="detection-icon">

                <i
                    className={`bi ${icon}`}
                ></i>

            </div>


            <div className="detection-label">

                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>

            </div>


            <i
                className={
                    safe
                        ? "bi bi-check-circle-fill detection-check"
                        : "bi bi-dash-circle detection-wait"
                }
            ></i>

        </div>

    );

}


export default Monitoring;