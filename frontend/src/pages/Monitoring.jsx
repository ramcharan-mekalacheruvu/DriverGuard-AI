import {
    useEffect,
    useRef,
    useState,
} from "react";

import "../styles/monitoring.css";


function Monitoring() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [cameraActive, setCameraActive] =
        useState(false);

    const [cameraError, setCameraError] =
        useState("");

    const [score, setScore] =
        useState(100);

    const startCamera = async () => {
        try {
            setCameraError("");

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
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
            }

            setCameraActive(true);

        } catch (error) {
            console.error(error);

            setCameraError(
                "Camera access was denied or is unavailable."
            );
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraActive(false);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

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
                            <span>/100</span>
                        </div>

                        <div className="score-status">
                            <i className="bi bi-shield-check"></i>
                            SAFE
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
                                    ? "Detected"
                                    : "Waiting"
                            }
                            safe={cameraActive}
                        />

                        <Detection
                            icon="bi-eye"
                            label="Eyes"
                            value="Normal"
                            safe
                        />

                        <Detection
                            icon="bi-compass"
                            label="Attention"
                            value="Focused"
                            safe
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

                </aside>

            </section>

        </main>
    );
}


function Detection({
    icon,
    label,
    value,
    safe,
}) {
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