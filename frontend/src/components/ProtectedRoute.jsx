
import { Navigate, Outlet } from "react-router-dom";


function ProtectedRoute() {

    const accessToken =
        localStorage.getItem("access");


    if (!accessToken) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }


    return <Outlet />;
}


export default ProtectedRoute;
