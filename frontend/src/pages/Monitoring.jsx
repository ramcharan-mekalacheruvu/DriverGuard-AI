
// src/pages/Monitoring.jsx

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
    updateDrowsiness,
    resetRiskEngine,
} from "../ai/riskEngine";

import {
    unlockAudio,
    speakAlert,
    resetAudioAlerts,
} from "../ai/audioAlerts";

import {
    detectHeadPose,
} from "../ai/headPose";

import {
    initializePhoneDetector,
    detectPhone,
    resetPhoneDetector,
} from "../ai/phoneDetection";


// =====================================================
// CONSTANTS
// =====================================================

const PHONE_DETECTION_INTERVAL = 1200;


// =====================================================
// MONITORING COMPONENT
// =====================================================

function Monitoring() {

    // -------------------------------------------------
    // Refs
    // -------------------------------------------------

    const videoRef = useRef(null);

    const streamRef = useRef(null);

    const animationFrameRef = useRef(null);

    const phoneDetectionTimerRef = useRef(null);

    const lastVideoTimeRef = useRef(-1);

    const aiInitializingRef = useRef(false);

    const phoneDetectionRunningRef = useRef(false);


    // -------------------------------------------------
    // Camera / AI state
    // -------------------------------------------------

    const [cameraActive, setCameraActive] =
        useState(false);

    const [cameraError, setCameraError] =
        useState("");

    const [aiReady, setAiReady] =
        useState(false);

    const [aiError, setAiError] =
        useState("");


    // -------------------------------------------------
    // Driver monitoring state
    // -------------------------------------------------

    const [score, setScore] =
        useState(100);

    const [faceDetected, setFaceDetected] =
        useState(false);

    const [eyesClosed, setEyesClosed] =
        useState(false);

    const [drowsy, setDrowsy] =
        useState(false);

    const [eyeEAR, setEyeEAR] =
        useState(0);

    const [lastAlert, setLastAlert] =
        useState("No alerts");

    const [headDirection, setHeadDirection] =
        useState("Not detected");

    const [attention, setAttention] =
        useState("Not detected");


    // -------------------------------------------------
    // Phone detection state
    // -------------------------------------------------

    const [phoneDetected, setPhoneDetected] =
        useState(false);

    const [phoneConfidence, setPhoneConfidence] =
        useState(0);

    const [phoneDetectionReady, setPhoneDetectionReady] =
        useState(false);


    // =================================================
    // DISTANCE
    // =================================================

    const distance = (p1, p2) => {

        const dx =
            p1.x - p2.x;

        const dy =
            p1.y - p2.y;

        return Math.sqrt(
            dx * dx + dy * dy
        );
    };


    // =================================================
    // CALCULATE EAR
    // =================================================

    const calculateEAR = (
        landmarks,
        eyePoints
    ) => {

        const p1 =
            landmarks[eyePoints[0]];

        const p2 =
            landmarks[eyePoints[1]];

        const p3 =
            landmarks[eyePoints[2]];

        const p4 =
            landmarks[eyePoints[3]];

        const p5 =
            landmarks[eyePoints[4]];

        const p6 =
            landmarks[eyePoints[5]];


        if (
            !p1 ||
            !p2 ||
            !p3 ||
            !p4 ||
            !p5 ||
            !p6
        ) {
            return 0;
        }


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
            vertical1 +
            vertical2
        ) / (
            2 * horizontal
        );
    };


    // =================================================
    // CALCULATE EYE STATE
    // =================================================

    const calculateEyeState = (
        landmarks
    ) => {

        const leftEAR =
            calculateEAR(
                landmarks,
                [
                    33,
                    160,
                    158,
                    133,
                    153,
                    144,
                ]
            );


        const rightEAR =
            calculateEAR(
                landmarks,
                [
                    362,
                    385,
                    387,
                    263,
                    373,
                    380,
                ]
            );


        const averageEAR =
            (
                leftEAR +
                rightEAR
            ) / 2;


        const eyesClosed =
            averageEAR > 0 &&
            averageEAR < 0.20;


        return {
            leftEAR,
            rightEAR,
            averageEAR,
            eyesClosed,
        };
    };


    // =================================================
    // INITIALIZE AI
    // =================================================

    const initializeAI = async () => {

        if (
            aiInitializingRef.current
        ) {
            return;
        }


        if (aiReady) {
            return;
        }


        try {

            aiInitializingRef.current =
                true;

            setAiError("");

            console.log(
                "Initializing AI..."
            );


            // -----------------------------------------
            // Face AI
            // -----------------------------------------

            await initializeFaceLandmarker();

            setAiReady(true);


            // -----------------------------------------
            // Phone AI
            // -----------------------------------------

            try {

                await initializePhoneDetector();

                setPhoneDetectionReady(
                    true
                );

                console.log(
                    "Phone detector ready"
                );

            } catch (error) {

                console.error(
                    "Phone detector initialization failed:",
                    error
                );

                setPhoneDetectionReady(
                    false
                );
            }


        } catch (error) {

            console.error(
                "AI initialization failed:",
                error
            );

            setAiError(
                "AI engine could not be initialized. Please check the AI model."
            );

        } finally {

            aiInitializingRef.current =
                false;
        }
    };


    // =================================================
    // START CAMERA
    // =================================================

    const startCamera = async () => {

        try {

            // -----------------------------------------
            // Reset previous monitoring state
            // -----------------------------------------

            resetRiskEngine();

            resetAudioAlerts();


            /*
             * MUST happen immediately from the user's
             * Start Monitoring button click.
             *
             * Do this BEFORE getUserMedia().
             */

            unlockAudio();


            setCameraError("");
            setAiError("");


            setScore(100);

            setFaceDetected(false);

            setEyesClosed(false);

            setDrowsy(false);

            setEyeEAR(0);

            setLastAlert(
                "No alerts"
            );

            setHeadDirection(
                "Not detected"
            );

            setAttention(
                "Not detected"
            );


            setPhoneDetected(false);

            setPhoneConfidence(0);


            lastVideoTimeRef.current =
                -1;


            // -----------------------------------------
            // Browser camera support
            // -----------------------------------------

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                setCameraError(
                    "Camera access is not supported by this browser."
                );

                return;
            }


            // -----------------------------------------
            // Request camera
            // -----------------------------------------

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    {
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
                    }
                );


            streamRef.current =
                stream;


            // -----------------------------------------
            // Attach camera
            // -----------------------------------------

            if (videoRef.current) {

                videoRef.current.srcObject =
                    stream;

                await videoRef.current.play();
            }


            setCameraActive(true);


            // -----------------------------------------
            // Initialize AI
            // -----------------------------------------

            await initializeAI();

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


    // =================================================
    // STOP CAMERA
    // =================================================

    const stopCamera = () => {

        // ---------------------------------------------
        // Stop animation loop
        // ---------------------------------------------

        if (
            animationFrameRef.current
        ) {

            cancelAnimationFrame(
                animationFrameRef.current
            );

            animationFrameRef.current =
                null;
        }


        // ---------------------------------------------
        // Stop phone timer
        // ---------------------------------------------

        if (
            phoneDetectionTimerRef.current
        ) {

            clearTimeout(
                phoneDetectionTimerRef.current
            );

            phoneDetectionTimerRef.current =
                null;
        }


        phoneDetectionRunningRef.current =
            false;


        // ---------------------------------------------
        // Stop camera tracks
        // ---------------------------------------------

        if (
            streamRef.current
        ) {

            streamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current =
                null;
        }


        // ---------------------------------------------
        // Clear video
        // ---------------------------------------------

        if (
            videoRef.current
        ) {

            videoRef.current.pause();

            videoRef.current.srcObject =
                null;
        }


        // ---------------------------------------------
        // Reset AI
        // ---------------------------------------------

        resetRiskEngine();

        resetAudioAlerts();

        resetPhoneDetector();


        // ---------------------------------------------
        // Reset UI
        // ---------------------------------------------

        setScore(100);

        setCameraActive(false);

        setFaceDetected(false);

        setEyesClosed(false);

        setDrowsy(false);

        setEyeEAR(0);

        setLastAlert(
            "No alerts"
        );

        setHeadDirection(
            "Not detected"
        );

        setAttention(
            "Not detected"
        );

        setPhoneDetected(false);

        setPhoneConfidence(0);

        setPhoneDetectionReady(false);


        lastVideoTimeRef.current =
            -1;
    };


    // =================================================
    // PHONE DETECTION
    // =================================================

    const runPhoneDetection = async () => {

        if (
            !cameraActive ||
            !phoneDetectionReady ||
            !videoRef.current ||
            phoneDetectionRunningRef.current
        ) {
            return;
        }


        const video =
            videoRef.current;


        if (
            video.readyState < 2
        ) {
            return;
        }


        phoneDetectionRunningRef.current =
            true;


        try {

            const phoneResult =
                await detectPhone(video);


            setPhoneDetected(
                Boolean(phoneResult.detected)
            );


            setPhoneConfidence(
                typeof phoneResult.confidence === "number"
                    ? phoneResult.confidence
                    : 0
            );


            // -----------------------------------------
            // PHONE AUDIO ALERT
            // -----------------------------------------

            if (
                phoneResult.detected
            ) {

                speakAlert(
                    "Please put the phone down and focus on driving."
                );

                setLastAlert(
                    "Phone detected"
                );
            }


        } catch (error) {

            console.error(
                "Phone detection failed:",
                error
            );

        } finally {

            phoneDetectionRunningRef.current =
                false;


            // -----------------------------------------
            // Schedule next detection
            // -----------------------------------------

            if (cameraActive) {

                phoneDetectionTimerRef.current =
                    setTimeout(
                        runPhoneDetection,
                        PHONE_DETECTION_INTERVAL
                    );
            }
        }
    };


    // =================================================
    // MAIN AI LOOP
    // =================================================

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


        // ---------------------------------------------
        // Wait for video
        // ---------------------------------------------

        if (
            video.readyState < 2
        ) {

            animationFrameRef.current =
                requestAnimationFrame(
                    runAI
                );

            return;
        }


        const currentVideoTime =
            video.currentTime;


        // ---------------------------------------------
        // Process only new video frame
        // ---------------------------------------------

        if (
            currentVideoTime !==
            lastVideoTimeRef.current
        ) {

            const now =
                performance.now();


            try {

                const result =
                    detectFace(
                        video,
                        now
                    );


                lastVideoTimeRef.current =
                    currentVideoTime;


                // =====================================
                // FACE DETECTED
                // =====================================

                if (
                    result &&
                    result.faceLandmarks &&
                    result.faceLandmarks.length > 0
                ) {

                    const landmarks =
                        result.faceLandmarks[0];


                    setFaceDetected(
                        true
                    );


                    // ---------------------------------
                    // Eye state
                    // ---------------------------------

                    const eyeState =
                        calculateEyeState(
                            landmarks
                        );


                    setEyeEAR(
                        Number(
                            eyeState.averageEAR
                        ) || 0
                    );


                    setEyesClosed(
                        Boolean(
                            eyeState.eyesClosed
                        )
                    );


                    // ---------------------------------
                    // Head pose
                    // ---------------------------------

                    const headPose =
                        detectHeadPose(
                            result.faceLandmarks
                        );


                    const currentHeadDirection =
                        headPose?.direction ||
                        "Not detected";


                    const currentAttention =
                        headPose?.attention ||
                        "Not detected";


                    setHeadDirection(
                        currentHeadDirection
                    );


                    setAttention(
                        currentAttention
                    );


                    // =================================
                    // HEAD POSE AUDIO ALERT
                    // =================================

                    if (
                        currentHeadDirection !==
                            "Center" &&
                        currentHeadDirection !==
                            "Not detected"
                    ) {

                        speakAlert(
                            "Please keep your eyes on the road."
                        );

                        setLastAlert(
                            "Head turned"
                        );
                    }


                    // =================================
                    // ATTENTION AUDIO ALERT
                    // =================================

                    if (
                        currentAttention ===
                        "Distracted"
                    ) {

                        speakAlert(
                            "Please focus your attention on the road."
                        );

                        setLastAlert(
                            "Attention distracted"
                        );
                    }


                    // ---------------------------------
                    // Drowsiness
                    // ---------------------------------

                    const risk =
                        updateDrowsiness(
                            eyeState.eyesClosed
                        );


                    if (risk) {

                        setDrowsy(
                            Boolean(
                                risk.drowsy
                            )
                        );


                        // ---------------------------------
                        // Keep score valid
                        // ---------------------------------

                        if (
                            typeof risk.score ===
                                "number" &&
                            Number.isFinite(
                                risk.score
                            )
                        ) {

                            const safeScore =
                                Math.max(
                                    0,
                                    Math.min(
                                        100,
                                        Math.round(
                                            risk.score
                                        )
                                    )
                                );


                            setScore(
                                safeScore
                            );
                        }


                        // =================================
                        // DROWSINESS AUDIO ALERT
                        // =================================

                        if (
                            risk.shouldAlert
                        ) {

                            speakAlert(
                                "Warning. You appear to be drowsy. Please stay alert."
                            );

                            setLastAlert(
                                "Drowsiness alert"
                            );
                        }
                    }

                } else {

                    // =================================
                    // NO FACE
                    // =================================

                    setFaceDetected(
                        false
                    );

                    setEyesClosed(
                        false
                    );

                    setDrowsy(
                        false
                    );

                    setEyeEAR(
                        0
                    );

                    setHeadDirection(
                        "Not detected"
                    );

                    setAttention(
                        "Not detected"
                    );


                    updateDrowsiness(
                        false
                    );
                }

            } catch (error) {

                console.error(
                    "AI frame processing error:",
                    error
                );
            }
        }


        // ---------------------------------------------
        // Continue animation loop
        // ---------------------------------------------

        animationFrameRef.current =
            requestAnimationFrame(
                runAI
            );
    };


    // =================================================
    // START / STOP AI LOOP
    // =================================================

    useEffect(() => {

        if (
            cameraActive &&
            aiReady
        ) {

            animationFrameRef.current =
                requestAnimationFrame(
                    runAI
                );


            // -----------------------------------------
            // Start phone detection
            // -----------------------------------------

            if (
                phoneDetectionReady
            ) {

                phoneDetectionTimerRef.current =
                    setTimeout(
                        runPhoneDetection,
                        1000
                    );
            }
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


            if (
                phoneDetectionTimerRef.current
            ) {

                clearTimeout(
                    phoneDetectionTimerRef.current
                );

                phoneDetectionTimerRef.current =
                    null;
            }


            phoneDetectionRunningRef.current =
                false;
        };

    }, [
        cameraActive,
        aiReady,
        phoneDetectionReady,
    ]);


    // =================================================
    // COMPONENT CLEANUP
    // =================================================

    useEffect(() => {

        return () => {

            stopCamera();
        };

    }, []);


    // =================================================
    // SCORE STATUS
    // =================================================

    const getScoreStatus = () => {

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
    };


    // =================================================
    // RENDER
    // =================================================

    return (

        <main className="monitor-page">

            {/* =========================================
                HEADER
            ========================================== */}

            <div className="monitor-header">

                <div>

                    <span>
                        REAL-TIME MONITORING
                    </span>

                    <h1>
                        Driver Monitoring
                    </h1>

                    <p>
                        Keep the camera positioned toward the driver's face.
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


            {/* =========================================
                MAIN LAYOUT
            ========================================== */}

            <section className="monitor-layout">


                {/* =====================================
                    CAMERA
                ====================================== */}

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
                                    Start monitoring to activate your camera.
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


                    {/* Camera error */}

                    {cameraError && (

                        <div className="camera-error">

                            <i className="bi bi-exclamation-triangle"></i>

                            {cameraError}

                        </div>

                    )}


                    {/* AI error */}

                    {aiError && (

                        <div className="camera-error">

                            <i className="bi bi-cpu"></i>

                            {aiError}

                        </div>

                    )}


                    {/* Controls */}

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


                {/* =====================================
                    SIDEBAR
                ====================================== */}

                <aside className="monitor-sidebar">


                    {/* =================================
                        SCORE
                    ================================== */}

                    <div className="monitor-score-card">

                        <small>
                            DRIVER SAFETY SCORE
                        </small>


                        <div className="monitor-score">

                            {Number.isFinite(score)
                                ? score
                                : 100}

                            <span>
                                /100
                            </span>

                        </div>


                        <div className="score-status">

                            <i className="bi bi-shield-check"></i>

                            {getScoreStatus()}

                        </div>

                    </div>


                    {/* =================================
                        LIVE DETECTION
                    ================================== */}

                    <div className="detection-card">

                        <div className="detection-heading">

                            <span>
                                LIVE DETECTION
                            </span>

                            <i className="bi bi-broadcast"></i>

                        </div>


                        {/* Face */}

                        <Detection
                            icon="bi-person-check"
                            label="Face"
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : faceDetected
                                        ? "Detected"
                                        : "Not detected"
                            }
                            safe={
                                cameraActive &&
                                faceDetected
                            }
                        />


                        {/* Eyes */}

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
                                cameraActive &&
                                !eyesClosed
                            }
                        />


                        {/* Drowsiness */}

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
                                cameraActive &&
                                !drowsy
                            }
                        />


                        {/* Attention */}

                        <Detection
                            icon="bi-compass"
                            label="Attention"
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : !faceDetected
                                        ? "Not detected"
                                        : attention
                            }
                            safe={
                                cameraActive &&
                                faceDetected &&
                                attention ===
                                    "Focused"
                            }
                        />


                        {/* Head Pose */}

                        <Detection
                            icon="bi-person-bounding-box"
                            label="Head Pose"
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : !faceDetected
                                        ? "Not detected"
                                        : headDirection
                            }
                            safe={
                                cameraActive &&
                                faceDetected &&
                                headDirection ===
                                    "Center"
                            }
                        />


                        {/* Phone */}

                        <Detection
                            icon="bi-phone"
                            label="Phone"
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : !phoneDetectionReady
                                        ? "Loading"
                                        : phoneDetected
                                            ? "Detected"
                                            : "Not detected"
                            }
                            safe={
                                cameraActive &&
                                phoneDetectionReady &&
                                !phoneDetected
                            }
                        />


                        {/* Yawning */}

                        <Detection
                            icon="bi-emoji-smile"
                            label="Yawning"
                            value="Not analyzed"
                            safe
                        />

                    </div>


                    {/* =================================
                        EAR
                    ================================== */}

                    <div className="ear-debug-card">

                        <span>
                            EYE ASPECT RATIO
                        </span>


                        <strong>
                            {Number.isFinite(eyeEAR)
                                ? eyeEAR.toFixed(3)
                                : "0.000"}
                        </strong>


                        <small>
                            Lower values indicate greater eye closure.
                        </small>

                    </div>


                    {/* =================================
                        PHONE CONFIDENCE
                    ================================== */}

                    {phoneDetectionReady && (

                        <div className="ear-debug-card">

                            <span>
                                PHONE DETECTION
                            </span>


                            <strong>

                                {phoneDetected
                                    ? `${(
                                        phoneConfidence * 100
                                    ).toFixed(1)}%`
                                    : "No phone"}

                            </strong>


                            <small>
                                Object detection confidence
                            </small>

                        </div>

                    )}


                    {/* =================================
                        LAST ALERT
                    ================================== */}

                    <div className="last-alert-card">

                        <i className="bi bi-volume-up"></i>


                        <div>

                            <span>
                                LAST ALERT
                            </span>


                            <strong>
                                {lastAlert}
                            </strong>

                        </div>

                    </div>


                    {/* =================================
                        AUDIO INFO
                    ================================== */}

                    <div className="alert-info">

                        <i className="bi bi-volume-up"></i>


                        <div>

                            <strong>
                                Audio alerts enabled
                            </strong>


                            <p>
                                Voice warnings will be played when unsafe behavior is detected.
                            </p>

                        </div>

                    </div>


                    {/* =================================
                        AI STATUS
                    ================================== */}

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


// =====================================================
// DETECTION COMPONENT
// =====================================================

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