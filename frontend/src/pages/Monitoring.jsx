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

import {
    detectYawn,
    resetYawnDetection,
} from "../ai/yawnDetection";

function Monitoring() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const aiInitializingRef = useRef(false);
    const lastPhoneDetectionRef = useRef(0);
    const phoneDetectionRunningRef = useRef(false);
    const lastHeadPoseAlertRef = useRef(0);
    const lastAttentionAlertRef = useRef(0);
    const lastPhoneAlertRef = useRef(0);
    const ALERT_COOLDOWN = 5000;

    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [aiReady, setAiReady] = useState(false);
    const [aiError, setAiError] = useState("");
    const [score, setScore] = useState(100);
    const [faceDetected, setFaceDetected] = useState(false);
    const [eyesClosed, setEyesClosed] = useState(false);
    const [drowsy, setDrowsy] = useState(false);
    const [eyeEAR, setEyeEAR] = useState(0);
    const [lastAlert, setLastAlert] = useState("No alerts");
    const [headDirection, setHeadDirection] = useState("Not detected");
    const [attention, setAttention] = useState("Not detected");
    const [phoneDetected, setPhoneDetected] = useState(false);
    const [phoneConfidence, setPhoneConfidence] = useState(0);
    const [phoneDetectionReady, setPhoneDetectionReady] = useState(false);
    const [yawning, setYawning] = useState(false);
    const [mouthMAR, setMouthMAR] = useState(0);

    const canPlayAlert = (lastAlertRef) => {
        const now = performance.now();
        if (now - lastAlertRef.current < ALERT_COOLDOWN) return false;
        lastAlertRef.current = now;
        return true;
    };

    const calculateSafetyScore = ({
        faceDetected,
        drowsy,
        phoneDetected,
        headDirection,
        attention,
        yawning,
    }) => {
        if (!faceDetected) return 100;

        let safetyScore = 100;

        if (drowsy) safetyScore -= 25;
        if (phoneDetected) safetyScore -= 30;
        if (headDirection !== "Center") safetyScore -= 15;
        if (attention !== "Focused") safetyScore -= 15;
        if (yawning) safetyScore -= 10;

        return Math.max(0, Math.min(100, safetyScore));
    };

    const distance = (p1, p2) => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const calculateEAR = (landmarks, eyePoints) => {
        const p1 = landmarks[eyePoints[0]];
        const p2 = landmarks[eyePoints[1]];
        const p3 = landmarks[eyePoints[2]];
        const p4 = landmarks[eyePoints[3]];
        const p5 = landmarks[eyePoints[4]];
        const p6 = landmarks[eyePoints[5]];

        if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

        const vertical1 = distance(p2, p6);
        const vertical2 = distance(p3, p5);
        const horizontal = distance(p1, p4);

        if (horizontal === 0) return 0;

        return (vertical1 + vertical2) / (2 * horizontal);
    };

    const calculateEyeState = (landmarks) => {
        const leftEAR = calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]);
        const rightEAR = calculateEAR(landmarks, [362, 385, 387, 263, 373, 380]);
        const averageEAR = (leftEAR + rightEAR) / 2;
        const eyesClosed = averageEAR > 0 && averageEAR < 0.2;

        return { leftEAR, rightEAR, averageEAR, eyesClosed };
    };

    const initializeAI = async () => {
        if (aiInitializingRef.current || aiReady) return;

        try {
            aiInitializingRef.current = true;
            setAiError("");
            console.log("Initializing AI...");

            await initializeFaceLandmarker();

            try {
                await initializePhoneDetector();
                setPhoneDetectionReady(true);
                console.log("📱 Phone detection ready");
            } catch (error) {
                console.error("Phone detector failed:", error);
                setPhoneDetectionReady(false);
            }

            setAiReady(true);
            console.log("All AI systems initialized successfully");
        } catch (error) {
            console.error("AI initialization failed:", error);
            setAiError("AI engine could not be initialized. Please check the Face Landmarker model.");
        } finally {
            aiInitializingRef.current = false;
        }
    };

    const startCamera = async () => {
        try {
            setCameraError("");
            setAiError("");

            resetRiskEngine();
            resetAudioAlerts();
            resetYawnDetection();

            setScore(100);
            setFaceDetected(false);
            setEyesClosed(false);
            setDrowsy(false);
            setEyeEAR(0);
            setLastAlert("No alerts");
            setHeadDirection("Not detected");
            setAttention("Not detected");
            setPhoneDetected(false);
            setPhoneConfidence(0);
            setYawning(false);
            setMouthMAR(0);
            lastPhoneDetectionRef.current = 0;
            phoneDetectionRunningRef.current = false;
            lastHeadPoseAlertRef.current = 0;
            lastAttentionAlertRef.current = 0;
            lastPhoneAlertRef.current = 0;
            lastVideoTimeRef.current = -1;

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraError("Camera access is not supported by this browser.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "user" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraActive(true);
            await initializeAI();
        } catch (error) {
            console.error("Camera error:", error);
            setCameraError("Camera access was denied or is unavailable. Please allow camera permission and try again.");
        }
    };

    const stopCamera = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }

        resetRiskEngine();
        resetAudioAlerts();
        resetPhoneDetector();
        resetYawnDetection();

        setScore(100);
        setCameraActive(false);
        setFaceDetected(false);
        setEyesClosed(false);
        setDrowsy(false);
        setEyeEAR(0);
        setYawning(false);
        setMouthMAR(0);
        setLastAlert("No alerts");
        setHeadDirection("Not detected");
        setAttention("Not detected");
        setPhoneDetected(false);
        setPhoneConfidence(0);
        lastPhoneDetectionRef.current = 0;
        phoneDetectionRunningRef.current = false;
        lastHeadPoseAlertRef.current = 0;
        lastAttentionAlertRef.current = 0;
        lastPhoneAlertRef.current = 0;
        lastVideoTimeRef.current = -1;
    };

    useEffect(() => {
        if (!cameraActive) {
            setScore(100);
            return;
        }

        if (!faceDetected) {
            setScore(100);
            return;
        }

        const newScore = calculateSafetyScore({
            faceDetected,
            drowsy,
            phoneDetected,
            headDirection,
            attention,
            yawning,
        });

        setScore(newScore);
    }, [
        cameraActive,
        faceDetected,
        drowsy,
        phoneDetected,
        headDirection,
        attention,
        yawning,
    ]);

    const runAI = () => {
        if (!videoRef.current || !aiReady || !cameraActive) return;

        const video = videoRef.current;

        if (video.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(runAI);
            return;
        }

        const currentVideoTime = video.currentTime;

        if (currentVideoTime !== lastVideoTimeRef.current) {
            const now = performance.now();

            try {
                const result = detectFace(video, now);
                lastVideoTimeRef.current = currentVideoTime;

                if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                    const landmarks = result.faceLandmarks[0];
                    setFaceDetected(true);

                    const eyeState = calculateEyeState(landmarks);

                    const yawnResult = detectYawn(landmarks, now);
                    setMouthMAR(yawnResult.mar);

                    if (yawnResult.yawning) {
                        setYawning(true);
                        speakAlert("You appear tired. Please stay alert.");
                        setLastAlert("Yawning detected");
                    } else {
                        setYawning(false);
                    }

                    const headPose = detectHeadPose(result.faceLandmarks);
                    setHeadDirection(headPose.direction);
                    setAttention(headPose.attention);

                    if (headPose.direction !== "Center") {
                        if (canPlayAlert(lastHeadPoseAlertRef)) {
                            speakAlert("Please keep your eyes on the road.");
                            setLastAlert("Head pose warning");
                        }
                    } else if (headPose.attention !== "Focused") {
                        if (canPlayAlert(lastAttentionAlertRef)) {
                            speakAlert("Please focus your attention on the road.");
                            setLastAlert("Attention warning");
                        }
                    }

                    setEyeEAR(eyeState.averageEAR);
                    setEyesClosed(eyeState.eyesClosed);

                    const risk = updateDrowsiness(eyeState.eyesClosed);

                    if (risk) {
                        setDrowsy(Boolean(risk.drowsy));

                        if (risk.shouldAlert) {
                            speakAlert("Warning. You appear to be drowsy. Please stay alert.");
                            setLastAlert("Drowsiness alert");
                        }
                    }
                } else {
                    setFaceDetected(false);
                    setEyesClosed(false);
                    setDrowsy(false);
                    setEyeEAR(0);
                    setYawning(false);
                    setMouthMAR(0);
                    resetYawnDetection();
                    setHeadDirection("Not detected");
                    setAttention("Not detected");
                    updateDrowsiness(false);
                }

                const currentTime = performance.now();

                if (
                    phoneDetectionReady &&
                    !phoneDetectionRunningRef.current &&
                    currentTime - lastPhoneDetectionRef.current > 700
                ) {
                    lastPhoneDetectionRef.current = currentTime;
                    phoneDetectionRunningRef.current = true;

                    detectPhone(video)
                        .then((phoneResult) => {
                            setPhoneDetected(Boolean(phoneResult.detected));
                            setPhoneConfidence(phoneResult.confidence || 0);

                            if (phoneResult.detected) {
                                if (canPlayAlert(lastPhoneAlertRef)) {
                                    speakAlert("Please put the phone down and focus on driving.");
                                    setLastAlert("Phone detected");
                                }
                            }
                        })
                        .catch((error) => {
                            console.error("Phone detection failed:", error);
                        })
                        .finally(() => {
                            phoneDetectionRunningRef.current = false;
                        });
                }
            } catch (error) {
                console.error("AI frame processing error:", error);
            }
        }

        animationFrameRef.current = requestAnimationFrame(runAI);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (cameraActive && aiReady) {
            animationFrameRef.current = requestAnimationFrame(runAI);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [cameraActive, aiReady]);

    const getScoreStatus = () => {
        if (score >= 90) return "SAFE";
        if (score >= 70) return "CAUTION";
        if (score >= 50) return "HIGH RISK";
        return "CRITICAL";
    };

    return (
        <main className="monitor-page">
            <div className="monitor-header">
                <div>
                    <span>REAL-TIME MONITORING</span>
                    <h1>Driver Monitoring</h1>
                    <p>Keep the camera positioned toward the driver's face.</p>
                </div>

                <div className={cameraActive ? "monitor-live" : "monitor-offline"}>
                    <i className="bi bi-circle-fill"></i>
                    {cameraActive ? "MONITORING" : "OFFLINE"}
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

                                <h2>Camera not started</h2>

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

                    {cameraError && (
                        <div className="camera-error">
                            <i className="bi bi-exclamation-triangle"></i>
                            {cameraError}
                        </div>
                    )}

                    {aiError && (
                        <div className="camera-error">
                            <i className="bi bi-cpu"></i>
                            {aiError}
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
                        <small>DRIVER SAFETY SCORE</small>

                        <div className="monitor-score">
                            {score}
                            <span>/100</span>
                        </div>

                        <div className="score-status">
                            <i className="bi bi-shield-check"></i>
                            {getScoreStatus()}
                        </div>
                    </div>

                    <div className="detection-card">
                        <div className="detection-heading">
                            <span>LIVE DETECTION</span>
                            <i className="bi bi-broadcast"></i>
                        </div>

                        <Detection
                            icon="bi-person-check"
                            label="Face"
                            value={!cameraActive ? "Waiting" : faceDetected ? "Detected" : "Not detected"}
                            safe={faceDetected}
                        />

                        <Detection
                            icon="bi-eye"
                            label="Eyes"
                            value={!cameraActive ? "Waiting" : eyesClosed ? "Closed" : "Normal"}
                            safe={cameraActive && !eyesClosed}
                        />

                        <Detection
                            icon="bi-emoji-frown"
                            label="Drowsiness"
                            value={!cameraActive ? "Waiting" : drowsy ? "Drowsy" : "Normal"}
                            safe={cameraActive && !drowsy}
                        />

                        <Detection
                            icon="bi-compass"
                            label="Attention"
                            value={!cameraActive ? "Waiting" : !faceDetected ? "Not detected" : attention}
                            safe={cameraActive && faceDetected && attention === "Focused"}
                        />

                        <Detection
                            icon="bi-person-bounding-box"
                            label="Head Pose"
                            value={!cameraActive ? "Waiting" : !faceDetected ? "Not detected" : headDirection}
                            safe={cameraActive && faceDetected && headDirection === "Center"}
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
                            safe={cameraActive && phoneDetectionReady && !phoneDetected}
                        />

                        <Detection
                            icon="bi-emoji-smile"
                            label="Yawning"
                            value={!cameraActive ? "Waiting" : !faceDetected ? "Not detected" : yawning ? "Detected" : "Normal"}
                            safe={cameraActive && faceDetected && !yawning}
                        />
                    </div>

                    <div className="ear-debug-card">
                        <span>EYE ASPECT RATIO</span>
                        <strong>{eyeEAR.toFixed(3)}</strong>
                        <small>Lower values indicate greater eye closure.</small>
                    </div>

                    <div className="ear-debug-card">
                        <span>MOUTH ASPECT RATIO</span>
                        <strong>{mouthMAR.toFixed(3)}</strong>
                        <small>Higher values indicate greater mouth opening.</small>
                    </div>

                    {phoneDetectionReady && (
                        <div className="ear-debug-card">
                            <span>PHONE DETECTION</span>
                            <strong>
                                {phoneDetected
                                    ? `${(phoneConfidence * 100).toFixed(1)}%`
                                    : "No phone"}
                            </strong>
                            <small>Object detection confidence</small>
                        </div>
                    )}

                    <div className="last-alert-card">
                        <i className="bi bi-volume-up"></i>

                        <div>
                            <span>LAST ALERT</span>
                            <strong>{lastAlert}</strong>
                        </div>
                    </div>

                    <div className="alert-info">
                        <i className="bi bi-volume-up"></i>

                        <div>
                            <strong>Audio alerts enabled</strong>
                            <p>Voice warnings will be played when unsafe behavior is detected.</p>
                        </div>
                    </div>

                    {aiReady && (
                        <div className="ai-status">
                            <i className="bi bi-cpu"></i>
                            <span>AI engine ready</span>
                        </div>
                    )}
                </aside>
            </section>
        </main>
    );
}

function Detection({ icon, label, value, safe }) {
    return (
        <div className="detection-row">
            <div className="detection-icon">
                <i className={`bi ${icon}`}></i>
            </div>

            <div className="detection-label">
                <span>{label}</span>
                <strong>{value}</strong>
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