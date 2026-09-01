import { Link } from "react-router-dom";


function Home() {
    return (
        <div>
            <h1>
                DriverGuard AI
            </h1>

            <p>
                AI-Based Real-Time Driver
                Monitoring System
            </p>

            <Link to="/login">
                Login
            </Link>

            {" | "}

            <Link to="/register">
                Register
            </Link>
        </div>
    );
}


export default Home;