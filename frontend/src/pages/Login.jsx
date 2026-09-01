import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";


function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
    });

    const [error, setError] = useState("");

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]: event.target.value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        try {
            const response = await api.post(
                "auth/login/",
                form
            );

            localStorage.setItem(
                "access",
                response.data.access
            );

            localStorage.setItem(
                "refresh",
                response.data.refresh
            );

            navigate("/dashboard");

        } catch (error) {
            console.error(error);

            setError(
                "Invalid username or password."
            );
        }
    };

    return (
        <div>

            <h2>DriverGuard Login</h2>

            {error && (
                <p>{error}</p>
            )}

            <form onSubmit={handleSubmit}>

                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={form.username}
                    onChange={handleChange}
                    required
                />

                <br />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                />

                <br />

                <button type="submit">
                    Login
                </button>

            </form>

        </div>
    );
}


export default Login;