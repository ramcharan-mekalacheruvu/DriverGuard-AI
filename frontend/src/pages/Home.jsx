import { Link } from "react-router-dom";

import "../styles/home.css";


function Home() {
    return (
        <main className="home-page">

            <section className="hero-section">

                <div className="hero-content">

                    <div className="status-pill">
                        <span></span>
                        AI-POWERED DRIVER SAFETY
                    </div>

                    <h1>
                        Drive safer with
                        <strong> intelligent monitoring.</strong>
                    </h1>

                    <p>
                        DriverGuard AI continuously monitors
                        driver attention using computer vision
                        and provides real-time safety alerts.
                    </p>

                    <div className="hero-buttons">

                        <Link
                            to="/register"
                            className="primary-btn"
                        >
                            Start Monitoring
                            <i className="bi bi-arrow-right"></i>
                        </Link>

                        <Link
                            to="/login"
                            className="secondary-btn"
                        >
                            Sign In
                        </Link>

                    </div>

                </div>

                <div className="hero-visual">

                    <div className="monitor-card">

                        <div className="camera-header">
                            <span>
                                <i className="bi bi-camera-video"></i>
                                LIVE MONITORING
                            </span>

                            <span className="live-dot">
                                LIVE
                            </span>
                        </div>

                        <div className="fake-camera">

                            <div className="face-placeholder">
                                <i className="bi bi-person"></i>
                            </div>

                            <div className="camera-status">
                                <span></span>
                                Driver detected
                            </div>

                        </div>

                        <div className="score-preview">

                            <div>
                                <small>
                                    SAFETY SCORE
                                </small>

                                <strong>
                                    94
                                </strong>
                            </div>

                            <div className="safe-label">
                                <i className="bi bi-shield-check"></i>
                                SAFE
                            </div>

                        </div>

                    </div>

                </div>

            </section>

            <section className="feature-section">

                <div className="section-heading">
                    <small>
                        INTELLIGENT SAFETY
                    </small>

                    <h2>
                        One system. Multiple protections.
                    </h2>
                </div>

                <div className="feature-grid">

                    <Feature
                        icon="bi-eye"
                        title="Drowsiness Detection"
                        text="Detect prolonged eye closure and signs of driver fatigue."
                    />

                    <Feature
                        icon="bi-compass"
                        title="Distraction Detection"
                        text="Monitor head position and detect prolonged attention loss."
                    />

                    <Feature
                        icon="bi-phone"
                        title="Phone Detection"
                        text="Identify mobile phone usage while driving."
                    />

                    <Feature
                        icon="bi-volume-up"
                        title="Voice Alerts"
                        text="Provide immediate audio warnings when risk increases."
                    />

                </div>

            </section>

        </main>
    );
}


function Feature({ icon, title, text }) {
    return (
        <div className="feature-card">

            <div className="feature-icon">
                <i className={`bi ${icon}`}></i>
            </div>

            <h3>{title}</h3>

            <p>{text}</p>

        </div>
    );
}


export default Home;