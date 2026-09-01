import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";


function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
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
            await api.post(
                "auth/register/",
                form
            );

            navigate("/login");

        } catch (error) {
            console.error(error);

            setError(
                "Registration failed. Please check your details."
            );
        }
    };

    return (
        <div>

            <h2>Create Account</h2>

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
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
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
                    Register
                </button>

            </form>

        </div>
    );
}


export default Register;