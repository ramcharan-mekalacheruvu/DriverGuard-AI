
import {
    Link,
    useNavigate,
} from "react-router-dom";

import "../styles/dashboard.css";


function Dashboard() {

    const navigate = useNavigate();


    const handleLogout = () => {

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");

        navigate("/login", {
            replace: true,
        });
    };


    return (

        <main className="dashboard-page">

            {/* Header */}

            <header className="dashboard-header">

                <div className="dashboard-brand">

                    <div className="dashboard-logo">
                        🚗
                    </div>

                    <div>
                        <h1>
                            DriverGuard
                        </h1>

                        <span>
                            AI Driver Safety
                        </span>
                    </div>

                </div>


                <button
                    className="logout-btn"
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right"></i>

                    Logout
                </button>

            </header>


            {/* Welcome */}

            <section className="dashboard-welcome">

                <div>

                    <span className="dashboard-label">
                        DRIVER SAFETY DASHBOARD
                    </span>

                    <h2>
                        Welcome back 👋
                    </h2>

                    <p>
                        Start a monitoring session to
                        analyze driver attention in real time.
                    </p>

                </div>


                <Link
                    to="/monitor"
                    className="start-monitor-btn"
                >

                    <i className="bi bi-camera-video"></i>

                    Start Monitoring

                </Link>

            </section>


            {/* Status Cards */}

            <section className="dashboard-grid">


                <div className="dashboard-card">

                    <div className="card-icon">
                        <i className="bi bi-shield-check"></i>
                    </div>

                    <div>

                        <span>
                            Current Status
                        </span>

                        <strong className="status-safe">
                            Ready
                        </strong>

                    </div>

                </div>


                <div className="dashboard-card">

                    <div className="card-icon">
                        <i className="bi bi-speedometer2"></i>
                    </div>

                    <div>

                        <span>
                            Safety Score
                        </span>

                        <strong>
                            100/100
                        </strong>

                    </div>

                </div>


                <div className="dashboard-card">

                    <div className="card-icon">
                        <i className="bi bi-camera-video"></i>
                    </div>

                    <div>

                        <span>
                            Camera
                        </span>

                        <strong>
                            Ready
                        </strong>

                    </div>

                </div>


                <div className="dashboard-card">

                    <div className="card-icon">
                        <i className="bi bi-volume-up"></i>
                    </div>

                    <div>

                        <span>
                            Audio Alerts
                        </span>

                        <strong>
                            Enabled
                        </strong>

                    </div>

                </div>

            </section>


            {/* Main Action */}

            <section className="dashboard-monitor-card">

                <div className="monitor-card-content">

                    <div className="monitor-card-icon">
                        <i className="bi bi-camera-video"></i>
                    </div>

                    <div>

                        <h3>
                            Ready to monitor
                        </h3>

                        <p>
                            Allow camera access and let
                            DriverGuard analyze your
                            driving attention.
                        </p>

                    </div>

                </div>


                <Link
                    to="/monitor"
                    className="dashboard-action"
                >
                    Open Monitoring
                    <i className="bi bi-arrow-right"></i>
                </Link>

            </section>


            {/* Detection Information */}

            <section className="dashboard-info">

                <div className="info-heading">

                    <span>
                        AI PROTECTION
                    </span>

                    <h2>
                        What DriverGuard monitors
                    </h2>

                </div>


                <div className="info-grid">

                    <div className="info-card">

                        <i className="bi bi-eye"></i>

                        <h3>
                            Drowsiness
                        </h3>

                        <p>
                            Detect prolonged eye closure
                            and signs of fatigue.
                        </p>

                    </div>


                    <div className="info-card">

                        <i className="bi bi-compass"></i>

                        <h3>
                            Distraction
                        </h3>

                        <p>
                            Analyze head position and
                            driver attention.
                        </p>

                    </div>


                    <div className="info-card">

                        <i className="bi bi-phone"></i>

                        <h3>
                            Phone Usage
                        </h3>

                        <p>
                            Detect mobile phone usage
                            while driving.
                        </p>

                    </div>


                    <div className="info-card">

                        <i className="bi bi-volume-up"></i>

                        <h3>
                            Voice Alerts
                        </h3>

                        <p>
                            Provide immediate audio
                            warnings when risk increases.
                        </p>

                    </div>

                </div>

            </section>

        </main>
    );
}


export default Dashboard;

