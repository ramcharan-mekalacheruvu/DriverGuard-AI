
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

import {
    detectYawn,
    resetYawnDetection,
} from "../ai/yawnDetection";


// =====================================================
// CONFIGURATION
// =====================================================

// Phone detection interval
const PHONE_DETECTION_INTERVAL = 1000;

// Head must remain away from center before alert
const HEAD_POSE_DELAY = 900;

// Attention must remain distracted before alert
const ATTENTION_DELAY = 1800;

// Additional cooldown in Monitoring.jsx
const CONDITION_ALERT_COOLDOWN = 8000;


// =====================================================
// DROWSINESS / EYE CONFIGURATION
// =====================================================

// IMPORTANT:
// EAR BELOW 0.110 = CLOSED EYES
const EYE_CLOSURE_THRESHOLD = 0.110;

// Average several frames to reduce mobile camera noise.
const EAR_HISTORY_SIZE = 5;

// Require several consecutive closed frames.
const DROWSINESS_CONFIRM_FRAMES = 5;

// Require several consecutive open frames to recover.
const DROWSINESS_CLEAR_FRAMES = 4;


// =====================================================
// YAWNING DISPLAY STABILIZATION
// =====================================================

// MAR itself is calculated inside yawnDetection.js.
// This component only smooths the returned value.

const MAR_HISTORY_SIZE = 5;


// =====================================================
// FACE LOSS TOLERANCE
// =====================================================

// Mobile cameras can temporarily lose landmarks.
const FACE_LOSS_TOLERANCE = 900;


// =====================================================
// COMPONENT
// =====================================================

function Monitoring() {

    // =================================================
    // DOM / ANIMATION REFERENCES
    // =================================================

    const videoRef = useRef(null);

    const streamRef = useRef(null);

    const animationFrameRef =
        useRef(null);

    const lastVideoTimeRef =
        useRef(-1);

    const aiInitializingRef =
        useRef(false);


    // =================================================
    // PHONE DETECTION
    // =================================================

    const lastPhoneDetectionRef =
        useRef(0);

    const phoneDetectionRunningRef =
        useRef(false);


    // =================================================
    // CONDITION TIMERS
    // =================================================

    const headPoseStartRef =
        useRef(null);

    const attentionStartRef =
        useRef(null);


    // =================================================
    // ALERT TIMERS
    // =================================================

    const lastHeadPoseAlertRef =
        useRef(0);

    const lastAttentionAlertRef =
        useRef(0);

    const lastPhoneAlertRef =
        useRef(0);


    // =================================================
    // PHONE STATE
    // =================================================

    const phoneDetectedRef =
        useRef(false);


    // =================================================
    // EAR STABILIZATION
    // =================================================

    const earHistoryRef =
        useRef([]);

    const closedEyeFramesRef =
        useRef(0);

    const openEyeFramesRef =
        useRef(0);

    const stableEyesClosedRef =
        useRef(false);


    // =================================================
    // MAR STABILIZATION
    // =================================================

    const marHistoryRef =
        useRef([]);


    // =================================================
    // FACE LOSS
    // =================================================

    const lastFaceSeenRef =
        useRef(0);


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

    const [yawning, setYawning] =
        useState(false);

    const [mouthMAR, setMouthMAR] =
        useState(0);


    // =================================================
    // DISTANCE
    // =================================================

    const distance = (p1, p2) => {

        if (!p1 || !p2) {
            return 0;
        }

        const dx =
            p1.x - p2.x;

        const dy =
            p1.y - p2.y;

        return Math.sqrt(
            dx * dx +
            dy * dy
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


        if (horizontal <= 0) {
            return 0;
        }


        return (
            vertical1 +
            vertical2
        ) / (
            2 *
            horizontal
        );
    };


    // =================================================
    // SMOOTH EAR
    // =================================================

    const smoothEAR = (value) => {

        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            if (
                earHistoryRef.current.length
            ) {

                return (
                    earHistoryRef.current[
                        earHistoryRef.current.length - 1
                    ]
                );
            }

            return 0;
        }


        const history =
            earHistoryRef.current;


        history.push(value);


        if (
            history.length >
            EAR_HISTORY_SIZE
        ) {

            history.shift();
        }


        const sum =
            history.reduce(
                (total, item) =>
                    total + item,
                0
            );


        return (
            sum /
            history.length
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


        let rawAverageEAR = 0;


        if (
            leftEAR > 0 &&
            rightEAR > 0
        ) {

            rawAverageEAR =
                (
                    leftEAR +
                    rightEAR
                ) / 2;

        } else if (
            leftEAR > 0
        ) {

            rawAverageEAR =
                leftEAR;

        } else if (
            rightEAR > 0
        ) {

            rawAverageEAR =
                rightEAR;
        }


        const averageEAR =
            smoothEAR(
                rawAverageEAR
            );


        // =============================================
        // EAR < 0.110 = CLOSED
        // =============================================

        const currentlyClosed =
            averageEAR > 0 &&
            averageEAR <
            EYE_CLOSURE_THRESHOLD;


        // =============================================
        // CLOSED FRAME COUNT
        // =============================================

        if (currentlyClosed) {

            closedEyeFramesRef.current += 1;

            openEyeFramesRef.current = 0;

        } else {

            openEyeFramesRef.current += 1;

            closedEyeFramesRef.current = 0;
        }


        // =============================================
        // CONFIRM CLOSED STATE
        // =============================================

        if (
            closedEyeFramesRef.current >=
            DROWSINESS_CONFIRM_FRAMES
        ) {

            stableEyesClosedRef.current =
                true;
        }


        // =============================================
        // CLEAR CLOSED STATE
        // =============================================

        if (
            openEyeFramesRef.current >=
            DROWSINESS_CLEAR_FRAMES
        ) {

            stableEyesClosedRef.current =
                false;
        }


        return {

            leftEAR,

            rightEAR,

            averageEAR,

            eyesClosed:
                stableEyesClosedRef.current,

        };
    };


    // =================================================
    // SMOOTH MAR
    // =================================================

    const smoothMAR = (value) => {

        if (
            !Number.isFinite(value) ||
            value < 0
        ) {

            if (
                marHistoryRef.current.length
            ) {

                return (
                    marHistoryRef.current[
                        marHistoryRef.current.length - 1
                    ]
                );
            }

            return 0;
        }


        const history =
            marHistoryRef.current;


        history.push(value);


        if (
            history.length >
            MAR_HISTORY_SIZE
        ) {

            history.shift();
        }


        const sum =
            history.reduce(
                (total, item) =>
                    total + item,
                0
            );


        return (
            sum /
            history.length
        );
    };


    // =================================================
    // RESET STABILITY
    // =================================================

    const resetStability = () => {

        earHistoryRef.current =
            [];

        marHistoryRef.current =
            [];

        closedEyeFramesRef.current =
            0;

        openEyeFramesRef.current =
            0;

        stableEyesClosedRef.current =
            false;

        lastFaceSeenRef.current =
            0;
    };


    // =================================================
    // RESET CONDITION TIMERS
    // =================================================

    const resetConditionTimers = () => {

        headPoseStartRef.current =
            null;

        attentionStartRef.current =
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
            direction !== "Center" &&
            direction !== "Not detected";


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
            duration >=
            HEAD_POSE_DELAY &&
            cooldownPassed
        ) {

            const spoken =
                speakHeadPoseAlert();


            if (spoken) {

                lastHeadPoseAlertRef.current =
                    now;

                setLastAlert(
                    "Head pose alert"
                );
            }
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
            currentAttention !== "Focused" &&
            currentAttention !== "Not detected";


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
            duration >=
            ATTENTION_DELAY &&
            cooldownPassed
        ) {

            const spoken =
                speakAttentionAlert();


            if (spoken) {

                lastAttentionAlertRef.current =
                    now;

                setLastAlert(
                    "Attention alert"
                );
            }
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

            const spoken =
                speakPhoneAlert();


            if (spoken) {

                lastPhoneAlertRef.current =
                    now;

                setLastAlert(
                    "Phone detected"
                );
            }
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


            setAiReady(
                true
            );


            // -----------------------------------------
            // PHONE DETECTOR
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
            // AUDIO
            // -----------------------------------------

            unlockAudio();


            // -----------------------------------------
            // RESET ENGINES
            // -----------------------------------------

            resetRiskEngine();

            resetAudioAlerts();

            resetYawnDetection();

            resetPhoneDetector();


            // -----------------------------------------
            // RESET STATE
            // -----------------------------------------

            setScore(100);

            setFaceDetected(false);

            setEyesClosed(false);

            setDrowsy(false);

            setEyeEAR(0);

            setYawning(false);

            setMouthMAR(0);

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
            // RESET REFERENCES
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

            resetStability();


            // -----------------------------------------
            // CAMERA SUPPORT
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
            // REQUEST CAMERA
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

                            frameRate: {
                                ideal: 30,
                                max: 30,
                            },
                        },

                        audio: false,
                    }
                );


            streamRef.current =
                stream;


            // -----------------------------------------
            // ATTACH VIDEO
            // -----------------------------------------

            if (videoRef.current) {

                videoRef.current.srcObject =
                    stream;

                await videoRef.current.play();
            }


            setCameraActive(true);


            // -----------------------------------------
            // INITIALIZE AI
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
        // STOP ANIMATION
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
        // STOP CAMERA
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
        // CLEAR VIDEO
        // ---------------------------------------------

        if (videoRef.current) {

            videoRef.current.pause();

            videoRef.current.srcObject =
                null;
        }


        // ---------------------------------------------
        // RESET ENGINES
        // ---------------------------------------------

        resetRiskEngine();

        resetAudioAlerts();

        resetPhoneDetector();

        resetYawnDetection();


        // ---------------------------------------------
        // RESET STATE
        // ---------------------------------------------

        setScore(100);

        setCameraActive(false);

        setFaceDetected(false);

        setEyesClosed(false);

        setDrowsy(false);

        setEyeEAR(0);

        setYawning(false);

        setMouthMAR(0);

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
        // RESET REFERENCES
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

        resetStability();
    };


    // =================================================
    // PHONE DETECTION
    // =================================================

    const runPhoneDetection = async (
        video,
        now
    ) => {

        if (
            phoneDetectionRunningRef.current
        ) {

            return;
        }


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
        // PROCESS ONLY NEW VIDEO FRAMES
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


                    lastFaceSeenRef.current =
                        now;


                    setFaceDetected(
                        true
                    );


                    // =================================
                    // EYE STATE
                    // =================================

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


                    // =================================
                    // DROWSINESS
                    // =================================

                    const risk =
                        updateDrowsiness(
                            eyeState.eyesClosed
                        );


                    if (risk) {

                        const currentDrowsy =
                            risk.state ===
                            "drowsy";


                        setDrowsy(
                            currentDrowsy
                        );


                        // ---------------------------------
                        // Speak only when risk engine
                        // explicitly requests an alert.
                        // ---------------------------------

                        if (
                            risk.shouldAlert
                        ) {

                            const spoken =
                                speakDrowsinessAlert();


                            if (spoken) {

                                setLastAlert(
                                    "Drowsiness alert"
                                );
                            }
                        }
                    }


                    // =================================
                    // HEAD POSE
                    // =================================

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


                        processHeadPoseAlert(
                            direction,
                            now
                        );


                        processAttentionAlert(
                            currentAttention,
                            now
                        );
                    }


                    // =================================
                    // YAWNING
                    // =================================

                    const yawnResult =
                        detectYawn(
                            landmarks,
                            now
                        );


                    if (yawnResult) {

                        const rawMAR =
                            Number(
                                yawnResult.mar ||
                                0
                            );


                        const stableMAR =
                            smoothMAR(
                                rawMAR
                            );


                        setMouthMAR(
                            stableMAR
                        );


                        const isYawning =
                            Boolean(
                                yawnResult.yawning
                            );


                        setYawning(
                            isYawning
                        );


                        // ---------------------------------
                        // yawnDetection.js is responsible
                        // for deciding whether the MAR
                        // actually represents a yawn.
                        // ---------------------------------

                        if (
                            isYawning
                        ) {

                            const spoken =
                                speakYawningAlert();


                            if (spoken) {

                                setLastAlert(
                                    "Yawning detected"
                                );
                            }
                        }
                    }


                } else {

                    // =================================
                    // FACE NOT FOUND
                    // =================================

                    const faceRecentlySeen =
                        lastFaceSeenRef.current >
                        0 &&
                        now -
                        lastFaceSeenRef.current <
                        FACE_LOSS_TOLERANCE;


                    if (
                        !faceRecentlySeen
                    ) {

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

                        setYawning(
                            false
                        );

                        setMouthMAR(
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


                        resetYawnDetection();

                        resetStability();

                        resetConditionTimers();
                    }
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

                streamRef.current =
                    null;
            }


            if (videoRef.current) {

                videoRef.current.pause();

                videoRef.current.srcObject =
                    null;
            }


            resetRiskEngine();

            resetAudioAlerts();

            resetPhoneDetector();

            resetYawnDetection();

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


                    {/* CAMERA ERROR */}

                    {cameraError && (

                        <div className="camera-error">

                            <i className="bi bi-exclamation-triangle"></i>

                            {cameraError}

                        </div>

                    )}


                    {/* AI ERROR */}

                    {aiError && (

                        <div className="camera-error">

                            <i className="bi bi-cpu"></i>

                            {aiError}

                        </div>

                    )}


                    {/* CONTROLS */}

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
                                attention === "Focused"
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
                                headDirection === "Center"
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
                            value={
                                !cameraActive
                                    ? "Waiting"
                                    : !faceDetected
                                        ? "Not detected"
                                        : yawning
                                            ? "Detected"
                                            : "Normal"
                            }
                            safe={
                                cameraActive &&
                                faceDetected &&
                                !yawning
                            }
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
                            {eyeEAR.toFixed(3)}
                        </strong>


                        <small>
                            Below 0.110 = closed eyes
                        </small>

                    </div>


                    {/* =================================
                        MAR
                    ================================== */}

                    <div className="ear-debug-card">

                        <span>
                            MOUTH ASPECT RATIO
                        </span>


                        <strong>
                            {mouthMAR.toFixed(3)}
                        </strong>


                        <small>
                            Yawning is determined by
                            yawnDetection.js.
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
