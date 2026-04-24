import "./App.css";
import Layout from "./component/home/Layout";
import Home from "./component/home/Home";
import Login from "./component/login/login";
import Verify from "./component/home/Verify";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Admin from "./component/login/Admin";
import Student from "./component/login/Student";
import Dashboard from "./component/admin/dashboard/dashboard";
import Authorisations  from "./component/admin/authori/authorisation";
import Issue from "./component/admin/add/issue";
import List from "./component/admin/list/List";
import Static from "./component/admin/static/Static";
import Parameters from "./component/admin/param/Param";
import Request from "./component/admin/request/Request";
import AuditTrail from "./component/admin/audit/AuditTrail";

import DashboardStudent from "./component/student/DashboardStudent";
import Settings from "./component/student/Settings";
import RequestStudent from "./component/student/RequestStudent";
function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/verify" element={<Verify />} />
          </Route>

          <Route path="/login" element={<Login />} />

          <Route path="/admin/*" element={<Admin />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="authorisations" element={<Authorisations />} />
            <Route path="add" element={<Issue />} />
            <Route path="list" element={<List />} />
            <Route path="stat" element={<Static />} />
            <Route path="req" element={<Request />} />
            <Route path="para" element={<Parameters />} />
            <Route path="audit" element={<AuditTrail />} />
          </Route>

          <Route path="/student/*" element={<Student />} >
           < Route index element={<DashboardStudent />}/>
            <Route path="DashboardStudent" element={<DashboardStudent/>} />
             <Route path="RequestStudent" element={<RequestStudent/>} />
            < Route path="Settings" element={<Settings />}/>
          
          </Route>


        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
