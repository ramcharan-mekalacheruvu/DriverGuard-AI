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
    resetAudioAlerts,
    unlockAudio,
    speakPhoneAlert,
    speakHeadPoseAlert,
    speakAttentionAlert,
    speakDrowsinessAlert,
    speakYawningAlert,
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
// CONFIGURATION
// =====================================================

// Phone detection interval
const PHONE_DETECTION_INTERVAL = 1000;

// Unsafe head pose must remain for this long
// before alerting.
const HEAD_POSE_DELAY = 1500;

// Distracted attention must remain for this long.
const ATTENTION_DELAY = 1500;

// Drowsiness must remain for this long.
const DROWSINESS_DELAY = 1800;

// Yawning must remain for this long.
const YAWNING_DELAY = 1500;

// Minimum time between alerts of the same type.
const CONDITION_ALERT_COOLDOWN = 7000;

// Eye closure threshold
const EYE_CLOSURE_THRESHOLD = 0.20;


// =====================================================
// COMPONENT
// =====================================================

function Monitoring() {

    // -------------------------------------------------
    // DOM / animation references
    // -------------------------------------------------

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const animationFrameRef =
        useRef(null);

    const lastVideoTimeRef =
        useRef(-1);

    const aiInitializingRef =
        useRef(false);


    // -------------------------------------------------
    // Phone detection references
    // -------------------------------------------------

    const lastPhoneDetectionRef =
        useRef(0);

    const phoneDetectionRunningRef =
        useRef(false);


    // -------------------------------------------------
    // Unsafe condition timers
    // -------------------------------------------------

    const headPoseStartRef =
        useRef(null);

    const attentionStartRef =
        useRef(null);

    const drowsinessStartRef =
        useRef(null);

    const yawningStartRef =
        useRef(null);


    // -------------------------------------------------
    // Last alert timestamps
    // -------------------------------------------------

    const lastHeadPoseAlertRef =
        useRef(0);

    const lastAttentionAlertRef =
        useRef(0);

    const lastDrowsinessAlertRef =
        useRef(0);

    const lastYawningAlertRef =
        useRef(0);

    const lastPhoneAlertRef =
        useRef(0);


    // -------------------------------------------------
    // Phone state reference
    // -------------------------------------------------

    const phoneDetectedRef =
        useRef(false);


    // =================================================
    // STATE
    // =================================================

    const [cameraActive, setCameraActive] =
        useState(false);

    const [cameraError, setCameraError] =
        useState("");

    const [aiReady, setAiReady] =
        useState(false);

    const [aiError, setAiError] =
        useState("");

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
    // EAR CALCULATION
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
    // EYE STATE
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


        const closed =
            averageEAR > 0 &&
            averageEAR <
                EYE_CLOSURE_THRESHOLD;


        return {
            leftEAR,
            rightEAR,
            averageEAR,
            eyesClosed: closed,
        };
    };


    // =================================================
    // RESET CONDITION TIMERS
    // =================================================

    const resetConditionTimers = () => {

        headPoseStartRef.current =
            null;

        attentionStartRef.current =
            null;

        drowsinessStartRef.current =
            null;

        yawningStartRef.current =
            null;
    };


    // =================================================
    // RESET ALERT TIMERS
    // =================================================

    const resetAlertTimers = () => {

        lastHeadPoseAlertRef.current =
            0;

        lastAttentionAlertRef.current =
            0;

        lastDrowsinessAlertRef.current =
            0;

        lastYawningAlertRef.current =
            0;

        lastPhoneAlertRef.current =
            0;
    };


    // =================================================
    // HEAD POSE ALERT
    // =================================================

    const processHeadPoseAlert = (
        direction,
        now
    ) => {

        const unsafe =
            direction &&
            direction !== "Center";


        if (!unsafe) {

            headPoseStartRef.current =
                null;

            return;
        }


        if (
            headPoseStartRef.current ===
            null
        ) {

            headPoseStartRef.current =
                now;

            return;
        }


        const duration =
            now -
            headPoseStartRef.current;


        const cooldownPassed =
            now -
            lastHeadPoseAlertRef.current >=
            CONDITION_ALERT_COOLDOWN;


        if (
            duration >= HEAD_POSE_DELAY &&
            cooldownPassed
        ) {

            speakHeadPoseAlert();

            lastHeadPoseAlertRef.current =
                now;

            setLastAlert(
                "Head pose alert"
            );
        }
    };


    // =================================================
    // ATTENTION ALERT
    // =================================================

    const processAttentionAlert = (
        currentAttention,
        now
    ) => {

        const distracted =
            currentAttention &&
            currentAttention !== "Focused";


        if (!distracted) {

            attentionStartRef.current =
                null;

            return;
        }


        if (
            attentionStartRef.current ===
            null
        ) {

            attentionStartRef.current =
                now;

            return;
        }


        const duration =
            now -
            attentionStartRef.current;


        const cooldownPassed =
            now -
            lastAttentionAlertRef.current >=
            CONDITION_ALERT_COOLDOWN;


        if (
            duration >= ATTENTION_DELAY &&
            cooldownPassed
        ) {

            speakAttentionAlert();

            lastAttentionAlertRef.current =
                now;

            setLastAlert(
                "Attention alert"
            );
        }
    };


    // =================================================
    // PHONE ALERT
    // =================================================

    const processPhoneAlert = (
        detected,
        now
    ) => {

        if (!detected) {

            phoneDetectedRef.current =
                false;

            return;
        }


        phoneDetectedRef.current =
            true;


        const cooldownPassed =
            now -
            lastPhoneAlertRef.current >=
            CONDITION_ALERT_COOLDOWN;


        if (cooldownPassed) {

            speakPhoneAlert();

            lastPhoneAlertRef.current =
                now;

            setLastAlert(
                "Phone detected"
            );
        }
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


            await initializeFaceLandmarker();


            setAiReady(true);


            // -----------------------------------------
            // Phone detector
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
                    "Phone detector failed:",
                    error
                );

                setPhoneDetectionReady(
                    false
                );
            }


            console.log(
                "Face AI initialized successfully"
            );

        } catch (error) {

            console.error(
                "AI initialization failed:",
                error
            );

            setAiError(
                "AI engine could not be initialized. Please check the Face Landmarker model."
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

            setCameraError("");
            setAiError("");


            // -----------------------------------------
            // IMPORTANT:
            // Unlock audio directly from button click.
            // -----------------------------------------

            unlockAudio();


            // -----------------------------------------
            // Reset engines
            // -----------------------------------------

            resetRiskEngine();
            resetAudioAlerts();


            // -----------------------------------------
            // Reset state
            // -----------------------------------------

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


            // -----------------------------------------
            // Reset references
            // -----------------------------------------

            lastVideoTimeRef.current =
                -1;

            lastPhoneDetectionRef.current =
                0;

            phoneDetectionRunningRef.current =
                false;

            phoneDetectedRef.current =
                false;

            resetConditionTimers();

            resetAlertTimers();


            // -----------------------------------------
            // Camera support
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
            // Attach video
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
        // Stop animation
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
        // Stop camera tracks
        // ---------------------------------------------

        if (streamRef.current) {

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

        if (videoRef.current) {

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
        // Reset state
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


        // ---------------------------------------------
        // Reset refs
        // ---------------------------------------------

        lastVideoTimeRef.current =
            -1;

        lastPhoneDetectionRef.current =
            0;

        phoneDetectionRunningRef.current =
            false;

        phoneDetectedRef.current =
            false;

        resetConditionTimers();

        resetAlertTimers();
    };


    // =================================================
    // PHONE DETECTION
    // =================================================

    const runPhoneDetection = async (
        video,
        now
    ) => {

        // ---------------------------------------------
        // Prevent overlapping detections
        // ---------------------------------------------

        if (
            phoneDetectionRunningRef.current
        ) {
            return;
        }


        // ---------------------------------------------
        // Interval
        // ---------------------------------------------

        if (
            now -
            lastPhoneDetectionRef.current <
            PHONE_DETECTION_INTERVAL
        ) {
            return;
        }


        phoneDetectionRunningRef.current =
            true;

        lastPhoneDetectionRef.current =
            now;


        try {

            const phoneResult =
                await detectPhone(video);


            if (!phoneResult) {
                return;
            }


            const detected =
                Boolean(
                    phoneResult.detected
                );


            const confidence =
                Number(
                    phoneResult.confidence ||
                    0
                );


            setPhoneDetected(
                detected
            );

            setPhoneConfidence(
                confidence
            );


            // -----------------------------------------
            // Alert only after result returns.
            // -----------------------------------------

            processPhoneAlert(
                detected,
                performance.now()
            );

        } catch (error) {

            console.error(
                "Phone detection failed:",
                error
            );

        } finally {

            phoneDetectionRunningRef.current =
                false;
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
        // Don't process the same video frame twice
        // ---------------------------------------------

        if (
            currentVideoTime !==
            lastVideoTimeRef.current
        ) {

            const now =
                performance.now();


            try {

                // =====================================
                // FACE DETECTION
                // =====================================

                const result =
                    detectFace(
                        video,
                        now
                    );


                lastVideoTimeRef.current =
                    currentVideoTime;


                // =====================================
                // FACE FOUND
                // =====================================

                if (
                    result &&
                    result.faceLandmarks &&
                    result.faceLandmarks.length >
                    0
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
                        eyeState.averageEAR
                    );


                    setEyesClosed(
                        eyeState.eyesClosed
                    );


                    // ---------------------------------
                    // Head pose
                    // ---------------------------------

                    const headPose =
                        detectHeadPose(
                            result.faceLandmarks
                        );


                    if (headPose) {

                        const direction =
                            headPose.direction ||
                            "Not detected";

                        const currentAttention =
                            headPose.attention ||
                            "Not detected";


                        setHeadDirection(
                            direction
                        );

                        setAttention(
                            currentAttention
                        );


                        // -----------------------------
                        // Head pose alert
                        // -----------------------------

                        processHeadPoseAlert(
                            direction,
                            now
                        );


                        // -----------------------------
                        // Attention alert
                        // -----------------------------

                        processAttentionAlert(
                            currentAttention,
                            now
                        );
                    }


                    // =================================
                    // DROWSINESS
                    // =================================

                    const risk =
                        updateDrowsiness(
                            eyeState.eyesClosed
                        );


                    if (risk) {

                        const currentDrowsy =
                            Boolean(
                                risk.drowsy
                            );


                        setDrowsy(
                            currentDrowsy
                        );


                        if (
                            typeof risk.score ===
                            "number"
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


                        // -----------------------------
                        // Drowsiness timer
                        // -----------------------------

                        if (
                            currentDrowsy
                        ) {

                            if (
                                drowsinessStartRef.current ===
                                null
                            ) {

                                drowsinessStartRef.current =
                                    now;
                            }


                            const drowsyDuration =
                                now -
                                drowsinessStartRef.current;


                            const cooldownPassed =
                                now -
                                lastDrowsinessAlertRef.current >=
                                CONDITION_ALERT_COOLDOWN;


                            if (
                                drowsyDuration >=
                                DROWSINESS_DELAY &&
                                cooldownPassed
                            ) {

                                speakDrowsinessAlert();

                                lastDrowsinessAlertRef.current =
                                    now;

                                setLastAlert(
                                    "Drowsiness alert"
                                );
                            }

                        } else {

                            drowsinessStartRef.current =
                                null;
                        }
                    }


                    // =================================
                    // YAWNING
                    // =================================
                    //
                    // If your face detector later provides
                    // a yawning value, this section can use it.
                    //
                    // Currently we deliberately DON'T invent
                    // a yawning result.
                    // =================================

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


                    // Reset condition timers
                    resetConditionTimers();
                }


                // =====================================
                // PHONE DETECTION
                // =====================================

                if (
                    phoneDetectionReady
                ) {

                    runPhoneDetection(
                        video,
                        now
                    );
                }

            } catch (error) {

                console.error(
                    "AI frame processing error:",
                    error
                );
            }
        }


        // ===========================================
        // NEXT FRAME
        // ===========================================

        animationFrameRef.current =
            requestAnimationFrame(
                runAI
            );
    };


    // =================================================
    // CLEANUP
    // =================================================

    useEffect(() => {

        return () => {

            stopCamera();
        };

    }, []);


    // =================================================
    // START AI LOOP
    // =================================================

    useEffect(() => {

        if (
            cameraActive &&
            aiReady
        ) {

            if (
                animationFrameRef.current
            ) {

                cancelAnimationFrame(
                    animationFrameRef.current
                );
            }


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
        phoneDetectionReady,
    ]);


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

                    {
                        cameraActive
                            ? "MONITORING"
                            : "OFFLINE"
                    }

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

                            {score}

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


                        <Detection
                            icon="bi-emoji-smile"
                            label="Yawning"
                            value="Not analyzed"
                            safe
                        />

                    </div>


                    {/* =================================
                        EAR DEBUG
                    ================================== */}

                    <div className="ear-debug-card">

                        <span>
                            EYE ASPECT RATIO
                        </span>


                        <strong>
                            {eyeEAR.toFixed(3)}
                        </strong>


                        <small>
                            Lower values indicate
                            greater eye closure.
                        </small>

                    </div>


                    {/* =================================
                        PHONE DEBUG
                    ================================== */}

                    {phoneDetectionReady && (

                        <div className="ear-debug-card">

                            <span>
                                PHONE DETECTION
                            </span>


                            <strong>

                                {
                                    phoneDetected
                                        ? `${(
                                            phoneConfidence *
                                            100
                                        ).toFixed(1)}%`
                                        : "No phone"
                                }

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
                                Voice warnings will be
                                played when unsafe
                                behavior is detected.
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