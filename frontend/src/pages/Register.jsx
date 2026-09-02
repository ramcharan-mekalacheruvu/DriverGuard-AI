import { useState } from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";

import api from "../services/api";

import "../styles/auth.css";


function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]:
                event.target.value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await api.post(
                "auth/register/",
                form
            );

            navigate("/login");

        } catch (error) {
            console.error(error);

            if (error.response?.data) {
                const data =
                    error.response.data;

                const message =
                    Object.values(data)
                        .flat()
                        .join(" ");

                setError(message);
            } else {
                setError(
                    "Registration failed."
                );
            }

        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">

            <div className="auth-card">

                <div className="auth-icon">
                    <i className="bi bi-person-plus"></i>
                </div>

                <h1>
                    Create account
                </h1>

                <p className="auth-subtitle">
                    Start using AI-powered driver monitoring.
                </p>

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

                        <label>
                            Username
                        </label>

                        <input
                            className="form-input"
                            type="text"
                            name="username"
                            placeholder="Choose a username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Email
                        </label>

                        <input
                            className="form-input"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Password
                        </label>

                        <input
                            className="form-input"
                            type="password"
                            name="password"
                            placeholder="Minimum 8 characters"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <button
                        className="auth-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating..."
                            : "Create Account"
                        }
                    </button>

                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link to="/login">
                        Sign in
                    </Link>
                </p>

            </div>

        </main>
    );
}

export default Register;