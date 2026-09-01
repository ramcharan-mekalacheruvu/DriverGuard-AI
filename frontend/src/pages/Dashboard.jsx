import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";


function Dashboard() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const token =
                    localStorage.getItem("access");

                const response = await api.get(
                    "auth/profile/",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

                setProfile(response.data);

            } catch (error) {
                console.error(error);
            }
        };

        loadProfile();
    }, []);

    return (
        <div>

            <h1>DriverGuard Dashboard</h1>

            {profile && (
                <h2>
                    Welcome, {profile.display_name}
                </h2>
            )}

            <p>
                AI Driver Monitoring
            </p>

            <Link to="/monitor">
                Start Monitoring
            </Link>

        </div>
    );
}


export default Dashboard;