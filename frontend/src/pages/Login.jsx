
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import api from "../services/api";
import "../styles/auth.css";


function Login() {

    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleChange = (event) => {

        setForm({
            ...form,
            [event.target.name]: event.target.value,
        });
    };


    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setLoading(true);

        try {

            const response = await api.post(
                "auth/login/",
                form
            );

            const accessToken =
                response.data.access;

            const refreshToken =
                response.data.refresh;


            if (!accessToken) {

                setError(
                    "Login failed. Access token was not received."
                );

                return;
            }


            localStorage.setItem(
                "access",
                accessToken
            );

            localStorage.setItem(
                "refresh",
                refreshToken
            );


            // Verify that token was actually saved
            console.log(
                "Login successful"
            );

            console.log(
                "Access token:",
                localStorage.getItem("access")
            );


            // Go to dashboard
            navigate("/dashboard", {
                replace: true,
            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            if (
                error.response &&
                error.response.status === 401
            ) {

                setError(
                    "Invalid username or password."
                );

            } else {

                setError(
                    "Unable to login. Please try again."
                );
            }

        } finally {

            setLoading(false);
        }
    };


    return (

        <div className="auth-page">

            <div className="auth-card">

                <div className="auth-logo">
                    🚗
                </div>


                <h1>
                    DriverGuard
                </h1>


                <p className="auth-subtitle">
                    AI-Based Driver Monitoring System
                </p>


                <h2>
                    Welcome Back
                </h2>


                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}


                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >

                    <div className="form-group">

                        <label htmlFor="username">
                            Username
                        </label>

                        <input
                            id="username"
                            type="text"
                            name="username"
                            placeholder="Enter your username"
                            value={form.username}
                            onChange={handleChange}
                            autoComplete="username"
                            required
                        />

                    </div>


                    <div className="form-group">

                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            required
                        />

                    </div>


                    <button
                        className="auth-button"
                        type="submit"
                        disabled={loading}
                    >

                        {loading
                            ? "Logging in..."
                            : "Login"
                        }

                    </button>

                </form>


                <p className="auth-footer">

                    Don't have an account?

                    {" "}

                    <Link to="/register">
                        Create Account
                    </Link>

                </p>

            </div>

        </div>
    );
}


export default Login;

